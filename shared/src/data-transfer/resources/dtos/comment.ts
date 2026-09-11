import { AnnotationDto } from '../schemas/annotation.js'
import { BaseResourceDto } from './common.js'
import { ItemDto } from './item.js'
import { RelDto } from './rel.js'
import { TapestryDto } from './tapestry.js'
import { PublicUserProfileDto } from './user.js'

interface BaseCommentDto extends BaseResourceDto {
  text: string
  author?: PublicUserProfileDto | null
  authorId: string
  contextId: string
  tapestryId: string
  tapestry?: TapestryDto | null
  deletedAt?: Date | null
}

export interface TapestryCommentDto extends BaseCommentDto {
  contextType: 'tapestry'
}

export interface ItemCommentDto extends BaseCommentDto {
  contextType: 'item'
  item?: ItemDto | null
}

export interface RelCommentDto extends BaseCommentDto {
  contextType: 'rel'
  rel?: RelDto | null
}

export interface ReplyDto extends BaseCommentDto {
  contextType: 'comment'
  parentComment?: CommentDto | null
}

export interface ItemAnnotationCommentDto extends BaseCommentDto {
  contextType: 'annotation'
  annotation?: AnnotationDto | null
}

export type CommentDto =
  | TapestryCommentDto
  | ItemCommentDto
  | RelCommentDto
  | ReplyDto
  | ItemAnnotationCommentDto

type CommentCreateOmitProps = keyof BaseResourceDto | 'author' | 'authorId'

export type CommentCreateDto =
  | Omit<TapestryCommentDto, CommentCreateOmitProps | 'tapestry'>
  | Omit<ItemCommentDto, CommentCreateOmitProps | 'item'>
  | Omit<RelCommentDto, CommentCreateOmitProps | 'rel'>
  | Omit<ReplyDto, CommentCreateOmitProps | 'parentComment'>
  | Omit<ItemAnnotationCommentDto, CommentCreateOmitProps | 'annotataion'>

export interface CommentUpdateDto {
  text: BaseCommentDto['text']
}
