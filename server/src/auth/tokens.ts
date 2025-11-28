import { SignOptions } from 'jsonwebtoken'
import { config } from '../config.js'
import jwt from 'jsonwebtoken'
import { InvalidCredentialsError } from '../errors/index.js'
import z, { ZodObject, ZodRawShape } from 'zod'

const SessionJWTSchema = z.object({ userId: z.string() })
type SessionJWTData = z.infer<typeof SessionJWTSchema>

const RegisterJWTSchema = z.object({
  gsiUserId: z.string().nullish(),
  email: z.string(),
  givenName: z.string(),
  familyName: z.string(),
  avatar: z.string().nullish(),
})
export type RegisterJWTData = z.infer<typeof RegisterJWTSchema>

function verifyJWT<T extends ZodRawShape>(token: string, schema: ZodObject<T>) {
  return schema.parse(
    jwt.verify(token, config.server.secretKey, {
      issuer: config.server.externalUrl,
      audience: 'tapestries-api',
    }),
  )
}

export function createJWT(
  payload: SessionJWTData | RegisterJWTData,
  expiresIn: SignOptions['expiresIn'],
): string {
  return jwt.sign(payload, config.server.secretKey, {
    issuer: config.server.externalUrl,
    audience: 'tapestries-api',
    expiresIn,
  })
}

export function verifySessionJWT(token: string) {
  try {
    return verifyJWT(token, SessionJWTSchema)
  } catch {
    throw new InvalidCredentialsError()
  }
}

export function verifyRegisterJWT(token: string) {
  try {
    return verifyJWT(token, RegisterJWTSchema)
  } catch {
    throw new InvalidCredentialsError()
  }
}
