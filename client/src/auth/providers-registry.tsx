import { GoogleLoginButton } from './google/login-button'
import { IALoginButton } from './internet-archive/login-button'

export interface AuthProviderItem {
  id: string
  component: React.ComponentType<{ onSuccess?: () => void }>
}

export const AUTH_PROVIDERS: AuthProviderItem[] = [
  {
    id: 'google',
    component: GoogleLoginButton,
  },
  {
    id: 'internet-archive',
    component: IALoginButton,
  },
  // TODO: Add more providers here as needed
  // { id: 'bluesky', component: BlueskyLoginButton },
  // { id: 'wikimedia', component: WikimediaLoginButton },
]
