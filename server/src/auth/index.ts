import { CookieOptions, Request, Response } from 'express'
import { createJWT, RegisterJWTData, verifySessionJWT } from './tokens.js'
import { prisma } from '../db.js'
import { Prisma } from '@prisma/client'
import { UserDoesNotExistError } from '../errors/index.js'
import { config } from '../config.js'
import { resources } from 'tapestry-shared/src/data-transfer/resources/index.js'

export const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken'
export const REGISTRATION_TOKEN_COOKIE_NAME = 'registrationToken'

export const SECURE_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: 'none',
  secure: config.server.secureCookie,
  path: `/api/${resources.sessions.create.path}`,
}

const REGISTRATION_TOKEN_EXP = 5 * 60 * 1000

export interface RegistrationSuggestions {
  usernameSuggestion: string
  firstNameSuggestion?: string
  lastNameSuggestion?: string
}

export function authenticate(req: Request): string | null {
  const authHeader = req.header('Authorization')
  const jwt = authHeader?.startsWith('Bearer') ? authHeader.substring('Bearer '.length) : undefined
  return jwt ? verifySessionJWT(jwt).userId : null
}

//Returns the id of the user matching. If there is none, sets the registration token
//cookie and throws UserDoesNotExistError with the suggestions for the registration form.
export async function findUserIdOrStartRegistration(
  where: Prisma.UserWhereInput,
  registration: RegisterJWTData,
  response: Response,
  suggestions: RegistrationSuggestions,
) {
  const user = await prisma.user.findFirst({ where, select: { id: true } })
  if (user) return user.id

  response.cookie(REGISTRATION_TOKEN_COOKIE_NAME, createJWT(registration, '5m'), {
    ...SECURE_COOKIE_OPTIONS,
    maxAge: REGISTRATION_TOKEN_EXP,
  })

  throw new UserDoesNotExistError(
    suggestions.usernameSuggestion,
    suggestions.firstNameSuggestion,
    suggestions.lastNameSuggestion,
  )
}
