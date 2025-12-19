import z from 'zod/v4'
import { HexColorSchema, IdentifiableSchema, PointSchema, SizeSchema } from './common.js'

export const KNOWN_WEBPAGE_TYPES = ['youtube', 'vimeo', 'iaWayback', 'iaAudio', 'iaVideo'] as const
export type WebpageType = (typeof KNOWN_WEBPAGE_TYPES)[number]

export const ACTION_BUTTON_TYPE = ['internalLink', 'externalLink'] as const

export const ThumbnailSchema = z.object({
  source: z.string().describe('The URL of the thumbnail image.'),
  size: SizeSchema.describe('The dimensions of the thumbnail image, in pixels.'),
})

export const commonItemProps = {
  base: {
    ...IdentifiableSchema.shape,
    // TODO: Should we support other types of positioning and sizing?
    position: PointSchema.describe('The position of this item on the tapestry canvas, in pixels.'),
    size: SizeSchema.describe('The size of this item on the tapestry canvas, in pixels.'),
    title: z
      .string()
      .nullish()
      .describe('Optional title that will appear near the item on the canvas.'),
    dropShadow: z
      .boolean()
      .describe(
        'Whether the item should have a slight drop shadow to appear as if it is slightly elevated from the canvas.',
      ),
    groupId: z.string().nullish().describe('The id of the group the item belongs to.'),
    notes: z.string().nullish().describe('User provided notes about the item'),
    customThumbnail: z.string().nullish().describe('The source of a user provided thumbnail image'),
  },
  source: {
    source: z
      .string()
      .describe('The URL from which the contents of this media item will be loaded.'),
  },
  playbackRange: {
    startTime: z.number().nullish().describe('Optional start time for audio or video content.'),
    stopTime: z.number().nullish().describe('Optional stop time for audio or video content.'),
  },
  thumbnail: {
    thumbnail: ThumbnailSchema.nullish().describe(
      'An image which will be displayed in place of the item in some cases to reduce loading time and network traffic.',
    ),
  },
}

export const TextItemSchema = z.object({
  ...commonItemProps.base,
  type: z.literal('text').describe('The type of this item.'),
  text: z.string().describe('The HTML content of this text frame.'),
  backgroundColor: HexColorSchema.nullish().describe(
    'An optional background color on top of which the HTML-formatted text will be displayed.',
  ),
})

export const ActionButtonItemSchema = z.object({
  ...commonItemProps.base,
  type: z.literal('actionButton').describe('The type of this item.'),
  actionType: z.enum(ACTION_BUTTON_TYPE).describe('The type of action that the button performs.'),
  action: z.string().nullish().describe('The action associated with the button.'),
  text: z.string().describe('The HTML content of this button.'),
  backgroundColor: HexColorSchema.nullish().describe(
    'An optional background color on top of which the HTML-formatted text will be displayed.',
  ),
})

export const AudioItemSchema = z.object({
  type: z.literal('audio').describe('The type of this item.'),
  ...commonItemProps.base,
  ...commonItemProps.source,
  ...commonItemProps.playbackRange,
})

export const BookItemSchema = z.object({
  type: z.literal('book').describe('The type of this item.'),
  ...commonItemProps.base,
  ...commonItemProps.source,
})

export const ImageItemSchema = z.object({
  type: z.literal('image').describe('The type of this item.'),
  ...commonItemProps.base,
  ...commonItemProps.source,
})

export const PdfItemSchema = z.object({
  type: z.literal('pdf').describe('The type of this item.'),
  ...commonItemProps.base,
  ...commonItemProps.source,
  ...commonItemProps.thumbnail,
  defaultPage: z
    .int()
    .nullish()
    .describe('The number of the page which will be scrolled to when opening the pdf'),
})

export const VideoItemSchema = z.object({
  type: z.literal('video').describe('The type of this item.'),
  ...commonItemProps.base,
  ...commonItemProps.source,
  ...commonItemProps.playbackRange,
  ...commonItemProps.thumbnail,
})

export const WebpageItemSchema = z.object({
  ...commonItemProps.base,
  ...commonItemProps.source,
  ...commonItemProps.thumbnail,
  type: z.literal('webpage').describe('The type of this item.'),
  webpageType: z
    .enum(KNOWN_WEBPAGE_TYPES)
    .nullish()
    .describe(
      'An additional descriptor in case the page falls into one of the special categories of webpages ' +
        'which have additional custom functionalities in the Tapestry viewer. In general these include ' +
        'known sources of audio and video content such as YouTube, Vimeo, and Internet Archive (IA) audio/video ' +
        "pages. Additionally, we have special handling of IA's Wayback Machine pages",
    ),
})

export const MediaItemSchema = z.discriminatedUnion('type', [
  AudioItemSchema,
  BookItemSchema,
  ImageItemSchema,
  PdfItemSchema,
  VideoItemSchema,
  WebpageItemSchema,
])

export const MEDIA_ITEM_TYPES: (ItemType | undefined)[] = MediaItemSchema.options.map(
  (o) => o.shape.type.value,
)

export const ItemSchema = z
  .discriminatedUnion('type', [...MediaItemSchema.options, TextItemSchema, ActionButtonItemSchema])
  .describe(
    'Represents a Tapestry item. Each item takes up a rectangular area on the Tapestry canvas and displays ' +
      'inside it a given type of media content - HTML-formatted text, image, audio, video, PDF, e-book, or webpage.' +
      'Items are the main building blocks of tapestries.',
  )

export type Thumbnail = z.infer<typeof ThumbnailSchema>
export type TextItem = z.infer<typeof TextItemSchema>
export type ActionButtonItem = z.infer<typeof ActionButtonItemSchema>
export type AudioItem = z.infer<typeof AudioItemSchema>
export type BookItem = z.infer<typeof BookItemSchema>
export type ImageItem = z.infer<typeof ImageItemSchema>
export type PdfItem = z.infer<typeof PdfItemSchema>
export type VideoItem = z.infer<typeof VideoItemSchema>
export type WebpageItem = z.infer<typeof WebpageItemSchema>
export type MediaItem = z.infer<typeof MediaItemSchema>
export type Item = z.infer<typeof ItemSchema>

export type ItemType = Item['type']
export type MediaItemType = MediaItem['type']
