import { AuthProvider } from './index.js'
import { config } from '../../config.js'
import z, { ZodType } from 'zod/v4'
import { InvalidCredentialsError, ServerError } from '../../errors/index.js'
import { LoginWithIACredentialsDto } from 'tapestry-shared/src/data-transfer/resources/dtos/session.js'
import { Response } from 'express'
import { ErrorReason } from 'tapestry-shared/src/data-transfer/resources/dtos/errors.js'
import { updateUserIfExists } from '../index.js'

const IA_XAUTHN_URL = 'https://archive.org/services/xauthn/'
const IA_IMG_URL = 'https://archive.org/services/img/'

type XauthnOpName = 'identify' | 'login'

interface IARequestTypeMap {
  identify: {
    access: string
    secret: string
    cookie: {
      'logged-in-sig': string
      'logged-in-user': string
    }
  }
  login: {
    email: string
    password: string
  }
}

const BaseIAUserDataSchema = z.object({
  email: z.string(),
  itemname: z.string(),
  screenname: z.string(),
})

function createIAResponseSchema<T extends ZodType, U extends ZodType>(
  successSchema: T,
  failureSchema: U,
) {
  return z.discriminatedUnion('success', [
    z.object({
      success: z.literal(true),
      version: z.number(),
      values: successSchema,
    }),
    z.object({
      success: z.literal(false),
      version: z.number(),
      error: z.string().optional(),
      values: failureSchema.optional(),
    }),
  ])
}

const failureMessages: Record<
  string,
  { message?: string; reason?: Extract<ErrorReason, 'IAAccountNotAccessible'> } | undefined
> = {
  account_locked: {
    message: 'Internet Archive account not accessible',
    reason: 'IAAccountNotAccessible',
  },
  account_not_verified: {
    message: 'Internet Archive account not accessible',
    reason: 'IAAccountNotAccessible',
  },
  account_bad_password: {},
  account_not_found: {},
}

const IA_RESPONSE_SCHEMAS = {
  identify: createIAResponseSchema(
    z.object({
      ...BaseIAUserDataSchema.shape,
      privs: z.string().array(),
      has_disability_access: z.boolean(),
    }),
    z.undefined(),
  ),
  login: createIAResponseSchema(
    z.object({
      ...BaseIAUserDataSchema.shape,
      cookies: z.object({
        'logged-in-user': z.string(),
        'logged-in-sig': z.string(),
      }),
      s3: z.object({
        access: z.string(),
        secret: z.string(),
      }),
    }),
    z.object({
      reason: z.string(),
    }),
  ),
} satisfies Record<XauthnOpName, ZodType>

async function authenticateWithIA<Op extends XauthnOpName>(
  op: Op,
  body: IARequestTypeMap[Op],
  clientResponse: Response,
) {
  const responseSchema = IA_RESPONSE_SCHEMAS[op]
  let parsedResponse: ReturnType<typeof responseSchema.parse>
  let iaResponse: globalThis.Response

  try {
    const url = new URL(IA_XAUTHN_URL)
    url.searchParams.set('op', op)
    iaResponse = await fetch(url, {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const jsonResponse = await iaResponse.json()
    parsedResponse = responseSchema.parse(jsonResponse)
  } catch (error) {
    console.error('Error while performing IA authentication', error)
    throw new ServerError(undefined, 'IANotAccessible')
  }

  if (parsedResponse.success) {
    const { email, itemname, screenname } = parsedResponse.values

    // If IA returns Set-Cookie headers, forward them back to the client so that we can initiate the IA session.
    // This will only work if Tapestries is deployed on the same domain as the Archive, for example on
    // https://tapestries.archive.org. Otherwise the browser blocks the Set-Cookie attempt.
    iaResponse.headers.getSetCookie().forEach((cookie) => {
      clientResponse.appendHeader('Set-Cookie', cookie)
    })

    return updateUserIfExists(
      { email },
      {
        email,
        givenName: screenname,
        familyName: '',
        avatar: `${IA_IMG_URL}/${itemname}`,
      },
    )
  } else if (op === 'login' && parsedResponse.values) {
    const { reason } = parsedResponse.values
    const errorResponse = failureMessages[reason] ?? {}
    throw new InvalidCredentialsError(errorResponse.message, errorResponse.reason)
  } else if (op === 'identify') {
    throw new InvalidCredentialsError('Invalid Internet Archive session', 'InvalidIASession')
  }

  throw new InvalidCredentialsError()
}

interface IACookies {
  authType: 'iaCookies'
  sigCookie?: string
  userCookie?: string
}

export class IACookiesAuthProvider implements AuthProvider<IACookies> {
  async login({ sigCookie, userCookie }: IACookies, response: Response) {
    if (!sigCookie || !userCookie) {
      throw new InvalidCredentialsError('Invalid Internet Archive session', 'InvalidIASession')
    }

    return authenticateWithIA(
      'identify',
      {
        access: config.server.ia.accountId,
        secret: config.server.ia.secret,
        cookie: {
          'logged-in-sig': sigCookie,
          'logged-in-user': userCookie,
        },
      },
      response,
    )
  }
}

export class IACredentialsAuthProvider implements AuthProvider<LoginWithIACredentialsDto> {
  async login({ email, password }: LoginWithIACredentialsDto, response: Response) {
    return authenticateWithIA('login', { email, password }, response)
  }
}
