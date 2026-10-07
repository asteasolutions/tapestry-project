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

// We only use Bluesky to identify the user, so we request the bare minimum scope.
const SCOPE = 'atproto'
const ROUTER_PATH = '/auth/bluesky'
const CLIENT_METADATA_PATH = `${ROUTER_PATH}/client-metadata.json`
const CALLBACK_PATH = `${ROUTER_PATH}/callback`

// Query params used when redirecting back to the client application
export const BLUESKY_LOGIN_CODE_PARAM = 'bluesky-login-code'
export const BLUESKY_LOGIN_ERROR_PARAM = 'bluesky-login-error'

const STATE_TTL = 10 * 60
const LOGIN_CODE_TTL = 2 * 60

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
  const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(
    new URL(config.server.externalUrl).hostname,
  )

  if (isLoopback) {
    // During local development the authorization server cannot fetch our client metadata document,
    // so we use the special "loopback" client defined by the atproto OAuth spec. Its redirect URI
    // must use an IP address, not "localhost".
    const redirectUri = `${apiUrl.replace(/\/\/[^/:]+/, '//127.0.0.1')}${CALLBACK_PATH}`
    return {
      client_id: `http://localhost?${new URLSearchParams({ redirect_uri: redirectUri, scope: SCOPE }).toString()}`,
      redirect_uris: [redirectUri],
      scope: SCOPE,
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      application_type: 'native',
      token_endpoint_auth_method: 'none',
      dpop_bound_access_tokens: true,
    }
  }

  return {
    client_id: `${apiUrl}${CLIENT_METADATA_PATH}`,
    client_name: 'Tapestries',
    client_uri: config.server.viewerUrl,
    redirect_uris: [`${apiUrl}${CALLBACK_PATH}`],
    scope: SCOPE,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    application_type: 'web',
    token_endpoint_auth_method: 'none',
    dpop_bound_access_tokens: true,
  }
}

// Handles are resolved by the server itself (via DNS and HTTPS well-known), so no third-party
// handle resolution service is involved.
export const blueskyOAuthClient = new NodeOAuthClient({
  clientMetadata: createClientMetadata(),
  stateStore: redisStore<NodeSavedState>('state', STATE_TTL),
  // Sessions are revoked right after the login completes, so they only need to live briefly.
  sessionStore: redisStore<NodeSavedSession>('session', STATE_TTL),
  // We never refresh tokens, so a local lock is sufficient.
  requestLock: requestLocalLock,
})

const AppStateSchema = z.object({ nonce: z.string(), returnTo: z.string() })
type AppState = z.infer<typeof AppStateSchema>

const LoginCodeDataSchema = z.object({ did: z.string(), handle: z.string(), nonce: z.string() })
export type BlueskyLoginCodeData = z.infer<typeof LoginCodeDataSchema>

const loginCodes = redisStore<BlueskyLoginCodeData>('login-code', LOGIN_CODE_TTL)

export async function consumeBlueskyLoginCode(code: string) {
  const data = await loginCodes.get(code)
  await loginCodes.del(code)
  return LoginCodeDataSchema.safeParse(data).data
}

function safeReturnTo(returnTo: string | undefined) {
  // Only allow relative paths to avoid open redirects
  return returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/'
}

export function createBlueskyAuthorizationUrl(handle: string, nonce: string, returnTo?: string) {
  const state: AppState = { nonce, returnTo: safeReturnTo(returnTo) }
  return blueskyOAuthClient.authorize(handle, { scope: SCOPE, state: JSON.stringify(state) })
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
  res.json(blueskyOAuthClient.clientMetadata)
})

blueskyRouter.get(CALLBACK_PATH, async (req, res) => {
  let returnTo = '/'
  try {
    const params = new URLSearchParams(req.originalUrl.split('?')[1] ?? '')
    // The library verifies that the "sub" in the token response is a DID whose
    // authorization server is the one which issued the token.
    const { session, state } = await blueskyOAuthClient.callback(params)
    const appState = AppStateSchema.parse(JSON.parse(state ?? ''))
    returnTo = appState.returnTo

    const { handle } = await blueskyOAuthClient.identityResolver.resolve(session.did)
    // We only need the user's identity, so there's no point in keeping the tokens.
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
