import { debounce } from 'lodash-es'
import { useEffect, useMemo, useState } from 'react'
import { usePropRef } from './use-prop-ref.js'

export function useDebounced<T>(initialValue: T, delay: number) {
  const [value, setValue] = useState(initialValue)
  const valueRef = usePropRef(initialValue)

  const debouncedCallback = useMemo(
    () => debounce(() => setValue(valueRef.current), delay),
    [delay, valueRef],
  )

  useEffect(() => {
    debouncedCallback()
  }, [initialValue, debouncedCallback])

  return value
}
