import { ORIGIN, Size } from 'tapestry-core/src/lib/geometry'
import {
  ActionButtonItemCreateDto,
  ActionButtonItemDto,
  ActionButtonItemUpdateDto,
  ItemCreateDto,
  ItemDto,
  ItemUpdateDto,
  MediaItemCreateDto,
  MediaItemDto,
  MediaItemUpdateDto,
  TextItemCreateDto,
  TextItemDto,
  TextItemUpdateDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import {
  TapestryDto,
  TapestryCreateDto,
  TapestryUpdateDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/tapestry'
import {
  ImportAssetUrlCreateDto,
  TapestryAssetUrlCreateDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/asset-url'
import {
  EditableTapestryViewModel,
  InteractionMode,
  TapestryWithOwner,
} from '../../pages/tapestry/view-model'
import {
  getImageSize,
  getPDFSize,
  getVideoSize,
  getWebpageSize,
  MediaItemSource,
} from '../../lib/media'
import { resource } from '../../services/rest-resources'
import { isFunction } from 'lodash-es'
import mime from 'mime'
import axios, { AxiosProgressEvent } from 'axios'
import { arrayToIdMap, fileExtension, isBlobURL, isMediaItem } from 'tapestry-core/src/utils'
import { userSettings } from '../../services/user-settings'
import { PublicUserProfileDto } from 'tapestry-shared/src/data-transfer/resources/dtos/user'
import { RelDto, RelUpdateDto } from 'tapestry-shared/src/data-transfer/resources/dtos/rel'
import { CommentThreadsDto } from 'tapestry-shared/src/data-transfer/resources/dtos/comment-threads'
import { produce, WritableDraft } from 'immer'
import { KeysOfUnion } from 'tapestry-core/src/type-utils'
import { GroupDto, GroupUpdateDto } from 'tapestry-shared/src/data-transfer/resources/dtos/group'
import {
  PresentationStepDto,
  PresentationStepUpdateDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/presentation-step'
import { FetchContentTypeProxyDto } from 'tapestry-shared/src/data-transfer/resources/dtos/proxy'
import { ItemType, MediaItem, MediaItemType } from 'tapestry-core/src/data-format/schemas/item'
import { viewModelFromTapestry } from 'tapestry-core-client/src/view-model/utils'

export const EDITABLE_TAPESTRY_PROPS = [
  'background',
  'startView',
  'theme',
  'title',
  'slug',
  'description',
  'visibility',
] as const satisfies (keyof TapestryDto & keyof TapestryUpdateDto)[]
export type EditableTapestryProps = (typeof EDITABLE_TAPESTRY_PROPS)[number]

const BASE_EDITABLE_ITEM_PROPS = [
  'dropShadow',
  'position',
  'size',
  'title',
  'type',
  'groupId',
  'notes',
] as const satisfies (keyof ItemDto & keyof ItemUpdateDto)[]

export const EDITABLE_TEXT_ITEM_PROPS = [
  ...BASE_EDITABLE_ITEM_PROPS,
  'text',
  'backgroundColor',
] as const satisfies (keyof TextItemDto & keyof TextItemUpdateDto)[]
export type EditableTextItemProps = (typeof EDITABLE_TEXT_ITEM_PROPS)[number]

export const EDITABLE_ACTION_BUTTON_ITEM_PROPS = [
  ...BASE_EDITABLE_ITEM_PROPS,
  'text',
  'backgroundColor',
  'action',
  'actionType',
] as const satisfies (keyof ActionButtonItemDto & keyof ActionButtonItemUpdateDto)[]
export type EditableActionButtonItemProps = (typeof EDITABLE_ACTION_BUTTON_ITEM_PROPS)[number]

export const EDITABLE_MEDIA_ITEM_PROPS = [
  ...BASE_EDITABLE_ITEM_PROPS,
  'source',
  'startTime',
  'stopTime',
  'webpageType',
  'defaultPage',
] as const satisfies (KeysOfUnion<MediaItemDto> & KeysOfUnion<MediaItemUpdateDto>)[]
export type EditableMediaItemProps = (typeof EDITABLE_MEDIA_ITEM_PROPS)[number]

export const EDITABLE_REL_PROPS = [
  'from',
  'to',
  'color',
  'weight',
] as const satisfies (keyof RelDto & keyof RelUpdateDto)[]
export type EditableRelProps = (typeof EDITABLE_REL_PROPS)[number]

export const EDITABLE_GROUP_PROPS = [
  'color',
  'hasBackground',
  'hasBorder',
] as const satisfies (keyof GroupDto & keyof GroupUpdateDto)[]
export type EditableGroupProps = (typeof EDITABLE_GROUP_PROPS)[number]

export const EDITABLE_PRESENTATION_STEP_PROPS = [
  'type',
  'itemId',
  'groupId',
  'prevStepId',
] as const satisfies (KeysOfUnion<PresentationStepDto> & KeysOfUnion<PresentationStepUpdateDto>)[]
export type EditablePresentationStepProps = (typeof EDITABLE_PRESENTATION_STEP_PROPS)[number]

export function newTapestry(title: string, slug?: string, description?: string): TapestryCreateDto {
  return {
    title,
    slug,
    description,
    items: [],
    rels: [],
    theme: 'light',
    background: '#ffffff',
    visibility: 'private',
  }
}

export function assignCommentThreads(
  tapestry: WritableDraft<EditableTapestryViewModel>,
  commentThreads: CommentThreadsDto,
) {
  for (const commentThread of commentThreads.threads) {
    const { contextType, contextId } = commentThread
    if (contextType === 'item') {
      tapestry.items[contextId]!.commentThread = commentThread
    } else if (contextType === 'rel') {
      tapestry.rels[contextId]!.commentThread = commentThread
    } else {
      tapestry.commentThread = commentThread
    }
  }
}

export function fromTapestryDto(
  tapestry: TapestryWithOwner<TapestryDto>,
  mode: InteractionMode,
  userAccess: UserAccess,
  commentThreads: CommentThreadsDto,
  presentationSteps: PresentationStepDto[],
): EditableTapestryViewModel {
  const presentationStepViewModels = presentationSteps.map((dto) => ({ dto }))

  const baseViewModel = viewModelFromTapestry(
    {
      ...tapestry,
      // Nested view models will be assigned below, to preserve their DTO types
      items: tapestry.items ?? [],
      rels: [],
      groups: [],
    },
    [],
  )
  const editableTapestryViewModel: EditableTapestryViewModel = {
    ...baseViewModel,
    items: Object.fromEntries(tapestry.items?.map((item) => [item.id, { dto: item }]) ?? []),
    rels: Object.fromEntries(tapestry.rels?.map((rel) => [rel.id, { dto: rel }]) ?? []),
    groups: Object.fromEntries(tapestry.groups?.map((group) => [group.id, { dto: group }]) ?? []),
    presentationSteps: arrayToIdMap(presentationStepViewModels, (step) => step.dto.id),
    slug: tapestry.slug,
    visibility: tapestry.visibility,
    allowForking: tapestry.allowForking,
    interactionMode: mode,
    viewportGuidelines: { spacing: 20 },
    createdAt: tapestry.createdAt,
    updatedAt: tapestry.updatedAt,
    ownerId: tapestry.ownerId,
    owner: tapestry.owner,
    pendingRequests: 0,
    userAccess,
    largeFiles: [],
    collaborators: {},
  }

  return produce(editableTapestryViewModel, (model) => {
    assignCommentThreads(model, commentThreads)
  })
}

export const itemSizes = {
  actionButton: { width: 350, height: 75 },
  audio: { width: 300, height: 50 },
  book: { width: 700, height: 500 },
  image: getImageSize,
  pdf: getPDFSize,
  video: getVideoSize,
  webpage: getWebpageSize,
  text: { height: 200, width: 400 },
} as const satisfies Record<ItemType, Size | ((file: MediaItemSource) => Promise<Size>)>

export function createTextItem(text = '', tapestryId: string): TextItemCreateDto {
  const { textItemColor } = userSettings.getTapestrySettings(tapestryId)
  return {
    type: 'text',
    size: itemSizes.text,
    text,
    title: '',
    dropShadow: false,
    position: ORIGIN,
    tapestryId,
    backgroundColor: textItemColor,
  }
}

export function createActionButtonItem(text = '', tapestryId: string): ActionButtonItemCreateDto {
  return {
    type: 'actionButton',
    actionType: 'link',
    dropShadow: false,
    position: ORIGIN,
    size: itemSizes.actionButton,
    backgroundColor: userSettings.getTapestrySettings(tapestryId).textItemColor,
    tapestryId,
    text,
  }
}

interface UploadOptions {
  signal?: AbortSignal
  onProgress?: (event: AxiosProgressEvent) => unknown
}
export async function uploadAsset(
  file: File,
  params: Omit<TapestryAssetUrlCreateDto, 'fileExtension' | 'mimeType'> | ImportAssetUrlCreateDto,
  { signal, onProgress }: UploadOptions = {},
) {
  const { name } = file
  const [, extension] = fileExtension(name)

  const { key, presignedURL } = await resource('assetURLs').create(
    params.type === 'import'
      ? params
      : {
          ...params,
          fileExtension: extension ?? '',
          mimeType: file.type,
        },
    undefined,
    { signal },
  )

  await axios.put(presignedURL, file, {
    headers: { 'Content-Type': file.type },
    signal,
    onUploadProgress: onProgress,
  })

  return key
}

export async function getItemSize(item: ItemDto): Promise<Size> {
  if (isMediaItem(item)) {
    return getMediaItemSize(item.type, item.source)
  }
  return itemSizes[item.type]
}

async function getMediaItemSize(type: MediaItemType, source: MediaItemSource): Promise<Size> {
  const sizeGetter = itemSizes[type]
  return isFunction(sizeGetter) ? await sizeGetter(source) : sizeGetter
}

export async function createMediaItem<T extends MediaItemType>(
  type: T,
  source: MediaItemSource,
  tapestryId: string,
) {
  const size = await getMediaItemSize(type, source)
  return {
    type,
    size,
    source: typeof source === 'string' ? source : URL.createObjectURL(source),
    title: '',
    dropShadow: true,
    position: ORIGIN,
    tapestryId,
  } as MediaItemCreateDto & { type: T }
}

// TODO: Handle the scenario where the source is an S3 object and therefore needs to be cloned.
// Right now we don't have the raw S3 key in the ItemDto and while we can extrapolate it from the url
// it might not be the cleanest solution. Things we can consider are:
// 1) Create a separate resource for duplicating (items)
// 2) Implement some sort of ref counting to S3 resource. This can be done only in the context of a tapestry
//    or maybe even globally. This way we can save on some storage space, but it will introduce additional
//    complexity
export function duplicateItem<T extends ItemDto>(item: T): ItemCreateDto {
  return structuredClone(item)
}

export async function getMediaType(source: MediaItemSource): Promise<string | null> {
  if (source instanceof File) {
    return source.type || (mime.getType(source.name) ?? '')
  }

  try {
    return (
      (await resource('proxy').create({
        type: 'content-type',
        url: source,
      })) as FetchContentTypeProxyDto
    ).result
  } catch {
    return null
  }
}

export async function getMediaSourceText(source: MediaItemSource): Promise<string> {
  if (source instanceof File) {
    return source.text()
  }
  try {
    const response = await fetch(source)
    return response.text()
  } catch {
    return ''
  }
}

export type UserAccess = 'view' | 'edit'

export function userAccess(
  tapestry: Pick<TapestryDto, 'ownerId' | 'userAccess'>,
  userId?: string,
): UserAccess {
  if (tapestry.ownerId === userId) return 'edit'

  const personalAccess = tapestry.userAccess?.find((access) => access.userId === userId)
  if (personalAccess) {
    return personalAccess.canEdit ? 'edit' : 'view'
  }

  // You cannot obtain a TapestryDto from the server if you don't have at least view access to it.
  return 'view'
}

export function fullName({ givenName, familyName }: PublicUserProfileDto) {
  return `${givenName} ${familyName}`
}

export function isLocalMediaItem(item: unknown): item is MediaItem {
  return isMediaItem(item) && isBlobURL(item.source)
}
