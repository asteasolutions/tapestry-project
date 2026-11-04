import { init, track } from '@plausible-analytics/tracker'
import { config } from '../config'

export type ClickTarget =
  | 'Header Gallery'
  | 'Landing Join a circle'
  | 'Landing Explore the public gallery'
  | 'Landing Watch demo'
  | 'Landing Reach out'
  | 'Landing View GitHub repo'
  | 'Landing Contact'

export type AnalyticsEvent = `Click: ${ClickTarget}` | 'Sign up cancelled' | 'Sign up completed'

export const isAnalyticsEnabled = !!config.plausibleDomain

export function trackEvent(name: AnalyticsEvent) {
  if (!isAnalyticsEnabled) return
  track(name, {})
}

export function clickTracking(target: ClickTarget) {
  return { 'data-analytics-click': target }
}

if (isAnalyticsEnabled) {
  init({
    domain: config.plausibleDomain,
    outboundLinks: true,
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
