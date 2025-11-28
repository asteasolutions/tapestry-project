import { useEffect, useRef } from 'react'

export function usePrevious<T>(value: T) {
  const prevRef = useRef(value)
  useEffect(() => {
    prevRef.current = value
  }, [value])

  return prevRef.current
}
