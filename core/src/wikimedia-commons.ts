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

interface CommonsVideoInfo {
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
  videoinfo?: CommonsVideoInfo[]
}

interface CommonsQueryResponse<Page> {
  query?: { pages?: Record<string, Page> }
}

function thumbnailFor(videoInfo: CommonsVideoInfo): string | null {
  if (!videoInfo.thumburl) return null
  return new URL(videoInfo.thumburl).pathname.startsWith(COMMONS_GENERIC_ICON_PATH)
    ? null
    : videoInfo.thumburl
}

// Modern browsers cannot decode Ogg Theora video. Safari cannot decode Ogg Vorbis audio.
// Commons transcodes most VIDEO and AUDIO files into WebM and MP3. It reports these as
// `derivatives`. Prefer a derivative over the original. Use the original only when no
// derivative exists.
function bestPlaybackURL(mediaType: WikimediaMediaType, videoInfo: CommonsVideoInfo): string {
  const derivatives = videoInfo.derivatives ?? []

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

  return videoInfo.url
}

function toWikimediaMedia(page: CommonsFilePage): WikimediaMedia | null {
  const videoInfo = page.videoinfo?.[0]
  if (!videoInfo) return null

  const mediaType = itemTypeForFile(videoInfo.mediatype, videoInfo.mime)
  if (!mediaType) return null

  return {
    id: String(page.pageid),
    url: bestPlaybackURL(mediaType, videoInfo),
    thumbnail: thumbnailFor(videoInfo),
    title: page.title,
    uploader: videoInfo.user ?? null,
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

export type WikimediaCollectionQuery = { type: 'category'; category: string }

export function parseWikimediaCollectionQuery(url: string): WikimediaCollectionQuery | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname !== COMMONS_HOST) return null

    const match = /^\/wiki\/(Category:.+)$/.exec(parsed.pathname)
    if (!match) return null

    return { type: 'category', category: decodeURIComponent(match[1]) }
  } catch {
    return null
  }
}

const VIDEO_INFO_PROPS = 'url|mime|mediatype|user|derivatives'

export async function fetchWikimediaMedia(
  title: string,
  signal?: AbortSignal,
): Promise<WikimediaMedia | null> {
  try {
    const url = new URL(COMMONS_API_URL)
    url.searchParams.set('action', 'query')
    url.searchParams.set('titles', title)
    url.searchParams.set('prop', 'videoinfo')
    url.searchParams.set('viprop', VIDEO_INFO_PROPS)
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
  collection: WikimediaCollectionQuery,
  signal?: AbortSignal,
): Promise<number | undefined> {
  try {
    const url = new URL(COMMONS_API_URL)
    url.searchParams.set('action', 'query')
    url.searchParams.set('titles', collection.category)
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

interface CommonsCategoryPage {
  results: WikimediaMedia[]
  nextCursor: string | null
}

async function fetchWikimediaCategoryPage(
  collection: WikimediaCollectionQuery,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<CommonsCategoryPage | null> {
  try {
    const url = new URL(COMMONS_API_URL)
    url.searchParams.set('action', 'query')
    url.searchParams.set('generator', 'categorymembers')
    url.searchParams.set('gcmtitle', collection.category)
    url.searchParams.set('gcmlimit', String(COMMONS_PAGE_SIZE))
    url.searchParams.set('gcmtype', 'file')
    url.searchParams.set('prop', 'videoinfo')
    url.searchParams.set('viprop', VIDEO_INFO_PROPS)
    url.searchParams.set('viurlwidth', '300')
    url.searchParams.set('format', 'json')
    url.searchParams.set('origin', '*')
    if (cursor) url.searchParams.set('gcmcontinue', cursor)

    const res = await fetch(url, { signal })
    if (!res.ok) return null

    interface CategoryMembersResponse extends CommonsQueryResponse<CommonsFilePage> {
      continue?: { gcmcontinue?: string }
    }
    const data = (await res.json()) as CategoryMembersResponse
    const pages = Object.values(data.query?.pages ?? {})

    return {
      results: pages
        .map(toWikimediaMedia)
        .filter((media): media is WikimediaMedia => media !== null),
      nextCursor: data.continue?.gcmcontinue ?? null,
    }
  } catch {
    return null
  }
}

export interface WikimediaCursorStore {
  get(realPage: number): Promise<string | null | undefined>
  set(realPage: number, cursor: string | null): Promise<void>
}

export async function fetchWikimediaCollectionResults(
  collection: WikimediaCollectionQuery,
  page: number,
  pageSize: number,
  cursorStore: WikimediaCursorStore,
  signal?: AbortSignal,
): Promise<{ total: number; results: WikimediaMedia[] } | undefined> {
  const skip = (page - 1) * pageSize
  const firstRealPage = Math.floor(skip / COMMONS_PAGE_SIZE)
  const lastRealPage = Math.floor((skip + pageSize - 1) / COMMONS_PAGE_SIZE)

  const realPages: CommonsCategoryPage[] = []

  for (let realPage = 0; realPage <= lastRealPage; realPage++) {
    const needsResults = realPage >= firstRealPage
    const nextCursorKnown =
      realPage < lastRealPage && (await cursorStore.get(realPage + 1)) !== undefined
    if (!needsResults && nextCursorKnown) continue

    let cursor: string | null = null
    if (realPage > 0) {
      const cached = await cursorStore.get(realPage)
      if (cached === null) break // the category ended before this page
      if (cached === undefined) return undefined // a gap in the cursor chain; can't recover
      cursor = cached
    }

    const fetched = await fetchWikimediaCategoryPage(collection, cursor, signal)
    if (!fetched) return undefined

    await cursorStore.set(realPage + 1, fetched.nextCursor)
    if (needsResults) realPages.push(fetched)
  }

  const offset = skip % COMMONS_PAGE_SIZE
  const combined = realPages.flatMap((realPage) => realPage.results)
  const total = await fetchWikimediaCollectionCount(collection, signal)

  return { total: total ?? combined.length, results: combined.slice(offset, offset + pageSize) }
}
