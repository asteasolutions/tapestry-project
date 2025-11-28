import { LoginWithGoogleDto } from 'tapestry-shared/src/data-transfer/resources/dtos/session'
import { config } from '../../config'
import { AuthService } from '../../services/auth'

interface GSILoginResponse {
  credential: string
}

export class GoogleAuthService extends AuthService<LoginWithGoogleDto> {
  doPrepare() {
    const callback: (response: GSILoginResponse) => Promise<void> = async (response) => {
      await this.doLogin({ authType: 'gsi', gsiCredential: response.credential }, true)
    }

    window.google.accounts.id.initialize({
      client_id: config.googleClientId,
      context: 'signin',
      ux_mode: 'popup',
      callback,
      auto_select: true,
      itp_support: true,
      use_fedcm_for_prompt: true,
    })
  }
}
