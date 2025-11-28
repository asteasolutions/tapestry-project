import clsx from 'clsx'
import { Text } from '../text/index.js'
import styles from './styles.module.css'
import { TypographyName } from '../../../theme/types.js'
import { ReactNode } from 'react'
import { defaults } from 'lodash-es'

interface LabelOptions {
  content: ReactNode
  position?: 'before' | 'after'
  variant?: TypographyName
}

interface CheckboxProps {
  checked: boolean
  onChange: () => unknown
  label?: string | LabelOptions
  disabled?: boolean
  classes?: {
    checkbox?: string
    label?: string
  }
}

export function Checkbox({ label, checked, onChange, disabled, classes = {} }: CheckboxProps) {
  const { checkbox: checkboxClass, label: labelClass } = classes
  const input = (
    <input
      type="checkbox"
      onChange={onChange}
      checked={checked}
      disabled={disabled}
      className={checkboxClass}
    />
  )
  if (!label) {
    return input
  }

  if (typeof label === 'string') {
    label = { content: label }
  }
  defaults(label, { variant: 'bodySm', position: 'before' })

  const labelElement =
    typeof label.content === 'string' ? (
      <Text variant={label.variant} className={clsx({ [styles.disabled]: disabled })}>
        {label.content}
      </Text>
    ) : (
      label.content
    )

  return (
    <label className={clsx(styles.label, labelClass)}>
      {label.position === 'before' && labelElement}
      {input}
      {label.position === 'after' && labelElement}
    </label>
  )
}
