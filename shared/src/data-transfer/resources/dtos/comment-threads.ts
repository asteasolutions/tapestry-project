import { BaseResourceDto } from './common.js'
import {
  ItemAnnotationCommentDto,
  ItemCommentDto,
  RelCommentDto,
  TapestryCommentDto,
} from './comment.js'
import { PublicUserProfileDto } from './user.js'

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
  firstComment: ItemCommentDto | ItemAnnotationCommentDto
}

export interface RelCommentThreadDto extends BaseCommentThreadDto {
  contextType: RelCommentDto['contextType']
  firstComment: RelCommentDto
}

export interface ItemAnnotationCommentThreadDto extends BaseCommentThreadDto {
  contextType: ItemAnnotationCommentDto['contextType']
  firstComment: ItemAnnotationCommentDto
  authors: PublicUserProfileDto[]
}

export type CommentThreadDto = TapestryCommentThreadDto | ItemCommentThreadDto | RelCommentThreadDto

export interface CommentThreadsDto extends BaseResourceDto {
  threads: CommentThreadDto[]
}
