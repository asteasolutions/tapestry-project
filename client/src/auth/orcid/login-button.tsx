import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { auth } from '..'
import { OrcidAuthService } from './service'

export function OrcidLoginButton() {
  function login() {
    if (auth instanceof OrcidAuthService) {
      // Redirects the window to ORCID; resolves only after navigation starts.
      void auth.login()
    }
  }

  return <Button onClick={login}>Sign in with ORCID</Button>
}
