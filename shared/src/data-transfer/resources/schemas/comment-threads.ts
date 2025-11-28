import z from 'zod/v4'
import { ItemCommentSchema, RelCommentSchema, TapestryCommentSchema } from './comment.js'
import { BaseResourceSchema } from './common.js'

const BaseCommentThreadSchema = BaseResourceSchema.extend({
  contextId: z.string(),
  size: z.number().positive(),
})

export const TapestryCommentThreadSchema = BaseCommentThreadSchema.extend({
  contextType: TapestryCommentSchema.shape.contextType,
  firstComment: TapestryCommentSchema,
})

export const ItemCommentThreadSchema = BaseCommentThreadSchema.extend({
  contextType: ItemCommentSchema.shape.contextType,
  firstComment: ItemCommentSchema,
})

export const RelCommentThreadSchema = BaseCommentThreadSchema.extend({
  contextType: RelCommentSchema.shape.contextType,
  firstComment: RelCommentSchema,
})

export const CommentThreadSchema = z.discriminatedUnion('contextType', [
  TapestryCommentThreadSchema,
  ItemCommentThreadSchema,
  RelCommentThreadSchema,
])

export const CommentThreadsSchema = BaseResourceSchema.extend({
  threads: CommentThreadSchema.array(),
})
