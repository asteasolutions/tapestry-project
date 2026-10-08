import z from 'zod/v4'
import { auth } from '.'
import { AuthProviderEnum, config } from '../config'
import { GoogleLoginButton } from './google/login-button'
import { IALoginButton } from './internet-archive/login-button'
import { BlueskyLoginButton } from './bluesky/login-button'
import { blueskyRedirect } from './bluesky/redirect'
import { SessionCreateDto } from 'tapestry-shared/src/data-transfer/resources/dtos/session'

export interface AuthProviderItem {
  id: string
  component: React.ComponentType<{
    isSingleProvider?: boolean
  }>
  /**
   * May return credentials from a redirect-based login flow,
   * which will then be used instead of refreshing the current session.
   */
  prepare?: () => SessionCreateDto | void
}
type AuthProvider = z.infer<typeof AuthProviderEnum>

const PROVIDER_MAP: Record<AuthProvider, AuthProviderItem> = {
  google: {
    id: 'google',
    component: GoogleLoginButton,
    prepare: () => {
      if (typeof window.google.accounts.id !== 'undefined') {
        window.google.accounts.id.initialize({
          client_id: config.googleClientId,
          context: 'signin',
          ux_mode: 'popup',
          callback: async (response: { credential: string }) => {
            await auth.login({ authType: 'gsi', gsiCredential: response.credential })
          },
          auto_select: true,
          itp_support: true,
          use_fedcm_for_prompt: true,
        })
      }
    },
  },
  ia: { id: 'internet-archive', component: IALoginButton },
  bluesky: {
    id: 'bluesky',
    component: BlueskyLoginButton,
    prepare: () => {
      if (blueskyRedirect.failed) {
        auth.setLoginError('Bluesky login failed. Please try again.')
      } else if (blueskyRedirect.code) {
        return { authType: 'bluesky', code: blueskyRedirect.code }
      }
    },
  },
  // TODO: Add more providers here as needed
  // wikimedia: { id: 'wikimedia', component: WikimediaLoginButton },
}

export const AUTH_PROVIDERS: AuthProviderItem[] = config.authProviders
  .map((id) => PROVIDER_MAP[id])
  .filter(Boolean)
