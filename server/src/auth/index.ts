import { Request } from 'express'
import { RegisterJWTData, verifySessionJWT } from './tokens.js'
import { prisma } from '../db.js'
import { Prisma } from '@prisma/client'
import { UserDoesNotExistError } from '../errors/index.js'

export const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken'
export const REGISTRATION_TOKEN_COOKIE_NAME = 'registrationToken'

export function authenticate(req: Request): string | null {
  const authHeader = req.header('Authorization')
  const jwt = authHeader?.startsWith('Bearer') ? authHeader.substring('Bearer '.length) : undefined
  return jwt ? verifySessionJWT(jwt).userId : null
}

export function updateUserIfExists(where: Prisma.UserWhereInput, data: RegisterJWTData) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findFirst({ where })

    if (!user) {
      throw new UserDoesNotExistError(data)
    }

    await tx.user.update({ where: { id: user.id }, data })
    return user.id
  })
}
