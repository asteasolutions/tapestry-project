import { isHTTPURL } from 'tapestry-core/src/utils'
import { MediaItemSource } from '../lib/media'
import { createMediaItem, getMediaSourceText } from '../model/data/utils'
import { ItemCreateDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { findWebSourceParser } from 'tapestry-core/src/web-sources'
import {
  iaItemEmbedURL,
  IAMediaType,
  parseInternetArchiveURL,
  IAItem,
  getIAItemMetadata,
  getIAPlaylistEntries,
  getNestedIAItems,
} from 'tapestry-core/src/internet-archive'
import { MediaItemType, WebpageType } from 'tapestry-core/src/data-format/schemas/item'
import { getUserListItems } from '../lib/internet-archive'
import { parseMediaSource, parseStringTransferData } from './data-transfer-handler'
import { fileTypeFromBuffer } from 'file-type'
import { parse } from 'ini'
import { IAImport } from '../pages/tapestry/view-model'

/**
 * Tries to extract a link from a url file. This is a shortcut file created on Windows in INI format
 */
async function parseUrlFile(source: File) {
  if (!source.name.endsWith('url')) {
    return
  }

  type URLSection = Record<'URL', string> | undefined
  const url = (parse(await source.text()).InternetShortcut as URLSection)?.URL

  return url
}

/**
 * Tries to extract a link from a webloc file. This is a shortcut file created on MacOS in XML format
 */
async function parseWeblocFile(source: File) {
  if (!source.name.endsWith('webloc')) {
    return
  }

  const fileType = await fileTypeFromBuffer(await source.arrayBuffer())

  if (fileType?.mime !== 'application/xml') {
    return
  }

  const children = new DOMParser()
    .parseFromString(await source.text(), 'application/xml')
    .querySelector('dict')?.children
  if (children?.length !== 2) {
    return
  }

  const [{ textContent: type }, { textContent: url }] = children
  if (type !== 'URL') {
    return
  }

  return url
}

/**
 * An ItemFactory takes a MediaItemSource (File or URL) and tries to produce one or more tapestry items from it.
 * If a factory doesn't know how to handle a given source, it returns null.
 */
export type ItemFactoryResult = [ItemCreateDto[], IAImport[]]
type ItemFactory = (
  source: MediaItemSource,
  mediaType: string | null,
  tapestryId: string,
) => Promise<ItemFactoryResult | null>

function createSimpleMediaItemFactory(
  itemType: MediaItemType,
  sourceMatches: (source: MediaItemSource, mediaType: string | null) => boolean,
): ItemFactory {
  return async (source, mediaType, tapestryId) => {
    if (!sourceMatches(source, mediaType)) return null

    return [[await createMediaItem(itemType, source, tapestryId)], []]
  }
}

const textItemFactory: ItemFactory = async (source, mediaType, tapestryId) => {
  if (mediaType !== 'text/plain') return null

  const sourceAsText = await getMediaSourceText(source)

  return await parseStringTransferData(sourceAsText, tapestryId)
}

const htmlFileItemFactory: ItemFactory = async (source, mediaType, tapestryId) => {
  if (!mediaType?.startsWith('application/xhtml') && mediaType !== 'text/html') return null

  return [[await createMediaItem('webpage', source, tapestryId)], []]
}

const webpageItemFactory: ItemFactory = async (source, _mediaType, tapestryId) => {
  if (typeof source !== 'string' || !isHTTPURL(source)) return null

  const parser = await findWebSourceParser(source)
  const item = await createMediaItem('webpage', parser.construct(parser.parse(source)), tapestryId)
  item.webpageType = parser.webpageType
  item.skipSourceResolution = true

  return [[item], []]
}

const IA_MEDIA_TYPE_MAP: Partial<Record<IAMediaType, WebpageType>> = {
  audio: 'iaAudio',
  movies: 'iaVideo',
}

export async function createIAItem(tapestryId: string, iaItem: IAItem) {
  const item = await createMediaItem('webpage', iaItemEmbedURL(iaItem), tapestryId)
  item.webpageType = IA_MEDIA_TYPE_MAP[iaItem.mediaType] ?? null
  item.skipSourceResolution = true

  return item
}

const iaCollectionFactory: ItemFactory = async (source, _, tapestryId) => {
  const descriptor = parseInternetArchiveURL(source)
  if (!descriptor) return null

  if (descriptor.urlType === 'user-list') {
    const iaItems = await getUserListItems(source as string)
    return [await Promise.all(iaItems.map(async (iaItem) => createIAItem(tapestryId, iaItem))), []]
  }

  const { id } = descriptor.item
  const metadata = await getIAItemMetadata(id)

  if (metadata?.mediatype === 'collection') {
    return [[], [{ type: 'IACollection', metadata, id }]]
  }

  if (metadata?.mediatype === 'movies' || metadata?.mediatype === 'audio') {
    const plst = (await getIAPlaylistEntries(descriptor.item)) ?? []
    if (plst.length > 1) {
      const entries = plst.map(({ title, orig, duration }) => ({ title, filename: orig, duration }))
      return [[], [{ type: 'IAPlaylist', id, metadata, entries }]]
    }
  }

  const iaItems = await getNestedIAItems(descriptor.item)
  return [await Promise.all(iaItems.map(async (iaItem) => createIAItem(tapestryId, iaItem))), []]

  return null
}

const linkFileFactory: ItemFactory = async (source, _, tapestryId) => {
  if (!(source instanceof File)) {
    return null
  }

  const url = (await parseUrlFile(source)) ?? (await parseWeblocFile(source))

  if (!url) {
    return null
  }

  return parseMediaSource(url, tapestryId)
}

/**
 * A sequence of item factories that can be tried consecutively when importing a file or text to the tapestry.
 * If all of these factories fail to produce tapestry items, then the given source is of unknown format and cannot
 * be imported.
 *
 * Note that for the most part the types of sources that each factory in this array can handle, don't overlap, so
 * their order is not critically important. However, the last factory in the array acts as a kind of "catchall"
 * which creates a "webpage" item for all unhandled URLs.
 */
export const ITEM_FACTORIES: ItemFactory[] = [
  createSimpleMediaItemFactory('image', (_, mediaType) => !!mediaType?.startsWith('image/')),
  createSimpleMediaItemFactory('book', (_, mediaType) => mediaType === 'application/epub+zip'),
  createSimpleMediaItemFactory('pdf', (_, mediaType) => mediaType === 'application/pdf'),
  createSimpleMediaItemFactory('video', (_, mediaType) => !!mediaType?.startsWith('video/')),
  createSimpleMediaItemFactory('audio', (_, mediaType) => !!mediaType?.startsWith('audio/')),
  linkFileFactory,
  textItemFactory,
  htmlFileItemFactory,
  iaCollectionFactory,
  webpageItemFactory,
]
