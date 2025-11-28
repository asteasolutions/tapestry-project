import { ReactNode, useCallback, useRef } from 'react'
import { ClickableContext } from '../buttons/clickable-context.js'
import styles from './styles.module.css'
import { LiteralColor } from '../../../theme/types.js'

export interface ColorPickerProps {
  onChange: (color: LiteralColor) => unknown
  children: ReactNode
  color?: LiteralColor
}

export function ColorPicker({ color, onChange, children }: ColorPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const click = useCallback(() => inputRef.current?.click(), [])

  return (
    <div className={styles.root}>
      <input
        value={color ?? '#000000'}
        type="color"
        ref={inputRef}
        inert
        onChange={(event) => onChange(event.target.value as LiteralColor)}
      />
      <ClickableContext value={{ click }}>{children}</ClickableContext>
    </div>
  )
}
