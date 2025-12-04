import '@dotenvx/dotenvx/config'
import z from 'zod/v4'
import { deepFreeze } from 'tapestry-core/src/utils.js'

const port = z.coerce.number<number>().int().min(0).max(65535)
const assertTrue = z
  .string()
  .transform((v) => v === 'true')
  .default(false)

export const config = deepFreeze(
  z
    .object({
      // DB
      DB_HOST: z.string(),
      DB_PORT: port.default(5432),
      DB_NAME: z.string(),
      DB_USER: z.string(),
      DB_PASS: z.string(),
      DB_LOG_LEVEL: z.string().default('query,error'),
      DB_USE_SSL: assertTrue,
      DATABASE_URL: z.string().nonempty(),

      // Server
      NODE_ENV: z.enum(['production', 'development', 'test']).catch('development'),
      SERVER_PORT: port.default(3000),
      SECRET_KEY: z.string(),
      GOOGLE_CLIENT_ID: z.string().default(''),
      IA_ACCOUNT_ID: z.string().default(''),
      IA_SECRET: z.string().default(''),
      WBM_RESPONSE_CACHE_DURATION: z.coerce.number().default(3600), // one hour in seconds
      ASSET_READ_URL_EXPIRES_IN: z.coerce.number().default(604_800), // on week in seconds
      ASSET_READ_URL_VALIDATION_EXPIRES_IN: z.coerce.number().default(600),
      EXTERNAL_SERVER_URL: z.string(),
      VIEWER_URL: z.string(),
      SECURE_COOKIE: z
        .string()
        .transform((v) => v !== 'false')
        .default(true),

      // AWS
      AWS_ENDPOINT_URL: z.string().default(''),
      AWS_ACCESS_KEY_ID: z.string().nullish(),
      AWS_SECRET_ACCESS_KEY: z.string().nullish(),
      AWS_REGION: z.string(),
      AWS_S3_BUCKET_NAME: z.string(),
      AWS_S3_FORCE_PATH_STYLE: assertTrue,

      // Redis
      REDIS_HOST: z.string().default('localhost'),
      REDIS_PORT: port.default(6379),
      REDIS_USE_TLS: assertTrue,

      // Worker
      PUPPETEER_ARGS: z.string().default(''),
      S3_CLEAN_UP_CRON_PATTERN: z.string().default('0 0 * * *'),
      TAPESTRY_THUMBNAIL_GENERATION_DELAY: z.coerce.number().default(150_000),
      // 5 minute timeout may look too long but some larger tapestries with a lot of iframes load slowly
      // so we better wait for a while in order to take a nicer screenshot.
      TAPESTRY_THUMBNAIL_GENERATION_TIMEOUT: z.coerce.number().default(300_000),
      ITEM_THUMBNAIL_GENERATION_DELAY: z.coerce.number().default(120_000),

      // Queue monitoring
      JOBS_ADMIN_NAME: z.string().nullish(),
      JOBS_ADMIN_PASSWORD: z.string().nullish(),

      VAULT_ADDR: z.string(),
      VAULT_ROLE_ID: z.string(),
      VAULT_SECRET_ID: z.string(),
    })
    .transform((input) => ({
      db: {
        host: input.DB_HOST,
        port: input.DB_PORT,
        name: input.DB_NAME,
        user: input.DB_USER,
        password: input.DB_PASS,
        logLevel: input.DB_LOG_LEVEL,
        useSsl: input.DB_USE_SSL,
        connectionString: input.DATABASE_URL,
      },
      server: {
        env: input.NODE_ENV,
        port: input.SERVER_PORT,
        secretKey: input.SECRET_KEY,
        googleClientId: input.GOOGLE_CLIENT_ID,
        assetReadUrlExpiresIn: input.ASSET_READ_URL_EXPIRES_IN,
        assetReadUrlValidationExpiresIn: input.ASSET_READ_URL_VALIDATION_EXPIRES_IN,
        externalUrl: input.EXTERNAL_SERVER_URL,
        viewerUrl: input.VIEWER_URL,
        ia: {
          accountId: input.IA_ACCOUNT_ID,
          secret: input.IA_SECRET,
        },
        secureCookie: input.SECURE_COOKIE,
        wbmResponseCacheDuration: input.WBM_RESPONSE_CACHE_DURATION,
      },
      vault: {
        endpoint: input.VAULT_ADDR,
        roleId: input.VAULT_ROLE_ID,
        secretId: input.VAULT_SECRET_ID,
      },
      aws: {
        endpointUrl: input.AWS_ENDPOINT_URL,
        accessKeyId: input.AWS_ACCESS_KEY_ID,
        secretAccessKey: input.AWS_SECRET_ACCESS_KEY,
        region: input.AWS_REGION,
        s3: {
          bucketName: input.AWS_S3_BUCKET_NAME,
          forcePathStyle: input.AWS_S3_FORCE_PATH_STYLE,
        },
      },
      redis: {
        host: input.REDIS_HOST,
        port: input.REDIS_PORT,
        useTls: input.REDIS_USE_TLS,
      },
      worker: {
        puppeteerArgs: input.PUPPETEER_ARGS,
        s3CleanupPattern: input.S3_CLEAN_UP_CRON_PATTERN,
        tapestryThumbnailGenerationDelay: input.TAPESTRY_THUMBNAIL_GENERATION_DELAY,
        tapestryThumbnailGenerationTimeout: input.TAPESTRY_THUMBNAIL_GENERATION_TIMEOUT,
        itemThumbnailGenerationDelay: input.ITEM_THUMBNAIL_GENERATION_DELAY,
        queueAdminName: input.JOBS_ADMIN_NAME,
        queueAdminPassword: input.JOBS_ADMIN_PASSWORD,
      },
    }))
    .parse(process.env),
)
