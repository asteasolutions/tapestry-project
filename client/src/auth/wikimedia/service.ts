import { config } from '../../config'
import { createOAuthClient } from '../oauth-clients'

const wikimedia = createOAuthClient({
  authType: 'wikimedia',
  authorizeUrl: `${config.wikimedia.baseUrl}/w/rest.php/oauth2/authorize`,
  clientId: config.wikimedia.clientId,
  redirectUri: config.wikimedia.redirectUri,
})

export const startWikimediaLogin = wikimedia.start
export const tryCompleteWikimediaLogin = wikimedia.tryCompleteLogin