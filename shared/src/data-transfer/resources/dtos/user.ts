import { BaseResourceDto } from './common.js'

export interface UserDto extends BaseResourceDto {
  email: string
  givenName: string
  familyName: string
  username: string
  avatar?: string | null
}

export type PublicUserProfileDto = Omit<UserDto, 'email'>
