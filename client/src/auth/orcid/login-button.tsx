import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { startOrcidLogin } from './service'

export function OrcidLoginButton() {
  return <Button onClick={startOrcidLogin}>Sign in with ORCID</Button>
}
