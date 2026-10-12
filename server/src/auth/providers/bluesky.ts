import { Response } from 'express'
import { LoginWithBlueskyDto } from 'tapestry-shared/src/data-transfer/resources/dtos/session.js'
import { AuthProvider } from './index.js'
import { InvalidCredentialsError } from '../../errors/index.js'
import { findUserIdOrStartRegistration } from '../index.js'
import { verifyBlueskyServiceToken } from '../bluesky.js'

export class BlueskyAuthProvider implements AuthProvider<LoginWithBlueskyDto> {
  async login({ serviceToken }: LoginWithBlueskyDto, response: Response) {
    const identity = await verifyBlueskyServiceToken(serviceToken)

    if (!identity) {
      throw new InvalidCredentialsError()
    }

    const { did, handle } = identity
    return findUserIdOrStartRegistration({ blueskyDid: did }, { blueskyDid: did }, response, {
      // Bluesky handles are domain names, e.g. "alice.bsky.social"
      usernameSuggestion: handle?.split('.')[0] ?? '',
    })
  }
}
