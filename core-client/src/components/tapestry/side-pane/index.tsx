import clsx from 'clsx'
import { CSSProperties, PropsWithChildren, ReactNode } from 'react'
import { useTapestryConfig } from '..'
import { IconButton } from '../../../../src/components/lib/buttons/index'
import { Text } from '../../../../src/components/lib/text/index'
import { getMaxInset } from '../../../../src/view-model/utils'
import { setSidePane } from '../../../view-model/store-commands/tapestry'
import { useFocusRectInset } from '../hooks/use-focus-rect-inset'
import styles from './styles.module.css'

const PADDING = 16

export interface SidePaneProps extends PropsWithChildren {
  isShown: boolean
  heading?: ReactNode
  isMinimized?: boolean
}

export function SidePane({ isShown, heading, children, isMinimized }: SidePaneProps) {
  const { useStoreData, useDispatch } = useTapestryConfig()
  const focusRectInsets = useStoreData('viewport.focusRectInsets')
  const dispatch = useDispatch()

  const { top, bottom } = getMaxInset(Object.values(focusRectInsets))

  useFocusRectInset(isShown ? { right: isMinimized ? 0 : 416 } : {})

  if (!isShown) {
    return null
  }

  return (
    <div
      className={clsx(styles.root, { [styles.minimized]: isMinimized })}
      style={
        { '--top': `${top + PADDING}px`, '--bottom': `${bottom + PADDING}px` } as CSSProperties
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
