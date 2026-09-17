import { MediaItemSource } from '../lib/media'
import { createMediaItem, createTextItem, getMediaType } from '../model/data/utils'
import { ItemCreateDto, ItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { ensureArray, isHTTPURL, OneOrMore } from 'tapestry-core/src/utils'
import { mapNotNull } from 'tapestry-core/src/lib/array'
import { getFile, scan } from 'tapestry-core-client/src/lib/file'
import { ItemCreateSchema } from 'tapestry-shared/src/data-transfer/resources/schemas/item'
import { blobUrlToFileMap } from 'tapestry-core-client/src/components/lib/hooks/use-media-source'
import { ITEM_FACTORIES, ItemFactoryResult } from './item-factories'
import { compact, omit, partition, set } from 'lodash-es'
import z from 'zod/v4'
import { CollectionImport } from '../pages/tapestry/view-model'
import { isBlobURL } from 'tapestry-core-client/src/view-model/utils'

export const MAX_FILE_SIZE = 500 * 1000 * 1000 // 500 MB

function isFileEligible(file: File, maxSize = MAX_FILE_SIZE) {
  return file.size <= maxSize
}

export class InvalidSourceError extends Error {}

export async function parseMediaSource(
  source: MediaItemSource,
  tapestryId: string,
): Promise<ItemFactoryResult> {
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

  return { items: [], collectionImports: [] }
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

function getStringTransferData(data: DataTransfer): string[] | string {
  // text/uri-list may contain multiple urls, each on separate line.
  // It can also contain comments - lines starting with #
  const uriList = compact(
    data
      .getData('text/uri-list')
      .split('\r\n')
      .filter((line) => !line.startsWith('#')),
  )

  if (uriList.length > 0) {
    return uriList
  }

  const htmlText = data.getData('text/html')
  const plainText = data.getData('text/plain')

  if (isHTTPURL(htmlText)) {
    return [htmlText]
  }

  if (isHTTPURL(plainText)) {
    return [plainText]
  }

  return htmlText || plainText
}

export async function parseStringTransferData(
  text: string[] | string,
  tapestryId: string,
): Promise<ItemFactoryResult> {
  if (!text) {
    return { items: [], collectionImports: [] }
  }

  if (Array.isArray(text)) {
    return parseSources(text, tapestryId)
  }

  const items = tryParseItems(text, tapestryId)
  if (items) {
    return { items, collectionImports: [] }
  }

  const lines = compact(text.trim().split(/\s*\n\s*/))
  if (lines.every((line) => isHTTPURL(line))) {
    return parseSources(lines, tapestryId)
  }

  if (isHTTPURL(text)) {
    return parseSources([text], tapestryId)
  }
  if (isBlobURL(text)) {
    const file = blobUrlToFileMap.get(text)
    if (file) {
      return parseSources([file], tapestryId)
    }
  }
  return { items: [createTextItem(text, tapestryId)], collectionImports: [] }
}

function sanitizeForCopy(item: ItemDto): Omit<ItemCreateDto, 'tapestryId'> {
  return omit(item, 'id', 'createdAt', 'updatedAt', 'tapestryId', 'groupId', 'thumbnail')
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

async function parseSources(
  sources: MediaItemSource[],
  tapestryId: string,
): Promise<ItemFactoryResult> {
  const result: ItemFactoryResult = { items: [], collectionImports: [] }
  for (const src of sources) {
    const { items, collectionImports } = await parseMediaSource(src, tapestryId)
    result.items.push(...items)
    result.collectionImports.push(...collectionImports)
  }
  return result
}

export type DeserializeResult = {
  items: ItemCreateDto[]
  largeFiles: File[]
  collectionImports: CollectionImport[]
}

export class DataTransferHandler {
  async deserialize(
    dataTransfer: DataTransfer | OneOrMore<MediaItemSource> | null,
    tapestryId: string,
  ): Promise<DeserializeResult> {
    if (!dataTransfer) {
      return Promise.resolve({ items: [], largeFiles: [], collectionImports: [] })
    }
    dataTransfer =
      dataTransfer instanceof DataTransfer ? dataTransfer : this.toDataTransfer(dataTransfer)

    const stringData = getStringTransferData(dataTransfer)

    // Do not put awaits above this invocation
    const files = await dataTransferToFiles(dataTransfer)

    const [eligibleFiles, largeFiles] = partition(files, isFileEligible)
    let { items, collectionImports } = await parseSources(eligibleFiles, tapestryId)
    if (items.length > 0 || collectionImports.length > 0) {
      return { items, collectionImports, largeFiles }
    }

    ;({ items, collectionImports } = await parseStringTransferData(stringData, tapestryId))
    return { items, collectionImports, largeFiles: [] }
  }

  async serialize(items: ItemDto[]) {
    await navigator.clipboard.writeText(JSON.stringify(items.map(sanitizeForCopy)))
  }

  async pasteClipboard(tapestryId: string): Promise<DeserializeResult> {
    const result: DeserializeResult = {
      items: [],
      largeFiles: [],
      collectionImports: [],
    }
    for (const item of await navigator.clipboard.read()) {
      let type = item.types.find((t) => t.startsWith('image/'))
      if (type) {
        result.items.push(
          await createMediaItem('image', new File([await item.getType(type)], ''), tapestryId),
        )
      } else if ((type = item.types.find((t) => t.startsWith('text/')))) {
        const text = await (await item.getType(type)).text()
        const { items, collectionImports } = await parseStringTransferData(text, tapestryId)
        result.collectionImports.push(...collectionImports)
        result.items.push(...items)
      }
    }
    return result
  }

  private toDataTransfer(source: OneOrMore<MediaItemSource>) {
    source = ensureArray(source)

    const dataTransfer = new DataTransfer()
    const [files, urls] = partition(source, (s) => s instanceof File)
    dataTransfer.setData('text/uri-list', urls.join('\r\n'))
    files.forEach((f) => dataTransfer.items.add(f))

    return dataTransfer
  }
}
