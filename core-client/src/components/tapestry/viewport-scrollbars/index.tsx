import clsx from 'clsx'
import { clamp } from 'lodash-es'
import { useRef } from 'react'
import { idMapToArray } from 'tapestry-core/src/utils'
import { useTapestryConfig } from '..'
import { getScrollbarPositions } from '../../../../src/view-model/utils'
import styles from './styles.module.css'

export function ViewportScrollbars() {
  const { useStoreData } = useTapestryConfig()

  const { viewport, items } = useStoreData(['viewport', 'items'])
  const scrollbarPositionsRef = useRef<ReturnType<typeof getScrollbarPositions>>({
    horizontal: { offset: 0, size: 0 },
    vertical: { offset: 0, size: 0 },
  })

  const isVisible = Date.now() - (viewport.lastUpdateTimestamp ?? 0) < 500

  // Avoid heavy scrollbar position re-calculation in case the scrollbars are not visible
  if (isVisible) {
    scrollbarPositionsRef.current = getScrollbarPositions(viewport, idMapToArray(items))
  }

  const { horizontal, vertical } = scrollbarPositionsRef.current

  return (
    <div className={clsx(styles.root, { [styles.visible]: isVisible })}>
      <div className={clsx(styles.scrollbarContainer, styles.horizontal)}>
        <div
          className={styles.scrollbar}
          style={
            {
              '--scroll-position': `${clamp(horizontal.offset, 0, 1) * 100}%`,
              '--size': `${horizontal.size * 100}%`,
            } as React.CSSProperties
          }
        />
      </div>
      <div className={clsx(styles.scrollbarContainer, styles.vertical)}>
        <div
          className={styles.scrollbar}
          style={
            {
              '--scroll-position': `${clamp(vertical.offset, 0, 1) * 100}%`,
              '--size': `${vertical.size * 100}%`,
            } as React.CSSProperties
          }
        />
      </div>
    </div>
  )
}
