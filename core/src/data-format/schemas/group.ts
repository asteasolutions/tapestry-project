import z from 'zod/v4'
import { IdentifiableSchema, HexColorSchema } from './common.js'

export const GroupSchema = z
  .object({
    ...IdentifiableSchema.shape,
    color: HexColorSchema.nullish().describe(
      'The optional background and border color of the group.',
    ),
    hasBorder: z.boolean().describe('Whether the group has a visible border with the group color'),
    hasBackground: z
      .boolean()
      .describe('Whether the group has a visible background with the group color'),
  })
  .describe(
    'A "group" is a logical collection of items. Items in a group behave as one item.' +
      'Dragging or selecting an item from a group respectively drags or selects the whole group. ' +
      'Deleting a group makes the items independent again.',
  )

export type Group = z.infer<typeof GroupSchema>
