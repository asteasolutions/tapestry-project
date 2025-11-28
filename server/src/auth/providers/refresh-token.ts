import type { AuthProvider } from './index.js'
import { verifySessionJWT } from '../tokens.js'
import { SessionExpiredError } from '../../errors/index.js'

interface RefreshTokenCredentials {
  authType: 'refreshToken'
  refreshToken: string | undefined
}

export class RefreshTokenAuthProvider implements AuthProvider<RefreshTokenCredentials> {
  login({ refreshToken }: RefreshTokenCredentials) {
    if (!refreshToken) {
      throw new SessionExpiredError()
    }

    try {
      const payload = verifySessionJWT(refreshToken)
      return Promise.resolve(payload.userId)
    } catch {
      throw new SessionExpiredError()
    }
  }
}
