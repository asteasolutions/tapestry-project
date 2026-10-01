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

interface FetchedPage<Result> {
  page: number
  result: Result | undefined
}

// Bridges IA's numbered-page search API to LazyList's skip/limit windowing, fetching the one or
// two real pages that cover the requested window.
async function paginateBySkipLimit<Result, Item>(
  fetchPage: (page: number, pageSize: number, signal: AbortSignal) => Promise<Result | undefined>,
  getItems: (result: Result) => Item[],
  skip: number,
  limit: number,
  signal: AbortSignal,
): Promise<{
  skip: number
  data: Item[]
  firstPage: FetchedPage<Result>
  secondPage?: FetchedPage<Result>
}> {
  const firstPageNumber = Math.floor(skip / limit) + 1
  const firstPageResult = await fetchPage(firstPageNumber, limit, signal)

  const extra = skip % limit
  const secondPageResult =
    extra && firstPageResult ? await fetchPage(firstPageNumber + 1, limit, signal) : undefined

  const data = [
    ...(firstPageResult ? getItems(firstPageResult) : []),
    ...(secondPageResult ? getItems(secondPageResult) : []),
  ].slice(extra, extra + limit)

  return {
    skip,
    data,
    firstPage: { page: firstPageNumber, result: firstPageResult },
    ...(extra && firstPageResult
      ? { secondPage: { page: firstPageNumber + 1, result: secondPageResult } }
      : {}),
  }
}

export async function requestSearchItems(
  query: string,
  skip: number,
  limit: number,
  signal: AbortSignal,
) {
  const { data, firstPage } = await paginateBySkipLimit(
    (page, pageSize, pageSignal) =>
      iaAdvancedSearch({ ...getSearchOpts(query), page, pageSize }, pageSignal),
    (result) => result.response.docs,
    skip,
    limit,
    signal,
  )

  return {
    skip,
    total: firstPage.result?.response.numFound ?? data.length,
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
