import clsx from 'clsx'
import { CSSProperties, useMemo, useState } from 'react'
import { fetchOpenverseCollectionResults, OpenverseMedia } from 'tapestry-core/src/openverse'
import { ImportItemsListProps } from '..'
import { CollectionImport } from '../../../../pages/tapestry/view-model'
import { useResponsive, Breakpoint } from '../../../../providers/responsive-provider'
import { Icon, IconName } from 'tapestry-core-client/src/components/lib/icon/index'
import { LazyListLoader } from '../../../lazy-list/lazy-list-loader'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { useObservable } from 'tapestry-core-client/src/components/lib/hooks/use-observable'
import { SelectAll } from '../select-all'
import { CollectionList } from '../collection-list'
import { MAX_SELECTION } from '../..'
import { requestExternalItems } from '../request-external-items'
import styles from './styles.module.css'

const NO_THUMBNAIL_ICON: Record<'image' | 'audio', IconName> = {
  image: 'image',
  audio: 'audio_file',
}

const DETAIL_COLUMN_COUNT = 2

export type OpenverseCollectionImport = Extract<CollectionImport, { type: 'OpenverseCollection' }>

interface OpenverseCollectionListProps extends Omit<ImportItemsListProps, 'collectionImport'> {
  collection: OpenverseCollectionImport
}

export function OpenverseCollectionList({
  onSelect,
  onToggleAll,
  toggling,
  collection,
  selectedItems,
  header,
}: OpenverseCollectionListProps) {
  const mdOrLess = useResponsive() <= Breakpoint.MD
  const textVariant = mdOrLess ? 'bodyXs' : undefined

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

  const selectedCount = selectedItems.length
  const maxSelectable = total === undefined ? undefined : Math.min(total, MAX_SELECTION)
  const allSelected = maxSelectable !== undefined && selectedCount >= maxSelectable

  const selectAll = (
    <SelectAll
      checked={allSelected}
      onChange={() => onToggleAll(!allSelected)}
      total={total}
      loading={toggling}
      classes={{ root: mdOrLess ? styles.mobileSelectAll : undefined, checkbox: styles.checkbox }}
      textVariant={textVariant}
    />
  )

  const detailsHeader = (
    <>
      <Text variant={textVariant} className={styles.bold}>
        Creator
      </Text>
      <Text variant={textVariant} className={styles.bold}>
        License
      </Text>
    </>
  )

  return (
    <div
      className={styles.root}
      style={{ '--detail-column-count': DETAIL_COLUMN_COUNT } as CSSProperties}
    >
      {!mdOrLess && (
        <div className={clsx(styles.collectionItem, styles.header)}>
          {selectAll}
          {detailsHeader}
        </div>
      )}
      <CollectionList
        windowSize={20}
        loadingEdgeProximity={5}
        requestItems={requestItems}
        onLoaderInitialized={setListLoader}
        // Openverse rate-limits aggressively. Nothing here needs a background refresh while the
        // picker is open, only real user-driven pagination.
        autoReload={false}
        mdOrLess={mdOrLess}
        detailsHeader={detailsHeader}
        detailsGroupName="openverse-collection-list"
        classes={{
          collectionItem: styles.collectionItem,
          detailsElement: styles.detailsElement,
          detailsIcon: styles.detailsIcon,
          itemDetails: styles.itemDetails,
        }}
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
        isSelected={(item) => !!selectedItems.find((i) => i.id === item.id)}
        onSelectItem={(item) => onSelect({ id: item.id, sourceUrl: item.url })}
        selectedCount={selectedCount}
        renderItemContent={(item) => (
          <>
            {item.thumbnail ? (
              <img
                className={styles.itemImage}
                src={item.thumbnail}
                alt={item.title}
                onError={() => setUndecodableIds((current) => new Set(current).add(item.id))}
              />
            ) : (
              <Icon
                component="div"
                icon={NO_THUMBNAIL_ICON[collection.mediaType]}
                className={clsx(styles.itemImage, styles.noThumbnailIcon)}
              />
            )}
            <Text lineClamp={2} variant={textVariant}>
              {item.title}
            </Text>
          </>
        )}
        renderItemDetails={(item) => (
          <>
            <Text lineClamp={2} variant={textVariant}>
              {item.creator}
            </Text>
            <Text variant={textVariant}>{item.license}</Text>
          </>
        )}
        emptyPlaceholder={
          <Text>
            {loadFailed
              ? "Couldn't load items right now — try again in a moment"
              : `No ${collection.mediaType === 'image' ? 'images' : 'audio items'} in this collection`}
          </Text>
        }
      />
    </div>
  )
}
