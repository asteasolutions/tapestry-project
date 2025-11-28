import z from 'zod/v4'
import { BaseResourceSchema } from './common.js'
import { baseResourcePropsMask } from '../types.js'
import { RelSchema as BaseRelSchema } from 'tapestry-core/src/data-format/schemas/rel.js'

export const RelSchema = z.object({
  ...BaseResourceSchema.shape,
  ...BaseRelSchema.shape,
  tapestryId: z.string().describe('The ID of the tapestry this rel belongs to.'),
})

export const RelCreateSchema = RelSchema.omit(baseResourcePropsMask).describe(
  'Set of properties to create new rel.',
)

export const RelCreateInTapestrySchema = RelCreateSchema.omit({ tapestryId: true })
  .extend({
    id: z.string(),
  })
  .describe(
    'Set of properties to create a new rel when the tapestry instance can be inferred from the context, ' +
      "i.e. the properties don't contain a reference to a tapestry.",
  )

export const RelUpdateSchema = RelSchema.omit({
  ...baseResourcePropsMask,
  tapestryId: true,
})
  .partial()
  .describe('Set of properties used to modify an existing rel.')
