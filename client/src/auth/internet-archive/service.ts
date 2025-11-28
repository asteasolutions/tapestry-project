import { LoginWithIACredentialsDto } from 'tapestry-shared/src/data-transfer/resources/dtos/session'
import { AuthService } from '../../services/auth'
import { CanceledError, GenericAbortSignal } from 'axios'

export class IAAuthService extends AuthService<LoginWithIACredentialsDto> {
  async login(credentials: LoginWithIACredentialsDto, signal?: GenericAbortSignal) {
    await this.doLogin(credentials, true, signal)
  }

  async refresh(loadUser?: boolean, signal?: GenericAbortSignal) {
    try {
      await super.refresh(loadUser, signal)
    } catch (error) {
      if (!(error instanceof CanceledError) && loadUser && !this.value.user) {
        await this.doLogin({ authType: 'iaCookies' }, true, signal)
      } else {
        throw error
      }
    }
  }
}
