import z from 'zod/v4'
import { HexColorSchema, IdentifiableSchema, PointSchema } from './common.js'

export const ArrowheadSchema = z.enum(['none', 'arrow'])

export const LineWeightSchema = z.enum(['light', 'medium', 'heavy'])

export const RelEndpointSchema = z.object({
  itemId: z.string().describe('The ID of the item to which this end of the arrow points.'),
  anchor: PointSchema.describe(
    'An anchor point used to determine the exact location of the arrow endpoint relative to the related ' +
      "item's bounding box. The x and y coordinates of the anchor are numbers between 0 and 1. The point (0, 0) " +
      "represents the top-left corner of the item's bounding box, and the point (1, 1) represents its bottom-right " +
      'corner. Other values are interpolated in between',
  ),
  arrowhead: ArrowheadSchema.describe('The type of line ending to draw at this endpoint.'),
})

export const RelSchema = z
  .object({
    ...IdentifiableSchema.shape,
    from: RelEndpointSchema.describe('The first endpoint of this rel.'),
    to: RelEndpointSchema.describe('The second endpoint of this rel.'),
    color: HexColorSchema.describe(
      'The color to use to draw the line connecting the two items, in hex color format.',
    ),
    weight: LineWeightSchema.describe(
      'The emphasis to put on the arrow. Heavier arrows are more prominent than lighter ones, ' +
        'for example, they might be drawn with a thicker line.',
    ),
  })
  .describe(
    'A "rel" is a relation between two tapestry items. Rels are visually represented as lines or arrows, ' +
      'to indicate the connection between the items. The two items are labeled "from" and "to", although these labels ' +
      'are only provisional as a rel can also point in reverse or be bi-directional. Rels can also be commented on.',
  )

export type Arrowhead = z.infer<typeof ArrowheadSchema>
export type LineWeight = z.infer<typeof LineWeightSchema>
export type RelEndpoint = z.infer<typeof RelEndpointSchema>
export type Rel = z.infer<typeof RelSchema>
