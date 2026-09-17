import {
  excludeIACollections,
  iaAdvancedSearch,
  getIAItemThumbnailURL,
  IAMediaType,
} from 'tapestry-core/src/internet-archive'
import { ImportItemsListProps } from '..'
import { useResponsive, Breakpoint } from '../../../../providers/responsive-provider'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { CollectionList, CollectionListItem } from '../collection-list'
import { useMemo, useState } from 'react'
import { partial } from 'lodash-es'
import { LazyListLoader } from '../../../lazy-list/lazy-list-loader'
import { useObservable } from 'tapestry-core-client/src/components/lib/hooks/use-observable'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import { SelectAll } from '../select-all'
import { paginateBySkipLimit } from '../paginate-by-skip-limit'
import { ImportItem, MAX_SELECTION } from '../..'
import styles from '../collection-list/styles.module.css'

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

function toImportItem(item: IASearchResultItem): ImportItem {
  return { id: item.id, mediaType: item.mediatype }
}

interface IASearchListProps extends Omit<ImportItemsListProps, 'collectionImport'> {
  query: string
  emptyPlaceholder?: string
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
  const textVariant = mdOrLess ? 'bodyXs' : undefined

  const [listLoader, setListLoader] = useState<LazyListLoader<IASearchResultItem> | null>(null)
  const state = useObservable(listLoader)
  const total = state?.total

  const requestItems = useMemo(() => partial(requestSearchItems, query), [query])

  const { trigger: selectAllItems, loading: selectingAll } = useAsyncAction(
    async ({ signal }: AbortController) => {
      const result = await requestItems(0, MAX_SELECTION, signal)
      onSelectAll(result.data.map(toImportItem))
    },
  )

  const selectedCount = selectedItems.length
  const hasSelection = selectedCount > 0

  const selectAll = (
    <SelectAll
      checked={hasSelection}
      onChange={() => (hasSelection ? onDeselectAll() : selectAllItems())}
      total={total}
      loading={selectingAll}
      classes={{ root: mdOrLess ? styles.mobileSelectAll : undefined, checkbox: styles.checkbox }}
      textVariant={textVariant}
    />
  )

  return (
    <CollectionList
      windowSize={100}
      loadingEdgeProximity={15}
      requestItems={requestItems}
      onLoaderInitialized={setListLoader}
      mdOrLess={mdOrLess}
      columns={['creator', 'published', 'views']}
      detailsGroupName="IA-search-list"
      selectAll={selectAll}
      header={
        mdOrLess ? (
          <>
            {!state?.skip && header}
            {selectAll}
          </>
        ) : (
          header
        )
      }
      toListItem={(item): CollectionListItem => ({
        image: getIAItemThumbnailURL(item.id),
        title: item.title,
        creator: item.creator,
        published: item.publicdate,
        views: item.downloads,
      })}
      isSelected={(item) => !!selectedItems.find((i) => i.id === item.id)}
      onSelectItem={(item) => onSelect(toImportItem(item))}
      selectedCount={selectedCount}
      emptyPlaceholder={<Text>{emptyPlaceholder}</Text>}
    />
  )
}
