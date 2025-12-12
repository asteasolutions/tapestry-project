import clsx from 'clsx'
import { ReactNode, useEffect, useRef, useState } from 'react'
import { useObservable } from 'tapestry-core-client/src/components/lib/hooks/use-observable'
import { compact, countBy, entries, maxBy } from 'lodash-es'
import { LazyListLoader, LazyListLoaderConfig, LazyListRequestItems } from './lazy-list-loader'
// styles.css contains only global styles and if it is imported as a CSS module, Vite discards it during build.
import './styles.css'
import { LoadingDots } from '../loading-dots'
import { usePropRef } from 'tapestry-core-client/src/components/lib/hooks/use-prop-ref'

export interface WithId {
  id: string
}

export interface LazyListProps<T extends WithId> extends Partial<LazyListLoaderConfig> {
  requestItems: LazyListRequestItems<T>
  renderItem: (item: T) => ReactNode
  emptyPlaceholder: ReactNode
  loadingIndicator: ReactNode
  // Normally the lazy list starts with the first item at the top and the user scrolls down to view more items.
  // If reversed, the list will start with the first item at the bottom and the user needs to scroll up instead.
  reversed?: boolean
  className?: string
  onLoaderInitialized?: (loader: LazyListLoader<T>) => void
  header?: ReactNode
}

const AUTOSCROLL_EDGE_TOLERANCE = 10

function calcItemOffsets(list: HTMLDivElement, skippedItems: number) {
  const offsets: Record<string, number> = {}
  for (const child of list.getElementsByClassName('lazy-list-item')) {
    const element = child as HTMLElement
    const itemId = element.dataset.itemId
    if (itemId) {
      offsets[itemId] = element.offsetTop - list.scrollTop
    }
  }

  const bottomOffset =
    skippedItems > 0 ? Infinity : list.scrollHeight - list.clientHeight - list.scrollTop

  return { offsets, bottomOffset }
}

export function LazyList<T extends WithId>({
  requestItems,
  renderItem,
  emptyPlaceholder,
  loadingIndicator,
  reversed,
  className,
  onLoaderInitialized,
  header,
  ...loaderConfigInit
}: LazyListProps<T>) {
  const listRef = useRef<HTMLDivElement>(null)
  const itemOffsetsRef = useRef({ offsets: {} as Record<string, number>, bottomOffset: 0 })
  const [loader] = useState(() => new LazyListLoader(requestItems, loaderConfigInit))
  const { data, skip, state, total } = useObservable(loader)

  const initCallbackRef = usePropRef(onLoaderInitialized)

  useEffect(() => {
    void loader.setRequestItems(requestItems)
  }, [requestItems, loader])

  useEffect(() => {
    initCallbackRef.current?.(loader)
    return () => loader.stop()
  }, [initCallbackRef, loader])

  useEffect(() => {
    const list = listRef.current!
    const scrolledToFirstElement = reversed
      ? itemOffsetsRef.current.bottomOffset < AUTOSCROLL_EDGE_TOLERANCE
      : list.scrollTop < AUTOSCROLL_EDGE_TOLERANCE
    if (scrolledToFirstElement && skip === 0) {
      // If the list is scrolled to the first item, auto-scroll to the edge
      list.scrollTo({ top: reversed ? list.scrollHeight - list.clientHeight : 0 })
    } else {
      // If the list is scrolled somewhere in the middle, we must assume that the updated items
      // may have edits or deletions at any position. We want to restore to scroll position to a
      // state where as many as possible of the previously displayed items remain stationary.
      const { offsets: newOffsets } = calcItemOffsets(list, skip)
      const itemDisplacements = compact(
        Object.entries(newOffsets).map(([itemId, offset]) =>
          itemId in itemOffsetsRef.current.offsets
            ? itemOffsetsRef.current.offsets[itemId] - offset
            : 0,
        ),
      )
      const mostCommonDisplacement = Number(
        (maxBy(entries(countBy(itemDisplacements)), (x) => x[1]) ?? [0])[0],
      )
      list.scrollTo({ top: list.scrollTop - mostCommonDisplacement })
    }
  }, [data, skip, reversed])

  const items = reversed ? data.toReversed() : data

  function onScroll() {
    const list = listRef.current!

    itemOffsetsRef.current = calcItemOffsets(list, skip)
    const firstItemIndexIntoView = data.findIndex(({ id }) => {
      const offset = itemOffsetsRef.current.offsets[id]
      return reversed ? offset < list.clientHeight : offset >= 0
    })
    loader.moveWindow(skip + firstItemIndexIntoView)
  }

  const loadingBefore = skip > 0
  const loadingAfter = data.length + skip < total

  return (
    <div ref={listRef} onScroll={onScroll} className={clsx('lazy-list', className)}>
      {header}
      {(reversed ? loadingAfter : loadingBefore) && <LoadingDots />}
      <div className="list-items-container">
        {state === 'initial-load' && loadingIndicator}
        {(state === 'idle' || state === 'reload') && items.length === 0 && emptyPlaceholder}
        {state !== 'initial-load' &&
          items.map((item) => (
            <div key={item.id} data-item-id={item.id} className="lazy-list-item">
              {renderItem(item)}
            </div>
          ))}
      </div>
      {(reversed ? loadingBefore : loadingAfter) && <LoadingDots />}
    </div>
  )
}
