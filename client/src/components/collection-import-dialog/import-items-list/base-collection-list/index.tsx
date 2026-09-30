import clsx from 'clsx'
import { compact } from 'lodash-es'
import { CSSProperties, ReactNode, RefObject, useMemo, useRef, useState } from 'react'
import { intlFormat } from 'date-fns'
import { Icon, IconName } from 'tapestry-core-client/src/components/lib/icon/index'
import { Checkbox } from 'tapestry-core-client/src/components/lib/checkbox'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { TypographyName } from 'tapestry-core-client/src/theme/types'
import { useObservable } from 'tapestry-core-client/src/components/lib/hooks/use-observable'
import { ItemCreateDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { LazyList, LazyListProps, WithId } from '../../../lazy-list'
import { LazyListLoader } from '../../../lazy-list/lazy-list-loader'
import { LoadingLogoIcon } from '../../../loading-logo-icon'
import { Thumbnail } from '../../thumbnail'
import { CreateItemsFromSelection, MAX_SELECTION } from '../..'
import { SelectAll } from '../select-all'
import styles from './styles.module.css'

interface FetchedPage<Result> {
  page: number
  result: Result | undefined
}

// Bridges a numbered-page API to LazyList's skip/limit windowing, fetching the one or two real
// pages that cover the requested window.
export async function paginateBySkipLimit<Result, Item>(
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
  const secondPageResult = extra ? await fetchPage(firstPageNumber + 1, limit, signal) : undefined

  const data = [
    ...(firstPageResult ? getItems(firstPageResult) : []),
    ...(secondPageResult ? getItems(secondPageResult) : []),
  ].slice(extra, extra + limit)

  return {
    skip,
    data,
    firstPage: { page: firstPageNumber, result: firstPageResult },
    ...(extra ? { secondPage: { page: firstPageNumber + 1, result: secondPageResult } } : {}),
  }
}

export type CollectionListColumn =
  | 'creator'
  | 'license'
  | 'uploader'
  | 'published'
  | 'views'
  | 'dimensions'

const COLUMN_LABEL: Record<CollectionListColumn, string> = {
  creator: 'Creator',
  license: 'License',
  uploader: 'Uploader',
  published: 'Published',
  views: 'Views',
  dimensions: 'Dimensions',
}

const COLUMN_WIDTH: Record<CollectionListColumn, string> = {
  creator: '130px',
  license: '130px',
  uploader: '130px',
  published: '110px',
  views: '60px',
  dimensions: '90px',
}

// The platform-agnostic row shape every collection list maps its own item type into.
export interface CollectionListItem {
  image?: string | null
  fallbackIcon?: IconName
  title: string
  creator?: string
  license?: string
  uploader?: string
  published?: string
  views?: number
  dimensions?: { width: number; height: number }
}

function renderColumnValue(
  column: CollectionListColumn,
  item: CollectionListItem,
  textVariant: TypographyName | undefined,
) {
  switch (column) {
    case 'creator':
      return (
        <Text lineClamp={2} variant={textVariant}>
          {item.creator}
        </Text>
      )
    case 'license':
      return <Text variant={textVariant}>{item.license}</Text>
    case 'uploader':
      return (
        <Text lineClamp={2} variant={textVariant}>
          {item.uploader}
        </Text>
      )
    case 'published':
      return (
        <Text variant={textVariant}>
          {item.published &&
            intlFormat(item.published, { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
      )
    case 'views':
      return (
        <Text className={styles.views} variant={textVariant}>
          {item.views !== undefined &&
            new Intl.NumberFormat('en-US', {
              notation: 'compact',
              compactDisplay: 'short',
            }).format(item.views)}
        </Text>
      )
    case 'dimensions':
      return (
        <Text variant={textVariant}>
          {item.dimensions && `${item.dimensions.width}×${item.dimensions.height}`}
        </Text>
      )
  }
}

export interface BaseCollectionListProps<T extends WithId> extends Pick<
  LazyListProps<T>,
  'requestItems' | 'windowSize' | 'loadingEdgeProximity' | 'autoReload'
> {
  mdOrLess: boolean
  columns: CollectionListColumn[]
  detailsGroupName: string
  header?: ReactNode
  toListItem: (item: T) => CollectionListItem
  toTapestryItem: (item: T) => Promise<ItemCreateDto | null>
  selectedIndices: Set<number>
  selectItems: (indices: number[]) => void
  deselectItem: (index: number) => void
  deselectAllItems: () => void
  createItemsFromSelectionRef: RefObject<CreateItemsFromSelection | undefined>
  emptyPlaceholder: ReactNode
}

export function BaseCollectionList<T extends WithId>({
  mdOrLess,
  columns,
  detailsGroupName,
  header,
  toListItem,
  toTapestryItem,
  selectedIndices,
  selectItems,
  deselectItem,
  deselectAllItems,
  createItemsFromSelectionRef,
  emptyPlaceholder,
  requestItems,
  ...lazyListProps
}: BaseCollectionListProps<T>) {
  const textVariant = mdOrLess ? 'bodyXs' : undefined

  const [listLoader, setListLoader] = useState<LazyListLoader<T> | null>(null)
  const state = useObservable(listLoader)
  const total = state?.total

  // Cache of everything fetched so far, indexed by absolute position, so autoReload's periodic
  // re-request of an already-loaded window is served from here instead of hitting the rate-limited
  // external APIs again. Gaps get explicit `undefined` entries, not sparse holes.
  const cacheRef = useRef<(T | undefined)[]>([])
  const totalRef = useRef<number | undefined>(undefined)

  const cachedRequestItems = useMemo(() => {
    return async (skip: number, limit: number, signal: AbortSignal) => {
      const cache = cacheRef.current
      const cachedWindow = cache.slice(skip, skip + limit)
      if (
        totalRef.current !== undefined &&
        cachedWindow.length === limit &&
        cachedWindow.every((item): item is T => item !== undefined)
      ) {
        return { skip, total: totalRef.current, data: cachedWindow }
      }

      const response = await requestItems(skip, limit, signal)
      totalRef.current = response.total

      for (let i = cache.length; i < skip; i++) {
        cache[i] = undefined
      }
      response.data.forEach((item, i) => {
        cache[skip + i] = item
      })

      return response
    }
  }, [requestItems])

  // Reassigned every render (not just once) so it always reflects the latest selection -- same
  // "keep a ref synced" pattern as usePropRef.
  createItemsFromSelectionRef.current = async () => {
    const cache = cacheRef.current
    const items = [...selectedIndices]
      .sort((a, b) => a - b)
      .map((i) => cache[i])
      .filter((item): item is T => item !== undefined)
    return compact(await Promise.all(items.map(toTapestryItem)))
  }

  const selectedCount = selectedIndices.size
  const maxSelectable = total === undefined ? undefined : Math.min(total, MAX_SELECTION)
  const allSelected = maxSelectable !== undefined && selectedCount >= maxSelectable

  const selectAll = (
    <SelectAll
      checked={allSelected}
      onChange={() => {
        if (allSelected) {
          deselectAllItems()
          return
        }
        const cache = cacheRef.current
        let cachedFromStart = 0
        while (cachedFromStart < cache.length && cache[cachedFromStart] !== undefined) {
          cachedFromStart++
        }
        selectItems(Array.from({ length: Math.min(cachedFromStart, MAX_SELECTION) }, (_, i) => i))
      }}
      total={total}
      classes={{ root: mdOrLess ? styles.mobileSelectAll : undefined, checkbox: styles.checkbox }}
      textVariant={textVariant}
    />
  )

  const detailsHeader = (
    <>
      {columns.map((column) => (
        <Text key={column} variant={textVariant} className={styles.bold}>
          {COLUMN_LABEL[column]}
        </Text>
      ))}
    </>
  )

  return (
    <div
      className={styles.root}
      style={
        {
          '--detail-columns': columns.map((column) => COLUMN_WIDTH[column]).join(' '),
          '--detail-column-count': columns.length,
        } as CSSProperties
      }
    >
      {!mdOrLess && (
        <div className={clsx(styles.collectionItem, styles.header)}>
          {selectAll}
          {detailsHeader}
        </div>
      )}
      <LazyList
        {...lazyListProps}
        requestItems={cachedRequestItems}
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
        renderItem={(item, index) => {
          // LazyList always calls renderItem with a real index; it's only optional in the shared
          // type because most of LazyList's other consumers don't need it.
          const rowIndex = index!
          const listItem = toListItem(item)
          const checked = selectedIndices.has(rowIndex)
          const itemSummary = (
            <Checkbox
              checked={checked}
              onChange={() => (checked ? deselectItem(rowIndex) : selectItems([rowIndex]))}
              classes={{ checkbox: styles.checkbox }}
              disabled={!checked && selectedCount >= MAX_SELECTION}
              label={{
                content: (
                  <>
                    <Text variant={textVariant} className={styles.itemIndex}>
                      {rowIndex + 1}.
                    </Text>
                    <Thumbnail
                      className={styles.itemImage}
                      image={listItem.image}
                      fallbackIcon={listItem.fallbackIcon}
                      title={listItem.title}
                    />
                    <Text lineClamp={2} variant={textVariant}>
                      {listItem.title}
                    </Text>
                  </>
                ),
                position: 'after',
              }}
            />
          )

          const itemDetails = (
            <>
              {columns.map((column) => (
                <span key={column}>{renderColumnValue(column, listItem, textVariant)}</span>
              ))}
            </>
          )

          return mdOrLess ? (
            <details className={styles.detailsElement} name={detailsGroupName}>
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
        emptyPlaceholder={emptyPlaceholder}
        loadingIndicator={<LoadingLogoIcon className={styles.loadingIndicator} />}
      />
    </div>
  )
}
