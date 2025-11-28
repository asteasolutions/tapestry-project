import { DistributiveOmit } from 'tapestry-core/src/type-utils.js'
import { BaseResourceDto } from './common.js'
import { TapestryDto } from './tapestry.js'
import {
  ActionButtonItem,
  AudioItem,
  BookItem,
  ImageItem,
  PdfItem,
  TextItem,
  VideoItem,
  WebpageItem,
} from 'tapestry-core/src/data-format/schemas/item.js'

interface BaseItemDto extends BaseResourceDto {
  tapestry?: TapestryDto | null
  tapestryId: string
}

interface BaseMediaItemDto extends BaseItemDto {
  internallyHosted: boolean
}

type ItemReadonlyProps = keyof BaseItemDto
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type NonNullishType = { type: {} }

export interface TextItemDto extends TextItem, BaseItemDto {}

export type TextItemCreateDto = Omit<TextItemDto, Exclude<ItemReadonlyProps, 'tapestryId'>>
export type TextItemCreateInTapestryDto = Omit<TextItemDto, Exclude<ItemReadonlyProps, 'id'>>
export type TextItemUpdateDto = Omit<Partial<TextItemDto>, ItemReadonlyProps> & NonNullishType

export interface ActionButtonItemDto extends ActionButtonItem, BaseItemDto {}

export type ActionButtonItemCreateDto = Omit<
  ActionButtonItemDto,
  Exclude<ItemReadonlyProps, 'tapestryId'>
>
export type ActionButtonItemCreateInTapestryDto = Omit<
  ActionButtonItemDto,
  Exclude<ItemReadonlyProps, 'id'>
>
export type ActionButtonItemUpdateDto = Omit<Partial<ActionButtonItemDto>, ItemReadonlyProps> &
  NonNullishType

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

type MediaItemReadonlyProps = ItemReadonlyProps | 'thumbnail' | 'internallyHosted'

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
  NonNullishType

export type ItemDto = TextItemDto | ActionButtonItemDto | MediaItemDto
export type ItemCreateDto = TextItemCreateDto | ActionButtonItemCreateDto | MediaItemCreateDto
export type ItemCreateInTapestryDto =
  | TextItemCreateInTapestryDto
  | ActionButtonItemCreateInTapestryDto
  | MediaItemCreateInTapestryDto
export type ItemUpdateDto = TextItemUpdateDto | ActionButtonItemUpdateDto | MediaItemUpdateDto
