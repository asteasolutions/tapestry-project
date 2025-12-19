import z from 'zod/v4'
import {
  ExportV5Schema,
  MediaItemSchema as MediaItemSchemaV5,
  ActionButtonItemSchema as ActionButtonItemSchemaV5,
} from '../v5'
import { TextItemSchema as TextItemSchemaV4 } from '../v4'

const ActionButtonItemSchema = z.object({
  ...ActionButtonItemSchemaV5.shape,
  actionType: z.enum(['internalLink', 'externalLink']),
})

const ItemSchema = z.discriminatedUnion('type', [
  ...MediaItemSchemaV5.options,
  TextItemSchemaV4,
  ActionButtonItemSchema,
])

export const ExportV6Schema = z.object({
  ...ExportV5Schema.shape,
  version: z.literal(6),
  items: z.array(ItemSchema).nullish(),
})

export type ExportV6 = z.infer<typeof ExportV6Schema>
