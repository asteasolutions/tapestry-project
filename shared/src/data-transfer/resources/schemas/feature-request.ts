import z from 'zod/v4'
import { BaseResourceSchema } from './common.js'
import { FEATURE_REQUEST_STATUSES } from '../dtos/feature-request.js'

export const FeatureRequestSchema = BaseResourceSchema.extend({
  tapestryId: z.string().nullable(),
  tapestryTitle: z.string(),
  requesterId: z.string().nullable(),
  status: z.enum(FEATURE_REQUEST_STATUSES),
  decidedAt: z.coerce.date<Date>().nullable(),
}).describe('A request by a tapestry owner to feature their tapestry in the public Gallery.')

export const FeatureRequestCreateSchema = z.object({
  tapestryId: z.string(),
})
