import z from 'zod/v4'
import { UserSchema } from './user.js'
import { trimString } from './common.js'

export const SessionSchema = z.object({
  accessToken: z.string(),
  userId: z.string(),
  expiresAt: z.number(),
  user: UserSchema.nullish(),
})

const usernameRegex = /^[a-zA-Z0-9_+.-]*$/g
export const SessionCreateSchema = z.discriminatedUnion('authType', [
  z.object({ authType: z.literal('refreshToken') }),
  z.object({ authType: z.literal('gsi'), gsiCredential: z.string() }),
  z.object({ authType: z.literal('iaCookies') }),
  z.object({ authType: z.literal('iaCredentials'), email: z.string(), password: z.string() }),
  z.object({
    authType: z.literal('registerUser'),
    username: z.preprocess(trimString, z.string().nonempty().regex(usernameRegex)),
  }),
])
