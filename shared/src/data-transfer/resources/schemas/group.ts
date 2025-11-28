import z from 'zod/v4'
import { BaseResourceSchema } from './common.js'
import { baseResourcePropsMask } from '../types.js'
import { GroupSchema as BaseGroupSchema } from 'tapestry-core/src/data-format/schemas/group.js'

export const GroupSchema = z.object({
  ...BaseResourceSchema.shape,
  ...BaseGroupSchema.shape,
  tapestryId: z.string().describe('The ID of the tapestry this group belongs to.'),
})

export const GroupCreateSchema = GroupSchema.omit(baseResourcePropsMask).describe(
  'Set of properties to create new group.',
)

export const GroupUpdateSchema = GroupSchema.omit({
  ...baseResourcePropsMask,
  tapestryId: true,
})
  .partial()
  .describe('Set of properties used to modify an existing group.')
