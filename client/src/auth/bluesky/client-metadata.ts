import type { OAuthClientMetadataInput } from '@atproto/oauth-client-browser'
import { BLUESKY_LOGIN_LXM } from 'tapestry-shared/src/bluesky'

export const BLUESKY_SCOPE = `atproto rpc:${BLUESKY_LOGIN_LXM}?aud=*`

/**
 * The OAuth client metadata for the deployed client.
 */
export function blueskyClientMetadata(
  client_id: string,
  redirectUri: string,
): OAuthClientMetadataInput {
  const origin = new URL(client_id).origin
  return {
    client_id: client_id,
    client_name: 'Tapestries',
    client_uri: origin,
    redirect_uris: [redirectUri],
    scope: BLUESKY_SCOPE,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    application_type: 'web',
    token_endpoint_auth_method: 'none',
    dpop_bound_access_tokens: true,
  }
}
