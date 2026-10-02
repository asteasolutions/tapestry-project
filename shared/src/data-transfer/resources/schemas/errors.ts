import z from 'zod/v4'

const BaseErrorNameSchema = z.literal([
  'InvalidCredentialsError',
  'InvalidAccessTokenError',
  'SessionExpiredError',
  'ForbiddenError',
  'NotFoundError',
  'ConflictError',
  'ServerError',
])

export const ErrorNameSchema = BaseErrorNameSchema.or(
  z.literal(['BadRequestError', 'UserDoesNotExistError']),
)

export const ErrorReasonSchema = z.enum([
  'IANotAccessible',
  'IAAccountNotAccessible',
  'InvalidIASession',
])

export const BaseErrorResponseSchema = z.object({
  name: BaseErrorNameSchema,
  message: z.string(),
  reason: ErrorReasonSchema.optional(),
})

export const BadRequestErrorCodeSchema = z.literal(['invalid', 'unique-violation'])
export const BadRequestFieldErrorSchema = z.object({ code: BadRequestErrorCodeSchema })
export const BadRequestErrorDetailsSchema = z.object({
  formErrors: z.array(z.string()),
  fieldErrors: z.record(z.string(), BadRequestFieldErrorSchema).nullish(),
})

export const BadRequestErrorResponseSchema = z.object({
  ...BaseErrorResponseSchema.omit({ name: true }).shape,
  name: z.literal('BadRequestError'),
  errors: BadRequestErrorDetailsSchema.nullish(),
})

export const UserDoesNotExistErrorResponseSchema = z.object({
  ...BaseErrorResponseSchema.omit({ name: true }).shape,
  name: z.literal('UserDoesNotExistError'),
  usernameSuggestion: z.string(),
  firstNameSuggestion: z.string().optional(),
  lastNameSuggestion: z.string().optional(),
})

export const ErrorResponseSchema = z.discriminatedUnion('name', [
  BaseErrorResponseSchema,
  BadRequestErrorResponseSchema,
  UserDoesNotExistErrorResponseSchema,
])

export { ZodError } from 'zod/v4'
