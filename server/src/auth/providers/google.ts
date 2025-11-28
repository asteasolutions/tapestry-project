import { OAuth2Client, TokenPayload } from 'google-auth-library'
import { SessionCreateDto } from 'tapestry-shared/src/data-transfer/resources/dtos/session.js'
import { AuthProvider } from './index.js'
import { config } from '../../config.js'
import { InvalidCredentialsError } from '../../errors/index.js'
import { updateUserIfExists } from '../index.js'

const client = new OAuth2Client()

interface GSIUserData {
  gsiUserId: string
  email: string
  givenName: string
  familyName: string
  avatar: string | null
}

async function verifyGSIToken(token: string): Promise<GSIUserData> {
  let payload: TokenPayload
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: config.server.googleClientId,
    })

    payload = ticket.getPayload()!
  } catch {
    throw new InvalidCredentialsError()
  }

  return {
    gsiUserId: payload.sub,
    email: payload.email!,
    givenName: payload.given_name!,
    familyName: payload.family_name ?? '',
    avatar: payload.picture ?? null,
  }
}

type GoogleCredentials = SessionCreateDto & { authType: 'gsi' }

export class GoogleAuthProvider implements AuthProvider<GoogleCredentials> {
  async login({ gsiCredential }: GoogleCredentials) {
    const gsiUserData = await verifyGSIToken(gsiCredential)

    return updateUserIfExists({ gsiUserId: gsiUserData.gsiUserId }, gsiUserData)
  }
}
