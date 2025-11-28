import React, { ComponentProps, MouseEvent, RefObject, useEffect, useRef, useState } from 'react'
import styles from './button-styles.module.css'
import clsx from 'clsx'
import { typographyClassName } from '../../../theme/index.js'
import { SvgIcon } from '../svg-icon/index.js'
import { useClickableContext } from './clickable-context.js'
import { Tooltip, TooltipProps } from '../tooltip/index.js'
import { Icon, IconName } from '../icon/index.js'

function useRepeatClicks(callback?: () => void) {
  const [isHolding, setIsHolding] = useState(false)
  const [isFiring, setIsFiring] = useState(false)

  const onRepeatClickRef = useRef<() => void>(undefined)
  onRepeatClickRef.current = callback

  useEffect(() => {
    let initialTimeoutId = 0
    let repeatClickIntervalId = 0
    if (isHolding && onRepeatClickRef.current) {
      initialTimeoutId = window.setTimeout(() => {
        repeatClickIntervalId = window.setInterval(() => {
          onRepeatClickRef.current?.()
          setIsFiring(true)
        }, 100)
      }, 200)
    }
    return () => {
      window.clearTimeout(initialTimeoutId)
      window.clearInterval(repeatClickIntervalId)
    }
  }, [isHolding])

  function pressButton() {
    setIsHolding(true)
  }

  function releaseButton(autoReset = true) {
    setIsHolding(false)
    if (autoReset) {
      setIsFiring(false)
    }
  }

  function reset() {
    setIsFiring(false)
  }

  return [isFiring, pressButton, releaseButton, reset] as const
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ButtonComponent = keyof React.JSX.IntrinsicElements | React.JSXElementConstructor<any>

export type ButtonProps<T extends ButtonComponent = 'button'> = Omit<
  ComponentProps<T>,
  | 'component'
  | 'icon'
  | 'size'
  | 'variant'
  | 'isActive'
  | 'onClick'
  | 'onRepeatClick'
  | 'tooltip'
  | 'ref'
> & {
  component?: T
  icon?: IconName | { name: IconName; fill?: boolean } | SvgComponent
  size?: 'small' | 'medium'
  variant?:
    | 'primary'
    | 'primary-negative'
    | 'secondary'
    | 'tertiary'
    | 'tertiary-negative'
    | 'outline'
    | 'outline-negative'
    | 'mono'
    | 'clear'
  isActive?: boolean
  onClick?: (event: MouseEvent) => void
  onRepeatClick?: () => void
  tooltip?: TooltipProps
  ref?: RefObject<T>
}

export function Button<T extends ButtonComponent = 'button'>({
  component,
  variant = 'primary',
  size,
  className,
  icon,
  children,
  onClick,
  isActive,
  onRepeatClick,
  tooltip,
  ref,
  ...rest
}: ButtonProps<T>) {
  const clickableContext = useClickableContext()
  const [isFiringRepeatClicks, pressButton, releaseButton, resetRepeatClicks] =
    useRepeatClicks(onRepeatClick)

  return React.createElement(
    component ?? 'button',
    {
      className: clsx(
        styles.button,
        typographyClassName('bodySm'),
        `button-${variant}`,
        `button-${size ?? 'medium'}`,
        {
          [styles.withIcon]: !!icon,
          [styles.iconOnly]: !!icon && !children,
          [styles.withTooltip]: !!tooltip,
          'button-active': isActive,
        },
        className,
      ),
      onClick: (event: MouseEvent) => {
        // The click event completes the mousedown -> mouseup -> click sequence.
        // In case we have been firing repeat clicks so far, don't handle the click event itself.
        if (isFiringRepeatClicks) {
          resetRepeatClicks()
          return
        }

        onClick?.(event)
        if (!event.defaultPrevented) {
          clickableContext?.click?.()
        }
      },
      onPointerDown: pressButton,
      onPointerUp: () => releaseButton(false),
      onPointerLeave: () => releaseButton(true),
      ref,
      ...rest,
    },
    !!icon &&
      (icon instanceof Function ? (
        <SvgIcon size={22} Icon={icon} />
      ) : typeof icon === 'string' ? (
        <Icon icon={icon} className="button-icon" />
      ) : (
        <Icon icon={icon.name} className="button-icon" filled={icon.fill} />
      )),
    children,
    tooltip && <Tooltip offset={8} {...tooltip} />,
  )
}
