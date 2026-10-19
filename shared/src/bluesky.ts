/** The "lxm" (lexicon method) claim of the service auth JWT used for logging in with Bluesky */
export const BLUESKY_LOGIN_LXM = 'app.tapestries.login'

/**
 * The DID which identifies the Tapestries API as the "aud" (audience) of the service auth JWT
 * used for logging in with Bluesky. It is derived from the API URL, so that the client and the
 * server agree on it without any extra configuration.
 */
export function blueskyServiceDid(apiUrl: string) {
  return `did:web:${new URL(apiUrl).hostname}`
}
