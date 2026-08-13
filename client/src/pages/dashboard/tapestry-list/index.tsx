import { times } from 'lodash-es'
import { LazyList } from '../../../components/lazy-list'
import { SkeletonLoader } from '../skeleton-loader'
import { TapestryCard } from '../tapestry-card'
import { ReactNode, useCallback, useEffect, useState } from 'react'
import {
  LazyListLoader,
  LazyListRequestItems,
} from '../../../components/lazy-list/lazy-list-loader'
import { resource } from '../../../services/rest-resources'
import styles from './styles.module.css'
import { TapestryDto } from 'tapestry-shared/src/data-transfer/resources/dtos/tapestry'
import { ListParamsInputDto } from 'tapestry-shared/src/data-transfer/resources/dtos/common'
import { useSession } from '../../../layouts/session'
import { NoTapestriesPlaceholder } from './no-tapestries-placeholder'
import { TapestryWithOwner } from '../../tapestry/view-model'
import { Breakpoint, breakpointForWidth } from '../../../providers/responsive-provider'

export interface TapestryListItem extends TapestryWithOwner<TapestryDto> {
  isBookmarked: boolean
}

// For simplicity this includes the gaps
const XL_MIN_COLUMN_WIDTH = 380

function useTapestryListColumnCount() {
  const determineColumnCount = () => {
    switch (breakpointForWidth(window.innerWidth)) {
      case Breakpoint.XL:
        return Math.trunc(window.innerWidth / XL_MIN_COLUMN_WIDTH)
      case Breakpoint.LG:
        return 3
      case Breakpoint.MD:
        return 2
      case Breakpoint.SM:
      case Breakpoint.XS:
        return 1
    }
  }

  const [columnCount, setColumnCount] = useState(determineColumnCount())

  useEffect(() => {
    const onWindowResize = () => setColumnCount(determineColumnCount())
    window.addEventListener('resize', onWindowResize)
    return () => window.removeEventListener('resize', onWindowResize)
  }, [])

  return columnCount
}

interface TapestryListProps {
  filter: ListParamsInputDto['filter']
  orderBy: ListParamsInputDto['orderBy']
  onLoaderInitialized?: (loader: LazyListLoader<TapestryListItem>) => void
  header?: ReactNode
  onNewTapestry: () => unknown
  showNewTapestryButton: boolean
}

export function TapestryList({
  filter,
  orderBy,
  onLoaderInitialized,
  onNewTapestry,
  showNewTapestryButton,
  header,
}: TapestryListProps) {
  const [tapestryLoader, setTapestryLoader] = useState<LazyListLoader<TapestryListItem> | null>(
    null,
  )
  const userId = useSession().user?.id
  const allBookmarked = !!userId && filter?.['bookmarkedBy:eq'] === userId

  const loadTapestries = useCallback<LazyListRequestItems<TapestryListItem>>(
    async (skip, limit, signal) => {
      const tapestries = await resource('tapestries').list(
        {
          filter,
          orderBy,
          include: ['owner', 'userAccess'],
          skip,
          limit,
        },
        { signal },
      )

      const bookmarks =
        !allBookmarked && userId
          ? await resource('tapestryBookmarks').list({
              filter: { 'tapestryId:in': tapestries.data.map((t) => t.id), 'userId:eq': userId },
            })
          : { data: [] }

      return {
        ...tapestries,
        data: tapestries.data.map((t) => ({
          ...(t as TapestryWithOwner<TapestryDto>),
          isBookmarked: allBookmarked ? true : bookmarks.data.some((b) => b.tapestryId === t.id),
        })),
      }
    },
    [filter, orderBy, allBookmarked, userId],
  )

  const columnCount = useTapestryListColumnCount()

  return (
    <LazyList
      header={header}
      className={styles.root}
      style={{ '--column-count': columnCount } as React.CSSProperties}
      loadingEdgeProximity={10}
      requestItems={loadTapestries}
      segmentLength={columnCount > 1 ? columnCount : undefined}
      onLoaderInitialized={(loader) => {
        setTapestryLoader(loader)
        onLoaderInitialized?.(loader)
      }}
      renderItem={(tapestry) => (
        <TapestryCard
          tapestry={tapestry}
          key={tapestry.id}
          onTapestryDeleted={() => tapestryLoader?.reload()}
          onTapestryModified={() => tapestryLoader?.reload()}
        />
      )}
      emptyPlaceholder={
        <NoTapestriesPlaceholder
          showNewTapestryButton={showNewTapestryButton}
          onNewTapestry={onNewTapestry}
        />
      }
      loadingIndicator={
        <>
          {times(8, (id) => (
            <SkeletonLoader key={id} />
          ))}
        </>
      }
    />
  )
}
