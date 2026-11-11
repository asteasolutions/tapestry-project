import z from 'zod/v4'
import { IdentifiableSchema } from 'tapestry-core/src/data-format/schemas/common.js'

export const TapestryExportSchema = z
  .object({
    ...IdentifiableSchema.shape,
    createdAt: z.coerce.date<Date>(),
    tapestryId: z.string().nullable(),
    userId: z.string().nullable(),
  })
  .describe('A record of a tapestry being exported to a ZIP file. Used for reporting.')

export const TapestryExportCreateSchema = z.object({
  tapestryId: z.string(),
})
