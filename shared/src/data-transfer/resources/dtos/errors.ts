import {
  BadRequestErrorCodeSchema,
  BadRequestErrorDetailsSchema,
  BadRequestErrorResponseSchema,
  BadRequestFieldErrorSchema,
  BaseErrorResponseSchema,
  ErrorNameSchema,
  ErrorReasonSchema,
  ErrorResponseSchema,
  UserDoesNotExistsErrorResponseSchema,
} from '../schemas/errors.js'
import z from 'zod/v4'

export type ErrorName = z.infer<typeof ErrorNameSchema>

export type ErrorReason = z.infer<typeof ErrorReasonSchema>

export type BadRequestErrorCode = z.infer<typeof BadRequestErrorCodeSchema>
export type BadRequestFieldError = z.infer<typeof BadRequestFieldErrorSchema>
export type BadRequestErrorDetails = z.infer<typeof BadRequestErrorDetailsSchema>

export type BaseErrorResponse = z.infer<typeof BaseErrorResponseSchema>
export type BadRequestErrorResponse = z.infer<typeof BadRequestErrorResponseSchema>
export type UserDoesNotExistsErrorResponse = z.infer<typeof UserDoesNotExistsErrorResponseSchema>

export type ErrorResponseDto = z.infer<typeof ErrorResponseSchema>

export function isErrorResponse(obj: object): obj is ErrorResponseDto {
  return ErrorResponseSchema.safeParse(obj).success
}
