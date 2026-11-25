import { useEffect, useRef } from 'react'
import { usePropRef } from './use-prop-ref.js'

export function useOutsideClick<T extends HTMLElement = HTMLElement>(
  callback?: (source: HTMLElement, target: HTMLElement) => unknown,
) {
  const containerRef = useRef<T>(null)
  const callbackRef = usePropRef(callback)

  useEffect(() => {
    // dragenter covers drags coming from outside the page, which have no pointerdown
    const onDown = (event: PointerEvent | DragEvent) => {
      const source = containerRef.current
      const target = event.target as HTMLElement
      if (source && !source.contains(target)) {
        callbackRef.current?.(source, target)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      const source = containerRef.current
      if (source && event.key === 'Escape') {
        callbackRef.current?.(source, event.target as HTMLElement)
      }
    }

    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('dragenter', onDown, true)
    document.addEventListener('keydown', onKeyDown, true)

    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('dragenter', onDown, true)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [callbackRef])

  return containerRef
}
