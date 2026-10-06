import { LoginWithOrcidDto } from 'tapestry-shared/src/data-transfer/resources/dtos/session'
import { config } from '../../config'
import { auth } from '..'
import { CanceledError, GenericAbortSignal } from 'axios'

/**
 * ORCID uses a standard OAuth2 authorization-code flow (unlike Google's in-page popup):
 *  1. We redirect the whole window to ORCID's authorize endpoint.
 *  2. ORCID redirects back to our redirectUri with a `?code=...` query parameter.
 *  3. We hand that code to our server, which exchanges it for the authenticated ORCID iD.
 *
 * See https://info.orcid.org/documentation/api-tutorials/api-tutorial-get-and-authenticated-orcid-id/
 */
function redirectUri() {
  return config.orcid.redirectUri || `${window.location.origin}/`
}

/** Step 1: send the user to ORCID to authenticate. */
export function startOrcidLogin() {
  const authorizeUrl = new URL(`${config.orcid.baseUrl}/oauth/authorize`)
  authorizeUrl.search = new URLSearchParams({
    client_id: config.orcid.clientId,
    response_type: 'code',
    scope: '/authenticate',
    redirect_uri: redirectUri(),
  }).toString()

  window.location.assign(authorizeUrl.toString())
}

/**
 * Step 3: when the app loads after the ORCID redirect, the URL carries the `code`. Called at
 * the start of every refresh() attempt; exchanges the code for a session if present. Returns
 * true if it completed a login, so the normal refresh-token flow is skipped for this attempt.
 */
export async function tryCompleteOrcidLogin(signal?: GenericAbortSignal): Promise<boolean> {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  if (!code) return false

  // Remove the OAuth params from the URL so a reload doesn't try to reuse a spent code.
  const dirtyParams = ['code', 'error', 'error_description', 'state']
  dirtyParams.forEach((param) => url.searchParams.delete(param))
  window.history.replaceState({}, '', url.toString())

  try {
    const credentials: LoginWithOrcidDto = { authType: 'orcid', code, redirectUri: redirectUri() }
    await auth.login(credentials, signal)
    return true
  } catch (error) {
    if (error instanceof CanceledError) throw error
    // Fall through to a normal refresh-token attempt if the exchange failed.
    return false
  }
}
