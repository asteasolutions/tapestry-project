import z from 'zod/v4'
import {
  ExportV4Schema,
  AudioItemSchemaV4,
  BookItemSchemaV4,
  ImageItemSchemaV4,
  PDFItemSchemaV4,
  VideoItemSchemaV4,
  WebpageItemSchemaV4,
  TextItemSchemaV4,
} from '../v4'
import { HexColorSchema } from '../../schemas/common'
import { commonItemProps } from '../../schemas/item'
import { ThumbnailSchema } from '../v2'

export const ActionButtonItemSchema = z.object({
  ...commonItemProps.base,
  type: z.literal('actionButton'),
  actionType: z.enum(['link']),
  action: z.string().nullish(),
  text: z.string(),
  backgroundColor: HexColorSchema.nullish(),
})

export const PDFItemSchemaV5 = z.object({
  ...PDFItemSchemaV4.shape,
  thumbnail: ThumbnailSchema.nullish(),
})

export const MediaItemSchema = z.discriminatedUnion('type', [
  AudioItemSchemaV4,
  BookItemSchemaV4,
  ImageItemSchemaV4,
  PDFItemSchemaV5,
  VideoItemSchemaV4,
  WebpageItemSchemaV4,
])

export const ItemSchema = z.discriminatedUnion('type', [
  ...MediaItemSchema.options,
  TextItemSchemaV4,
  ActionButtonItemSchema,
])

export const ExportV5Schema = z.object({
  ...ExportV4Schema.shape,
  version: z.literal(5),
  items: z.array(ItemSchema).nullish(),
})

export type ExportV5 = z.infer<typeof ExportV5Schema>
