export const IA_WAYBACK_PAGE = 'ia-wayback-page'
export const IA_ITEM = 'ia-item'
export const IA_USER_LIST = 'ia-user-list'

const IA_HOST = 'archive.org'

export interface IAItem {
  id: string
  mediaType: IAMediaType
  pathParams?: string[]
  queryParams?: URLSearchParams
}

interface IAItemUrlDescriptor {
  urlType: 'details' | 'embed'
  item: Omit<IAItem, 'mediaType'>
}

interface IAUserListUrlDescriptor {
  urlType: 'user-list'
  username: string
  listId: string
}

type IAUrlDescriptor = IAItemUrlDescriptor | IAUserListUrlDescriptor

export type IAMediaType =
  | 'texts'
  | 'etree'
  | 'audio'
  | 'movies'
  | 'software'
  | 'image'
  | 'data'
  | 'web'
  | 'collection'
  | 'account'

const IA_ITEM_METADATA_API_URL = 'https://archive.org/metadata/'
export interface IAItemMetadata {
  metadata: {
    mediatype: IAMediaType
    title: string
    description?: string
    publicdate: string
    uploader?: string
    summary?: string
    creator?: string
  }
}

type IAEmbedPlaylistAPIResponse = {
  title: string
  duration: number
  orig: string
}[]

// More fields available at https://archive.org/advancedsearch.php
export interface IAAdvancedSearchFields {
  identifier: string
  mediatype: IAMediaType
  title: string
  creator?: string
  publicdate: string
  downloads: number
}

type IAAdvancedSearchFieldsQuery = Partial<Record<keyof IAAdvancedSearchFields, true>>

// Go to https://archive.org/advancedsearch.php for more details and examples
interface IAAdvancedSearchOptions<F extends IAAdvancedSearchFieldsQuery> {
  q: string
  fields?: F
  sort?: string[]
  pageSize?: number
  page?: number
}

interface IAAdvancedSearchResponse<F extends IAAdvancedSearchFieldsQuery> {
  responseHeader: {
    status: number
    QTime: number
    params: {
      query: string
      fields: string
      wt: string
      rows: number
      start: number
    }
  }
  response: {
    numFound: number
    start: number
    docs: Pick<IAAdvancedSearchFields, keyof F & keyof IAAdvancedSearchFields>[]
  }
}

export async function iaAdvancedSearch<F extends IAAdvancedSearchFieldsQuery>(
  opts: IAAdvancedSearchOptions<F>,
  signal?: AbortSignal,
) {
  const url = new URL('https://archive.org/advancedsearch.php')
  url.searchParams.set('q', opts.q)
  url.searchParams.set('output', 'json')
  url.searchParams.set('rows', `${opts.pageSize ?? 50}`)
  url.searchParams.set('page', `${opts.page ?? 1}`)
  if (opts.fields) {
    Object.keys(opts.fields).forEach((field) => url.searchParams.append('fl[]', field))
  }
  opts.sort?.forEach((sort) => url.searchParams.append('sort[]', sort))

  const response = await fetch(url, { signal })
  if (response.ok) {
    return (await response.json()) as IAAdvancedSearchResponse<F>
  }
}

export function parseInternetArchiveURL(source: unknown): IAUrlDescriptor | null {
  if (typeof source !== 'string' || source === '') return null

  try {
    const url = new URL(source)
    const [urlType, itemIdOrUsername, ...pathParams] = url.pathname.replace(/^\/?/, '').split('/')
    if (
      url.host !== IA_HOST ||
      (urlType !== 'details' && urlType !== 'embed') ||
      !itemIdOrUsername
    ) {
      return null
    }
    if (urlType === 'details' && itemIdOrUsername.startsWith('@') && pathParams[0] === 'lists') {
      return {
        urlType: 'user-list',
        username: itemIdOrUsername.slice(1),
        listId: pathParams[1],
      }
    }
    return {
      urlType,
      item: {
        id: itemIdOrUsername,
        pathParams,
        queryParams: new URLSearchParams(url.searchParams),
      },
    }
  } catch (error) {
    console.warn(error)
    return null
  }
}

export function iaItemEmbedURL({ id, pathParams, queryParams }: IAItem) {
  const url = new URL(`https://${IA_HOST}`)
  url.pathname = ['embed', id, ...(pathParams ?? [])].join('/')
  url.search = queryParams?.toString() ?? ''
  return url.toString()
}

export async function getNestedIAItems(item: Omit<IAItem, 'mediaType'>): Promise<IAItem[]> {
  const mediaTypeResponse = await iaAdvancedSearch({
    q: `identifier:${item.id}`,
    fields: { mediatype: true },
  })

  if (!mediaTypeResponse?.response.numFound) return []

  const { mediatype: mediaType } = mediaTypeResponse.response.docs[0]

  if (mediaType !== 'collection') {
    // If it is not a collection treat it as a single item
    return [{ ...item, mediaType }]
  }

  const membersResponse = await iaAdvancedSearch({
    q: `collection:${item.id}`,
    fields: { identifier: true, mediatype: true },
    sort: ['createdate desc'],
    // Put some upper limit on the amount of collection members to load since most IA collections have millions
    // of members. In the future we will create some UX for the user to pick items from the collection.
    pageSize: 50,
  })

  return (
    membersResponse?.response.docs.map((doc) => ({
      id: doc.identifier,
      mediaType: doc.mediatype,
    })) ?? []
  )
}

export async function getIAItemMetadata(id: string) {
  try {
    const res = await fetch(`${IA_ITEM_METADATA_API_URL}${id}`)
    const { metadata } = (await res.json()) as IAItemMetadata
    return metadata
  } catch {
    return null
  }
}

function iaPlaylistURL({ id, pathParams, queryParams }: Omit<IAItem, 'mediaType'>) {
  const url = new URL(`https://${IA_HOST}`)
  url.pathname = ['details', id, ...(pathParams ?? [])].join('/')
  url.search = queryParams?.toString() ?? ''
  url.searchParams.set('embed', '1')
  url.searchParams.set('output', 'json')
  return url.toString()
}

export async function getIAPlaylistEntries(item: Omit<IAItem, 'mediaType'>) {
  try {
    const res = await fetch(iaPlaylistURL(item))
    return (await res.json()) as IAEmbedPlaylistAPIResponse
  } catch {
    return null
  }
}

export async function getIAItemMediaType(id: string) {
  return (await getIAItemMetadata(id))?.mediatype
}

export function getIAItemThumbnailURL(id: string) {
  return `https://archive.org/services/img/${id}`
}
