import { useMemo, useState } from 'react'
import { fetchOpenverseCollectionResults, OpenverseMedia } from 'tapestry-core/src/openverse'
import { ImportItemsListProps } from '..'
import { CollectionImport } from '../../../../pages/tapestry/view-model'
import { useResponsive, Breakpoint } from '../../../../providers/responsive-provider'
import { IconName } from 'tapestry-core-client/src/components/lib/icon/index'
import { LazyListLoader } from '../../../lazy-list/lazy-list-loader'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { useObservable } from 'tapestry-core-client/src/components/lib/hooks/use-observable'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import {
  BaseCollectionList,
  CollectionListItem,
  CollectionSelectAll,
} from '../base-collection-list'
import { ImportItem, MAX_SELECTION } from '../..'
import { requestExternalItems } from '../paginate-utils'

const NO_THUMBNAIL_ICON: Record<'image' | 'audio', IconName> = {
  image: 'image',
  audio: 'audio_file',
}

export type OpenverseCollectionImport = Extract<CollectionImport, { type: 'OpenverseCollection' }>

interface OpenverseCollectionListProps extends Omit<ImportItemsListProps, 'collectionImport'> {
  collection: OpenverseCollectionImport
}

function toImportItem(item: OpenverseMedia): ImportItem {
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

  const [listLoader, setListLoader] = useState<LazyListLoader<OpenverseMedia> | null>(null)
  const state = useObservable(listLoader)
  const total = state?.total

  const [undecodableIds, setUndecodableIds] = useState<Set<string>>(new Set())
  const [loadFailed, setLoadFailed] = useState(false)

  const requestItems = useMemo(() => {
    // Always report the count fetched up front. Do not derive the total from each page's own
    // response. LazyListLoader treats a change in total as a change in the list. It then does a
    // full reload and clears the current items. A failed page must not look like a smaller list.
    return async (skip: number, limit: number, signal: AbortSignal) => {
      const result = await requestExternalItems(
        (page, pageSize, pageSignal) =>
          fetchOpenverseCollectionResults(
            collection.mediaType,
            collection.collection,
            page,
            pageSize,
            pageSignal,
          ),
        skip,
        limit,
        signal,
      )
      setLoadFailed(result.failed)
      return { skip: result.skip, total: collection.total, data: result.data }
    }
  }, [collection.mediaType, collection.collection, collection.total])

  const { trigger: selectAllItems, loading: selectingAll } = useAsyncAction(
    async ({ signal }: AbortController) => {
      const result = await requestItems(0, MAX_SELECTION, signal)
      onSelectAll(result.data.map(toImportItem))
    },
  )

  const selectedCount = selectedItems.length
  const maxSelectable = total === undefined ? undefined : Math.min(total, MAX_SELECTION)
  const allSelected = maxSelectable !== undefined && selectedCount >= maxSelectable

  const selectAll = (
    <CollectionSelectAll
      checked={allSelected}
      onChange={() => (allSelected ? onDeselectAll() : selectAllItems())}
      total={total}
      loading={selectingAll}
      mdOrLess={mdOrLess}
    />
  )

  return (
    <BaseCollectionList
      windowSize={20}
      loadingEdgeProximity={5}
      requestItems={requestItems}
      onLoaderInitialized={setListLoader}
      // Openverse rate-limits aggressively. Nothing here needs a background refresh while the
      // picker is open, only real user-driven pagination.
      autoReload={false}
      mdOrLess={mdOrLess}
      columns={['creator', 'license']}
      detailsGroupName="openverse-collection-list"
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
      shouldRenderItem={(item) => !undecodableIds.has(item.id)}
      toListItem={(item): CollectionListItem => ({
        image: item.thumbnail,
        fallbackIcon: NO_THUMBNAIL_ICON[collection.mediaType],
        title: item.title,
        creator: item.creator ?? undefined,
        license: item.license,
      })}
      onImageError={(item) => setUndecodableIds((current) => new Set(current).add(item.id))}
      isSelected={(item) => !!selectedItems.find((i) => i.id === item.id)}
      onSelectItem={(item) => onSelect(toImportItem(item))}
      selectedCount={selectedCount}
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
