import {
  OpenverseCollectionQuery,
  OpenverseMedia,
  OpenverseMediaType,
} from 'tapestry-core/src/openverse'
import { WikimediaCollectionQuery, WikimediaMedia } from 'tapestry-core/src/wikimedia-commons'
import {
  ExternalMediaProxyDto,
  ExternalCollectionCountProxyDto,
  ExternalCollectionResultsProxyDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/proxy'
import { resource } from '../services/rest-resources'

export async function fetchOpenverseMedia(
  mediaType: OpenverseMediaType,
  id: string,
  signal?: AbortSignal,
): Promise<OpenverseMedia | null> {
  const { result } = (await resource('proxy').create(
    { type: 'external-media', query: { platform: 'openverse', mediaType, id } },
    {},
    { signal },
  )) as ExternalMediaProxyDto

  return result as OpenverseMedia | null
}

export async function fetchWikimediaMedia(
  title: string,
  signal?: AbortSignal,
): Promise<WikimediaMedia | null> {
  const { result } = (await resource('proxy').create(
    { type: 'external-media', query: { platform: 'wikimedia-commons', title } },
    {},
    { signal },
  )) as ExternalMediaProxyDto

  return result as WikimediaMedia | null
}

export async function fetchOpenverseCollectionCount(
  mediaType: OpenverseMediaType,
  collection: OpenverseCollectionQuery,
  signal?: AbortSignal,
): Promise<number | undefined> {
  const { result } = (await resource('proxy').create(
    { type: 'external-collection-count', query: { platform: 'openverse', mediaType, collection } },
    {},
    { signal },
  )) as ExternalCollectionCountProxyDto

  return result
}

export async function fetchWikimediaCollectionCount(
  collection: WikimediaCollectionQuery,
  signal?: AbortSignal,
): Promise<number | undefined> {
  const { result } = (await resource('proxy').create(
    { type: 'external-collection-count', query: { platform: 'wikimedia-commons', collection } },
    {},
    { signal },
  )) as ExternalCollectionCountProxyDto

  return result
}

export async function fetchOpenverseCollectionResults(
  mediaType: OpenverseMediaType,
  collection: OpenverseCollectionQuery,
  page: number,
  pageSize: number,
  signal?: AbortSignal,
): Promise<{ total: number; results: OpenverseMedia[] } | undefined> {
  const { result } = (await resource('proxy').create(
    {
      type: 'external-collection-results',
      query: { platform: 'openverse', mediaType, collection },
      page,
      pageSize,
    },
    {},
    { signal },
  )) as ExternalCollectionResultsProxyDto

  return result as { total: number; results: OpenverseMedia[] } | undefined
}

export async function fetchWikimediaCollectionResults(
  collection: WikimediaCollectionQuery,
  page: number,
  pageSize: number,
  signal?: AbortSignal,
): Promise<{ total: number; results: WikimediaMedia[] } | undefined> {
  const { result } = (await resource('proxy').create(
    {
      type: 'external-collection-results',
      query: { platform: 'wikimedia-commons', collection },
      page,
      pageSize,
    },
    {},
    { signal },
  )) as ExternalCollectionResultsProxyDto

  return result as { total: number; results: WikimediaMedia[] } | undefined
}
