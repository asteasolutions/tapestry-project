import { config } from '../../config'
import { createOAuthClient } from '../oauth-clients'

const orcid = createOAuthClient({
  authType: 'orcid',
  authorizeUrl: `${config.orcid.baseUrl}/oauth/authorize`,
  clientId: config.orcid.clientId,
  scope: '/authenticate',
  redirectUri: config.orcid.redirectUri,
})

export const startOrcidLogin = orcid.start
export const tryCompleteOrcidLogin = orcid.tryCompleteLogin
