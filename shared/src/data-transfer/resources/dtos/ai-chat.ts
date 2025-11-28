import { BaseResourceDto, RelationKeys } from './common.js'
import { TapestryDto } from './tapestry.js'
import { PublicUserProfileDto } from './user.js'

export type AIChatParticipantRole = 'user' | 'assistant'
export type AIChatProvider = 'google'
export type AIChatMessageState = 'pending' | 'processed' | 'error'

export interface AIChatDto extends BaseResourceDto {
  userId: string
  aiProvider: AIChatProvider
  aiModel: string
  tapestryId?: string | null

  user?: PublicUserProfileDto | null
  tapestry?: TapestryDto | null
}

interface AIChatMessageItemAttachmentDto {
  type: 'item'
  itemId?: string | null
}

export type AIChatMessageAttachmentDto = AIChatMessageItemAttachmentDto

export interface AIChatMessageDto extends BaseResourceDto {
  chatId: string
  role: AIChatParticipantRole
  content: string
  state: AIChatMessageState
  attachments?: AIChatMessageAttachmentDto[] | null

  chat?: AIChatDto | null
}

export type AIChatCreateDto = Omit<
  AIChatDto,
  keyof BaseResourceDto | RelationKeys<AIChatDto> | 'userId'
>

export type AIChatMessageCreateDto = Omit<
  AIChatMessageDto,
  keyof BaseResourceDto | RelationKeys<AIChatMessageDto> | 'role' | 'state'
>
