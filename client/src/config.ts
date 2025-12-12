import { NullishInt } from 'tapestry-core/src/data-format/schemas/common'
import { deepFreeze } from 'tapestry-core/src/utils'
import { treeifyError, z } from 'zod/v4'

const parsedConfig = deepFreeze(
  z
    .object({
      VITE_API_URL: z.string(),
      VITE_AUTH_PROVIDER: z.enum(['ia', 'google']).catch('google'),
      VITE_GOOGLE_CLIENT_ID: z.string(),
      VITE_BUG_REPORT_FORM_URL: z.string(),
      VITE_AI_CHAT_EXPIRES_IN: NullishInt(3600), // default: one hour
      VITE_WEBPAGE_LOADER_TIMEOUT: NullishInt(3, (schema) => schema.nonnegative()),
      VITE_WBM_SNAPSHOT_POLLING_PERIOD: NullishInt(600), // default: ten minutes
      VITE_STUN_SERVER: z.string(),
    })
    .transform((input) => ({
      apiUrl: input.VITE_API_URL,
      authProvider: input.VITE_AUTH_PROVIDER,
      googleClientId: input.VITE_GOOGLE_CLIENT_ID,
      bugReportFormUrl: input.VITE_BUG_REPORT_FORM_URL,
      aiChatExpiresIn: input.VITE_AI_CHAT_EXPIRES_IN,
      webpageLoaderTimeout: input.VITE_WEBPAGE_LOADER_TIMEOUT,
      wbmSnapshotPollingPeriod: input.VITE_WBM_SNAPSHOT_POLLING_PERIOD,
      stunServer: input.VITE_STUN_SERVER,
    }))
    .safeParse(import.meta.env),
)

if (parsedConfig.error) {
  console.error('Error in config', treeifyError(parsedConfig.error))
  throw parsedConfig.error
}

export const config = parsedConfig.data
