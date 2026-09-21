// Wikimedia Commons is queried through the MediaWiki Action API, documented at
// https://www.mediawiki.org/wiki/API:Main_page. Category listing uses the `categorymembers`
// generator: https://www.mediawiki.org/wiki/API:Categorymembers.
const COMMONS_HOST = 'commons.wikimedia.org'
const COMMONS_API_URL = 'https://commons.wikimedia.org/w/api.php'
const COMMONS_PAGE_SIZE = 50
const COMMONS_GENERIC_ICON_PATH = '/w/resources/assets/file-type-icons/'

export type WikimediaMediaType = 'image' | 'video' | 'audio' | 'pdf'

function itemTypeForFile(mediatype: string, mime: string): WikimediaMediaType | null {
  if (mediatype === 'BITMAP' || mediatype === 'DRAWING') return 'image'
  if (mediatype === 'VIDEO') return 'video'
  if (mediatype === 'AUDIO') return 'audio'
  if (mediatype === 'OFFICE' && mime === 'application/pdf') return 'pdf'
  return null
}

export interface WikimediaMedia {
  id: string
  url: string
  thumbnail: string | null
  title: string
  uploader: string | null
  mediaType: WikimediaMediaType
}

interface CommonsDerivative {
  src: string
  type: string
  width: number
}

// `prop=videoinfo` is Commons' general per-file metadata endpoint -- despite the name, it's
// returned (and needed) for every file type, not just video. See fetchWikimediaCollectionResults.
interface CommonsItemInfo {
  url: string
  mime: string
  mediatype: string
  user?: string
  thumburl?: string
  derivatives?: CommonsDerivative[]
}

interface CommonsFilePage {
  pageid: number
  title: string
  videoinfo?: CommonsItemInfo[]
}

interface CommonsQueryResponse<Page> {
  query?: { pages?: Record<string, Page> }
}

function thumbnailFor(itemInfo: CommonsItemInfo): string | null {
  if (!itemInfo.thumburl) return null
  return new URL(itemInfo.thumburl).pathname.startsWith(COMMONS_GENERIC_ICON_PATH)
    ? null
    : itemInfo.thumburl
}

// Modern browsers cannot decode Ogg Theora video. Safari cannot decode Ogg Vorbis audio.
// Commons transcodes most VIDEO and AUDIO files into WebM and MP3. It reports these as
// `derivatives`. Prefer a derivative over the original. Use the original only when no
// derivative exists.
function bestPlaybackURL(mediaType: WikimediaMediaType, itemInfo: CommonsItemInfo): string {
  const derivatives = itemInfo.derivatives ?? []

  if (mediaType === 'video') {
    const webm = derivatives.filter((d) => d.type.startsWith('video/webm'))
    const best = webm.reduce<CommonsDerivative | null>(
      (best, d) => (!best || d.width > best.width ? d : best),
      null,
    )
    if (best) return best.src
  }

  if (mediaType === 'audio') {
    const mp3 = derivatives.find((d) => d.type.startsWith('audio/mpeg'))
    if (mp3) return mp3.src
  }

  return itemInfo.url
}

function toWikimediaMedia(page: CommonsFilePage): WikimediaMedia | null {
  const itemInfo = page.videoinfo?.[0]
  if (!itemInfo) return null

  const mediaType = itemTypeForFile(itemInfo.mediatype, itemInfo.mime)
  if (!mediaType) return null

  return {
    id: String(page.pageid),
    url: bestPlaybackURL(mediaType, itemInfo),
    thumbnail: thumbnailFor(itemInfo),
    title: page.title,
    uploader: itemInfo.user ?? null,
    mediaType,
  }
}

export function parseWikimediaFileTitle(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname !== COMMONS_HOST) return null

    const pathMatch = /^\/wiki\/(File:.+)$/.exec(parsed.pathname)
    if (pathMatch) return decodeURIComponent(pathMatch[1])

    const hashMatch = /^#\/media\/(File:.+)$/.exec(parsed.hash)
    if (hashMatch) return decodeURIComponent(hashMatch[1])

    return null
  } catch {
    return null
  }
}

// Build a short link back to a file's page from just its page id. This avoids re-encoding a
// title with unicode, spaces, or punctuation. Commons' own API reports this exact form as
// `descriptionshorturl` for every file.
export function wikimediaFilePageURL(pageId: string): string {
  return `https://${COMMONS_HOST}/w/index.php?curid=${pageId}`
}

export function parseWikimediaCollectionQuery(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname !== COMMONS_HOST) return null

    const match = /^\/wiki\/(Category:.+)$/.exec(parsed.pathname)
    if (!match) return null

    return decodeURIComponent(match[1])
  } catch {
    return null
  }
}

