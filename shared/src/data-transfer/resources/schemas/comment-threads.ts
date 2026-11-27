import z from 'zod/v4'
import {
  ItemAnnotationCommentSchema,
  ItemCommentSchema,
  RelCommentSchema,
  TapestryCommentSchema,
} from './comment.js'
import { BaseResourceSchema } from './common.js'
import { PublicUserProfileSchema } from './user.js'

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
  firstComment: z.discriminatedUnion('contextType', [
    ItemCommentSchema,
    ItemAnnotationCommentSchema,
  ]),
})

export const RelCommentThreadSchema = BaseCommentThreadSchema.extend({
  contextType: RelCommentSchema.shape.contextType,
  firstComment: RelCommentSchema,
})

export const ItemAnnotationCommentThreadSchema = BaseCommentThreadSchema.extend({
  contextType: ItemAnnotationCommentSchema.shape.contextType,
  firstComment: ItemAnnotationCommentSchema,
  authors: PublicUserProfileSchema.array(),
})

export const CommentThreadSchema = z.discriminatedUnion('contextType', [
  TapestryCommentThreadSchema,
  ItemCommentThreadSchema,
  RelCommentThreadSchema,
])

export const CommentThreadsSchema = BaseResourceSchema.extend({
  threads: CommentThreadSchema.array(),
})
