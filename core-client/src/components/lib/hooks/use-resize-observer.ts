import { RefObject, useEffect } from 'react'
import { usePropRef } from './use-prop-ref.js'

type UseResizeObserverCallback = (entries: ResizeObserverEntry[], target: HTMLElement) => void

interface UseResizeObserverOptions {
  ref: RefObject<HTMLElement | null>
  callback: UseResizeObserverCallback
}

export function useResizeObserver({ ref, callback }: UseResizeObserverOptions) {
  const callbackRef = usePropRef(callback)

  useEffect(() => {
    const target = ref.current
    if (!target) {
      return
    }
    const resizeObserver = new ResizeObserver((entries) => callbackRef.current(entries, target))
    resizeObserver.observe(target)

    return () => {
      resizeObserver.disconnect()
    }
  }, [callbackRef, ref])
}
