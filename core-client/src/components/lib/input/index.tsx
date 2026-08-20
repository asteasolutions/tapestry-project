import { ComponentProps, ReactNode, RefObject } from 'react'
import styles from './styles.module.css'
import clsx from 'clsx'
import { TypographyName } from '../../../theme/types.js'
import { typographyClassName } from '../../../theme/index.js'
import { Text } from '../text/index.js'

export interface InputProps extends ComponentProps<'input'> {
  label?: ReactNode
  typography?: TypographyName
  error?: string
  ref?: RefObject<HTMLInputElement | null>
  name?: string
  endAdornment?: ReactNode
}

export function Input({
  label,
  className,
  typography = 'bodySm',
  error,
  name,
  ref,
  endAdornment,
  ...props
}: InputProps) {
  const input = (
    <>
      <div
        className={clsx(styles.root, className, {
          [styles.invalidInput]: error,
        })}
      >
        <input
          ref={ref}
          className={typographyClassName(typography)}
          name={name}
          {...props}
          onKeyDown={(e) => {
            props.onKeyDown?.(e)
            e.stopPropagation()
          }}
          onPaste={(e) => e.stopPropagation()}
          onCopy={(e) => e.stopPropagation()}
        />
        {endAdornment}
      </div>
      {error && (
        <Text variant="bodySm" textType="error">
          {error}
        </Text>
      )}
    </>
  )
  return label ? (
    <label className={clsx(styles.inputLabel, 'input-label')}>
      {label}
      {input}
    </label>
  ) : (
    input
  )
}
