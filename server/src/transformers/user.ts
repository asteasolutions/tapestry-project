import { Prisma } from '@prisma/client'
import { UserDto } from 'tapestry-shared/src/data-transfer/resources/dtos/user.js'

//eslint-disable-next-line @typescript-eslint/require-await
export async function userDbToDto(dbUser: Prisma.UserGetPayload<null>): Promise<UserDto> {
  return {
    id: dbUser.id,
    createdAt: dbUser.createdAt,
    updatedAt: dbUser.updatedAt,
    email: dbUser.email,
    givenName: dbUser.givenName,
    familyName: dbUser.familyName,
    username: dbUser.username,
    avatar: dbUser.avatar,
  }
}
