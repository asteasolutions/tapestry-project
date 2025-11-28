import z from 'zod/v4'
import { BaseResourceSchema } from './common.js'

export const JobStatusSchema = z.enum(['pending', 'processing', 'complete', 'failed'])

const TapestryCreateJobType = z.enum(['import', 'fork'])

export const TapestryCreateJobSchema = BaseResourceSchema.extend({
  userId: z.string(),
  status: JobStatusSchema,
  progress: z.number().gte(0).lte(1),
  type: TapestryCreateJobType,
  tapestryId: z.string().nullish(),
  parentId: z.string().nullish(),
  s3Key: z.string().nullish(),
})

export const TapestryCreateJobCreateSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('import'), s3Key: z.string() }),
  z.object({
    type: z.literal('fork'),
    parentId: z.string(),
    title: z.string().nullish(),
    description: z.string().nullish(),
  }),
])
