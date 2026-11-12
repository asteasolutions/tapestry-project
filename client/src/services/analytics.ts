import { init, track } from '@plausible-analytics/tracker'
import { config } from '../config'

const ALLOWED_QUERY_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'ref',
  'source',
])

export type ClickTarget =
  | 'Header Gallery'
  | 'Landing Join a circle'
  | 'Landing Explore the public gallery'
  | 'Landing Watch demo'
  | 'Landing Reach out'
  | 'Landing View GitHub repo'
  | 'Landing Contact'
  | 'Landing As We May Think'
  | 'Landing Internet Archive'

export type AnalyticsEvent = `Click: ${ClickTarget}` | 'Sign up cancelled' | 'Sign up completed'

export const isAnalyticsEnabled = !!config.plausibleDomain

export function trackEvent(name: AnalyticsEvent) {
  if (!isAnalyticsEnabled) return
  track(name, {})
}

export function clickTracking(target: ClickTarget) {
  return { 'data-analytics-click': target }
}

function sanitizeUrl(href: string) {
  try {
    const url = new URL(href)
    for (const param of [...url.searchParams.keys()]) {
      if (!ALLOWED_QUERY_PARAMS.has(param)) {
        url.searchParams.delete(param)
      }
    }
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

if (isAnalyticsEnabled) {
  init({
    domain: config.plausibleDomain,
    outboundLinks: true,
    transformRequest: (payload) => {
      const u = sanitizeUrl(payload.u)
      if (!u) {
        return null
      }
      return { ...payload, u, r: payload.r && sanitizeUrl(payload.r) }
    },
  })

  document.addEventListener(
    'click',
    (event) => {
      const target = (event.target as Element | null)?.closest<HTMLElement>(
        '[data-analytics-click]',
      )
      const name = target?.dataset.analyticsClick
      if (name) {
        trackEvent(`Click: ${name as ClickTarget}`)
      }
    },
    { capture: true },
  )
}
