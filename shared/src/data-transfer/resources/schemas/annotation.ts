import z from 'zod/v4'
import { BaseResourceSchema } from './common'
import { ItemSchema } from './item'
import { baseResourcePropsMask } from '../types'
import { PublicUserProfileSchema } from './user'
import { ItemAnnotationCommentThreadSchema } from './comment-threads'

export const AnnotationSchema = z.object({
  ...BaseResourceSchema.shape,
  isHighlight: z.boolean(),
  itemId: z.string(),
  authorId: z.string(),
  item: ItemSchema.nullish(),
  author: PublicUserProfileSchema.nullish(),
  commentThread: ItemAnnotationCommentThreadSchema.omit({
    id: true,
    contextId: true,
    contextType: true,
    createdAt: true,
    updatedAt: true,
  }).nullish(),
})

const BaseAnnotationCreateSchema = AnnotationSchema.omit({
  ...baseResourcePropsMask,
  authorId: true,
  author: true,
  item: true,
  commentThread: true,
}).extend({
  commentText: z.string().nullish(),
})

export const AnnotationCreateInTextSchema = BaseAnnotationCreateSchema.extend({
  annotationType: z.literal('text'),
  from: z.number(),
  to: z.number(),
})

export const AnnotationCreateSchema = z.discriminatedUnion('annotationType', [
  AnnotationCreateInTextSchema,
])
