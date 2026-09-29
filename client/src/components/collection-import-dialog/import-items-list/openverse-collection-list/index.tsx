import { useMemo, useState } from 'react'
import { fetchOpenverseCollectionResults, OpenverseMedia } from 'tapestry-core/src/openverse'
import { ImportItemsListProps } from '..'
import { CollectionImport } from '../../../../pages/tapestry/view-model'
import { useResponsive, Breakpoint } from '../../../../providers/responsive-provider'
import { IconName } from 'tapestry-core-client/src/components/lib/icon/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import {
  BaseCollectionList,
  CollectionListItem,
  paginateBySkipLimit,
} from '../base-collection-list'
import { OpenverseSelectedItem } from '../..'

const NO_THUMBNAIL_ICON: Record<'image' | 'audio', IconName> = {
  image: 'image',
  audio: 'audio_file',
}

export type OpenverseCollectionImport = Extract<CollectionImport, { type: 'OpenverseCollection' }>

interface OpenverseCollectionListProps extends Omit<
  ImportItemsListProps,
  'collectionImport' | 'selectedItems' | 'onSelect' | 'onSelectAll'
> {
  collection: OpenverseCollectionImport
  selectedItems: OpenverseSelectedItem[]
  onSelect: (item: OpenverseSelectedItem) => unknown
  onSelectAll: (items: OpenverseSelectedItem[]) => unknown
}

function toImportItem(item: OpenverseMedia): OpenverseSelectedItem {
  return { id: item.id, sourceUrl: item.url }
}

export function OpenverseCollectionList({
  onSelect,
  onSelectAll,
  onDeselectAll,
  collection,
  selectedItems,
  header,
}: OpenverseCollectionListProps) {
  const mdOrLess = useResponsive() <= Breakpoint.MD
  const [loadFailed, setLoadFailed] = useState(false)

  const requestItems = useMemo(() => {
    // Always report the count fetched up front. Do not derive the total from each page's own
    // response. LazyListLoader treats a change in total as a change in the list. It then does a
    // full reload and clears the current items. A failed page must not look like a smaller list.
    return async (skip: number, limit: number, signal: AbortSignal) => {
      const { data, firstPage, secondPage } = await paginateBySkipLimit(
        (page, pageSize, pageSignal) =>
          fetchOpenverseCollectionResults(
            collection.mediaType,
            collection.collection,
            page,
            pageSize,
            pageSignal,
          ),
        (result) => result.results,
        skip,
        limit,
        signal,
      )
      setLoadFailed(
        firstPage.result === undefined || (secondPage !== undefined && !secondPage.result),
      )
      return { skip, total: collection.total, data }
    }
  }, [collection.mediaType, collection.collection, collection.total])

  return (
    <BaseCollectionList
      windowSize={20}
      loadingEdgeProximity={5}
      requestItems={requestItems}
      // Openverse rate-limits aggressively. Nothing here needs a background refresh while the
      // picker is open, only real user-driven pagination.
      autoReload={false}
      mdOrLess={mdOrLess}
      columns={['creator', 'license']}
      detailsGroupName="openverse-collection-list"
      header={header}
      toListItem={(item): CollectionListItem => ({
        image: item.thumbnail,
        fallbackIcon: NO_THUMBNAIL_ICON[collection.mediaType],
        title: item.title,
        creator: item.creator ?? undefined,
        license: item.license,
      })}
      toImportItem={toImportItem}
      selectedItems={selectedItems}
      onSelect={onSelect}
      onSelectAll={onSelectAll}
      onDeselectAll={onDeselectAll}
      emptyPlaceholder={
        <Text>
          {loadFailed
            ? "Couldn't load items right now — try again in a moment"
            : `No ${collection.mediaType === 'image' ? 'images' : 'audio items'} in this collection`}
        </Text>
      }
    />
  )
}
