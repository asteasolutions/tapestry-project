import { ComponentProps, CSSProperties } from 'react'
import styles from './styles.module.css'
import Color from 'color'
import { Theme } from 'tapestry-core-client/src/theme/themes'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import clsx from 'clsx'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'

export interface CommentsIndicatorProps extends ComponentProps<'button'> {
  theme: Theme
  n: number
  onClick?: () => unknown
  color?: string
}

export function CommentsIndicator({
  theme,
  n,
  color,
  className,
  style,
  ...props
}: CommentsIndicatorProps) {
  const bgColor = color ?? theme.color('background.disabled')
  const fgColor =
    Color(bgColor).isLight() === (theme.name === 'light')
      ? theme.color('text.primary')
      : theme.color('text.primaryInverse')
  return (
    <Text
      component="button"
      className={clsx(styles.commentsIndicator, className)}
      style={{ '--bg-color': bgColor, '--fg-color': fgColor, ...style } as CSSProperties}
      {...props}
    >
      <Icon icon="chat_bubble" />
      {n}
    </Text>
  )
}
