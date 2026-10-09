import { BaseResourceDto } from './common.js'

export interface UserDto extends BaseResourceDto {
  email?: string | null
  givenName?: string | null
  familyName?: string | null
  username: string
  avatar?: string | null
}

export type PublicUserProfileDto = Omit<UserDto, 'email'>
