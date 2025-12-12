import clsx from 'clsx'
import { intlFormat } from 'date-fns'
import {
  iaAdvancedSearch,
  getIAItemThumbnailURL,
  IAMediaType,
} from 'tapestry-core/src/internet-archive'
import { ImportItemsListProps } from '..'
import { useResponsive, Breakpoint } from '../../../../providers/responsive-provider'
import { Checkbox } from 'tapestry-core-client/src/components/lib/checkbox'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'
import { LazyList } from '../../../lazy-list'
import { LoadingLogoIcon } from '../../../loading-logo-icon'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import styles from './styles.module.css'
import { useMemo, useState } from 'react'
import { partial } from 'lodash-es'
import { MAX_SELECTION } from '../..'
import { LazyListLoader } from '../../../lazy-list/lazy-list-loader'
import { useObservable } from 'tapestry-core-client/src/components/lib/hooks/use-observable'
import { SelectAll } from '../select-all'

function getCollectionSearchOpts(collectionId: string) {
  return {
    q: `collection:${collectionId} AND NOT mediatype:collection`,
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

interface IACollectionItem {
  id: string
  identifier: string
  mediatype: IAMediaType
  title: string
  creator?: string | undefined
  publicdate: string
  downloads: number
}

export async function requestCollectionItems(
  id: string,
  skip: number,
  limit: number,
  signal: AbortSignal,
) {
  const firstPage = Math.floor(skip / limit) + 1

  const firstPageResult = await iaAdvancedSearch(
    {
      ...getCollectionSearchOpts(id),
      page: firstPage,
      pageSize: limit,
    },
    signal,
  )

  const totalCount = firstPageResult?.response.numFound

  const extra = skip % limit
  const secondPageResult = extra
    ? await iaAdvancedSearch(
        {
          ...getCollectionSearchOpts(id),
          page: firstPage + 1,
          pageSize: limit,
        },
        signal,
      )
    : null

  const finalResult = [
    ...(firstPageResult?.response.docs ?? []),
    ...(secondPageResult?.response.docs ?? []),
  ]
    .slice(extra, extra + limit)
    .map((doc) => ({ ...doc, id: doc.identifier }))

  return {
    skip,
    total: totalCount ?? finalResult.length,
    data: finalResult,
  }
}

interface IACollectionListProps extends Omit<ImportItemsListProps, 'iaImport'> {
  collectionId: string
}

export function IACollectionList({
  onSelect,
  onToggleAll,
  toggling,
  collectionId,
  selectedItems,
  header,
}: IACollectionListProps) {
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

  const [listLoader, setListLoader] = useState<LazyListLoader<IACollectionItem> | null>(null)
  const state = useObservable(listLoader)
  const total = state?.total

  const requestItems = useMemo(() => partial(requestCollectionItems, collectionId), [collectionId])

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
      <LazyList
        windowSize={100}
        requestItems={requestItems}
        loadingEdgeProximity={15}
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
          const checked = !!selectedItems.find((i) => i.id === item.id)
          const itemSummary = (
            <Checkbox
              checked={checked}
              onChange={() => onSelect({ id: item.id, mediaType: item.mediatype })}
              classes={{ checkbox: styles.checkbox }}
              disabled={!checked && selectedCount >= MAX_SELECTION}
              label={{
                content: (
                  <>
                    <img className={styles.itemImage} src={getIAItemThumbnailURL(item.id)} />
                    <Text lineClamp={2} variant={textVariant}>
                      {item.title}
                    </Text>
                  </>
                ),
                position: 'after',
              }}
            />
          )

          const itemDetails = (
            <>
              <Text lineClamp={lineClamp} variant={textVariant}>
                {item.creator}
              </Text>
              <Text variant={textVariant}>
                {intlFormat(item.publicdate, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
              <Text className={styles.views} variant={textVariant}>
                {new Intl.NumberFormat('en-US', {
                  notation: 'compact',
                  compactDisplay: 'short',
                }).format(item.downloads)}
              </Text>
            </>
          )

          return mdOrLess ? (
            <details className={styles.detailsElement} name="IA-collection-list">
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
        emptyPlaceholder={<Text>No items in this collection</Text>}
        loadingIndicator={<LoadingLogoIcon className={styles.loadingIndicator} />}
      />
    </div>
  )
}
