import { useEffect } from 'react'
import { usePropRef } from './use-prop-ref.js'
import { LongPressDetector, LongPressUpEvent } from '../../../lib/long-press-detector.js'

export function useLongPress<T extends HTMLElement>(
  elementGetter: () => T | null,
  callback: () => unknown,
) {
  const elementGetterRef = usePropRef(elementGetter)
  const callbackRef = usePropRef(callback)

  useEffect(() => {
    const elem = elementGetterRef.current()
    if (!elem) {
      return
    }

    const detector = new LongPressDetector(elem)

    const onDown = () => callbackRef.current()
    detector.addEventListener('down', onDown)

    const onUp = (e: LongPressUpEvent) => e.detail.preventDefault()
    detector.addEventListener('up', onUp)

    detector.activate()

    return () => {
      detector.deactivate()
      detector.removeEventListener('down', onDown)
      detector.removeEventListener('up', onUp)
    }
  }, [elementGetterRef, callbackRef])
}
