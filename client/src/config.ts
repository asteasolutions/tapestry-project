import { deepFreeze } from 'tapestry-core/src/utils'
import { z } from 'zod/v4'

export const config = deepFreeze(
  z
    .object({
      VITE_API_URL: z.string(),
      VITE_AUTH_PROVIDER: z.enum(['ia', 'google']).catch('google'),
      VITE_GOOGLE_CLIENT_ID: z.string(),
      VITE_BUG_REPORT_FORM_URL: z.string(),
      VITE_AI_CHAT_EXPIRES_IN: z.coerce.number().default(3600), // default: one hour
      VITE_WEBPAGE_LOADER_TIMEOUT: z.coerce.number().int().nonnegative().default(3),
      VITE_WBM_SNAPSHOT_POLLING_PERIOD: z.coerce.number().default(600), // default: ten minutes
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
    .parse(import.meta.env),
)
