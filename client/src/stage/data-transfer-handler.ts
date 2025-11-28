import { MediaItemSource } from '../lib/media'
import { createMediaItem, createTextItem, getMediaType } from '../model/data/utils'
import { ItemCreateDto, ItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { isHTTPURL } from 'tapestry-core/src/utils'
import { mapNotNull } from 'tapestry-core/src/lib/array'
import { getFile, scan } from 'tapestry-core-client/src/lib/file'
import { ItemCreateSchema } from 'tapestry-shared/src/data-transfer/resources/schemas/item'
import { blobUrlToFileMap } from 'tapestry-core-client/src/components/lib/hooks/use-media-source'
import { ITEM_FACTORIES } from './item-factories'
import { compact, omit, partition, set } from 'lodash'
import z from 'zod/v4'
import { IAImport } from '../pages/tapestry/view-model'
import {
  parseInternetArchiveURL,
  getIAItemMetadata,
  getIAPlaylistEntries,
} from 'tapestry-core/src/internet-archive'
import { isBlobURL } from 'tapestry-core-client/src/view-model/utils'

export const MAX_FILE_SIZE = 500 * 1000 * 1000 // 500 MB

export function isFileEligible(file: File, maxSize = MAX_FILE_SIZE) {
  return file.size <= maxSize
}

export class InvalidSourceError extends Error {}

export async function parseFileTransferData(
  source: MediaItemSource,
  tapestryId: string,
): Promise<ItemCreateDto[]> {
  // Make sure the source is either a file or an HTTP URL
  if (!(source instanceof File) && !isHTTPURL(source)) {
    throw new InvalidSourceError()
  }

  const mediaType = await getMediaType(source)

  for (const factory of ITEM_FACTORIES) {
    const items = await factory(source, mediaType, tapestryId)
    if (items) {
      return items
    }
  }

  return []
}

function tryParseItems(text: string, tapestryId: string): ItemCreateDto[] | undefined {
  try {
    const schema = z.preprocess((item) => {
      if (item && typeof item === 'object') {
        set(item, 'tapestryId', tapestryId)
      }
      return item
    }, ItemCreateSchema)

    return schema.array().parse(JSON.parse(text))
  } catch {
    return undefined
  }
}

function getStringTransferData(data: DataTransfer) {
  // text/uri-list may contain multiple urls, each on separate line.
  // It can also contain comments - lines starting with #
  const text = data
    .getData('text/uri-list')
    .split('\r\n')
    .find((line) => !line.startsWith('#'))

  if (!text) {
    const htmlText = data.getData('text/html')
    const plainText = data.getData('text/plain')

    if (isHTTPURL(htmlText)) {
      return htmlText
    }

    if (isHTTPURL(plainText)) {
      return plainText
    }

    return htmlText || plainText
  }

  return text
}

export async function parseStringTransferData(
  text: string | undefined,
  tapestryId: string,
): Promise<ItemCreateDto[] | undefined> {
  if (!text) {
    return undefined
  }

  const items = tryParseItems(text, tapestryId)
  if (items) {
    return items
  }

  const lines = compact(text.trim().split(/\s*\n\s*/))
  if (lines.every((line) => isHTTPURL(line))) {
    return (await Promise.all(lines.map((url) => parseFileTransferData(url, tapestryId)))).flat()
  }

  if (isHTTPURL(text)) {
    return parseFileTransferData(text, tapestryId)
  }
  if (isBlobURL(text)) {
    const file = blobUrlToFileMap.get(text)
    if (file) {
      return parseFileTransferData(file, tapestryId)
    }
  }
  return [createTextItem(text, tapestryId)]
}

function sanitizeForCopy(item: ItemDto): Omit<ItemCreateDto, 'tapestryId'> {
  return omit(item, 'id', 'createdAt', 'updatedAt', 'tapestryId', 'groupId')
}

export async function dataTransferToFiles(transfer: DataTransfer) {
  return (
    await Promise.all(
      mapNotNull(transfer.items, (i) => i.webkitGetAsEntry() ?? i.getAsFile()).map(async (entry) =>
        entry instanceof File ? entry : scan(entry, async (fileEntry) => await getFile(fileEntry)),
      ),
    )
  ).flat(2)
}

export async function getIAImport(stringData: string): Promise<IAImport | undefined> {
  const iaItem = parseInternetArchiveURL(stringData)

  if (!iaItem || iaItem.urlType === 'user-list') {
    return
  }
  const { id } = iaItem.item

  const metadata = await getIAItemMetadata(id)

  if (metadata?.mediatype === 'collection') {
    return {
      type: 'IACollection',
      metadata,
      id,
    }
  }

  if (metadata?.mediatype === 'movies' || metadata?.mediatype === 'audio') {
    const playlistEntries = await getIAPlaylistEntries(iaItem.item)
    if (playlistEntries && playlistEntries.length >= 2) {
      return {
        type: 'IAPlaylist',
        id,
        metadata,
        entries: playlistEntries.map((entry) => ({
          title: entry.title,
          filename: entry.orig,
          duration: entry.duration,
        })),
      }
    }
  }
}

export type DeserializeResult = {
  items: ItemCreateDto[]
  largeFiles: File[]
  iaImport?: IAImport
}

export class DataTransferHandler {
  async deserialize(
    dataTransfer: DataTransfer | null,
    tapestryId: string,
  ): Promise<DeserializeResult> {
    if (!dataTransfer) {
      return Promise.resolve({ items: [], largeFiles: [] })
    }

    const stringData = getStringTransferData(dataTransfer)

    // Do not put awaits above this invocation
    const files = await dataTransferToFiles(dataTransfer)
    const iaImport = await getIAImport(stringData)

    const [eligibleFiles, largeFiles] = partition(files, isFileEligible)
    const fileItems = (
      await Promise.all(eligibleFiles.map((file) => parseFileTransferData(file, tapestryId)))
    ).flat(2)

    return {
      items:
        fileItems.length === 0 && !iaImport
          ? ((await parseStringTransferData(stringData, tapestryId)) ?? [])
          : fileItems,
      largeFiles,
      iaImport,
    }
  }

  async serialize(items: ItemDto[]) {
    await navigator.clipboard.writeText(JSON.stringify(items.map(sanitizeForCopy)))
  }

  async pasteClipboard(tapestryId: string): Promise<DeserializeResult> {
    const result: DeserializeResult = {
      items: [],
      largeFiles: [],
    }
    for (const item of await navigator.clipboard.read()) {
      let type = item.types.find((t) => t.startsWith('image/'))
      if (type) {
        result.items.push(
          await createMediaItem('image', new File([await item.getType(type)], ''), tapestryId),
        )
      } else if ((type = item.types.find((t) => t.startsWith('text/')))) {
        const text = await (await item.getType(type)).text()
        const iaImport = await getIAImport(text)
        if (iaImport) {
          result.iaImport = iaImport
        } else {
          result.items.push(...((await parseStringTransferData(text, tapestryId)) ?? []))
        }
      }
    }
    return result
  }
}
