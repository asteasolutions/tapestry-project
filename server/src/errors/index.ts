import { Prisma } from '@prisma/client'
import { ErrorRequestHandler } from 'express'
import { HttpError } from 'http-errors'
import { mapValues } from 'lodash-es'
import {
  BadRequestErrorDetails,
  BadRequestErrorResponse,
  BadRequestFieldError,
  BaseErrorResponse,
  ErrorName,
  ErrorReason,
  ErrorResponseDto,
  UserDoesNotExistsErrorResponse,
} from 'tapestry-shared/src/data-transfer/resources/dtos/errors.js'
import {
  ErrorResponseSchema,
  ZodError,
} from 'tapestry-shared/src/data-transfer/resources/schemas/errors.js'
import { flattenError } from 'zod/v4'
import { RegisterJWTData } from '../auth/tokens.js'
import { isNotFoundError, isUniqueConstraintViolation } from '../db.js'

abstract class APIError<T extends ErrorName = ErrorName> extends Error {
  constructor(
    public code: number,
    public message: string,
    public name: T,
    public reason?: ErrorReason,
  ) {
    super(message)
  }
}

export class BadRequestError
  extends APIError<'BadRequestError'>
  implements BadRequestErrorResponse
{
  public errors: BadRequestErrorDetails | undefined

  constructor(err?: ZodError | BadRequestErrorDetails)
  constructor(message?: string, err?: ZodError | BadRequestErrorDetails)
  constructor(
    messageOrError?: string | ZodError | BadRequestErrorDetails,
    maybeError?: ZodError | BadRequestErrorDetails,
  ) {
    const [message, error] =
      typeof messageOrError === 'undefined'
        ? ['Validation Error', maybeError]
        : typeof messageOrError === 'string'
          ? [messageOrError, maybeError]
          : ['Validation Error', messageOrError]

    super(400, message, 'BadRequestError')

    if (error instanceof ZodError) {
      const flattened = flattenError(error)
      flattened.fieldErrors = mapValues<object, BadRequestFieldError>(
        flattened.fieldErrors,
        () => ({ code: 'invalid' }),
      )
      this.errors = flattened
    } else {
      this.errors = error
    }
  }
}

export class InvalidCredentialsError
  extends APIError<'InvalidCredentialsError'>
  implements BaseErrorResponse
{
  constructor(
    message = 'Invalid Credentials',
    reason?: Extract<ErrorReason, 'InvalidIASession' | 'IAAccountNotAccessible'>,
  ) {
    super(401, message, 'InvalidCredentialsError', reason)
  }
}

export class InvalidAccessTokenError
  extends APIError<'InvalidAccessTokenError'>
  implements BaseErrorResponse
{
  constructor(message = 'Invalid Access Token') {
    super(401, message, 'InvalidAccessTokenError')
  }
}

export class SessionExpiredError
  extends APIError<'SessionExpiredError'>
  implements BaseErrorResponse
{
  constructor(message = 'Session Expired') {
    super(401, message, 'SessionExpiredError')
  }
}

export class ForbiddenError extends APIError<'ForbiddenError'> implements BaseErrorResponse {
  constructor(message = 'Forbidden') {
    super(403, message, 'ForbiddenError')
  }
}

export class NotFoundError extends APIError<'NotFoundError'> implements BaseErrorResponse {
  constructor(message = 'Not Found') {
    super(404, message, 'NotFoundError')
  }
}

export class ConflictError extends APIError<'ConflictError'> implements BaseErrorResponse {
  constructor(message = 'Conflict') {
    super(409, message, 'ConflictError')
  }
}

export class UserDoesNotExistError
  extends APIError<'UserDoesNotExistsError'>
  implements UserDoesNotExistsErrorResponse
{
  public usernameSuggestion: string
  constructor(public jwt: RegisterJWTData) {
    super(404, 'User not found', 'UserDoesNotExistsError')
    this.usernameSuggestion = jwt.email.split('@')[0]
  }
}

export class ServerError extends APIError<'ServerError'> implements BaseErrorResponse {
  constructor(message = 'Server error', reason?: Extract<ErrorReason, 'IANotAccessible'>) {
    super(500, message, 'ServerError', reason)
  }
}

export function toAPIError(err: unknown) {
  // The body-parser (actually raw-body) adds a `type` property with the value "entity.too.large"
  // which might be more reliable, but the typings are lacking
  if (err instanceof HttpError && err.name === 'PayloadTooLargeError') {
    return new BadRequestError('Content too large')
  }
  if (err instanceof ZodError) {
    return new BadRequestError(err)
  }

  if (isNotFoundError(err)) {
    return new NotFoundError()
  }

  if (isUniqueConstraintViolation(err)) {
    const target = err.meta?.target
    const fieldErrors = Array.isArray(target)
      ? (target as string[]).reduce<BadRequestErrorDetails['fieldErrors']>(
          (acc, col) => ({ ...acc, [col]: { code: 'unique-violation' } }),
          {},
        )
      : {}

    return new BadRequestError(`Unique constraint violation`, {
      formErrors: [],
      fieldErrors,
    })
  }

  if (
    err instanceof Prisma.PrismaClientKnownRequestError ||
    err instanceof Prisma.PrismaClientUnknownRequestError ||
    err instanceof Prisma.PrismaClientValidationError
  ) {
    return new BadRequestError()
  }
  if (
    err instanceof Prisma.PrismaClientRustPanicError ||
    err instanceof Prisma.PrismaClientInitializationError
  ) {
    return new ServerError()
  }
  if (err instanceof APIError) {
    return err
  }
  if (err instanceof Error) {
    return new ServerError()
  }
  return new ServerError()
}

export function toErrorDto<T extends ErrorName>(error: APIError<T>): ErrorResponseDto {
  return ErrorResponseSchema.parse(error)
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  console.error(err)
  if (res.headersSent) {
    return next(err)
  }

  const apiError = toAPIError(err)
  res.status(apiError.code).json(toErrorDto(apiError))
}
