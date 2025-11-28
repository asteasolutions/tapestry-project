import z from 'zod/v4'
import { BaseResourceSchema } from './common.js'
import { baseResourcePropsMask } from '../types.js'
import { PublicUserProfileSchema } from './user.js'
import { TapestrySchema } from './tapestry.js'
import { ItemSchema } from './item.js'
import { RelSchema } from './rel.js'

const BaseCommentSchema = BaseResourceSchema.extend({
  text: z.string(),
  author: PublicUserProfileSchema.nullish(),
  authorId: z.string(),
  contextId: z.string(),
  tapestryId: z.string(),
  tapestry: TapestrySchema.nullish(),
  deletedAt: z.coerce.date<Date>().nullish(),
})

export const TapestryCommentSchema = BaseCommentSchema.extend({
  contextType: z.literal('tapestry'),
})

export const ItemCommentSchema = BaseCommentSchema.extend({
  contextType: z.literal('item'),
  item: ItemSchema.nullish(),
})

export const RelCommentSchema = BaseCommentSchema.extend({
  contextType: z.literal('rel'),
  rel: RelSchema.nullish(),
})

export const ReplySchema = BaseCommentSchema.extend({
  contextType: z.literal('comment'),
})

export const CommentSchema = z.discriminatedUnion('contextType', [
  TapestryCommentSchema,
  ItemCommentSchema,
  RelCommentSchema,
  ReplySchema,
])

const commentCreateOmitPropsMask = {
  ...baseResourcePropsMask,
  author: true,
  authorId: true,
} as const

export const CommentCreateSchema = z.discriminatedUnion('contextType', [
  TapestryCommentSchema.omit({ ...commentCreateOmitPropsMask, tapestry: true }),
  ItemCommentSchema.omit({ ...commentCreateOmitPropsMask, item: true }),
  RelCommentSchema.omit({ ...commentCreateOmitPropsMask, rel: true }),
  ReplySchema.omit(commentCreateOmitPropsMask),
])

export const CommentUpdateSchema = z.object({
  text: BaseCommentSchema.shape.text,
})
