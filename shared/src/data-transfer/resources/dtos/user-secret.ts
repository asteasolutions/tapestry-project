import { AIChatProvider } from './ai-chat.js'
import { BaseResourceDto } from './common.js'

export type UserSecretType = `${AIChatProvider}ApiKey`

export interface UserSecretDto extends BaseResourceDto {
  type: UserSecretType
  maskedValue: string
  ownerId: string
}

export type UserSecretCreateDto = Omit<UserSecretDto, keyof BaseResourceDto | 'maskedValue'> & {
  value: string
}
export type UserSecretUpdateDto = Partial<Omit<UserSecretCreateDto, 'ownerId'>>
