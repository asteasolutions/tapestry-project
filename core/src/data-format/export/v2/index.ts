import z from 'zod/v4'
import { HexColorSchema, RectangleSchema } from '../../schemas/common.js'
import {
  BaseItemSchema as BaseItemSchemaV1,
  TextItemSchema as TextItemSchemaV1,
  AudioItemSchema as AudioItemSchemaV1,
  BookItemSchema as BookItemSchemaV1,
  ImageItemSchema as ImageItemSchemaV1,
  PDFItemSchema as PDFItemSchemaV1,
  VideoItemSchema as VideoItemSchemaV1,
  WaybackPageItemSchema as WaybackPageItemSchemaV1,
  WebpageItemSchema as WebpageItemSchemaV1,
  RelSchema as RelSchemaV1,
} from '../v1/index.js'
import { ThumbnailSchema } from '../../schemas/item.js'

const ThumbnailWithTimestampSchema = ThumbnailSchema.extend({
  timestamp: z.string().nullish(),
})

export const BaseItemSchema = BaseItemSchemaV1.omit({
  tapestryId: true,
})

export const TextItemSchema = TextItemSchemaV1.omit({ tapestryId: true }).extend({
  backgroundColor: HexColorSchema.nullish(),
})

export const BaseMediaItemSchema = BaseItemSchema.extend({
  source: z.string(),
  internallyHosted: z.boolean(),
})

export const AudioItemSchema = z.object({
  ...AudioItemSchemaV1.shape,
  ...BaseMediaItemSchema.shape,
})

export const BookItemSchema = z.object({ ...BookItemSchemaV1.shape, ...BaseMediaItemSchema.shape })

export const ImageItemSchema = z.object({
  ...ImageItemSchemaV1.shape,
  ...BaseMediaItemSchema.shape,
})

export const PDFItemSchema = z.object({ ...PDFItemSchemaV1.shape, ...BaseMediaItemSchema.shape })

export const VideoItemSchema = z.object({
  ...VideoItemSchemaV1.shape,
  ...BaseMediaItemSchema.shape,
})

export const WaybackPageItemSchema = z.object({
  ...WaybackPageItemSchemaV1.shape,
  ...BaseMediaItemSchema.shape,
  thumbnail: ThumbnailWithTimestampSchema.nullish(),
})

export const WebpageItemSchema = z.object({
  ...WebpageItemSchemaV1.shape,
  ...BaseMediaItemSchema.shape,
  thumbnail: ThumbnailSchema.nullish(),
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

export const RelSchema = RelSchemaV1.omit({
  tapestryId: true,
})

export const ExportV2Schema = z.object({
  version: z.literal(2),
  id: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  rels: z.array(RelSchema).nullish(),
  items: z.array(ItemSchema).nullish(),
  createdAt: z.coerce.date<Date>(),
  updatedAt: z.coerce.date<Date>(),
  background: HexColorSchema,
  theme: z.union([z.literal('light'), z.literal('dark')]),
  parentId: z.string().nullish(),
  startView: RectangleSchema.nullish(),
  thumbnail: z.string().nullish(),
})

export type ExportV2 = z.infer<typeof ExportV2Schema>
