import { isEqual } from 'lodash'
import { useEffect, useState } from 'react'

export function useRecentlyChanged<T>(value: T, delay: number) {
  const [prev, setPrev] = useState(value)
  const [changed, setChanged] = useState(true)

  useEffect(() => {
    const timeout = window.setTimeout(() => setChanged(false), delay)
    return () => clearTimeout(timeout)
  }, [prev, delay])

  if (!isEqual(prev, value)) {
    setPrev(value)
    setChanged(true)
  }

  return changed
}
