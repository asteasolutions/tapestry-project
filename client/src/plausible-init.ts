import { init } from '@plausible-analytics/tracker'
import { config } from './config'

export const isPlausibleEnabled = !!config.plausibleDomain

if (isPlausibleEnabled) {
  init({
    domain: config.plausibleDomain,
    outboundLinks: true,
    fileDownloads: true,
    // Lets you verify tracking locally by setting VITE_PLAUSIBLE_DOMAIN in client/.env.
    captureOnLocalhost: import.meta.env.DEV,
  })
}
