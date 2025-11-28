import { ComponentProps, KeyboardEvent, ReactNode, RefObject } from 'react'
import clsx from 'clsx'
import { TypographyName } from 'tapestry-core-client/src/theme/types'
import { typographyClassName } from 'tapestry-core-client/src/theme/index'
import styles from './styles.module.css'
import { isMeta } from 'tapestry-core-client/src/lib/keyboard-event'

export interface TextAreaProps extends Omit<ComponentProps<'textarea'>, 'onSubmit'> {
  label?: ReactNode
  typography?: TypographyName
  onSubmit?: (e: KeyboardEvent) => unknown
  ref?: RefObject<HTMLTextAreaElement | null>
}

export function Textarea({
  label,
  className,
  typography = 'bodySm',
  onKeyDown,
  onSubmit,
  ref,
  ...props
}: TextAreaProps) {
  const textarea = (
    <textarea
      ref={ref}
      className={clsx(styles.root, typographyClassName(typography), className)}
      {...props}
      onKeyDown={(e) => {
        e.stopPropagation()
        onKeyDown?.(e)
        if (e.code === 'Enter' && isMeta(e.nativeEvent)) {
          onSubmit?.(e)
        }
      }}
      onPaste={(e) => e.stopPropagation()}
      onCopy={(e) => e.stopPropagation()}
    />
  )
  return label ? (
    <label className={clsx(styles.textareaLabel, 'textarea-label')}>
      {label}
      {textarea}
    </label>
  ) : (
    textarea
  )
}
