import z from 'zod/v4'
import {
  BaseItemSchema as BaseItemSchemaV2,
  TextItemSchema as TextItemSchemaV2,
  AudioItemSchema as AudioItemSchemaV2,
  BookItemSchema as BookItemSchemaV2,
  ImageItemSchema as ImageItemSchemaV2,
  PDFItemSchema as PDFItemSchemaV2,
  VideoItemSchema as VideoItemSchemaV2,
  WaybackPageItemSchema as WaybackPageItemSchemaV2,
  WebpageItemSchema as WebpageItemSchemaV2,
  RelSchema as RelSchemaV2,
  ExportV2Schema,
} from '../v2/index.js'

export const BaseItemSchema = BaseItemSchemaV2

export const TextItemSchema = TextItemSchemaV2

const PlayableMediaItemSchema = z.object({
  startTime: z.number().nullish(),
  stopTime: z.number().nullish(),
})

export const AudioItemSchema = z.object({
  ...AudioItemSchemaV2.omit({ skipSeconds: true }).shape,
  ...PlayableMediaItemSchema.shape,
})

export const BookItemSchema = BookItemSchemaV2
export const ImageItemSchema = ImageItemSchemaV2
export const PDFItemSchema = PDFItemSchemaV2
export const VideoItemSchema = z.object({
  ...VideoItemSchemaV2.omit({ skipSeconds: true }).shape,
  ...PlayableMediaItemSchema.shape,
})

export const WaybackPageItemSchema = WaybackPageItemSchemaV2

export const WebpageItemSchema = z.object({
  ...WebpageItemSchemaV2.omit({ skipSeconds: true }).shape,
  ...PlayableMediaItemSchema.shape,
})

const MediaItemSchema = z.discriminatedUnion('type', [
  AudioItemSchema,
  BookItemSchema,
  ImageItemSchema,
  PDFItemSchema,
  VideoItemSchema,
  WaybackPageItemSchema,
  WebpageItemSchema,
])

const ItemSchema = z.discriminatedUnion('type', [...MediaItemSchema.options, TextItemSchema])

export const RelSchema = RelSchemaV2

export const ExportV3Schema = z.object({
  ...ExportV2Schema.shape,
  version: z.literal(3),
  items: z.array(ItemSchema).nullish(),
})

export type ExportV3 = z.infer<typeof ExportV3Schema>
