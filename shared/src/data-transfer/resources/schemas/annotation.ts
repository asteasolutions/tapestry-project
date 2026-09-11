import z from 'zod/v4'
import { BaseResourceSchema } from './common'
import { ItemSchema } from './item'
import { baseResourcePropsMask } from '../types'
import { CommentSchema } from './comment'
import { UserSchema } from './user'

export const AnnotationSchema = z.object({
  ...BaseResourceSchema.shape,
  itemId: z.string(),
  userId: z.string(),
  elementId: z.string().nullish(),
  user: UserSchema.nullish(),
  item: ItemSchema.nullish(),
  comments: CommentSchema.array().nullish(),
})
export type AnnotationDto = z.infer<typeof AnnotationSchema>

export const AnnotationCreateSchema = AnnotationSchema.omit({
  ...baseResourcePropsMask,
  userId: true,
  user: true,
  item: true,
  comments: true,
})
export type AnnotationCreateDto = z.infer<typeof AnnotationCreateSchema>
