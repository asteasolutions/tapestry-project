import { LoginWithBlueskyDto } from 'tapestry-shared/src/data-transfer/resources/dtos/session.js'
import { AuthProvider } from './index.js'
import { InvalidCredentialsError } from '../../errors/index.js'
import { updateUserIfExists } from '../index.js'
import { verifyBlueskyServiceToken } from '../bluesky.js'

export class BlueskyAuthProvider implements AuthProvider<LoginWithBlueskyDto> {
  async login({ serviceToken }: LoginWithBlueskyDto) {
    const identity = await verifyBlueskyServiceToken(serviceToken)

    if (!identity) {
      throw new InvalidCredentialsError()
    }

    return updateUserIfExists(
      { blueskyDid: identity.did },
      {
        blueskyDid: identity.did,
        givenName: identity.handle ?? identity.did,
        familyName: '',
        avatar: null,
      },
    )
  }
}
