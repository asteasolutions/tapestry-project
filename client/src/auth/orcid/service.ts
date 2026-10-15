import { config } from '../../config'
import { createOAuthClient } from '../oauth-clients'

export const orcidClient = createOAuthClient({
  authType: 'orcid',
  authorizeUrl: `${config.orcid.baseUrl}/oauth/authorize`,
  clientId: config.orcid.clientId,
  scope: '/authenticate',
  redirectUri: config.redirectUri,
})
