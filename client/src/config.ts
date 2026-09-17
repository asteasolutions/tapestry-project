import { OptionalInt } from 'tapestry-core/src/data-format/schemas/common'
import { deepFreeze } from 'tapestry-core/src/utils'
import { treeifyError, z } from 'zod/v4'

const parsedConfig = deepFreeze(
  z
    .object({
      VITE_API_URL: z.string(),
      VITE_AUTH_PROVIDER: z.enum(['ia', 'google', 'orcid']).catch('google'),
      VITE_GOOGLE_CLIENT_ID: z.string(),
      VITE_ORCID_CLIENT_ID: z.string().default(''),
      VITE_ORCID_BASE_URL: z.string().default('https://orcid.org'),
      // Optional override for the OAuth callback URL. Must match a redirect URI registered
      // with ORCID. Defaults to the app's own origin at runtime when left blank.
      VITE_ORCID_REDIRECT_URI: z.string().default(''),
      VITE_BUG_REPORT_FORM_URL: z.string(),
      VITE_AI_CHAT_EXPIRES_IN: OptionalInt(3600), // default: one hour
      VITE_WEBPAGE_LOADER_TIMEOUT: OptionalInt(3, (schema) => schema.nonnegative()),
      VITE_WBM_SNAPSHOT_POLLING_PERIOD: OptionalInt(600), // default: ten minutes
      VITE_STUN_SERVER: z.string(),
      VITE_SENTRY_DSN: z.string().default(''),
    })
    .transform((input) => ({
      apiUrl: input.VITE_API_URL,
      authProvider: input.VITE_AUTH_PROVIDER,
      googleClientId: input.VITE_GOOGLE_CLIENT_ID,
      orcid: {
        clientId: input.VITE_ORCID_CLIENT_ID,
        baseUrl: input.VITE_ORCID_BASE_URL,
        redirectUri: input.VITE_ORCID_REDIRECT_URI,
      },
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
