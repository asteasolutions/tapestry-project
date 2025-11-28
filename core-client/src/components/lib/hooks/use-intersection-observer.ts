import { RefObject, useEffect, useState } from 'react'
import { usePropRef } from './use-prop-ref.js'

interface UseIntersectionObserverOptions {
  viewportRef: RefObject<HTMLElement | null>
  targetRef: RefObject<HTMLElement | null>
  callback: (entry: IntersectionObserverEntry) => unknown
}

export function useIntersectionObserver({
  viewportRef,
  targetRef,
  callback,
}: UseIntersectionObserverOptions) {
  const callbackRef = usePropRef(callback)

  useEffect(() => {
    const viewport = viewportRef.current
    const target = targetRef.current
    if (!viewport || !target) {
      return
    }
    const observer = new IntersectionObserver((entries) => callbackRef.current(entries[0]), {
      root: viewport,
    })
    observer.observe(target)
    return () => {
      observer.disconnect()
    }
  }, [viewportRef, targetRef, callbackRef])
}

export function useIsIntersecting(
  options: Pick<UseIntersectionObserverOptions, 'viewportRef' | 'targetRef'>,
) {
  const [intersecting, setIntersecting] = useState(false)
  useIntersectionObserver({
    ...options,
    callback: (entry) => setIntersecting(entry.isIntersecting),
  })
  return intersecting
}
