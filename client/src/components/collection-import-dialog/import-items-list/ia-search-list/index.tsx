import {
  excludeIACollections,
  iaAdvancedSearch,
  getIAItemThumbnailURL,
  IAMediaType,
} from 'tapestry-core/src/internet-archive'
import { ImportItemsListProps } from '..'
import { useResponsive, Breakpoint } from '../../../../providers/responsive-provider'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import {
  BaseCollectionList,
  CollectionListItem,
  paginateBySkipLimit,
} from '../base-collection-list'
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
