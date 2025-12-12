import clsx from 'clsx'
import { CSSProperties, PropsWithChildren, ReactNode } from 'react'
import { useTapestryConfig } from '..'
import { IconButton } from '../../../../src/components/lib/buttons/index'
import { Text } from '../../../../src/components/lib/text/index'
import { setSidePane } from '../../../view-model/store-commands/tapestry'
import { useViewportObstruction } from '../hooks/use-viewport-obstruction'
import styles from './styles.module.css'
import { maxEmptyArea, ORIGIN, Rectangle } from 'tapestry-core/src/lib/geometry'
import { idMapToArray } from 'tapestry-core/src/utils'
import { omit } from 'lodash'

const PADDING = 16
const PANEL_WIDTH = 416

export interface SidePaneProps extends PropsWithChildren {
  isShown: boolean
  heading?: ReactNode
  isMinimized?: boolean
}

export function SidePane({ isShown, heading, children, isMinimized }: SidePaneProps) {
  const obstruction = useViewportObstruction({ clear: { top: true, bottom: true, right: true } })
  const { useStoreData, useDispatch } = useTapestryConfig()
  const { size: viewportSize, obstructions } = useStoreData('viewport', ['size', 'obstructions'])
  const dispatch = useDispatch()

  const targetRect = new Rectangle(ORIGIN, viewportSize).contract({
    left: viewportSize.width - PANEL_WIDTH,
  })
  const panelRect = maxEmptyArea(targetRect, idMapToArray(omit(obstructions, obstruction.id)))

  if (!isShown || !panelRect) {
    return null
  }

  return (
    <div
      ref={obstruction.ref}
      className={clsx(styles.root, { [styles.minimized]: isMinimized })}
      style={
        {
          '--top': `${panelRect.top + PADDING}px`,
          '--bottom': `${targetRect.bottom - panelRect.bottom + PADDING}px`,
        } as CSSProperties
      }
    >
      {heading && (
        <div className={styles.header}>
          {typeof heading === 'string' ? <Text>{heading}</Text> : heading}
          <span style={{ flex: 1 }} />
          <IconButton
            icon="close"
            aria-label="Close side panel"
            onClick={() => dispatch(setSidePane(null))}
            tooltip={{ side: 'bottom', children: 'Close' }}
          />
        </div>
      )}
      {children}
    </div>
  )
}
