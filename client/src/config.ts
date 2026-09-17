import { OptionalInt } from 'tapestry-core/src/data-format/schemas/common'
import { deepFreeze } from 'tapestry-core/src/utils'
import { treeifyError, z } from 'zod/v4'

const parsedConfig = deepFreeze(
  z
    .object({
      VITE_API_URL: z.string(),
      VITE_GOOGLE_CLIENT_ID: z.string(),
      VITE_AUTH_PROVIDERS: z.string().default('google,ia'), // default: both Google and Internet Archive
      VITE_BUG_REPORT_FORM_URL: z.string(),
      VITE_AI_CHAT_EXPIRES_IN: OptionalInt(3600), // default: one hour
      VITE_WEBPAGE_LOADER_TIMEOUT: OptionalInt(3, (schema) => schema.nonnegative()),
      VITE_WBM_SNAPSHOT_POLLING_PERIOD: OptionalInt(600), // default: ten minutes
      VITE_STUN_SERVER: z.string(),
      VITE_SENTRY_DSN: z.string().default(''),
    })
    .transform((input) => ({
      apiUrl: input.VITE_API_URL,
      googleClientId: input.VITE_GOOGLE_CLIENT_ID,
      authProviders: input.VITE_AUTH_PROVIDERS.split(',')
        .map((p) => p.trim().toLowerCase())
        .filter(Boolean),
      bugReportFormUrl: input.VITE_BUG_REPORT_FORM_URL,
      aiChatExpiresIn: input.VITE_AI_CHAT_EXPIRES_IN,
      webpageLoaderTimeout: input.VITE_WEBPAGE_LOADER_TIMEOUT,
      wbmSnapshotPollingPeriod: input.VITE_WBM_SNAPSHOT_POLLING_PERIOD,
      stunServer: input.VITE_STUN_SERVER,
      sentryDsn: input.VITE_SENTRY_DSN,
    }))
    .safeParse(import.meta.env),
)

if (parsedConfig.error) {
  console.error('Error in config', treeifyError(parsedConfig.error))
  throw parsedConfig.error
}

export const config = parsedConfig.data
