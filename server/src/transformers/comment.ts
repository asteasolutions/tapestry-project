import { Comment } from '@prisma/client'
import { get, set } from 'lodash-es'
import { CommentDto } from 'tapestry-shared/src/data-transfer/resources/dtos/comment.js'

//eslint-disable-next-line @typescript-eslint/require-await
export async function commentDbToDto(dbComment: Comment): Promise<CommentDto> {
  return {
    id: dbComment.id,
    createdAt: dbComment.createdAt,
    updatedAt: dbComment.updatedAt,
    authorId: dbComment.authorId,
    text: dbComment.text,
    contextType: dbComment.contextType,
    contextId: {
      tapestry: dbComment.tapestryId,
      item: dbComment.itemId,
      rel: dbComment.relId,
      comment: dbComment.parentCommentId,
    }[dbComment.contextType]!,
    tapestryId: dbComment.tapestryId,
    deletedAt: dbComment.deletedAt,
  }
}

type CommentDBField = keyof Comment
const DB_TO_DTO_FIELD_MAP: Record<CommentDBField, string> = {
  id: 'id',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  text: 'text',
  authorId: 'authorId',
  contextType: 'contextType',
  tapestryId: 'tapestryId',
  itemId: 'contextId',
  relId: 'contextId',
  parentCommentId: 'contextId',
  deletedAt: 'deletedAt',
}

export function commentDtoToDb(comment: CommentDto): Comment
export function commentDtoToDb<const O extends CommentDBField>(
  comment: Partial<CommentDto>,
  omit: O[],
): Omit<Comment, O>
export function commentDtoToDb<O extends CommentDBField>(
  comment: Partial<CommentDto>,
  omit?: O[],
): Omit<Comment, O> {
  const exclude: CommentDBField[] = [...(omit ?? [])]
  if (comment.contextType !== 'item') {
    exclude.push('itemId')
  }
  if (comment.contextType !== 'rel') {
    exclude.push('relId')
  }
  if (comment.contextType !== 'comment') {
    exclude.push('parentCommentId')
  }

  const fieldsToAssign = (Object.keys(DB_TO_DTO_FIELD_MAP) as CommentDBField[]).filter(
    (field) => !exclude.includes(field),
  )

  const dbComment: Partial<Comment> = {}
  for (const field of fieldsToAssign) {
    set(dbComment, field, get(comment, DB_TO_DTO_FIELD_MAP[field]))
  }

  return dbComment as Omit<Comment, O>
}
