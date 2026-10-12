import type { OAuthClientMetadataInput } from '@atproto/oauth-client-browser'
import { BLUESKY_LOGIN_LXM } from 'tapestry-shared/src/bluesky'

export const BLUESKY_SCOPE = `atproto rpc:${BLUESKY_LOGIN_LXM}?aud=*`

export const CLIENT_METADATA_PATH = '/oauth-client-metadata.json'

/**
 * The OAuth client metadata for the deployed client. It is served as a static file at
 * CLIENT_METADATA_PATH (see vite.config.ts), and its URL is used as the client ID.
 */
export function blueskyClientMetadata(publicUrl: string): OAuthClientMetadataInput {
  const origin = new URL(publicUrl).origin
  return {
    client_id: `${origin}${CLIENT_METADATA_PATH}`,
    client_name: 'Tapestries',
    client_uri: origin,
    redirect_uris: [`${origin}/`],
    scope: BLUESKY_SCOPE,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    application_type: 'web',
    token_endpoint_auth_method: 'none',
    dpop_bound_access_tokens: true,
  }
}
