import { BaseResourceDto } from './common.js'
import { ItemCommentDto, RelCommentDto, TapestryCommentDto } from './comment.js'

interface BaseCommentThreadDto extends BaseResourceDto {
  contextId: string
  size: number
}

export interface TapestryCommentThreadDto extends BaseCommentThreadDto {
  contextType: TapestryCommentDto['contextType']
  firstComment: TapestryCommentDto
}

export interface ItemCommentThreadDto extends BaseCommentThreadDto {
  contextType: ItemCommentDto['contextType']
  firstComment: ItemCommentDto
}

export interface RelCommentThreadDto extends BaseCommentThreadDto {
  contextType: RelCommentDto['contextType']
  firstComment: RelCommentDto
}

export type CommentThreadDto = TapestryCommentThreadDto | ItemCommentThreadDto | RelCommentThreadDto

export interface CommentThreadsDto extends BaseResourceDto {
  threads: CommentThreadDto[]
}
