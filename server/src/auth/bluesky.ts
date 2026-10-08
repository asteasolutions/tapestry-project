import { Router } from 'express'
import { randomBytes } from 'crypto'
import z from 'zod/v4'
import {
  NodeOAuthClient,
  requestLocalLock,
  type NodeSavedSession,
  type NodeSavedState,
  type OAuthClientMetadataInput,
} from '@atproto/oauth-client-node'
import { config } from '../config.js'
import { redis } from '../services/redis.js'

const SCOPE = 'atproto'

const ROUTER_PATH = '/auth/bluesky'
const CLIENT_METADATA_PATH = `${ROUTER_PATH}/client-metadata.json`
const CALLBACK_PATH = `${ROUTER_PATH}/callback`

export const BLUESKY_LOGIN_CODE_PARAM = 'bluesky-login-code'
export const BLUESKY_LOGIN_ERROR_PARAM = 'bluesky-login-error'

const STATE_LIFETIME = 10 * 60
const LOGIN_CODE_LIFETIME = 2 * 60

function redisStore<V>(namespace: string, ttl: number) {
  const key = (k: string) => `bluesky-oauth:${namespace}:${k}`
  return {
    async get(k: string) {
      const value = await redis.get(key(k))
      return value ? (JSON.parse(value) as V) : undefined
    },
    async set(k: string, value: V) {
      await redis.set(key(k), JSON.stringify(value), 'EX', ttl)
    },
    async del(k: string) {
      await redis.del(key(k))
    },
  }
}

function createClientMetadata(): OAuthClientMetadataInput {
  const apiUrl = new URL('/api', config.server.externalUrl).href

  return {
    client_id: `${apiUrl}${CLIENT_METADATA_PATH}`,
    client_name: 'Tapestries',
    redirect_uris: [`${apiUrl}${CALLBACK_PATH}`],
    scope: SCOPE,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    application_type: 'web',
    token_endpoint_auth_method: 'none',
    dpop_bound_access_tokens: true,
  }
}

let oauthClient: NodeOAuthClient | undefined

// The client is created lazily, on the first Bluesky login, rather than when the module is
// imported. The library validates the client metadata on creation and rejects a non-HTTPS
// client ID, so creating it eagerly would crash the whole server whenever EXTERNAL_SERVER_URL
// isn't HTTPS. This way only the Bluesky login is affected.
function getOAuthClient() {
  oauthClient ??= new NodeOAuthClient({
    clientMetadata: createClientMetadata(),
    stateStore: redisStore<NodeSavedState>('state', STATE_LIFETIME),
    sessionStore: redisStore<NodeSavedSession>('session', STATE_LIFETIME),
    requestLock: requestLocalLock,
  })
  return oauthClient
}

const AppStateSchema = z.object({ nonce: z.string(), returnTo: z.string() })
type AppState = z.infer<typeof AppStateSchema>

const LoginCodeDataSchema = z.object({ did: z.string(), handle: z.string(), nonce: z.string() })
export type BlueskyLoginCodeData = z.infer<typeof LoginCodeDataSchema>

const loginCodes = redisStore<BlueskyLoginCodeData>('login-code', LOGIN_CODE_LIFETIME)

export async function consumeBlueskyLoginCode(code: string) {
  const data = await loginCodes.get(code)
  await loginCodes.del(code)
  return LoginCodeDataSchema.safeParse(data).data
}

function safeReturnTo(returnTo: string | undefined) {
  // Only allow relative paths to avoid open redirects
  return returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/'
}

export function resolveBlueskyHandle(handle: string) {
  return getOAuthClient().identityResolver.resolve(handle)
}

export function createBlueskyAuthorizationUrl(handle: string, nonce: string, returnTo?: string) {
  const state: AppState = { nonce, returnTo: safeReturnTo(returnTo) }
  return getOAuthClient().authorize(handle, { scope: SCOPE, state: JSON.stringify(state) })
}

function clientRedirectUrl(path: string, params: Record<string, string>) {
  const url = new URL(path, config.server.viewerUrl)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return url.href
}

export const blueskyRouter = Router()

blueskyRouter.get(CLIENT_METADATA_PATH, (_req, res) => {
  res.json(getOAuthClient().clientMetadata)
})

blueskyRouter.get(CALLBACK_PATH, async (req, res) => {
  let returnTo = '/'
  try {
    const params = new URLSearchParams(req.originalUrl.split('?')[1] ?? '')
    const { session, state } = await getOAuthClient().callback(params)
    const appState = AppStateSchema.parse(JSON.parse(state ?? ''))
    returnTo = appState.returnTo

    const { handle } = await getOAuthClient().identityResolver.resolve(session.did)
    await session.signOut().catch((error: unknown) => {
      console.error('Error while revoking Bluesky session', error)
    })

    const code = randomBytes(32).toString('base64url')
    await loginCodes.set(code, { did: session.did, handle, nonce: appState.nonce })

    res.redirect(clientRedirectUrl(returnTo, { [BLUESKY_LOGIN_CODE_PARAM]: code }))
  } catch (error) {
    console.error('Error while completing Bluesky authentication', error)
    res.redirect(clientRedirectUrl(returnTo, { [BLUESKY_LOGIN_ERROR_PARAM]: 'true' }))
  }
})
