import { useMemo, useState } from 'react'
import {
  fetchWikimediaCollectionResults,
  WikimediaMedia,
} from 'tapestry-core/src/wikimedia-commons'
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

// Use this icon when a media item has no real thumbnail (Commons' generic per-extension icon,
// already mapped to null in wikimedia-commons.ts).
const NO_THUMBNAIL_ICON: Record<WikimediaMedia['mediaType'], IconName> = {
  image: 'image',
  audio: 'audio_file',
  video: 'video_file',
  pdf: 'picture_as_pdf',
}

export type WikimediaCommonsCategoryImport = Extract<
  CollectionImport,
  { type: 'WikimediaCommonsCategory' }
>

interface WikimediaCollectionListProps extends Omit<ImportItemsListProps, 'collectionImport'> {
  collection: WikimediaCommonsCategoryImport
}

function toImportItem(item: WikimediaMedia): ImportItem {
  return { id: item.id, sourceUrl: item.url, wikimediaMediaType: item.mediaType }
}

export function WikimediaCollectionList({
  onSelect,
  onSelectAll,
  onDeselectAll,
  collection,
  selectedItems,
  header,
}: WikimediaCollectionListProps) {
  const mdOrLess = useResponsive() <= Breakpoint.MD

  const [listLoader, setListLoader] = useState<LazyListLoader<WikimediaMedia> | null>(null)
  const state = useObservable(listLoader)
  const total = state?.total

  const [undecodableIds, setUndecodableIds] = useState<Set<string>>(new Set())
  const [loadFailed, setLoadFailed] = useState(false)

  const requestItems = useMemo(() => {
    // Commons paginates categories with an opaque cursor, not a page number -- there's no way to
    // jump directly to an arbitrary skip. Walk forward from wherever this category's walk last
    // left off, fetching one real page at a time and buffering everything fetched so far, until
    // the buffer covers the requested window. Cursors (and the buffered items) live for as long
    // as this component does; they don't go stale.
    const fetched: WikimediaMedia[] = []
    let nextCursor: string | undefined
    let done = false

    return async (skip: number, limit: number, signal: AbortSignal) => {
      while (fetched.length < skip + limit && !done) {
        const page = await fetchWikimediaCollectionResults(collection.category, nextCursor, signal)
        if (!page) {
          setLoadFailed(true)
          return { skip, total: collection.total, data: fetched.slice(skip, skip + limit) }
        }
        fetched.push(...page.results)
        nextCursor = page.nextCursor
        done = nextCursor === undefined
      }
      setLoadFailed(false)
      return { skip, total: collection.total, data: fetched.slice(skip, skip + limit) }
    }
  }, [collection.category, collection.total])

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
      // Commons rate-limits aggressively. Nothing here needs a background refresh while the
      // picker is open, only real user-driven pagination.
      autoReload={false}
      mdOrLess={mdOrLess}
      columns={['uploader']}
      detailsGroupName="wikimedia-collection-list"
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
        fallbackIcon: NO_THUMBNAIL_ICON[item.mediaType],
        title: item.title,
        uploader: item.uploader ?? undefined,
      })}
      onImageError={(item) => setUndecodableIds((current) => new Set(current).add(item.id))}
      isSelected={(item) => !!selectedItems.find((i) => i.id === item.id)}
      onSelectItem={(item) => onSelect(toImportItem(item))}
      selectedCount={selectedCount}
      emptyPlaceholder={
        <Text>
          {loadFailed
            ? "Couldn't load items right now — try again in a moment"
            : 'No files in this category'}
        </Text>
      }
    />
  )
}
