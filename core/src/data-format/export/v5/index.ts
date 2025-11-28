import z from 'zod/v4'
import { ExportV4Schema, MediaItemSchema, TextItemSchema } from '../v4'
import { HexColorSchema } from '../../schemas/common'
import { commonItemProps } from '../../schemas/item'

const ActionButtonItemSchema = z.object({
  ...commonItemProps.base,
  type: z.literal('actionButton'),
  actionType: z.enum(['link']),
  action: z.string().nullish(),
  text: z.string(),
  backgroundColor: HexColorSchema.nullish(),
})

const ItemSchema = z.discriminatedUnion('type', [
  ...MediaItemSchema.options,
  TextItemSchema,
  ActionButtonItemSchema,
])

export const ExportV5Schema = z.object({
  ...ExportV4Schema.shape,
  version: z.literal(5),
  items: z.array(ItemSchema).nullish(),
})

export type ExportV5 = z.infer<typeof ExportV5Schema>
