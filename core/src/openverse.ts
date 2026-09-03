const OPENVERSE_HOST = 'openverse.org'
const OPENVERSE_MAX_PAGE_SIZE = 20

export type OpenverseMediaType = 'image' | 'audio'

const OPENVERSE_API_URL: Record<OpenverseMediaType, string> = {
  image: 'https://api.openverse.org/v1/images/',
  audio: 'https://api.openverse.org/v1/audio/',
}

export interface OpenverseMedia {
  id: string
  url: string
  thumbnail: string | null
  title: string
  creator: string | null
  license: string
}

interface OpenverseMediaListResponse {
  result_count: number
  results: OpenverseMedia[]
}

export function parseOpenverseMediaId(
  url: string,
): { mediaType: OpenverseMediaType; id: string } | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname !== OPENVERSE_HOST) return null

    const match = /^\/(image|audio)\/([0-9a-f-]{36})\/?$/i.exec(parsed.pathname)
    if (!match) return null

    return { mediaType: match[1].toLowerCase() as OpenverseMediaType, id: match[2] }
  } catch {
    return null
  }
}

export function openverseMediaPageURL(mediaType: OpenverseMediaType, id: string): string {
  return `https://${OPENVERSE_HOST}/${mediaType}/${id}`
}

export type OpenverseCollectionQuery =
  | { type: 'tag'; tag: string }
  | { type: 'source'; source: string }

export function parseOpenverseCollectionQuery(
  url: string,
): { mediaType: OpenverseMediaType; collection: OpenverseCollectionQuery } | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname !== OPENVERSE_HOST) return null

    const match = /^\/(image|audio)\/collection\/?$/i.exec(parsed.pathname)
    if (!match) return null

    const mediaType = match[1].toLowerCase() as OpenverseMediaType

    const tag = parsed.searchParams.get('tag')
    if (tag) return { mediaType, collection: { type: 'tag', tag } }

    const source = parsed.searchParams.get('source')
    if (source) return { mediaType, collection: { type: 'source', source } }

    return null
  } catch {
    return null
  }
}

export async function fetchOpenverseMedia(
  mediaType: OpenverseMediaType,
  id: string,
  signal?: AbortSignal,
): Promise<OpenverseMedia | null> {
  try {
    const res = await fetch(`${OPENVERSE_API_URL[mediaType]}${id}/`, { signal })
    if (!res.ok) return null

    return (await res.json()) as OpenverseMedia
  } catch {
    return null
  }
}

function setOpenverseCollectionSearchParams(url: URL, collection: OpenverseCollectionQuery) {
  if (collection.type === 'tag') {
    url.searchParams.set('unstable__collection', 'tag')
    url.searchParams.set('unstable__tag', collection.tag)
  } else {
    url.searchParams.set('unstable__collection', 'source')
    url.searchParams.set('source', collection.source)
  }
}

async function fetchOpenverseCollectionPage(
  mediaType: OpenverseMediaType,
  collection: OpenverseCollectionQuery,
  page: number,
  pageSize: number,
  signal?: AbortSignal,
) {
  try {
    const url = new URL(OPENVERSE_API_URL[mediaType])
    setOpenverseCollectionSearchParams(url, collection)
    url.searchParams.set('page', String(page))
    url.searchParams.set('page_size', String(pageSize))

    const res = await fetch(url, { signal })
    if (!res.ok) return null

    return (await res.json()) as OpenverseMediaListResponse
  } catch {
    return null
  }
}

export async function fetchOpenverseCollectionCount(
  mediaType: OpenverseMediaType,
  collection: OpenverseCollectionQuery,
  signal?: AbortSignal,
): Promise<number | undefined> {
  return (await fetchOpenverseCollectionPage(mediaType, collection, 1, 1, signal))?.result_count
}

export async function fetchOpenverseCollectionResults(
  mediaType: OpenverseMediaType,
  collection: OpenverseCollectionQuery,
  page: number,
  pageSize: number,
  signal?: AbortSignal,
): Promise<{ total: number; results: OpenverseMedia[] } | undefined> {
  const skip = (page - 1) * pageSize
  const firstRealPage = Math.floor(skip / OPENVERSE_MAX_PAGE_SIZE) + 1
  const lastRealPage = Math.floor((skip + pageSize - 1) / OPENVERSE_MAX_PAGE_SIZE) + 1

  const realPages: (OpenverseMediaListResponse | null)[] = []
  for (let realPage = firstRealPage; realPage <= lastRealPage; realPage++) {
    realPages.push(
      await fetchOpenverseCollectionPage(
        mediaType,
        collection,
        realPage,
        OPENVERSE_MAX_PAGE_SIZE,
        signal,
      ),
    )
  }
  if (!realPages[0]) return undefined

  const offset = skip % OPENVERSE_MAX_PAGE_SIZE
  const combined = realPages.flatMap((realPage) => realPage?.results ?? [])

  return {
    total: realPages[0].result_count,
    results: combined.slice(offset, offset + pageSize),
  }
}
