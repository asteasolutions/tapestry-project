import { LoginWithOrcidDto } from 'tapestry-shared/src/data-transfer/resources/dtos/session'
import { config } from '../../config'
import { AuthService } from '../../services/auth'
import { CanceledError, GenericAbortSignal } from 'axios'

/**
 * ORCID uses a standard OAuth2 authorization-code flow (unlike Google's in-page popup):
 *  1. We redirect the whole window to ORCID's authorize endpoint.
 *  2. ORCID redirects back to our `redirectUri` with a `?code=...` query parameter.
 *  3. We hand that code to our server, which exchanges it for the authenticated ORCID iD.
 *
 * See https://info.orcid.org/documentation/api-tutorials/api-tutorial-get-and-authenticated-orcid-id/
 */
function redirectUri() {
  return config.orcid.redirectUri || `${window.location.origin}/`
}

export class OrcidAuthService extends AuthService<LoginWithOrcidDto> {
  /** Step 1: send the user to ORCID to authenticate. */
  login() {
    const authorizeUrl = new URL(`${config.orcid.baseUrl}/oauth/authorize`)
    authorizeUrl.search = new URLSearchParams({
      client_id: config.orcid.clientId,
      response_type: 'code',
      scope: '/authenticate',
      redirect_uri: redirectUri(),
    }).toString()

    window.location.assign(authorizeUrl.toString())
    return Promise.resolve()
  }

  /**
   * Step 3: when the app loads after the ORCID redirect, the URL carries the `code`.
   * Exchange it for a session here so it runs on the normal startup refresh path.
   */
  async refresh(loadUser?: boolean, signal?: GenericAbortSignal) {
    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')

    if (code) {
      // Remove the OAuth params from the URL so a reload doesn't try to reuse a spent code.
      const dirtyParams = ['code', 'error', 'error_description', 'state']
      dirtyParams.forEach((param) => url.searchParams.delete(param))
      window.history.replaceState({}, '', url.toString())

      try {
        await this.doLogin({ authType: 'orcid', code, redirectUri: redirectUri() }, true, signal)
        return
      } catch (error) {
        if (error instanceof CanceledError) {
          throw error
        }
        // Fall through to a normal refresh-token attempt if the exchange failed.
      }
    }

    await super.refresh(loadUser, signal)
  }
}
