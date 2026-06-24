import z from 'zod/v4'
import { ExportV7Schema } from '../v7'
import { ItemSchema } from '../../schemas/item'

// V8 introduces the "iiif" item type (deep-zoomable IIIF images). The change is purely additive at the
// item level, so the only structural difference from V7 is the version literal. Tapestries that contain
// "iiif" items are tagged as V8 so that older clients, which don't know how to render them, can detect
// the newer format.
export const ExportV8Schema = z.object({
  ...ExportV7Schema.shape,
  version: z.literal(8),
  items: z.array(ItemSchema).nullish(),
})

export type ExportV8 = z.infer<typeof ExportV8Schema>
