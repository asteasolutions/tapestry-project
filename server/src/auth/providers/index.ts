import { SessionCreateDto } from 'tapestry-shared/src/data-transfer/resources/dtos/session.js'
import { BadRequestError } from '../../errors/index.js'
import { RefreshTokenAuthProvider } from './refresh-token.js'
import { GoogleAuthProvider } from './google.js'
import { config } from '../../config.js'
import { IACookiesAuthProvider, IACredentialsAuthProvider } from './internet-archive.js'
import { Response } from 'express'
import { RegisterUserAuthProvider } from './register-user.js'

export interface AuthProvider<Credentials extends SessionCreateDto> {
  login(params: Credentials, response: Response): Promise<string>
}

class UnsupportedAuthProvider implements AuthProvider<SessionCreateDto> {
  login(_: SessionCreateDto): Promise<string> {
    throw new BadRequestError('Unsupported authentication type')
  }
}
const unsupported = new UnsupportedAuthProvider()

export const AUTH_PROVIDERS = {
  refreshToken: new RefreshTokenAuthProvider(),
  gsi: config.server.googleClientId ? new GoogleAuthProvider() : unsupported,
  iaCookies: config.server.ia.accountId ? new IACookiesAuthProvider() : unsupported,
  iaCredentials: new IACredentialsAuthProvider(),
  registerUser: new RegisterUserAuthProvider(),
} satisfies Record<SessionCreateDto['authType'], AuthProvider<SessionCreateDto>>
