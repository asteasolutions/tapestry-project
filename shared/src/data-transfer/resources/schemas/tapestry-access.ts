import z from 'zod/v4'
import { BaseResourceSchema } from './common.js'
import { PublicUserProfileSchema } from './user.js'

export const TapestryAccessSchema = BaseResourceSchema.extend({
  tapestryId: z.string(),
  userId: z.string(),
  user: PublicUserProfileSchema.nullish(),
  canEdit: z.boolean(),
})

export const TapestryAccessCreateSchema = z.object({
  tapestryInvitationId: z.string(),
})

export const TapestryAccessUpdateSchema = z.object({
  canEdit: z.boolean(),
})