const ITEM_INFO_PROPS = 'url|mime|mediatype|user|derivatives'

export async function fetchWikimediaMedia(
  title: string,
  signal?: AbortSignal,
): Promise<WikimediaMedia | null> {
  try {
    const url = new URL(COMMONS_API_URL)
    url.searchParams.set('action', 'query')
    url.searchParams.set('titles', title)
    url.searchParams.set('prop', 'videoinfo')
    url.searchParams.set('viprop', ITEM_INFO_PROPS)
    url.searchParams.set('format', 'json')
    url.searchParams.set('origin', '*')

    const res = await fetch(url, { signal })
    if (!res.ok) return null

    const data = (await res.json()) as CommonsQueryResponse<CommonsFilePage>
    const page = Object.values(data.query?.pages ?? {}).at(0)
    return page ? toWikimediaMedia(page) : null
  } catch {
    return null
  }
}

export async function fetchWikimediaCollectionCount(
  category: string,
  signal?: AbortSignal,
): Promise<number | undefined> {
  try {
    const url = new URL(COMMONS_API_URL)
    url.searchParams.set('action', 'query')
    url.searchParams.set('titles', category)
    url.searchParams.set('prop', 'categoryinfo')
    url.searchParams.set('format', 'json')
    url.searchParams.set('origin', '*')

    const res = await fetch(url, { signal })
    if (!res.ok) return undefined

    interface CategoryPage {
      categoryinfo?: { files: number }
    }
    const data = (await res.json()) as CommonsQueryResponse<CategoryPage>
    return Object.values(data.query?.pages ?? {})[0]?.categoryinfo?.files
  } catch {
    return undefined
  }
}

const CATEGORY_THUMBNAIL_WIDTH = 300

// Commons categories are templated, not prose, so `extracts` (Wikipedia's article-summary API)
// always returns an empty string for them -- there is no cheap category description to show.
// `pageimages` does work, resolving to a representative file already in the category.
export async function fetchWikimediaCollectionThumbnail(
  category: string,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const url = new URL(COMMONS_API_URL)
    url.searchParams.set('action', 'query')
    url.searchParams.set('titles', category)
    url.searchParams.set('prop', 'pageimages')
    url.searchParams.set('piprop', 'thumbnail')
    url.searchParams.set('pithumbsize', String(CATEGORY_THUMBNAIL_WIDTH))
    url.searchParams.set('format', 'json')
    url.searchParams.set('origin', '*')

    const res = await fetch(url, { signal })
    if (!res.ok) return null

    interface CategoryPage {
      thumbnail?: { source: string }
    }
    const data = (await res.json()) as CommonsQueryResponse<CategoryPage>
    return Object.values(data.query?.pages ?? {})[0]?.thumbnail?.source ?? null
  } catch {
    return null
  }
}

/**
 * Fetch one real page (up to COMMONS_PAGE_SIZE items) of a category's files, starting from an
 * optional cursor. Commons categories paginate with an opaque cursor (`gcmcontinue`), not a page
 * number -- there is no way to jump directly to an arbitrary page. Callers that need an
 * arbitrary skip/limit window (e.g. a lazily-loaded list) walk this themselves, keeping track of
 * each real page's cursor as they go.
 */
export async function fetchWikimediaCollectionResults(
  category: string,
  cursor?: string,
  signal?: AbortSignal,
): Promise<{ results: WikimediaMedia[]; nextCursor: string | undefined } | undefined> {
  try {
    const url = new URL(COMMONS_API_URL)
    url.searchParams.set('action', 'query')
    url.searchParams.set('generator', 'categorymembers')
    url.searchParams.set('gcmtitle', category)
    url.searchParams.set('gcmlimit', String(COMMONS_PAGE_SIZE))
    url.searchParams.set('gcmtype', 'file')
    url.searchParams.set('prop', 'videoinfo')
    url.searchParams.set('viprop', ITEM_INFO_PROPS)
    url.searchParams.set('viurlwidth', '120')
    url.searchParams.set('format', 'json')
    url.searchParams.set('origin', '*')
    if (cursor) url.searchParams.set('gcmcontinue', cursor)

    const res = await fetch(url, { signal })
    if (!res.ok) return undefined

    interface CategoryMembersResponse extends CommonsQueryResponse<CommonsFilePage> {
      continue?: { gcmcontinue?: string }
    }
    const data = (await res.json()) as CategoryMembersResponse
    const pages = Object.values(data.query?.pages ?? {})

    return {
      results: pages
        .map(toWikimediaMedia)
        .filter((media): media is WikimediaMedia => media !== null),
      nextCursor: data.continue?.gcmcontinue,
    }
  } catch {
    return undefined
  }
}
