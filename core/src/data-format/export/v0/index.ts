import z from 'zod/v4'
import { HexColorSchema, PointSchema, RectangleSchema, SizeSchema } from '../../schemas/common.js'

const MediaItemSourceSchema = z.string().or(z.instanceof(File))

export const BaseItemSchema = z.object({
  id: z.string().nonempty(),
  position: PointSchema,
  size: SizeSchema,
  title: z.string(),
  dropShadow: z.boolean().nullish(),
})

export const TextItemSchema = BaseItemSchema.extend({
  type: z.literal('text'),
  text: z.string(),
  backgroundColor: HexColorSchema.optional(),
})

const BaseMediaItemSchema = BaseItemSchema.extend({
  source: MediaItemSourceSchema,
})

export const AudioItemSchema = BaseMediaItemSchema.extend({
  type: z.literal('audio'),
})

export const BookItemSchema = BaseMediaItemSchema.extend({
  type: z.literal('book'),
})

export const ImageItemSchema = BaseMediaItemSchema.extend({
  type: z.literal('image'),
})

export const PDFItemSchema = BaseMediaItemSchema.extend({
  type: z.literal('pdf'),
})

export const VideoItemSchema = BaseMediaItemSchema.extend({
  type: z.literal('video'),
})

export const WaybackPageItemSchema = BaseMediaItemSchema.extend({
  type: z.literal('wayback-page'),
  source: z.string(),
  timestamp: z.string().optional(),
})

export const WebpageItemSchema = BaseMediaItemSchema.extend({
  type: z.literal('webpage'),
})

const ItemSchema = z.union([
  AudioItemSchema,
  BookItemSchema,
  ImageItemSchema,
  PDFItemSchema,
  VideoItemSchema,
  WaybackPageItemSchema,
  WebpageItemSchema,
  TextItemSchema,
])

const ArrowheadSchema = z.enum(['none', 'arrow'])

const RelEndpointSchema = z.object({
  itemId: z.string(),
  anchor: PointSchema,
  arrowhead: ArrowheadSchema,
})

export const RelSchema = z.object({
  id: z.string(),
  from: RelEndpointSchema,
  to: RelEndpointSchema,
  color: HexColorSchema,
})

export const ExportV0Schema = z.object({
  version: z.literal(0).optional(),
  id: z.string(),
  title: z.string(),
  updatedAt: z.coerce.date<Date>(),
  items: ItemSchema.array(),
  rels: RelSchema.array(),
  startView: RectangleSchema.optional(),
  theme: z.enum(['light', 'dark']).nullish(),
  background: HexColorSchema,
  parentId: z.string().optional(),
})

export type ExportV0 = z.infer<typeof ExportV0Schema>
