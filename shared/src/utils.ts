import { PublicUserProfileDto, UserDto } from './data-transfer/resources/dtos/user'

export function userToPublicProfileDto(user: UserDto): PublicUserProfileDto {
  return {
    id: user.id,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    givenName: user.givenName,
    familyName: user.familyName,
    username: user.username,
    avatar: user.avatar,
  }
}
