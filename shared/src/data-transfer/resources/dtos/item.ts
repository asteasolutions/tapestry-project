import { DistributiveOmit } from 'tapestry-core/src/type-utils.js'
import { BaseResourceDto } from './common.js'
import { TapestryDto } from './tapestry.js'
import {
  ActionButtonItem,
  AudioItem,
  BookItem,
  ImageItem,
  Item,
  PdfItem,
  TextItem,
  VideoItem,
  WebpageItem,
} from 'tapestry-core/src/data-format/schemas/item.js'
import { Size } from 'tapestry-core/src/data-format/schemas/common.js'

interface BaseItemDto extends BaseResourceDto {
  tapestry?: TapestryDto | null
  tapestryId: string
  scheduledThumbnailProcessing?: 'derive' | 'recreate' | null
}

interface BaseMediaItemDto extends BaseItemDto {
  internallyHosted: boolean
}

interface ThumbnailUpdate {
  thumbnail?: {
    source: string
    size: Size
  } | null
}

type ItemReadonlyProps = keyof BaseItemDto | 'thumbnail'
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type NonNullishType = { type: {} }

type CreateDto<I extends Item & BaseItemDto> = Omit<I, Exclude<ItemReadonlyProps, 'tapestryId'>>
type CreateInTapestryDto<I extends Item & BaseItemDto> = Omit<I, Exclude<ItemReadonlyProps, 'id'>>
type UpdateDto<I extends Item & BaseItemDto> = Omit<Partial<I>, ItemReadonlyProps> &
  NonNullishType &
  ThumbnailUpdate

export interface TextItemDto extends TextItem, BaseItemDto {}

export type TextItemCreateDto = CreateDto<TextItemDto>
export type TextItemCreateInTapestryDto = CreateInTapestryDto<TextItemDto>
export type TextItemUpdateDto = UpdateDto<TextItemDto>

export interface ActionButtonItemDto extends ActionButtonItem, BaseItemDto {}
export type ActionButtonItemCreateDto = CreateDto<ActionButtonItemDto>
export type ActionButtonItemCreateInTapestryDto = CreateInTapestryDto<ActionButtonItemDto>
export type ActionButtonItemUpdateDto = UpdateDto<ActionButtonItemDto>

export interface AudioItemDto extends AudioItem, BaseMediaItemDto {}
export interface VideoItemDto extends VideoItem, BaseMediaItemDto {}
export interface BookItemDto extends BookItem, BaseMediaItemDto {}
export interface ImageItemDto extends ImageItem, BaseMediaItemDto {}
export interface PdfItemDto extends PdfItem, BaseMediaItemDto {}
export interface WebpageItemDto extends WebpageItem, BaseMediaItemDto {}

export type MediaItemDto =
  | AudioItemDto
  | BookItemDto
  | ImageItemDto
  | PdfItemDto
  | VideoItemDto
  | WebpageItemDto

type MediaItemReadonlyProps = ItemReadonlyProps | 'internallyHosted'

type BaseMediaItemWriteProps = MediaItemDto & {
  skipSourceResolution?: boolean
}

export type MediaItemCreateDto = DistributiveOmit<
  BaseMediaItemWriteProps,
  Exclude<MediaItemReadonlyProps, 'tapestryId'>
>

// When creating items as part of a tapestry, the client needs to generate and pass IDs
// so that the backend can know which items each rel points to
export type MediaItemCreateInTapestryDto = DistributiveOmit<
  BaseMediaItemWriteProps,
  Exclude<MediaItemReadonlyProps, 'id'>
>

export type MediaItemUpdateDto = DistributiveOmit<
  Partial<BaseMediaItemWriteProps>,
  MediaItemReadonlyProps
> &
  NonNullishType &
  ThumbnailUpdate

export type ItemDto = TextItemDto | ActionButtonItemDto | MediaItemDto
export type ItemCreateDto = TextItemCreateDto | ActionButtonItemCreateDto | MediaItemCreateDto
export type ItemCreateInTapestryDto =
  | TextItemCreateInTapestryDto
  | ActionButtonItemCreateInTapestryDto
  | MediaItemCreateInTapestryDto
export type ItemUpdateDto = TextItemUpdateDto | ActionButtonItemUpdateDto | MediaItemUpdateDto
