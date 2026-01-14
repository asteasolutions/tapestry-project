import * as Sentry from '@sentry/react'
import { config } from './config'

export const isSentryEnabled = !!config.sentryDsn

if (isSentryEnabled) {
  Sentry.init({
    dsn: config.sentryDsn,
    sendDefaultPii: true,
  })
}
