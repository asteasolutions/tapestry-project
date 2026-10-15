import z from 'zod/v4'
import { UserSchema } from './user.js'
import { trimString } from './common.js'

export const SessionSchema = z.object({
  accessToken: z.string(),
  userId: z.string(),
  expiresAt: z.number(),
  user: UserSchema.nullish(),
})

const OAuthCodeSchema = z.object({ code: z.string(), redirectUri: z.string() })

const usernameRegex = /^[a-zA-Z0-9_+.-]*$/g
const UsernameSchema = z.preprocess(trimString, z.string().nonempty().max(25).regex(usernameRegex))
const NameSchema = z.preprocess(trimString, z.string().nonempty().max(25))

export const RegisterUserSuggestionsSchema = z.object({
  usernameSuggestion: UsernameSchema.optional().catch(undefined),
  firstNameSuggestion: NameSchema.optional().catch(undefined),
  lastNameSuggestion: NameSchema.optional().catch(undefined),
})

export const SessionCreateSchema = z.discriminatedUnion('authType', [
  z.object({ authType: z.literal('refreshToken') }),
  z.object({ authType: z.literal('gsi'), gsiCredential: z.string() }),
  z.object({ authType: z.literal('orcid'), ...OAuthCodeSchema.shape }),
  z.object({ authType: z.literal('wikimedia'), ...OAuthCodeSchema.shape }),
  z.object({ authType: z.literal('iaCookies') }),
  z.object({ authType: z.literal('iaCredentials'), email: z.string(), password: z.string() }),
  z.object({
    authType: z.literal('registerUser'),
    username: UsernameSchema,
    firstName: NameSchema.optional(),
    lastName: NameSchema.optional(),
  }),
])
