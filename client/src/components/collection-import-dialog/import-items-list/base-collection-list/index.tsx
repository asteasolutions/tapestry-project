import clsx from 'clsx'
import { CSSProperties, ReactNode } from 'react'
import { intlFormat } from 'date-fns'
import { Icon, IconName } from 'tapestry-core-client/src/components/lib/icon/index'
import { Checkbox } from 'tapestry-core-client/src/components/lib/checkbox'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { TypographyName } from 'tapestry-core-client/src/theme/types'
import { LazyList, LazyListProps, WithId } from '../../../lazy-list'
import { LoadingLogoIcon } from '../../../loading-logo-icon'
import { MAX_SELECTION } from '../..'
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
 * `CollectionList` — `id`/selection/creation still flow through the caller's own real item type. */
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

/**
 * The UI and lazy-loading shell shared by every collection import's item list (every
 * `ImportItemsList` branch except `IAPlaylistEntries`, which lists a fixed, already-loaded
 * array rather than paging a remote collection). Each caller supplies its own fetching and a
 * `toListItem` mapper into the generic `CollectionListItem` shape; item-row rendering (thumbnail
 * or fallback icon, title, detail columns), the checkbox wiring, the mobile details/desktop row
 * switch, the desktop column-header bar, and the `LazyList` plumbing all live here once.
 */
export interface CollectionListProps<T extends WithId> extends Pick<
  LazyListProps<T>,
  | 'requestItems'
  | 'windowSize'
  | 'loadingEdgeProximity'
  | 'autoReload'
  | 'onLoaderInitialized'
  | 'header'
> {
  mdOrLess: boolean
  columns: CollectionListColumn[]
  detailsGroupName: string
  selectAll: ReactNode
  /** Skip rendering an item entirely, e.g. one whose thumbnail failed to load. Default: always render. */
  shouldRenderItem?: (item: T) => boolean
  toListItem: (item: T) => CollectionListItem
  onImageError?: (item: T) => void
  isSelected: (item: T) => boolean
  onSelectItem: (item: T) => void
  selectedCount: number
  emptyPlaceholder: ReactNode
}

export function CollectionList<T extends WithId>({
  mdOrLess,
  columns,
  detailsGroupName,
  selectAll,
  shouldRenderItem,
  toListItem,
  onImageError,
  isSelected,
  onSelectItem,
  selectedCount,
  emptyPlaceholder,
  ...lazyListProps
}: CollectionListProps<T>) {
  const textVariant = mdOrLess ? 'bodyXs' : undefined

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
        renderItem={(item) => {
          if (shouldRenderItem && !shouldRenderItem(item)) return null

          const listItem = toListItem(item)
          const checked = isSelected(item)
          const itemSummary = (
            <Checkbox
              checked={checked}
              onChange={() => onSelectItem(item)}
              classes={{ checkbox: styles.checkbox }}
              disabled={!checked && selectedCount >= MAX_SELECTION}
              label={{
                content: (
                  <>
                    {listItem.image ? (
                      <img
                        className={styles.itemImage}
                        src={listItem.image}
                        alt={listItem.title}
                        onError={() => onImageError?.(item)}
                      />
                    ) : (
                      <Icon
                        component="div"
                        icon={listItem.fallbackIcon ?? 'image'}
                        className={clsx(styles.itemImage, styles.noThumbnailIcon)}
                      />
                    )}
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
