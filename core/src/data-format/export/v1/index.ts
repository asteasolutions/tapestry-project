import z from 'zod/v4'
import { IdentifiableSchema, HexColorSchema, RectangleSchema } from '../../schemas/common.js'
import {
  BaseItemSchema as BaseItemSchemaV0,
  TextItemSchema as TextItemSchemaV0,
  AudioItemSchema as AudioItemSchemaV0,
  BookItemSchema as BookItemSchemaV0,
  ImageItemSchema as ImageItemSchemaV0,
  PDFItemSchema as PDFItemSchemaV0,
  VideoItemSchema as VideoItemSchemaV0,
  WaybackPageItemSchema as WaybackPageItemSchemaV0,
  WebpageItemSchema as WebpageItemSchemaV0,
  RelSchema as RelSchemaV0,
} from '../v0/index.js'

export const BaseItemSchema = z.object({
  ...BaseItemSchemaV0.shape,
  ...IdentifiableSchema.shape,
  tapestryId: z.string(),
  dropShadow: z.boolean(),
})

export const TextItemSchema = z.object({ ...TextItemSchemaV0.shape, ...BaseItemSchema.shape })

const BaseMediaItemSchema = z.object({
  ...IdentifiableSchema.shape,
  source: z.string(),
  internallyHosted: z.boolean(),
})

export const AudioItemSchema = z.object({
  ...AudioItemSchemaV0.shape,
  ...BaseMediaItemSchema.shape,
  skipSeconds: z.number().nullish(),
})
export const BookItemSchema = z.object({ ...BookItemSchemaV0.shape, ...BaseMediaItemSchema.shape })
export const ImageItemSchema = z.object({
  ...ImageItemSchemaV0.shape,
  ...BaseMediaItemSchema.shape,
})
export const PDFItemSchema = z.object({ ...PDFItemSchemaV0.shape, ...BaseMediaItemSchema.shape })
export const VideoItemSchema = z.object({
  ...VideoItemSchemaV0.shape,
  ...BaseMediaItemSchema.shape,
  skipSeconds: z.number().nullish(),
})
export const WaybackPageItemSchema = z.object({
  ...WaybackPageItemSchemaV0.shape,
  ...BaseMediaItemSchema.shape,
  type: z.literal('waybackPage'),
  timestamp: z.string().nullish(),
})
export const WebpageItemSchema = z.object({
  ...WebpageItemSchemaV0.shape,
  ...BaseMediaItemSchema.shape,
  skipSeconds: z.number().nullish(),
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

export const RelSchema = z.object({
  ...RelSchemaV0.shape,
  ...IdentifiableSchema.shape,
  tapestryId: z.string(),
})

export const ExportV1Schema = z.object({
  version: z.literal(1),
  id: z.string(),
  title: z.string(),
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

export type ExportV1 = z.infer<typeof ExportV1Schema>
