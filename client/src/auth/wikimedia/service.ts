import { config } from '../../config'
import { createOAuthClient } from '../oauth-clients'

export const wikimediaClient = createOAuthClient({
  authType: 'wikimedia',
  authorizeUrl: `${config.wikimedia.baseUrl}/w/rest.php/oauth2/authorize`,
  clientId: config.wikimedia.clientId,
  redirectUri: config.wikimedia.redirectUri,
})
