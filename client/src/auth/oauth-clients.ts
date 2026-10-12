import { auth } from '.'

type OAuthAuthType = 'orcid' | 'wikimedia'

interface OAuthClientOptions {
  authType: OAuthAuthType
  authorizeUrl: string
  clientId: string
  scope?: string
  redirectUri: string
}

const OAUTH_PARAMS = ['code', 'error', 'error_description', 'state']
const nonceKey = (authType: OAuthAuthType) => `oauth-nonce:${authType}`

export function createOAuthClient({
  authType,
  authorizeUrl,
  clientId,
  scope,
  redirectUri,
}: OAuthClientOptions) {
  const getRedirectUri = () => redirectUri || `${window.location.origin}/`
  let pending: Promise<boolean> | null = null

  function start() {
    const nonce = crypto.randomUUID()
    sessionStorage.setItem(nonceKey(authType), nonce)

    const url = new URL(authorizeUrl)
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: getRedirectUri(),
      state: `${authType}:${nonce}`,
    })
    if (scope) params.set('scope', scope)
    url.search = params.toString()

    window.location.assign(url.toString())
  }

  async function exchange(code: string, nonce: string | undefined): Promise<boolean> {
    const expectedNonce = sessionStorage.getItem(nonceKey(authType))
    sessionStorage.removeItem(nonceKey(authType))
    if (!nonce || nonce !== expectedNonce) return false

    try {
      await auth.login({ authType, code, redirectUri: getRedirectUri() })
      return true
    } catch (error) {
      console.error('[oauth] login failed', error)
      return false
    }
  }

  function tryCompleteLogin(): Promise<boolean> {
    if (pending) return pending

    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    const [stateAuthType, nonce] = (url.searchParams.get('state') ?? '').split(':')

    if (!code || stateAuthType !== authType) return Promise.resolve(false)

    OAUTH_PARAMS.forEach((param) => url.searchParams.delete(param))
    window.history.replaceState({}, '', url.toString())

    pending = exchange(code, nonce)
    return pending
  }

  return { start, tryCompleteLogin }
}