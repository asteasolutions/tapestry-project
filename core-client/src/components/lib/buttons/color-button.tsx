import { ComponentProps } from 'react'
import styles from './color-button-styles.module.css'
import clsx from 'clsx'
import { LiteralColor } from '../../../theme/types.js'
import { useClickableContext } from './clickable-context.js'
import { Tooltip, TooltipProps } from '../tooltip/index.js'

export type ColorButtonProps = Omit<ComponentProps<'button'>, 'color'> & {
  color?: LiteralColor
  size?: number
  isSelected?: boolean
  'aria-label': string
  tooltip?: TooltipProps
}

export function ColorButton({
  color,
  size,
  className,
  isSelected,
  style,
  onClick,
  tooltip,
  ...props
}: ColorButtonProps) {
  const isTransparent = !!color && /^#[\da-f]{6}00$/.test(color)
  const clickableContext = useClickableContext()

  return (
    <button
      {...props}
      className={clsx(styles.colorButton, className, {
        selected: isSelected,
        [styles.transparent]: isTransparent,
        [styles.withTooltip]: !!tooltip,
      })}
      style={
        {
          ...style,
          '--color': color,
          '--size': `${size ?? 26}px`,
        } as React.CSSProperties
      }
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) {
          clickableContext?.click?.()
        }
      }}
    >
      <span className={styles.colorCircleWrapper}>
        <span className="color-circle" />
      </span>
      {tooltip && <Tooltip {...tooltip} offset={8} />}
    </button>
  )
}
