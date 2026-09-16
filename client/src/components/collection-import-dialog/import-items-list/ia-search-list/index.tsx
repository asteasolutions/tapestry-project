import clsx from 'clsx'
import { intlFormat } from 'date-fns'
import {
  excludeIACollections,
  iaAdvancedSearch,
  getIAItemThumbnailURL,
  IAMediaType,
} from 'tapestry-core/src/internet-archive'
import { ImportItemsListProps } from '..'
import { useResponsive, Breakpoint } from '../../../../providers/responsive-provider'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { CollectionList } from '../collection-list'
import styles from './styles.module.css'
import { useMemo, useState } from 'react'
import { partial } from 'lodash-es'
import { LazyListLoader } from '../../../lazy-list/lazy-list-loader'
import { useObservable } from 'tapestry-core-client/src/components/lib/hooks/use-observable'
import { SelectAll } from '../select-all'
import { paginateBySkipLimit } from '../paginate-by-skip-limit'

function getSearchOpts(query: string) {
  return {
    q: excludeIACollections(query),
    fields: {
      identifier: true,
      mediatype: true,
      title: true,
      creator: true,
      publicdate: true,
      downloads: true,
    } as const,
    sort: ['downloads desc', 'identifier desc'],
  }
}

interface IASearchResultItem {
  id: string
  identifier: string
  mediatype: IAMediaType
  title: string
  creator?: string | undefined
  publicdate: string
  downloads: number
}

export async function requestSearchItems(
  query: string,
  skip: number,
  limit: number,
  signal: AbortSignal,
) {
  const { data, firstPage } = await paginateBySkipLimit(
    (page, pageSize, pageSignal) =>
      iaAdvancedSearch({ ...getSearchOpts(query), page, pageSize }, pageSignal),
    (result) => result.response.docs,
    skip,
    limit,
    signal,
  )

  return {
    skip,
    total: firstPage.result?.response.numFound ?? data.length,
    data: data.map((doc) => ({ ...doc, id: doc.identifier })),
  }
}

interface IASearchListProps extends Omit<ImportItemsListProps, 'collectionImport'> {
  query: string
  emptyPlaceholder?: string
}

export function IASearchList({
  onSelect,
  onToggleAll,
  toggling,
  query,
  selectedItems,
  header,
  emptyPlaceholder = 'No results for this search',
}: IASearchListProps) {
  const mdOrLess = useResponsive() <= Breakpoint.MD
  const textVariant = mdOrLess ? 'bodyXs' : undefined
  const lineClamp = mdOrLess ? 1 : 2
  const detailsHeader = (
    <>
      <Text variant={textVariant} className={styles.bold}>
        Creator
      </Text>
      <Text variant={textVariant} className={styles.bold}>
        Published
      </Text>
      <Text variant={textVariant} className={clsx(styles.views, styles.bold)}>
        Views
      </Text>
    </>
  )

  const [listLoader, setListLoader] = useState<LazyListLoader<IASearchResultItem> | null>(null)
  const state = useObservable(listLoader)
  const total = state?.total

  const requestItems = useMemo(() => partial(requestSearchItems, query), [query])

  const selectedCount = selectedItems.length
  const hasSelection = selectedCount > 0

  const selectAll = (
    <SelectAll
      checked={hasSelection}
      onChange={() => onToggleAll(!hasSelection)}
      total={total}
      loading={toggling}
      classes={{ root: mdOrLess ? styles.mobileSelectAll : undefined, checkbox: styles.checkbox }}
      textVariant={textVariant}
    />
  )

  return (
    <div className={styles.root}>
      {!mdOrLess && (
        <div className={clsx(styles.collectionItem, styles.header)}>
          {selectAll}
          {detailsHeader}
        </div>
      )}
      <CollectionList
        windowSize={100}
        loadingEdgeProximity={15}
        requestItems={requestItems}
        onLoaderInitialized={setListLoader}
        mdOrLess={mdOrLess}
        detailsHeader={detailsHeader}
        detailsGroupName="IA-search-list"
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
        isSelected={(item) => !!selectedItems.find((i) => i.id === item.id)}
        onSelectItem={(item) => onSelect({ id: item.id, mediaType: item.mediatype })}
        selectedCount={selectedCount}
        renderItemContent={(item) => (
          <>
            <img className={styles.itemImage} src={getIAItemThumbnailURL(item.id)} />
            <Text lineClamp={2} variant={textVariant}>
              {item.title}
            </Text>
          </>
        )}
        renderItemDetails={(item) => (
          <>
            <Text lineClamp={lineClamp} variant={textVariant}>
              {item.creator}
            </Text>
            <Text variant={textVariant}>
              {intlFormat(item.publicdate, { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
            <Text className={styles.views} variant={textVariant}>
              {new Intl.NumberFormat('en-US', {
                notation: 'compact',
                compactDisplay: 'short',
              }).format(item.downloads)}
            </Text>
          </>
        )}
        emptyPlaceholder={<Text>{emptyPlaceholder}</Text>}
      />
    </div>
  )
}
