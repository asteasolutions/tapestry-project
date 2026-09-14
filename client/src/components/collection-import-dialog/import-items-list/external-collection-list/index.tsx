import clsx from 'clsx'
import { CSSProperties, ReactNode, useMemo, useState } from 'react'
import {
  fetchOpenverseCollectionResults,
  OpenverseMedia,
  OpenverseMediaType,
} from 'tapestry-core/src/openverse'
import { WikimediaMedia } from 'tapestry-core/src/wikimedia-commons'
import { fetchWikimediaCollectionResults } from '../../../../lib/external-media'
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
import { paginateBySkipLimit } from '../paginate-by-skip-limit'
import styles from './styles.module.css'

// Use this icon when a media item has no real thumbnail. This covers Openverse audio (always
// null) and Commons' generic per-extension icon (already mapped to null in wikimedia-commons.ts).
const NO_THUMBNAIL_ICON: Record<'image' | 'audio' | 'video' | 'pdf', IconName> = {
  image: 'image',
  audio: 'audio_file',
  video: 'video_file',
  pdf: 'picture_as_pdf',
}

const FETCH_RETRY_ATTEMPTS = 3
const FETCH_RETRY_DELAY_MS = 4000

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const timeout = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timeout)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })
}

// LazyListLoader replaces the whole list on every fetch. This includes its own periodic reload.
// A single failed fetch would then clear the list. Retry first. Space the retries past the
// proxy's short failure-cache time.
async function fetchPageWithRetry<Result>(
  fetchPage: (page: number, pageSize: number, signal: AbortSignal) => Promise<Result | undefined>,
  page: number,
  pageSize: number,
  signal: AbortSignal,
): Promise<Result | undefined> {
  for (let attempt = 0; attempt < FETCH_RETRY_ATTEMPTS; attempt++) {
    const result = await fetchPage(page, pageSize, signal)
    if (result) return result
    if (attempt < FETCH_RETRY_ATTEMPTS - 1) await delay(FETCH_RETRY_DELAY_MS, signal)
  }
  return undefined
}

async function requestExternalItems<Media>(
  fetchPage: (
    page: number,
    pageSize: number,
    signal: AbortSignal,
  ) => Promise<{ total: number; results: Media[] } | undefined>,
  skip: number,
  limit: number,
  signal: AbortSignal,
) {
  const { data, firstPage, secondPage } = await paginateBySkipLimit(
    (page, pageSize, pageSignal) => fetchPageWithRetry(fetchPage, page, pageSize, pageSignal),
    (result) => result.results,
    skip,
    limit,
    signal,
  )

  return {
    skip,
    data,
    failed: firstPage.result === undefined || (secondPage !== undefined && !secondPage.result),
  }
}

export type ExternalCollectionImport = Extract<
  CollectionImport,
  { type: 'OpenverseCollection' | 'WikimediaCommonsCategory' }
>

type FetchExternalPage = (
  skip: number,
  limit: number,
  signal: AbortSignal,
) => Promise<{ skip: number; data: (OpenverseMedia | WikimediaMedia)[]; failed: boolean }>

interface ExternalCollectionConfig {
  detailColumnCount: number
  detailsHeader: ReactNode
  emptyPlaceholder: string
  itemMediaTypeFallback: OpenverseMediaType | undefined
  fetchPage: FetchExternalPage
}

