import z from 'zod/v4'
import {
  TextItemSchema as TextItemSchemaV3,
  AudioItemSchema as AudioItemSchemaV3,
  BookItemSchema as BookItemSchemaV3,
  ImageItemSchema as ImageItemSchemaV3,
  PDFItemSchema as PDFItemSchemaV3,
  VideoItemSchema as VideoItemSchemaV3,
  WebpageItemSchema as WebpageItemSchemaV3,
  RelSchema as RelSchemaV3,
  ExportV3Schema,
} from '../v3/index.js'
import { KNOWN_WEBPAGE_TYPES } from '../../schemas/item.js'
import { ThumbnailSchema } from '../../schemas/item.js'

const GroupSchema = z.object({
  id: z.string(),
  color: z.string().nullish(),
  hasBorder: z.boolean(),
  hasBackground: z.boolean(),
})

const ItemGroupIdSchema = z.object({ groupId: z.string().nullish() })
const ItemNotesSchema = z.object({ notes: z.string().nullish() })
const NullishTitleSchema = z.object({ title: z.string().nullish() })
const CustomThumbnailSchema = z.object({ customThumbnail: z.string().nullish() })

export const TextItemSchema = z.object({
  ...TextItemSchemaV3.shape,
  ...ItemGroupIdSchema.shape,
  ...ItemNotesSchema.shape,
  ...NullishTitleSchema.shape,
  ...CustomThumbnailSchema.shape,
})
export const AudioItemSchema = z.object({
  ...AudioItemSchemaV3.shape,
  ...ItemGroupIdSchema.shape,
  ...ItemNotesSchema.shape,
  ...NullishTitleSchema.shape,
  ...CustomThumbnailSchema.shape,
})
export const BookItemSchema = z.object({
  ...BookItemSchemaV3.shape,
  ...ItemGroupIdSchema.shape,
  ...ItemNotesSchema.shape,
  ...NullishTitleSchema.shape,
  ...CustomThumbnailSchema.shape,
})
export const ImageItemSchema = z.object({
  ...ImageItemSchemaV3.shape,
  ...ItemGroupIdSchema.shape,
  ...ItemNotesSchema.shape,
  ...NullishTitleSchema.shape,
  ...CustomThumbnailSchema.shape,
})
export const PDFItemSchema = z.object({
  ...PDFItemSchemaV3.shape,
  ...ItemGroupIdSchema.shape,
  ...ItemNotesSchema.shape,
  ...NullishTitleSchema.shape,
  ...CustomThumbnailSchema.shape,
  defaultPage: z.int().nullish(),
})
export const VideoItemSchema = z.object({
  ...VideoItemSchemaV3.shape,
  ...ItemGroupIdSchema.shape,
  ...ItemNotesSchema.shape,
  ...NullishTitleSchema.shape,
  thumbnail: ThumbnailSchema.nullish(),
  ...CustomThumbnailSchema.shape,
})
export const WebpageItemSchema = z.object({
  ...WebpageItemSchemaV3.shape,
  ...ItemGroupIdSchema.shape,
  ...ItemNotesSchema.shape,
  ...NullishTitleSchema.shape,
  webpageType: z.enum(KNOWN_WEBPAGE_TYPES).nullish(),
  timestamp: z.string().nullish(),
  ...CustomThumbnailSchema.shape,
})

export const MediaItemSchema = z.discriminatedUnion('type', [
  AudioItemSchema,
  BookItemSchema,
  ImageItemSchema,
  PDFItemSchema,
  VideoItemSchema,
  WebpageItemSchema,
])

const ItemSchema = z.discriminatedUnion('type', [...MediaItemSchema.options, TextItemSchema])

export const RelSchema = z.object({
  ...RelSchemaV3.shape,
  weight: z.enum(['light', 'medium', 'heavy']),
})

export const ItemPresentationStepSchema = z.object({
  id: z.string(),
  prevStepId: z.string().nullish(),
  type: z.literal('item'),
  itemId: z.string(),
})

export const GroupPresentationStepSchema = z.object({
  id: z.string(),
  prevStepId: z.string().nullish(),
  type: z.literal('group'),
  groupId: z.string(),
})

export const PresentationStepSchema = z.discriminatedUnion('type', [
  ItemPresentationStepSchema,
  GroupPresentationStepSchema,
])

export const ExportV4Schema = z.object({
  ...ExportV3Schema.shape,
  version: z.literal(4),
  items: z.array(ItemSchema).nullish(),
  groups: z.array(GroupSchema).nullish(),
  rels: z.array(RelSchema).nullish(),
  presentation: z.array(PresentationStepSchema).nullish(),
})

export type ExportV4 = z.infer<typeof ExportV4Schema>
