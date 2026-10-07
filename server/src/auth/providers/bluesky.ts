import { LoginWithBlueskyDto } from 'tapestry-shared/src/data-transfer/resources/dtos/session.js'
import { AuthProvider } from './index.js'
import { InvalidCredentialsError } from '../../errors/index.js'
import { updateUserIfExists } from '../index.js'
import { consumeBlueskyLoginCode } from '../bluesky.js'

const HANDLE_INVALID = 'handle.invalid'

type BlueskyCredentials = LoginWithBlueskyDto & { nonce: string | undefined }

export class BlueskyAuthProvider implements AuthProvider<BlueskyCredentials> {
  async login({ code, nonce }: BlueskyCredentials) {
    const data = await consumeBlueskyLoginCode(code)

    // The nonce binds the login code to the browser which initiated the authorization
    if (!data || !nonce || data.nonce !== nonce) {
      throw new InvalidCredentialsError()
    }

    return updateUserIfExists(
      { blueskyDid: data.did },
      {
        blueskyDid: data.did,
        givenName: data.handle === HANDLE_INVALID ? data.did : data.handle,
        familyName: '',
        avatar: null,
      },
    )
  }
}
