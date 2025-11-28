import { DependencyList, useEffect } from 'react'
import { matchesShortcut } from '../../../lib/keyboard-event.js'
import { usePropRef } from './use-prop-ref.js'

type MaybePromise<T> = T | Promise<T>

export function useKeyboardShortcuts(
  shortcuts: Record<string, (event: KeyboardEvent) => MaybePromise<boolean | void>>,
  dependencies: DependencyList = [],
  useCapture = false,
) {
  const shortcutsRef = usePropRef(shortcuts)

  useEffect(() => {
    const onKeydown = async (ev: KeyboardEvent) => {
      for (const [shortcut, callback] of Object.entries(shortcutsRef.current)) {
        if (matchesShortcut(ev, shortcut)) {
          if (!(await callback(ev))) {
            ev.stopPropagation()
            ev.preventDefault()
          }
          break
        }
      }
    }

    document.addEventListener('keydown', onKeydown, useCapture)

    return () => document.removeEventListener('keydown', onKeydown, useCapture)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, useCapture, shortcutsRef])
}
