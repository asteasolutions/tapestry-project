import z from 'zod/v4'
import { auth } from '.'
import { AuthProviderEnum, config } from '../config'
import { GoogleLoginButton } from './google/login-button'
import { IALoginButton } from './internet-archive/login-button'
import { BlueskyLoginButton } from './bluesky/login-button'
import { tryCompleteBlueskyLogin } from './bluesky/oauth-client'

export interface AuthProviderItem {
  id: string
  component: React.ComponentType<{
    isSingleProvider?: boolean
  }>
  prepare?: () => void
  tryCompleteLogin?: () => Promise<boolean>
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
    tryCompleteLogin: tryCompleteBlueskyLogin,
  },
}

export const AUTH_PROVIDERS: AuthProviderItem[] = config.authProviders
  .map((id) => PROVIDER_MAP[id])
  .filter(Boolean)
