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
import { IASelectedItem } from '../..'

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

function toImportItem(item: IASearchResultItem): IASelectedItem {
  return { id: item.id, mediaType: item.mediatype }
}

interface IASearchListProps extends Omit<
  ImportItemsListProps,
  'collectionImport' | 'selectedItems' | 'onSelect' | 'onSelectAll'
> {
  query: string
  emptyPlaceholder?: string
  selectedItems: IASelectedItem[]
  onSelect: (item: IASelectedItem) => unknown
  onSelectAll: (items: IASelectedItem[]) => unknown
}

export function IASearchList({
  onSelect,
  onSelectAll,
  onDeselectAll,
  query,
  selectedItems,
  header,
  emptyPlaceholder = 'No results for this search',
}: IASearchListProps) {
  const mdOrLess = useResponsive() <= Breakpoint.MD

  const requestItems = useMemo(() => partial(requestSearchItems, query), [query])

  return (
    <BaseCollectionList
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
      toImportItem={toImportItem}
      selectedItems={selectedItems}
      onSelect={onSelect}
      onSelectAll={onSelectAll}
      onDeselectAll={onDeselectAll}
      emptyPlaceholder={<Text>{emptyPlaceholder}</Text>}
    />
  )
}
