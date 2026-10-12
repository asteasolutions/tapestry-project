import { IdResolver } from '@atproto/identity'
import { verifyJwt } from '@atproto/xrpc-server'
import { BLUESKY_LOGIN_LXM, blueskyServiceDid } from 'tapestry-shared/src/bluesky.js'
import { config } from '../config.js'
import { redis } from '../services/redis.js'

// Service auth tokens live for at most a minute when requested for a specific method,
// so we only need to remember the used token IDs for that long to prevent replays
const USED_TOKEN_LIFETIME = 2 * 60

const idResolver = new IdResolver()

const serviceDid = blueskyServiceDid(config.server.externalUrl)

export interface BlueskyIdentity {
  did: string
  handle: string | undefined
}

async function resolveHandle(did: string) {
  try {
    const { handle } = await idResolver.did.resolveAtprotoData(did)
    // The handle in the DID document is only valid if it resolves back to the same DID
    return (await idResolver.handle.resolve(handle)) === did ? handle : undefined
  } catch {
    return undefined
  }
}

/**
 * Verifies a service auth JWT which the user's PDS issued for us (via
 * com.atproto.server.getServiceAuth) and returns the identity of the user it was issued for.
 * The token is signed with the user's atproto signing key, which proves that the bearer has
 * an authenticated session with the user's PDS.
 */
export async function verifyBlueskyServiceToken(token: string): Promise<BlueskyIdentity | null> {
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

    return { did: payload.iss, handle: await resolveHandle(payload.iss) }
  } catch (error) {
    console.error('Error while verifying Bluesky service token', error)
    return null
  }
}
