import { isUniqueConstraintViolation, prisma } from '../../db.js'
import { BadRequestError, SessionExpiredError } from '../../errors/index.js'
import { verifyRegisterJWT } from '../tokens.js'
import { AuthProvider } from './index.js'

interface RegisterUserCredentials {
  authType: 'registerUser'
  registrationToken: string | undefined
  username: string
}

export class RegisterUserAuthProvider implements AuthProvider<RegisterUserCredentials> {
  async login({ registrationToken, username }: RegisterUserCredentials) {
    if (!registrationToken) {
      throw new SessionExpiredError()
    }

    try {
      const payload = verifyRegisterJWT(registrationToken)
      const user = await prisma.user.create({ data: { ...payload, username } })
      return user.id
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new BadRequestError({
          formErrors: [],
          fieldErrors: { username: { code: 'unique-violation' } },
        })
      }
      throw new SessionExpiredError()
    }
  }
}
