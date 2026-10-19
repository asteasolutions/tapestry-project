import { Response } from 'express'
import { LoginWithBlueskyDto } from 'tapestry-shared/src/data-transfer/resources/dtos/session.js'
import { AuthProvider } from './index.js'
import { InvalidCredentialsError } from '../../errors/index.js'
import { findUserIdOrStartRegistration } from '../index.js'
import { IdResolver } from '@atproto/identity'
import { verifyJwt } from '@atproto/xrpc-server'
import { BLUESKY_LOGIN_LXM, blueskyServiceDid } from 'tapestry-shared/src/bluesky.js'
import { config } from '../../config.js'
import { redis } from '../../services/redis.js'

const USED_TOKEN_LIFETIME = 2 * 60

const idResolver = new IdResolver()
const serviceDid = blueskyServiceDid(config.server.externalUrl)

interface BlueskyIdentity {
  did: string
  handle: string | undefined
}

async function verifyBlueskyServiceToken(token: string): Promise<BlueskyIdentity | null> {
  try {
    const payload = await verifyJwt(token, serviceDid, BLUESKY_LOGIN_LXM, (iss, forceRefresh) =>
      idResolver.did.resolveAtprotoKey(iss, forceRefresh),
    )

    if (!payload.jti || payload.iss.includes('#')) return null

    const isFirstUse = await redis.set(
      `bluesky-service-token:${payload.jti}`,
      '1',
      'EX',
      USED_TOKEN_LIFETIME,
      'NX',
    )
    if (!isFirstUse) return null

    return {
      did: payload.iss,
      handle: (await idResolver.did.resolveAtprotoData(payload.iss)).handle,
    }
  } catch {
    throw new InvalidCredentialsError()
  }
}

export class BlueskyAuthProvider implements AuthProvider<LoginWithBlueskyDto> {
  async login({ serviceToken }: LoginWithBlueskyDto, response: Response) {
    const identity = await verifyBlueskyServiceToken(serviceToken)

    if (!identity) {
      throw new InvalidCredentialsError()
    }

    const { did, handle } = identity
    return findUserIdOrStartRegistration({ blueskyDid: did }, { blueskyDid: did }, response, {
      usernameSuggestion: handle?.split('.')[0] ?? '',
    })
  }
}
