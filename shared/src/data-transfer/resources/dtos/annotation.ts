import { ItemAnnotationCommentThreadDto } from './comment-threads'
import { BaseResourceDto } from './common'
import { ItemDto } from './item'
import { PublicUserProfileDto } from './user'

export interface AnnotationDto extends BaseResourceDto {
  isHighlight: boolean
  itemId: string
  authorId: string
  item?: ItemDto | null
  author?: PublicUserProfileDto | null
  commentThread?: Omit<
    ItemAnnotationCommentThreadDto,
    'id' | 'contextId' | 'contextType' | 'createdAt' | 'updatedAt'
  > | null
}

type BaseAnnotationCreateDto = Omit<
  AnnotationDto,
  keyof BaseResourceDto | 'authorId' | 'author' | 'item' | 'commentThread'
>

export interface AnnotationCreateInTextDto extends BaseAnnotationCreateDto {
  annotationType: 'text'
  from: number
  to: number
}

export type AnnotationCreateDto = AnnotationCreateInTextDto
