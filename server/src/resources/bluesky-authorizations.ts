import { randomBytes } from 'crypto'
import { Resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { RESTResourceImpl } from './base-resource.js'
import { createBlueskyAuthorizationUrl } from '../auth/bluesky.js'
import { BLUESKY_NONCE_COOKIE_NAME } from '../auth/index.js'
import { InvalidCredentialsError } from '../errors/index.js'
import { SECURE_COOKIE_OPTIONS } from './sessions.js'

const NONCE_EXP = 10 * 60 * 1000

export const blueskyAuthorizations: RESTResourceImpl<Resources['blueskyAuthorizations'], never> = {
  accessPolicy: {
    canCreate: () => Promise.resolve(true),
  },

  handlers: {
    create: async ({ body: { handle, returnTo } }, { rawResponse }) => {
      const nonce = randomBytes(32).toString('base64url')

      let authorizationUrl: URL
      try {
        authorizationUrl = await createBlueskyAuthorizationUrl(handle, nonce, returnTo)
      } catch (error) {
        console.error('Error while initiating Bluesky authentication', error)
        throw new InvalidCredentialsError('Invalid Bluesky handle', 'InvalidBlueskyHandle')
      }

      rawResponse.cookie(BLUESKY_NONCE_COOKIE_NAME, nonce, {
        ...SECURE_COOKIE_OPTIONS,
        maxAge: NONCE_EXP,
      })

      return { authorizationUrl: authorizationUrl.href }
    },
  },
}
