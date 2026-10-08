const CODE_PARAM = 'bluesky-login-code'
const ERROR_PARAM = 'bluesky-login-error'

function consumeRedirectParams() {
  const url = new URL(window.location.href)
  const code = url.searchParams.get(CODE_PARAM)
  const failed = url.searchParams.has(ERROR_PARAM)

  if (code !== null || failed) {
    url.searchParams.delete(CODE_PARAM)
    url.searchParams.delete(ERROR_PARAM)
    window.history.replaceState(window.history.state, '', url)
  }

  return { code, failed }
}

export const blueskyRedirect = consumeRedirectParams()
