import { UserDto } from './user.js'

export interface SessionDto {
  accessToken: string
  userId: string
  expiresAt: number
  user?: UserDto | null
}

export interface SessionRefreshDto {
  authType: 'refreshToken'
}

export interface LoginWithGoogleDto {
  authType: 'gsi'
  gsiCredential: string
}

export interface LoginWithIACookiesDto {
  authType: 'iaCookies'
}

export interface LoginWithIACredentialsDto {
  authType: 'iaCredentials'
  email: string
  password: string
}

export interface RegisterUserDto {
  authType: 'registerUser'
  username: string
}

export type SessionCreateDto =
  | SessionRefreshDto
  | LoginWithGoogleDto
  | LoginWithIACookiesDto
  | LoginWithIACredentialsDto
  | RegisterUserDto
