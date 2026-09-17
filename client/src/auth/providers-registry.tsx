import { config } from '../config'
import { GoogleLoginButton } from './google/login-button'
import { IALoginButton } from './internet-archive/login-button'

export interface AuthProviderItem {
  id: string
  component: React.ComponentType<{ onSuccess?: () => void }>
}

const PROVIDER_MAP: Record<string, AuthProviderItem> = {
  google: { id: 'google', component: GoogleLoginButton },
  ia: { id: 'internet-archive', component: IALoginButton },
  // TODO: Add more providers here as needed
  // bluesky: { id: 'bluesky', component: BlueskyLoginButton },
  // wikimedia: { id: 'wikimedia', component: WikimediaLoginButton },
}

export const AUTH_PROVIDERS: AuthProviderItem[] = config.authProviders
  .map((id) => PROVIDER_MAP[id])
  .filter(Boolean)
