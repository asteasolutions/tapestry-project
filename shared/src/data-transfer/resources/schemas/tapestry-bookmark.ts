import z from 'zod/v4'
import { BaseResourceSchema } from './common.js'
import { baseResourcePropsMask } from '../types.js'

export const TapestryBookmarkSchema = BaseResourceSchema.extend({
  tapestryId: z.string(),
  userId: z.string(),
})

export const TapestryBookmarkCreateSchema = TapestryBookmarkSchema.omit({
  ...baseResourcePropsMask,
  userId: true,
})
