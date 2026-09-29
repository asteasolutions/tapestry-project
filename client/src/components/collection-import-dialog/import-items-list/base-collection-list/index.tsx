import clsx from 'clsx'
import { CSSProperties, ReactNode, useState } from 'react'
import { intlFormat } from 'date-fns'
import { Icon, IconName } from 'tapestry-core-client/src/components/lib/icon/index'
import { Checkbox } from 'tapestry-core-client/src/components/lib/checkbox'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { TypographyName } from 'tapestry-core-client/src/theme/types'
import { useObservable } from 'tapestry-core-client/src/components/lib/hooks/use-observable'
import { LazyList, LazyListProps, WithId } from '../../../lazy-list'
import { LazyListLoader } from '../../../lazy-list/lazy-list-loader'
import { LoadingLogoIcon } from '../../../loading-logo-icon'
import { MAX_SELECTION } from '../..'
import { SelectAll } from '../select-all'
import styles from './styles.module.css'

export type CollectionListColumn = 'creator' | 'license' | 'uploader' | 'published' | 'views'

const COLUMN_LABEL: Record<CollectionListColumn, string> = {
  creator: 'Creator',
  license: 'License',
  uploader: 'Uploader',
  published: 'Published',
  views: 'Views',
}

const COLUMN_WIDTH: Record<CollectionListColumn, string> = {
  creator: '130px',
  license: '130px',
  uploader: '130px',
  published: '110px',
  views: '60px',
}

/** The generic, platform-agnostic shape one item's row needs to render. Every collection list
 * (Openverse, Wikimedia, IA search) maps its own native item type into this before handing it to
 * `BaseCollectionList` — `id`/selection/creation still flow through the caller's own real item type. */
export interface CollectionListItem {
  image?: string | null
  fallbackIcon?: IconName
  title: string
  creator?: string
  license?: string
  uploader?: string
  published?: string
  views?: number
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
  }
}

// A thumbnail that falls back to a generic icon both when there's no image URL at all and when a
// real image URL fails to load. Handled locally (rather than filtering the failed item out of the
// list entirely, as this used to) so the lazy list's loaded window stays in sync with what it
// actually requested -- removing an item after the fact desyncs its indices from the server.
function ItemThumbnail({
  image,
  fallbackIcon,
  title,
}: Pick<CollectionListItem, 'image' | 'fallbackIcon' | 'title'>) {
  const [failed, setFailed] = useState(false)
  return image && !failed ? (
    <img className={styles.itemImage} src={image} alt={title} onError={() => setFailed(true)} />
  ) : (
    <Icon
      component="div"
      icon={fallbackIcon ?? 'image'}
      className={clsx(styles.itemImage, styles.noThumbnailIcon)}
    />
  )
}

export interface BaseCollectionListProps<T extends WithId, S extends { id: string }> extends Pick<
  LazyListProps<T>,
  'requestItems' | 'windowSize' | 'loadingEdgeProximity' | 'autoReload'
> {
  mdOrLess: boolean
  columns: CollectionListColumn[]
  detailsGroupName: string
  header?: ReactNode
  toListItem: (item: T) => CollectionListItem
  toImportItem: (item: T) => S
  selectedItems: S[]
  onSelect: (item: S) => unknown
  onSelectAll: (items: S[]) => unknown
  onDeselectAll: () => unknown
  emptyPlaceholder: ReactNode
}

export function BaseCollectionList<T extends WithId, S extends { id: string }>({
  mdOrLess,
  columns,
  detailsGroupName,
  header,
  toListItem,
  toImportItem,
  selectedItems,
  onSelect,
  onSelectAll,
  onDeselectAll,
  emptyPlaceholder,
  ...lazyListProps
}: BaseCollectionListProps<T, S>) {
  const textVariant = mdOrLess ? 'bodyXs' : undefined

  const [listLoader, setListLoader] = useState<LazyListLoader<T> | null>(null)
  const state = useObservable(listLoader)
  const total = state?.total

  const selectedCount = selectedItems.length
  const maxSelectable = total === undefined ? undefined : Math.min(total, MAX_SELECTION)
  const allSelected = maxSelectable !== undefined && selectedCount >= maxSelectable

  const selectAll = (
    <SelectAll
      checked={allSelected}
      onChange={() => {
        if (allSelected) {
          onDeselectAll()
        } else if (state) {
          onSelectAll(state.data.slice(0, MAX_SELECTION).map(toImportItem))
        }
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
          const listItem = toListItem(item)
          const checked = !!selectedItems.find((i) => i.id === item.id)
          const itemSummary = (
            <Checkbox
              checked={checked}
              onChange={() => onSelect(toImportItem(item))}
              classes={{ checkbox: styles.checkbox }}
              disabled={!checked && selectedCount >= MAX_SELECTION}
              label={{
                content: (
                  <>
                    <ItemThumbnail
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

interface FetchedPage<Result> {
  page: number
  result: Result | undefined
}

/**
 * Bridge a numbered-page API (IA's advanced search, or a proxied external platform) to
 * `LazyList`'s arbitrary `skip`/`limit` windowing. A requested window rarely lines up with a
 * page boundary, so fetch the one or two server pages that cover it and slice out the window.
 */
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
