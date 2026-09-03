import clsx from 'clsx'
import { CSSProperties, useMemo, useState } from 'react'
import { partial } from 'lodash-es'
import { OpenverseMedia } from 'tapestry-core/src/openverse'
import { WikimediaMedia } from 'tapestry-core/src/wikimedia-commons'
import {
  fetchOpenverseCollectionResults,
  fetchWikimediaCollectionResults,
} from '../../../../lib/external-media'
import { ImportItemsListProps } from '..'
import { IAImport } from '../../../../pages/tapestry/view-model'
import { useResponsive, Breakpoint } from '../../../../providers/responsive-provider'
import { Checkbox } from 'tapestry-core-client/src/components/lib/checkbox'
import { Icon, IconName } from 'tapestry-core-client/src/components/lib/icon/index'
import { LazyList } from '../../../lazy-list'
import { LazyListLoader } from '../../../lazy-list/lazy-list-loader'
import { LoadingLogoIcon } from '../../../loading-logo-icon'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { useObservable } from 'tapestry-core-client/src/components/lib/hooks/use-observable'
import { SelectAll } from '../select-all'
import { MAX_SELECTION } from '../..'
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
  const firstPage = Math.floor(skip / limit) + 1

  const firstPageResult = await fetchPageWithRetry(fetchPage, firstPage, limit, signal)

  const extra = skip % limit
  const secondPageResult = extra
    ? await fetchPageWithRetry(fetchPage, firstPage + 1, limit, signal)
    : undefined

  const finalResult = [
    ...(firstPageResult?.results ?? []),
    ...(secondPageResult?.results ?? []),
  ].slice(extra, extra + limit)

  return {
    skip,
    data: finalResult,
    failed: firstPageResult === undefined || (!!extra && secondPageResult === undefined),
  }
}

export type ExternalCollectionImport = Extract<IAImport, { type: 'ExternalCollection' }>

interface ExternalCollectionListProps extends Omit<ImportItemsListProps, 'iaImport'> {
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
  const { platform } = collection

  const detailColumnCount = platform === 'openverse' ? 2 : 1
  const detailsHeader =
    platform === 'openverse' ? (
      <>
        <Text variant={textVariant} className={styles.bold}>
          Creator
        </Text>
        <Text variant={textVariant} className={styles.bold}>
          License
        </Text>
      </>
    ) : (
      <Text variant={textVariant} className={styles.bold}>
        Uploader
      </Text>
    )

  const [listLoader, setListLoader] = useState<LazyListLoader<
    OpenverseMedia | WikimediaMedia
  > | null>(null)
  const state = useObservable(listLoader)
  const total = state?.total

  const [undecodableIds, setUndecodableIds] = useState<Set<string>>(new Set())
  const [loadFailed, setLoadFailed] = useState(false)

  const requestItems = useMemo(() => {
    const fetchExternalItems =
      platform === 'openverse'
        ? partial(
            requestExternalItems,
            partial(fetchOpenverseCollectionResults, collection.mediaType, collection.collection),
          )
        : partial(
            requestExternalItems,
            partial(fetchWikimediaCollectionResults, collection.collection),
          )

    // Always report the count fetched up front. Do not derive the total from each page's own
    // response. LazyListLoader treats a change in total as a change in the list. It then does a
    // full reload and clears the current items. A failed page must not look like a smaller list.
    return async (skip: number, limit: number, signal: AbortSignal) => {
      const result = await fetchExternalItems(skip, limit, signal)
      setLoadFailed(result.failed)
      return { skip: result.skip, total: collection.total, data: result.data }
    }
  }, [platform, collection])

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
      <LazyList
        windowSize={20}
        requestItems={requestItems}
        loadingEdgeProximity={5}
        onLoaderInitialized={setListLoader}
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
        renderItem={(item) => {
          if (undecodableIds.has(item.id)) return null

          const itemMediaType =
            'mediaType' in item
              ? item.mediaType
              : collection.platform === 'openverse'
                ? collection.mediaType
                : undefined
          const checked = !!selectedItems.find((i) => i.id === item.id)
          const itemSummary = (
            <Checkbox
              checked={checked}
              onChange={() =>
                onSelect({
                  id: item.id,
                  sourceUrl: item.url,
                  ...('mediaType' in item ? { wikimediaMediaType: item.mediaType } : {}),
                })
              }
              classes={{ checkbox: styles.checkbox }}
              disabled={!checked && selectedCount >= MAX_SELECTION}
              label={{
                content: (
                  <>
                    {item.thumbnail ? (
                      <img
                        className={styles.itemImage}
                        src={item.thumbnail}
                        alt={item.title}
                        onError={() =>
                          setUndecodableIds((current) => new Set(current).add(item.id))
                        }
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
                ),
                position: 'after',
              }}
            />
          )

          const itemDetails =
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

          return mdOrLess ? (
            <details className={styles.detailsElement} name="external-collection-list">
              <summary className={styles.collectionItem}>
                {itemSummary}
                <Icon component="div" icon="arrow_forward_ios" className={styles.detailsIcon} />
              </summary>
              <div className={styles.itemDetails}>
                {detailsHeader}
                {itemDetails}
              </div>
            </details>
          ) : (
            <div className={styles.collectionItem}>
              {itemSummary}
              {itemDetails}
            </div>
          )
        }}
        emptyPlaceholder={
          <Text>
            {loadFailed
              ? "Couldn't load items right now — try again in a moment"
              : platform === 'openverse'
                ? `No ${collection.mediaType === 'image' ? 'images' : 'audio items'} in this collection`
                : 'No files in this category'}
          </Text>
        }
        loadingIndicator={<LoadingLogoIcon className={styles.loadingIndicator} />}
      />
    </div>
  )
}
