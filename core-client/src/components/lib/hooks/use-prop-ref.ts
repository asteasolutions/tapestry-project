import { useRef } from 'react'

export function usePropRef<T>(value: T) {
  const ref = useRef<T>(value)
  ref.current = value
  return ref
}
