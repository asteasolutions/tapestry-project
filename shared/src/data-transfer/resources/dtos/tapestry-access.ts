import { BaseResourceDto } from './common.js'
import { PublicUserProfileDto } from './user.js'

export interface TapestryAccessDto extends BaseResourceDto {
  tapestryId: string
  userId: string
  user?: PublicUserProfileDto | null
  canEdit: boolean
}

export interface TapestryAccessCreateDto {
  tapestryInvitationId: string
}

export interface TapestryAccessUpdateDto {
  canEdit: boolean
}
