// Openverse API docs: https://docs.openverse.org/api/. Endpoint reference for the
// list/detail routes used below: https://api.openverse.org/v1/#tag/images.
const OPENVERSE_HOST = 'openverse.org'

// The largest page size Openverse allows for anonymous requests. Anonymous requests are also
// limited to the first 240 results of a collection; `page_count` in the response accounts for it.
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
  /** Only present for images -- Openverse's audio results have no visual dimensions. */
  width?: number
  height?: number
}

export interface OpenverseMediaPage {
  result_count: number
  page_count: number
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

export async function fetchOpenverseCollectionPage(
  mediaType: OpenverseMediaType,
  collection: OpenverseCollectionQuery,
  page: number,
  signal?: AbortSignal,
): Promise<OpenverseMediaPage | null> {
  const url = new URL(OPENVERSE_API_URL[mediaType])
  if (collection.type === 'tag') {
    url.searchParams.set('unstable__collection', 'tag')
    url.searchParams.set('unstable__tag', collection.tag)
  } else {
    url.searchParams.set('unstable__collection', 'source')
    url.searchParams.set('source', collection.source)
  }
  url.searchParams.set('page', String(page))
  url.searchParams.set('page_size', String(OPENVERSE_MAX_PAGE_SIZE))

  try {
    const res = await fetch(url, { signal })
    if (!res.ok) return null

    return (await res.json()) as OpenverseMediaPage
  } catch {
    return null
  }
}
