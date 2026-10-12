import {
  BrowserOAuthClient,
  buildLoopbackClientId,
  type OAuthSession,
} from '@atproto/oauth-client-browser'
import { BLUESKY_LOGIN_LXM, blueskyServiceDid } from 'tapestry-shared/src/bluesky'
import { config } from '../../config'
import { BLUESKY_SCOPE, CLIENT_METADATA_PATH } from './client-metadata'
import { SessionCreateDto } from 'tapestry-shared/src/data-transfer/resources/dtos/session'

export { OAuthResolverError } from '@atproto/oauth-client-browser'

function isLoopback(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

/**
 * Loopback redirect URIs must use an IP address rather than "localhost" (RFC 8252), so during
 * development the auth server always redirects back to 127.0.0.1. The OAuth state is stored per
 * origin though, so we always use localhost: logins are started there, and both the callback and
 * any page opened on 127.0.0.1 are moved there before anything else runs.
 */
function moveToLocalhost() {
  const { hostname, port, pathname, search, hash } = window.location
  if (hostname !== '127.0.0.1' && hostname !== '[::1]') return false

  window.location.replace(`http://localhost${port ? `:${port}` : ''}${pathname}${search}${hash}`)
  return true
}

let clientPromise: Promise<BrowserOAuthClient> | undefined

export function getBlueskyOAuthClient() {
  clientPromise ??= isLoopback(window.location.hostname)
    ? // During development we use a loopback client, which doesn't need hosted metadata.
      // The auth server redirects back to 127.0.0.1, see moveToLocalhost().
      BrowserOAuthClient.load({
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
  // Retry on the next call if loading the client failed
  promise.catch(() => (clientPromise = undefined))

  return promise
}

/**
 * Redirects to the authorization server of the user's PDS. The promise never resolves.
 */
export async function startBlueskyLogin(handle: string, signal?: AbortSignal) {
  const client = await getBlueskyOAuthClient()
  return client.signInRedirect(handle, { signal })
}

/**
 * Asks the user's PDS for a short-lived token, signed with the user's key, which proves to our
 * server that the user is who they claim to be.
 */
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

const RETURN_TO_KEY = 'bluesky-login-return-to'

/**
 * Saves the current location, so that we can return to it after the user is redirected back
 * from the Bluesky authorization server, which always redirects to the root path.
 */
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

  // Restore the original location before the router is created, so that it never sees the
  // callback URL. This module is evaluated before that since the auth service depends on it.
  const returnTo = sessionStorage.getItem(RETURN_TO_KEY)
  sessionStorage.removeItem(RETURN_TO_KEY)
  const safeReturnTo = returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/'
  window.history.replaceState(window.history.state, '', safeReturnTo)

  return params
}

const callbackParams = moveToLocalhost() ? null : consumeCallbackParams()

/**
 * Completes the Bluesky OAuth flow, if we've just been redirected back from the authorization
 * server, and returns credentials for logging into our server.
 */
export async function completeBlueskyLogin(): Promise<SessionCreateDto | undefined> {
  if (!callbackParams) return

  const client = await getBlueskyOAuthClient()
  // initCallback() synchronously replaces the current history entry with one that has no state,
  // which would wipe the router's state, so we put the entry back right after calling it.
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
    await session.signOut().catch((error: unknown) => {
      console.error('Error while revoking Bluesky session', error)
    })
  }
}
