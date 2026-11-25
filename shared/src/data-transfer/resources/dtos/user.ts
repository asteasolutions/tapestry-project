import { BaseResourceDto } from './common.js'

export const USER_ROLES = ['user', 'admin'] as const

export type UserRole = (typeof USER_ROLES)[number]

export interface UserDto extends BaseResourceDto {
  email?: string | null
  givenName?: string | null
  familyName?: string | null
  username: string
  avatar?: string | null
  role: UserRole
}

export type PublicUserProfileDto = Omit<UserDto, 'email' | 'role'>
