import { RefObject, useEffect } from 'react'
import { usePropRef } from './use-prop-ref.js'

interface UseScrollObserverOptions {
  ref: RefObject<HTMLElement | null>
  callback: (target: HTMLElement) => void
}

export function useScrollObserver({ ref, callback }: UseScrollObserverOptions) {
  const callbackRef = usePropRef(callback)

  useEffect(() => {
    const scrollContainer = ref.current
    if (!scrollContainer) {
      return
    }
    const onScroll = () => callbackRef.current(scrollContainer)
    scrollContainer.addEventListener('scroll', onScroll)

    return () => scrollContainer.removeEventListener('scroll', onScroll)
  }, [callbackRef, ref])
}
