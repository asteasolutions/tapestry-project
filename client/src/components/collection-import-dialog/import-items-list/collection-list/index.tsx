import { ReactNode } from 'react'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'
import { Checkbox } from 'tapestry-core-client/src/components/lib/checkbox'
import { LazyList, LazyListProps, WithId } from '../../../lazy-list'
import { LoadingLogoIcon } from '../../../loading-logo-icon'
import { MAX_SELECTION } from '../..'
import styles from './styles.module.css'

/**
 * The UI and lazy-loading shell shared by every collection import's item list (every
 * `ImportItemsList` branch except `IAPlaylistEntries`, which lists a fixed, already-loaded
 * array rather than paging a remote collection). Each caller supplies how to render one
 * item's thumbnail/title and its detail columns; the checkbox wiring, the mobile
 * details/desktop row switch, and the `LazyList` plumbing live here once.
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
  detailsHeader: ReactNode
  detailsGroupName: string
  classes: {
    collectionItem: string
    detailsElement: string
    detailsIcon: string
    itemDetails: string
  }
  /** Skip rendering an item entirely, e.g. one whose thumbnail failed to load. Default: always render. */
  shouldRenderItem?: (item: T) => boolean
  renderItemContent: (item: T) => ReactNode
  renderItemDetails: (item: T) => ReactNode
  isSelected: (item: T) => boolean
  onSelectItem: (item: T) => void
  selectedCount: number
  emptyPlaceholder: ReactNode
}

export function CollectionList<T extends WithId>({
  mdOrLess,
  detailsHeader,
  detailsGroupName,
  classes,
  shouldRenderItem,
  renderItemContent,
  renderItemDetails,
  isSelected,
  onSelectItem,
  selectedCount,
  emptyPlaceholder,
  ...lazyListProps
}: CollectionListProps<T>) {
  return (
    <LazyList
      {...lazyListProps}
      renderItem={(item) => {
        if (shouldRenderItem && !shouldRenderItem(item)) return null

        const checked = isSelected(item)
        const itemSummary = (
          <Checkbox
            checked={checked}
            onChange={() => onSelectItem(item)}
            classes={{ checkbox: styles.checkbox }}
            disabled={!checked && selectedCount >= MAX_SELECTION}
            label={{ content: renderItemContent(item), position: 'after' }}
          />
        )

        const itemDetails = renderItemDetails(item)

        return mdOrLess ? (
          <details className={classes.detailsElement} name={detailsGroupName}>
            <summary className={classes.collectionItem}>
              {itemSummary}
              <Icon component="div" icon="arrow_forward_ios" className={classes.detailsIcon} />
            </summary>
            <div className={classes.itemDetails}>
              {detailsHeader}
              {itemDetails}
            </div>
          </details>
        ) : (
          <div className={classes.collectionItem}>
            {itemSummary}
            {itemDetails}
          </div>
        )
      }}
      emptyPlaceholder={emptyPlaceholder}
      loadingIndicator={<LoadingLogoIcon className={styles.loadingIndicator} />}
    />
  )
}
