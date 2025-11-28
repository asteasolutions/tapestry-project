import { useEffect, useRef } from 'react'
import { usePropRef } from './use-prop-ref.js'
import { distance, Point } from 'tapestry-core/src/lib/geometry.js'
import { toPoint } from '../../../lib/dom.js'

export function useOutsideClick<T extends HTMLElement = HTMLElement>(
  callback?: (source: HTMLElement, target: HTMLElement) => unknown,
) {
  const containerRef = useRef<T>(null)
  const callbackRef = usePropRef(callback)

  useEffect(() => {
    let state: { point: Point; timestamp: number } | null = null

    const onDown = (event: PointerEvent) => {
      state = { point: toPoint(event), timestamp: performance.now() }
    }
    const onUp = (event: PointerEvent) => {
      if (!state) return

      const source = containerRef.current
      if (performance.now() - state.timestamp < 200 && distance(state.point, toPoint(event)) < 3) {
        const target = event.target as HTMLElement | null
        if (source && !source.contains(target)) {
          callbackRef.current?.(source, target!)
        }
      }
      state = null
    }

    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('pointerup', onUp, true)

    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('pointerup', onUp, true)
    }
  }, [callbackRef])

  return containerRef
}
