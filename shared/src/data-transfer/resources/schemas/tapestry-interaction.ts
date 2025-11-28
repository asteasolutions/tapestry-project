import z from 'zod/v4'
import { BaseResourceSchema } from './common.js'
import { baseResourcePropsMask } from '../types.js'

export const TapestryInteractionSchema = BaseResourceSchema.extend({
  tapestryId: z.string(),
  userId: z.string(),
  lastSeen: z.coerce.date<Date>(),
  firstSeen: z.coerce.date<Date>(),
})

export const TapestryInteractionCreateParams = TapestryInteractionSchema.omit({
  ...baseResourcePropsMask,
  userId: true,
}).extend({
  firstSeen: z.coerce.date<Date>().nullish(),
})
