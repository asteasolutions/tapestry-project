import { BaseResourceDto } from './common.js'
import { TapestryDto } from './tapestry.js'

export interface TapestryInvitationDto extends BaseResourceDto {
  tapestryId: string
  tapestry?: TapestryDto | null
  canEdit: boolean
}

export type TapestryInvitationCreateDto = Omit<
  TapestryInvitationDto,
  keyof BaseResourceDto | 'tapestry'
>

export interface TapestryInvitationUpdateDto {
  accept: true
}
