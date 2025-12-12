import {
  BadRequestErrorCode,
  ErrorResponseDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/errors'

export class APIError extends Error {
  constructor(public data: ErrorResponseDto) {
    super(data.message)
  }
}

export class UnknownError extends Error {
  constructor(public cause?: unknown) {
    super('Unknown error')
  }
}

type ErrorCodeMap = Record<BadRequestErrorCode, string>

const FIELD_ERROR_CODE_MESSAGES: ErrorCodeMap = {
  invalid: 'Invalid input',
  'unique-violation': 'Already taken',
}

export function getErrorMessage(error: unknown, name?: string, overrides?: Partial<ErrorCodeMap>) {
  if (!error) {
    return
  }
  if (typeof error === 'string') {
    return error
  }
  if (error instanceof APIError) {
    if (error.data.name === 'BadRequestError' && name) {
      const code = error.data.errors?.fieldErrors?.[name]?.code
      if (code) {
        return overrides?.[code] ?? FIELD_ERROR_CODE_MESSAGES[code]
      }
    }
    if (error.data.name === 'ForbiddenError' && !name) {
      return "You don't have permissions to perform this action"
    }
  }
}
