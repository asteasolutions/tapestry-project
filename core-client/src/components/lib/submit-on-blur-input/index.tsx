import { useState } from 'react'
import { Input, InputProps } from '../input/index.js'
import { identity } from 'lodash-es'

interface SubmitOnBlurInputProps extends Omit<InputProps, 'onSubmit' | 'onBlur' | 'onChange'> {
  value: string
  onSubmit: (value: string) => unknown
  parse?: (value: string) => string
  formClass?: string
}

export function SubmitOnBlurInput({
  value,
  onSubmit,
  formClass,
  parse = identity,
  ...props
}: SubmitOnBlurInputProps) {
  const [internalValue, setInternalValue] = useState(value)
  const [oldValue, setOldValue] = useState(value)
  if (oldValue !== value) {
    setOldValue(value)
    setInternalValue(value)
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        // We could use a ref as well, but since this is fairly isolated I decided to skip on it --ivo
        ;(e.target as HTMLFormElement).querySelector('input')?.blur()
      }}
      className={formClass}
    >
      <Input
        value={internalValue}
        onChange={(e) => setInternalValue(parse(e.target.value))}
        onBlur={() => {
          onSubmit(internalValue)
          setOldValue(internalValue)
        }}
        {...props}
      />
    </form>
  )
}
