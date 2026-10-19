import {
  excludeIACollections,
  iaAdvancedSearch,
  getIAItemThumbnailURL,
  IAMediaType,
} from 'tapestry-core/src/internet-archive'
import { ImportItemsListProps } from '..'
import { useResponsive, Breakpoint } from '../../../../providers/responsive-provider'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { BaseCollectionList, CollectionListItem } from '../base-collection-list'
import { useMemo } from 'react'
import { partial } from 'lodash-es'
import { createIAMediaItems } from '../../../../stage/item-factories'

function getSearchOpts(query: string) {
  return {
    q: excludeIACollections(query),
    fields: {
      identifier: true,
      mediatype: true,
      title: true,
      creator: true,
      publicdate: true,
      downloads: true,
    } as const,
    sort: ['downloads desc', 'identifier desc'],
  }
}

interface IASearchResultItem {
  id: string
  identifier: string
  mediatype: IAMediaType
  title: string
  creator?: string | undefined
  publicdate: string
  downloads: number
}

// Bridges IA's numbered-page search API to LazyList's skip/limit windowing, fetching the one or
// two real pages that cover the requested window.
export async function requestSearchItems(
  query: string,
  skip: number,
  limit: number,
  signal: AbortSignal,
) {
  const searchOpts = getSearchOpts(query)
  const firstPageNumber = Math.floor(skip / limit) + 1
  const firstPageResult = await iaAdvancedSearch(
    { ...searchOpts, page: firstPageNumber, pageSize: limit },
    signal,
  )

  const extra = skip % limit
  const secondPageResult =
    extra && firstPageResult
      ? await iaAdvancedSearch(
          { ...searchOpts, page: firstPageNumber + 1, pageSize: limit },
          signal,
        )
      : undefined

  const data = [
    ...(firstPageResult ? firstPageResult.response.docs : []),
    ...(secondPageResult ? secondPageResult.response.docs : []),
  ].slice(extra, extra + limit)

  return {
    skip,
    total: firstPageResult?.response.numFound ?? data.length,
    data: data.map((doc) => ({ ...doc, id: doc.identifier })),
  }
}

interface IASearchListProps extends Omit<ImportItemsListProps, 'collectionImport'> {
  query: string
  emptyPlaceholder?: string
}

export function IASearchList({
  query,
  header,
  emptyPlaceholder = 'No results for this search',
  tapestryId,
  ...props
}: IASearchListProps) {
  const mdOrLess = useResponsive() <= Breakpoint.MD

  const requestItems = useMemo(() => partial(requestSearchItems, query), [query])

  return (
    <BaseCollectionList
      {...props}
      windowSize={100}
      loadingEdgeProximity={15}
      requestItems={requestItems}
      mdOrLess={mdOrLess}
      columns={['creator', 'published', 'views']}
      detailsGroupName="IA-search-list"
      header={header}
      toListItem={(item): CollectionListItem => ({
        image: getIAItemThumbnailURL(item.id),
        title: item.title,
        creator: item.creator,
        published: item.publicdate,
        views: item.downloads,
      })}
      toTapestryItem={async (item: IASearchResultItem) => {
        const [created] = await createIAMediaItems(tapestryId, [
          { id: item.id, mediaType: item.mediatype },
        ])
        return created
      }}
      emptyPlaceholder={<Text>{emptyPlaceholder}</Text>}
    />
  )
}