// Everything that varies by platform lives here, in one place. Adding a platform means
// adding one branch here, not touching every ternary in the component below.
function describeExternalCollection(
  collection: ExternalCollectionImport,
  textVariant: 'bodyXs' | undefined,
): ExternalCollectionConfig {
  if (collection.type === 'OpenverseCollection') {
    return {
      detailColumnCount: 2,
      detailsHeader: (
        <>
          <Text variant={textVariant} className={styles.bold}>
            Creator
          </Text>
          <Text variant={textVariant} className={styles.bold}>
            License
          </Text>
        </>
      ),
      emptyPlaceholder: `No ${collection.mediaType === 'image' ? 'images' : 'audio items'} in this collection`,
      itemMediaTypeFallback: collection.mediaType,
      fetchPage: (skip, limit, signal) =>
        requestExternalItems(
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
        ),
    }
  }

  return {
    detailColumnCount: 1,
    detailsHeader: (
      <Text variant={textVariant} className={styles.bold}>
        Uploader
      </Text>
    ),
    emptyPlaceholder: 'No files in this category',
    itemMediaTypeFallback: undefined,
    fetchPage: (skip, limit, signal) =>
      requestExternalItems(
        (page, pageSize, pageSignal) =>
          fetchWikimediaCollectionResults(collection.collection, page, pageSize, pageSignal),
        skip,
        limit,
        signal,
      ),
  }
}

interface ExternalCollectionListProps extends Omit<ImportItemsListProps, 'collectionImport'> {
  collection: ExternalCollectionImport
}

export function ExternalCollectionList({
  onSelect,
  onToggleAll,
  toggling,
  collection,
  selectedItems,
  header,
}: ExternalCollectionListProps) {
  const mdOrLess = useResponsive() <= Breakpoint.MD
  const textVariant = mdOrLess ? 'bodyXs' : undefined

  const { detailColumnCount, detailsHeader, emptyPlaceholder, itemMediaTypeFallback, fetchPage } =
    useMemo(() => describeExternalCollection(collection, textVariant), [collection, textVariant])

  const [listLoader, setListLoader] = useState<LazyListLoader<
    OpenverseMedia | WikimediaMedia
  > | null>(null)
  const state = useObservable(listLoader)
  const total = state?.total

  const [undecodableIds, setUndecodableIds] = useState<Set<string>>(new Set())
  const [loadFailed, setLoadFailed] = useState(false)

  const requestItems = useMemo(() => {
    // Always report the count fetched up front. Do not derive the total from each page's own
    // response. LazyListLoader treats a change in total as a change in the list. It then does a
    // full reload and clears the current items. A failed page must not look like a smaller list.
    return async (skip: number, limit: number, signal: AbortSignal) => {
      const result = await fetchPage(skip, limit, signal)
      setLoadFailed(result.failed)
      return { skip: result.skip, total: collection.total, data: result.data }
    }
  }, [fetchPage, collection.total])

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

  return (
    <div
      className={styles.root}
      style={{ '--detail-column-count': detailColumnCount } as CSSProperties}
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
        // Openverse and Wikimedia Commons rate-limit aggressively. Nothing here needs a
        // background refresh while the picker is open, only real user-driven pagination.
        autoReload={false}
        mdOrLess={mdOrLess}
        detailsHeader={detailsHeader}
        detailsGroupName="external-collection-list"
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
        onSelectItem={(item) =>
          onSelect({
            id: item.id,
            sourceUrl: item.url,
            ...('mediaType' in item ? { wikimediaMediaType: item.mediaType } : {}),
          })
        }
        selectedCount={selectedCount}
        renderItemContent={(item) => {
          const itemMediaType = 'mediaType' in item ? item.mediaType : itemMediaTypeFallback
          return (
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
                  icon={NO_THUMBNAIL_ICON[itemMediaType ?? 'image']}
                  className={clsx(styles.itemImage, styles.noThumbnailIcon)}
                />
              )}
              <Text lineClamp={2} variant={textVariant}>
                {item.title}
              </Text>
            </>
          )
        }}
        renderItemDetails={(item) =>
          'uploader' in item ? (
            <Text lineClamp={2} variant={textVariant}>
              {item.uploader}
            </Text>
          ) : (
            <>
              <Text lineClamp={2} variant={textVariant}>
                {item.creator}
              </Text>
              <Text variant={textVariant}>{item.license}</Text>
            </>
          )
        }
        emptyPlaceholder={
          <Text>
            {loadFailed
              ? "Couldn't load items right now — try again in a moment"
              : emptyPlaceholder}
          </Text>
        }
      />
    </div>
  )
}
