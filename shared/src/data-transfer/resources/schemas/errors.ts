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
  z.literal(['BadRequestError', 'UserDoesNotExistsError']),
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

export const UserDoesNotExistsErrorResponseSchema = z.object({
  ...BaseErrorResponseSchema.omit({ name: true }).shape,
  name: z.literal('UserDoesNotExistsError'),
  usernameSuggestion: z.string(),
})

export const ErrorResponseSchema = z.discriminatedUnion('name', [
  BaseErrorResponseSchema,
  BadRequestErrorResponseSchema,
  UserDoesNotExistsErrorResponseSchema,
])

export { ZodError } from 'zod/v4'
