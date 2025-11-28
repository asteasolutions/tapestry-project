import { BaseResourceDto } from './common.js'

export interface TapestryInteractionDto extends BaseResourceDto {
  tapestryId: string
  userId: string
  lastSeen: Date
  firstSeen: Date
}

export type TapestryInteractionCreateDto = Omit<
  TapestryInteractionDto,
  keyof BaseResourceDto | 'userId' | 'firstSeen'
> & {
  firstSeen?: Date | null
}
