import z, { ZodType } from 'zod/v4'
import { BaseResourceSchema } from './common.js'
import { omit } from 'lodash-es'
import {
  TextItemSchema as BaseTextItemSchema,
  ActionButtonItemSchema as BaseActionButtonItemSchema,
  AudioItemSchema as BaseAudioItemSchema,
  VideoItemSchema as BaseVideoItemSchema,
  BookItemSchema as BaseBookItemSchema,
  PdfItemSchema as BasePdfItemSchema,
  ImageItemSchema as BaseImageItemSchema,
  WebpageItemSchema as BaseWebpageItemSchema,
} from 'tapestry-core/src/data-format/schemas/item.js'
import { IdentifiableSchema } from 'tapestry-core/src/data-format/schemas/common.js'

const readonlyProps = {
  tapestryId: z.string(),
}

// XXX: Zod doesn't support applying "omit" or "partial" directly to a discriminated union for now.
// The workaround is to create a new discriminated union with a list of modified types. Therefore
// we create all versions of each item type separately here and then group them in unions below.
// https://github.com/colinhacks/zod/discussions/1434

function constructItemSchemas<P extends Record<string, ZodType>>(
  itemProps: P,
  createOmitProps: (keyof P)[] = [],
) {
  createOmitProps.push('id')
  const itemSchema = z.object({
    ...BaseResourceSchema.shape,
    ...readonlyProps,
    ...itemProps,
  })
  const createItemProps = omit(itemProps, createOmitProps) as P
  const itemCreateSchema = z.object({
    ...readonlyProps,
    ...createItemProps,
  })

  // When creating items as part of a tapestry, the client needs to generate and pass IDs
  // so that the backend can know which items each rel points to
  const itemCreateInTapestrySchema = z.object({
    ...IdentifiableSchema.shape,
    ...createItemProps,
  })

  const { type, ...otherProps } = itemProps
  const partialProps = z
    .object({
      ...(omit(otherProps, createOmitProps) as Omit<P, 'type'>),
    })
    .partial()
  const itemUpdateSchema = z.object({ ...partialProps.shape, type: type as P['type'] })
  return [itemSchema, itemCreateSchema, itemCreateInTapestrySchema, itemUpdateSchema] as const
}

function constructMediaItemSchemas<P extends Record<string, ZodType>>(props: P) {
  return constructItemSchemas(
    {
      ...props,
      internallyHosted: z
        .boolean()
        .describe(
          'Whether the content of this media item is hosted on Tapestry project infrastructure, or externally.',
        ),
      // XXX: This property is needed only in create and update DTOs but there is no easy way to insert it just there
      // so we define it for all media item DTOs. Don't worry, the DTO TS interfaces define it properly, this here only
      // affects the zod schemas.
      skipSourceResolution: z.boolean().optional(),
    },
    ['internallyHosted'],
  )
}

export const [
  TextItemSchema,
  TextItemCreateSchema,
  TextItemCreateInTapestrySchema,
  TextItemUpdateSchema,
] = constructItemSchemas(BaseTextItemSchema.shape)

export const [
  ActionButtonItemSchema,
  ActionButtonItemCreateSchema,
  ActionButtonItemCreateInTapestrySchema,
  ActionButtonItemUpdateSchema,
] = constructItemSchemas(BaseActionButtonItemSchema.shape)

export const [
  AudioItemSchema,
  AudioItemCreateSchema,
  AudioItemCreateInTapestrySchema,
  AudioItemUpdateSchema,
] = constructMediaItemSchemas(BaseAudioItemSchema.shape)
export const [
  BookItemSchema,
  BookItemCreateSchema,
  BookItemCreateInTapestrySchema,
  BookItemUpdateSchema,
] = constructMediaItemSchemas(BaseBookItemSchema.shape)
export const [
  ImageItemSchema,
  ImageItemCreateSchema,
  ImageItemCreateInTapestrySchema,
  ImageItemUpdateSchema,
] = constructMediaItemSchemas(BaseImageItemSchema.shape)
export const [
  PdfItemSchema,
  PdfItemCreateSchema,
  PdfItemCreateInTapestrySchema,
  PdfItemUpdateSchema,
] = constructMediaItemSchemas(BasePdfItemSchema.shape)
export const [
  VideoItemSchema,
  VideoItemCreateSchema,
  VideoItemCreateInTapestrySchema,
  VideoItemUpdateSchema,
] = constructMediaItemSchemas(BaseVideoItemSchema.shape)
export const [
  WebpageItemSchema,
  WebpageItemCreateSchema,
  WebpageItemCreateInTapestrySchema,
  WebpageItemUpdateSchema,
] = constructMediaItemSchemas(BaseWebpageItemSchema.shape)

export const MediaItemSchema = z.discriminatedUnion('type', [
  AudioItemSchema,
  BookItemSchema,
  ImageItemSchema,
  PdfItemSchema,
  VideoItemSchema,
  WebpageItemSchema,
])

export const MediaItemCreateSchema = z.discriminatedUnion('type', [
  AudioItemCreateSchema,
  BookItemCreateSchema,
  ImageItemCreateSchema,
  PdfItemCreateSchema,
  VideoItemCreateSchema,
  WebpageItemCreateSchema,
])

export const MediaItemCreateInTapestrySchema = z.discriminatedUnion('type', [
  AudioItemCreateInTapestrySchema,
  BookItemCreateInTapestrySchema,
  ImageItemCreateInTapestrySchema,
  PdfItemCreateInTapestrySchema,
  VideoItemCreateInTapestrySchema,
  WebpageItemCreateInTapestrySchema,
])

export const MediaItemUpdateSchema = z.discriminatedUnion('type', [
  AudioItemUpdateSchema,
  BookItemUpdateSchema,
  ImageItemUpdateSchema,
  PdfItemUpdateSchema,
  VideoItemUpdateSchema,
  WebpageItemUpdateSchema,
])

export const ItemSchema = z
  .discriminatedUnion('type', [...MediaItemSchema.options, TextItemSchema, ActionButtonItemSchema])
  .describe(
    'Represents a Tapestry item. Each item takes up a rectangular area on the Tapestry canvas and displays ' +
      'inside it a given type of media content - HTML-formatted text, image, audio, video, PDF, e-book, or webpage.' +
      'Items are the main building blocks of tapestries.',
  )

export const ItemCreateSchema = z
  .discriminatedUnion('type', [
    ...MediaItemCreateSchema.options,
    TextItemCreateSchema,
    ActionButtonItemCreateSchema,
  ])
  .describe('A set of parameters used to create a new Tapestry item.')

export const ItemCreateInTapestrySchema = z
  .discriminatedUnion('type', [
    ...MediaItemCreateInTapestrySchema.options,
    TextItemCreateInTapestrySchema,
    ActionButtonItemCreateInTapestrySchema,
  ])
  .describe(
    'A set of parameters used to create a new Tapestry item in cases where the tapestry instance can be inferred ' +
      "from the context, i.e. the parameters don't contain a reference to a tapestry",
  )

export const ItemUpdateSchema = z
  .discriminatedUnion('type', [
    ...MediaItemUpdateSchema.options,
    TextItemUpdateSchema,
    ActionButtonItemUpdateSchema,
  ])
  .describe('A set of parameters used to modify an existing Tapestry item.')
