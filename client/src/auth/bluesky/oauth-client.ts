import {
  BrowserOAuthClient,
  buildLoopbackClientId,
  type OAuthSession,
} from '@atproto/oauth-client-browser'
import { BLUESKY_LOGIN_LXM, blueskyServiceDid } from 'tapestry-shared/src/bluesky'
import { config } from '../../config'
import { BLUESKY_SCOPE, CLIENT_METADATA_PATH } from './client-metadata'
import { SessionCreateDto } from 'tapestry-shared/src/data-transfer/resources/dtos/session'

const RETURN_TO_KEY = 'bluesky-login-return-to'

function isLoopback(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

function moveToLocalhost() {
  const { hostname, port, pathname, search, hash } = window.location
  if (hostname !== '127.0.0.1' && hostname !== '[::1]') return false

  window.location.replace(`http://localhost${port ? `:${port}` : ''}${pathname}${search}${hash}`)
  return true
}

let clientPromise: Promise<BrowserOAuthClient> | undefined

export function getBlueskyOAuthClient() {
  clientPromise ??= isLoopback(window.location.hostname)
    ? BrowserOAuthClient.load({
        clientId: `${buildLoopbackClientId({
          hostname: window.location.hostname,
          port: window.location.port,
          pathname: '/',
        })}&scope=${encodeURIComponent(BLUESKY_SCOPE)}`,
        handleResolver: 'https://bsky.social',
      })
    : BrowserOAuthClient.load({
        clientId: `${window.location.origin}${CLIENT_METADATA_PATH}`,
        handleResolver: 'https://bsky.social',
      })

  const promise = clientPromise
  promise.catch(() => (clientPromise = undefined))

  return promise
}

export async function startBlueskyLogin(handle: string, signal?: AbortSignal) {
  const client = await getBlueskyOAuthClient()
  return client.signInRedirect(handle, { signal })
}

export async function getBlueskyServiceToken(session: OAuthSession) {
  const params = new URLSearchParams({
    aud: blueskyServiceDid(config.apiUrl),
    lxm: BLUESKY_LOGIN_LXM,
  })
  const response = await session.fetchHandler(
    `/xrpc/com.atproto.server.getServiceAuth?${params.toString()}`,
  )
  if (!response.ok) {
    throw new Error(`Failed to obtain a Bluesky service token: ${response.status}`)
  }
  const { token } = (await response.json()) as { token: string }
  return token
}

export function saveBlueskyReturnTo() {
  sessionStorage.setItem(RETURN_TO_KEY, `${window.location.pathname}${window.location.search}`)
}

function consumeCallbackParams() {
  const params = new URLSearchParams(window.location.hash.slice(1))
  if (
    window.location.pathname !== '/' ||
    !params.has('state') ||
    !(params.has('code') || params.has('error'))
  ) {
    return null
  }

  const returnTo = sessionStorage.getItem(RETURN_TO_KEY)
  sessionStorage.removeItem(RETURN_TO_KEY)
  const safeReturnTo = returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/'
  window.history.replaceState(window.history.state, '', safeReturnTo)

  return params
}

const callbackParams = moveToLocalhost() ? null : consumeCallbackParams()

export async function completeBlueskyLogin(): Promise<SessionCreateDto | undefined> {
  if (!callbackParams) return

  const client = await getBlueskyOAuthClient()

  const state: unknown = window.history.state
  const { href } = window.location
  const callbackPromise = client.initCallback(
    callbackParams,
    client.clientMetadata.redirect_uris[0],
  )
  window.history.replaceState(state, '', href)
  const { session } = await callbackPromise

  try {
    return { authType: 'bluesky', serviceToken: await getBlueskyServiceToken(session) }
  } finally {
    await session.signOut()
  }
}
