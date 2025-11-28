import { ComponentProps, createElement, CSSProperties, JSXElementConstructor, JSX } from 'react'
import { TypographyName } from '../../../theme/types.js'
import clsx from 'clsx'
import { typographyClassName } from '../../../theme/index.js'
import styles from './styles.module.css'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TextComponent = keyof JSX.IntrinsicElements | JSXElementConstructor<any>

export type TextProps<T extends TextComponent = 'span'> = Omit<ComponentProps<T>, 'component'> & {
  component?: T
  variant?: TypographyName
  lineClamp?: number
  textType?: 'error' | 'warning'
  ellipsize?: boolean
}

export function Text<T extends TextComponent = 'span'>({
  variant = 'body',
  component,
  lineClamp,
  textType,
  className,
  style,
  children,
  ellipsize,
  ...props
}: TextProps<T>) {
  return createElement(component ?? 'span', {
    className: clsx(
      'typography',
      typographyClassName(variant),
      className,
      {
        [styles.lineClamp]: !!lineClamp,
        ellipsize,
      },
      textType,
    ),
    style: {
      '--line-clamp': lineClamp,
      ...style,
    } as CSSProperties,
    ...props,
    children,
  })
}
