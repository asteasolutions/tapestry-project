import z from 'zod/v4'
import { Item, ItemSchema } from './item.js'
import { Rel, RelSchema } from './rel.js'
import { HexColorSchema, IdentifiableSchema, RectangleSchema } from './common.js'
import { GroupSchema } from './group.js'

export const TapestrySchema = z
  .object({
    ...IdentifiableSchema.shape,
    title: z.string().nonempty().describe('The title of this tapestry.'),
    description: z.string().nullish().describe('An optional description of the tapestry.'),
    items: ItemSchema.array().describe('The list of items in this tapestry.'),
    rels: RelSchema.array().describe(
      'The list of rels, i.e. relations between items in the tapestry.',
    ),
    groups: GroupSchema.array().describe('The list of item groups in the tapestry.'),
    startView: RectangleSchema.nullish().describe(
      'A rectangular area on the tapestry canvas which should be initially visible when a user opens the tapestry. ' +
        'If not specified, the tapestry is initially displayed so that all its items fit on the screen.',
    ),
    theme: z
      .enum(['light', 'dark'])
      .describe(
        'The theme to use for the built-in controls provided by the Tapestry viewing or editing application.',
      ),
    background: HexColorSchema.describe(
      'The background color to use for the entire tapestry canvas. In hex color format.',
    ),
    thumbnail: z
      .string()
      .nullish()
      .describe(
        'An URL of an image used to represent the tapestry, typically a screenshot of the tapestry itself. ' +
          "In some cases a thumbnail may not be available, for example if it hasn't been generated or uploaded yet",
      ),
  })
  .describe(
    'A Tapestry is a digital format describing an endless canvas that hosts a variety of interconnected ' +
      'multimedia items. Authors can create tapestries on various topics and share them with other users to view and ' +
      'comment. The items that can be included in a tapestry can be HTML-formatted text frames, embedded webpages, ' +
      'images, audio, video, and others. Tapestry items can be connected with arrows, a.k.a. "rels".',
  )

export type Tapestry = z.infer<typeof TapestrySchema>
export type TapestryElement = Item | Rel
