import { Request, Response } from 'express'
import { resources, Resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { prisma } from '../db.js'
import { RESTResourceImpl } from './base-resource.js'
import { createJWT } from '../auth/tokens.js'
import { CookieOptions } from 'express'
import { UserDto } from 'tapestry-shared/src/data-transfer/resources/dtos/user.js'
import { userDbToDto } from '../transformers/user.js'
import jwt from 'jsonwebtoken'
import { REFRESH_TOKEN_COOKIE_NAME, REGISTRATION_TOKEN_COOKIE_NAME } from '../auth/index.js'
import { AUTH_PROVIDERS } from '../auth/providers/index.js'
import { config } from '../config.js'
import { SessionCreateDto } from 'tapestry-shared/src/data-transfer/resources/dtos/session.js'
import { UserDoesNotExistError } from '../errors/index.js'

const REFRESH_TOKEN_EXP = 24 * 60 * 60 * 1000 // 1 day in ms
const SECURE_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: 'none',
  secure: config.server.secureCookie,
  path: `/api/${resources.sessions.create.path}`,
}

async function invokeLoginProvider(
  request: SessionCreateDto,
  rawRequest: Request,
  rawResponse: Response,
) {
  if (request.authType === 'refreshToken') {
    return AUTH_PROVIDERS.refreshToken.login({
      authType: 'refreshToken',
      refreshToken: rawRequest.cookies[REFRESH_TOKEN_COOKIE_NAME] as string | undefined,
    })
  }

  if (request.authType === 'gsi') {
    return AUTH_PROVIDERS.gsi.login(request)
  }

  if (request.authType === 'iaCookies') {
    return AUTH_PROVIDERS.iaCookies.login(
      {
        authType: 'iaCookies',
        userCookie: rawRequest.cookies['logged-in-user'] as string | undefined,
        sigCookie: rawRequest.cookies['logged-in-sig'] as string | undefined,
      },
      rawResponse,
    )
  }

  if (request.authType === 'iaCredentials') {
    return AUTH_PROVIDERS.iaCredentials.login(request, rawResponse)
  }

  // After we successfully invoke the "registerUser" provider, we must clear the "registrationToken" cookie
  const userId = await AUTH_PROVIDERS.registerUser.login({
    authType: 'registerUser',
    registrationToken: rawRequest.cookies[REGISTRATION_TOKEN_COOKIE_NAME] as string | undefined,
    username: request.username,
  })
  rawResponse.clearCookie(REGISTRATION_TOKEN_COOKIE_NAME, SECURE_COOKIE_OPTIONS)
  return userId
}

export const sessions: RESTResourceImpl<Resources['sessions'], never> = {
  accessPolicy: {
    canCreate: () => Promise.resolve(true),
    canDestroy: () => Promise.resolve(true),
  },

  handlers: {
    create: async ({ body, query }, { rawRequest, rawResponse }) => {
      let userId: string
      try {
        userId = await invokeLoginProvider(body, rawRequest, rawResponse)
      } catch (error) {
        if (error instanceof UserDoesNotExistError) {
          rawResponse.cookie(REGISTRATION_TOKEN_COOKIE_NAME, createJWT(error.jwt, '5m'), {
            ...SECURE_COOKIE_OPTIONS,
            maxAge: 5 * 60 * 1000,
          })
        }
        throw error
      }

      const accessToken = createJWT({ userId }, '5m')
      const refreshToken = createJWT({ userId }, REFRESH_TOKEN_EXP)

      rawResponse.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
        ...SECURE_COOKIE_OPTIONS,
        maxAge: REFRESH_TOKEN_EXP,
      })

      let user: UserDto | null = null
      if (query.include?.includes('user')) {
        user = await userDbToDto(await prisma.user.findUniqueOrThrow({ where: { id: userId } }))
      }

      return {
        userId,
        accessToken,
        user,
        expiresAt: jwt.decode(accessToken, { json: true })!.exp! * 1000,
      }
    },

    destroy: (_, { rawResponse }): Promise<void> => {
      rawResponse.clearCookie(REFRESH_TOKEN_COOKIE_NAME, SECURE_COOKIE_OPTIONS)
      return Promise.resolve()
    },
  },
}
