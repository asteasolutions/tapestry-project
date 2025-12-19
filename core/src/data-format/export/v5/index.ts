import z from 'zod/v4'
import {
  ExportV4Schema,
  AudioItemSchema,
  BookItemSchema,
  ImageItemSchema,
  PDFItemSchema as PDFItemSchemaV4,
  VideoItemSchema,
  WebpageItemSchema,
  TextItemSchema,
} from '../v4'
import { HexColorSchema } from '../../schemas/common'
import { commonItemProps, ThumbnailSchema } from '../../schemas/item'

export const ActionButtonItemSchema = z.object({
  ...commonItemProps.base,
  type: z.literal('actionButton'),
  actionType: z.enum(['link']),
  action: z.string().nullish(),
  text: z.string(),
  backgroundColor: HexColorSchema.nullish(),
})

export const PDFItemSchema = z.object({
  ...PDFItemSchemaV4.shape,
  thumbnail: ThumbnailSchema.nullish(),
})

export const MediaItemSchema = z.discriminatedUnion('type', [
  AudioItemSchema,
  BookItemSchema,
  ImageItemSchema,
  PDFItemSchema,
  VideoItemSchema,
  WebpageItemSchema,
])

export const ItemSchema = z.discriminatedUnion('type', [
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
