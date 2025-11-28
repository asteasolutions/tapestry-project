import { useEffect, useRef, useState } from 'react'
import { InputProps, Options, SelectInstance, components } from 'react-select'
import { typographyClassName } from 'tapestry-core-client/src/theme/index'
import { IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import styles from './styles.module.css'
import { clamp } from 'lodash'
import { Tooltip } from 'tapestry-core-client/src/components/lib/tooltip/index'
import { Select, SelectOption } from '../../../../select'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'

type Option = SelectOption<number>

const OPTIONS: Options<Option> = [10, 12, 14, 18, 24, 36, 48, 64, 80, 144, 288].map((value) => ({
  value,
  label: <Text variant="bodySm">{value}</Text>,
}))

const Input = (props: InputProps<Option, false>) => <components.Input {...props} isHidden={false} />

interface ChangeFontInputProps {
  value: number | undefined
  onChange: (size: number) => unknown
  className?: string
  onMenuOpen?: () => unknown
}

const MAX_FONT_SIZE = 999

export function FontSizeInput({ value, onChange, className, onMenuOpen }: ChangeFontInputProps) {
  const selectAPI = useRef<SelectInstance<Option>>(null)

  const [internalValue, setInternalValue] = useState(value)
  useEffect(() => setInternalValue(value), [value])

  const nextOption = (greater: boolean) => {
    const currentValue = internalValue || -1
    const option = greater
      ? OPTIONS.find((o) => o.value > currentValue)
      : OPTIONS.findLast((o) => o.value < currentValue)
    if (option) {
      onChange(option.value)
    }
  }

  const setClamped = (value: number) =>
    setInternalValue(Number.isNaN(value) ? 0 : clamp(Math.abs(value), 1, MAX_FONT_SIZE))

  const [lastKeyCode, setLastKeyCode] = useState('')

  return (
    <div className={styles.root}>
      <div>
        <Select
          ref={selectAPI}
          options={OPTIONS}
          tabSelectsValue={false}
          isSearchable
          components={{
            Input,
            DropdownIndicator: () => null,
            IndicatorSeparator: () => null,
            Placeholder: () => null,
          }}
          onChange={(option) => {
            if (option) {
              setInternalValue(option.value)
              setTimeout(() => selectAPI.current?.blur())
            }
          }}
          controlShouldRenderValue={false}
          value={internalValue ?? 0}
          inputValue={internalValue ? `${internalValue}` : ''}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.code === 'Enter' && lastKeyCode !== 'ArrowUp' && lastKeyCode !== 'ArrowDown') {
              selectAPI.current?.blur()
              e.preventDefault()
              return
            }

            setLastKeyCode(e.code)
          }}
          filterOption={() => true}
          onInputChange={(value, { action }) => {
            if (action !== 'input-change') {
              return
            }
            const intValue = Number.parseInt(value)

            setClamped(Math.abs(intValue))
          }}
          onBlur={() => {
            if (internalValue === 0) {
              setInternalValue(value)
            } else if (internalValue !== undefined && internalValue !== value) {
              onChange(internalValue)
            }
          }}
          styles={{
            control: (base) => ({ ...base, minHeight: '32px' }),
            input: (base) => ({
              ...base,
              padding: 0,
              justifyContent: 'end',
              color: 'var(--theme-text-primary)',
            }),
            valueContainer: (base) => ({ ...base, paddingRight: 0 }),
            menu: (base) => ({ ...base, width: 'auto' }),
          }}
          classNames={{ container: () => typographyClassName('bodySm') }}
          className={className}
          onMenuOpen={onMenuOpen}
        />
        <Tooltip side="bottom" offset={16}>
          Font size
        </Tooltip>
      </div>
      <div>
        <IconButton
          className={styles.fontInputButton}
          icon="arrow_drop_up"
          aria-label="Increase font size"
          onClick={() => nextOption(true)}
          disabled={(internalValue || -1) >= OPTIONS[OPTIONS.length - 1].value}
          tooltip={{ side: 'bottom', children: 'Increase font size' }}
        />
        <IconButton
          className={styles.fontInputButton}
          icon="arrow_drop_down"
          aria-label="Decrease font size"
          onClick={() => nextOption(false)}
          disabled={(internalValue || -1) <= OPTIONS[0].value}
          tooltip={{ side: 'bottom', children: 'Decrease font size' }}
        />
      </div>
    </div>
  )
}
