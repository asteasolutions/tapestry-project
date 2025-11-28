import z from 'zod/v4'
import { BaseResourceSchema } from './common.js'
import { baseResourcePropsMask } from '../types.js'
import { TapestrySchema } from './tapestry.js'

export const TapestryInvitationSchema = BaseResourceSchema.extend({
  tapestryId: z.string(),
  tapestry: TapestrySchema.nullish(),
  canEdit: z.boolean(),
})

export const TapestryInvitationCreateParams = TapestryInvitationSchema.omit({
  ...baseResourcePropsMask,
})
