import * as Sentry from '@sentry/node'
import { config } from './config'

export const isSentryEnabled = !!config.sentry.dsn

if (isSentryEnabled) {
  Sentry.init({
    dsn: config.sentry.dsn,
    sendDefaultPii: true,
  })
}
