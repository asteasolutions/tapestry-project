import { Item } from '@prisma/client'
import { get, set } from 'lodash-es'
import { HexColor } from 'tapestry-core/src/data-format/schemas/common.js'
import { ItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item.js'
import { extractInternallyHostedS3Key, s3Service } from '../services/s3-service.js'
import { isHTTPURL } from 'tapestry-core/src/utils.js'
import { MEDIA_ITEM_TYPES } from 'tapestry-core/src/data-format/schemas/item.js'

export async function parseDBItemSource(source: string) {
  const internallyHosted = !isHTTPURL(source) && !source.startsWith('blob:')
  source = internallyHosted ? await s3Service.getReadObjectUrl(source) : source
  return { source, internallyHosted }
}

export async function itemDbToDto(dbItem: Item): Promise<ItemDto> {
  const commonProps = {
    id: dbItem.id,
    createdAt: dbItem.createdAt,
    updatedAt: dbItem.updatedAt,
    title: dbItem.title,
    dropShadow: dbItem.dropShadow,
    tapestryId: dbItem.tapestryId,
    position: {
      x: dbItem.positionX,
      y: dbItem.positionY,
    },
    size: {
      width: dbItem.width,
      height: dbItem.height,
    },
    groupId: dbItem.groupId,
    notes: dbItem.notes,
  }
  const { type } = dbItem

  if (type === 'text') {
    return {
      ...commonProps,
      type,
      text: dbItem.text!,
      backgroundColor: dbItem.backgroundColor as HexColor | null,
    }
  }

  if (type === 'actionButton') {
    return {
      ...commonProps,
      type,
      actionType: dbItem.actionType!,
      action: dbItem.action,
      text: dbItem.text!,
      backgroundColor: dbItem.backgroundColor as HexColor | null,
    }
  }

  const thumbnail = dbItem.thumbnail
    ? {
        source: await s3Service.getReadObjectUrl(dbItem.thumbnail),
        size: {
          width: dbItem.thumbnailWidth!,
          height: dbItem.thumbnailHeight!,
        },
      }
    : undefined

  const commonMediaItemProps = {
    ...(await parseDBItemSource(dbItem.source!)),
    thumbnail,
    customThumbnail: dbItem.customThumbnail
      ? (await parseDBItemSource(dbItem.customThumbnail)).source
      : null,
  }

  if (type === 'video' || type === 'audio') {
    return {
      ...commonProps,
      type,
      ...commonMediaItemProps,
      startTime: dbItem.startTime,
      stopTime: dbItem.stopTime,
    }
  }

  if (type === 'pdf') {
    return {
      ...commonProps,
      type,
      defaultPage: dbItem.defaultPage,
      ...commonMediaItemProps,
    }
  }

  if (type === 'image' || type === 'book') {
    return {
      ...commonProps,
      type,
      ...commonMediaItemProps,
    }
  }

  return {
    ...commonProps,
    type,
    ...commonMediaItemProps,
    webpageType: dbItem.webpageType,
  }
}

type ItemDBField = keyof Item
const DB_TO_DTO_FIELD_MAP: Record<ItemDBField, string> = {
  id: 'id',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  tapestryId: 'tapestryId',
  positionX: 'position.x',
  positionY: 'position.y',
  width: 'size.width',
  height: 'size.height',
  type: 'type',
  webpageType: 'webpageType',
  title: 'title',
  dropShadow: 'dropShadow',
  text: 'text',
  backgroundColor: 'backgroundColor',
  source: 'source',
  thumbnail: 'thumbnail.source',
  thumbnailWidth: 'thumbnail.size.width',
  thumbnailHeight: 'thumbnail.size.height',
  startTime: 'startTime',
  stopTime: 'stopTime',
  groupId: 'groupId',
  notes: 'notes',
  customThumbnail: 'customThumbnail',
  defaultPage: 'defaultPage',
  actionType: 'actionType',
  action: 'action',
}

export function itemDtoToDb(item: Partial<ItemDto>): Item
export function itemDtoToDb<const O extends ItemDBField>(
  item: Partial<ItemDto>,
  omit: O[],
): Omit<Item, O>
export function itemDtoToDb<O extends ItemDBField>(
  item: Partial<ItemDto>,
  omit?: O[],
): Omit<Item, O> {
  const isMediaItem = MEDIA_ITEM_TYPES.includes(item.type)
  const fieldsToAssign = (Object.keys(DB_TO_DTO_FIELD_MAP) as ItemDBField[]).filter((field) => {
    if ((omit as string[] | undefined)?.includes(field)) return false

    if (field === 'text' || field === 'backgroundColor') return !isMediaItem
    if (field === 'action' || field === 'actionType') return item.type === 'actionButton'
    if (field === 'source') return isMediaItem
    if (field === 'startTime' || field === 'stopTime')
      return item.type === 'video' || item.type === 'audio'
    if (field === 'defaultPage') return item.type === 'pdf'

    return true
  })

  const dbItem: Partial<Item> = {}
  for (const field of fieldsToAssign) {
    set(dbItem, field, get(item, DB_TO_DTO_FIELD_MAP[field]))
  }

  dbItem.source = extractInternallyHostedS3Key(dbItem.source) ?? dbItem.source
  dbItem.thumbnail = extractInternallyHostedS3Key(dbItem.thumbnail) ?? dbItem.thumbnail

  return dbItem as Omit<Item, O>
}
