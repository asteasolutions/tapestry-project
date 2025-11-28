import clsx from 'clsx'
import { CSSProperties, ReactNode, useRef } from 'react'
import styles from './styles.module.css'
import { Text } from '../text/index.js'
import { useLongPress } from '../../lib/hooks/use-long-press.js'
import { useObservable } from '../../lib/hooks/use-observable.js'
import { Observable } from '../../../lib/events/observable.js'
import { uniqueId } from 'lodash-es'

function getStyles(side: TooltipProps['side'], offset: number) {
  const value = `${offset}px`
  switch (side) {
    case 'top':
      return { marginBottom: value }
    case 'right':
      return { marginLeft: value }
    case 'bottom':
      return { marginTop: value }
    case 'left':
      return { marginRight: value }
  }
}

export interface TooltipProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  side: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  offset?: number
  arrowFollowsAlignment?: boolean
}

const TOOLTIP_DURATION = 3000

class TooltipObservable extends Observable<{ id?: string }> {
  setVisible(id: string | undefined) {
    this.update((state) => {
      state.id = id
    })
  }
}

const tooltipObservable = new TooltipObservable({})

function useTooltipLongPress(id: string) {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<number>(undefined)

  useLongPress(
    () => tooltipRef.current?.parentElement ?? null,
    () => {
      tooltipObservable.setVisible(id)
      timeoutRef.current = window.setTimeout(() => {
        if (tooltipObservable.value.id === id) {
          tooltipObservable.setVisible(undefined)
        }
      }, TOOLTIP_DURATION)
    },
  )

  return tooltipRef
}

export function Tooltip({
  children,
  className,
  style,
  side,
  offset = 0,
  align = 'center',
  arrowFollowsAlignment,
}: TooltipProps) {
  const idRef = useRef(uniqueId('Tooltip'))
  const tooltipRef = useTooltipLongPress(idRef.current)
  const isVisible = useObservable(tooltipObservable).id === idRef.current

  return (
    <div
      className={clsx(styles.root, `tooltip-${side}`, `tooltip-${align}`, className, 'tooltip', {
        shown: isVisible,
        [styles.arrowFollowsAlignment]: arrowFollowsAlignment,
      })}
      style={{ ...getStyles(side, offset), ...style }}
      ref={tooltipRef}
    >
      {typeof children === 'string' ? <Text variant="bodyXs">{children}</Text> : children}
    </div>
  )
}
