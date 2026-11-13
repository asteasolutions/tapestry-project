import { useEffect, useState } from 'react'
import { ChangeEvent, Observable } from '../../../lib/events/observable.js'
import { Objectish, Patch } from 'immer'
import { usePropRef } from './use-prop-ref.js'

export type ObservableChangeCallback<T> = (
  oldValue: T | undefined,
  newValue: T,
  patches: Patch[],
) => unknown

export function useObservable<T extends Objectish>(
  observable: Observable<T>,
  onChangeCallback?: ObservableChangeCallback<T>,
): T
export function useObservable<T extends Objectish>(
  observable: Observable<T> | null,
  onChangeCallback?: ObservableChangeCallback<T>,
): T | undefined
export function useObservable<T extends Objectish>(
  observable: Observable<T> | null,
  onChangeCallback?: ObservableChangeCallback<T>,
) {
  const [state, setState] = useState(observable?.value)
  const onChangeRef = usePropRef(onChangeCallback)

  useEffect(() => {
    let oldValue = observable?.value
    setState(oldValue)
    const onChangeListener = (val: ChangeEvent<T>) => {
      const { value, patches } = val.detail
      setState(value)
      onChangeRef.current?.(oldValue, value, patches)
      oldValue = value
    }

    observable?.addEventListener('change', onChangeListener)
    return () => {
      observable?.removeEventListener('change', onChangeListener)
    }
  }, [observable, onChangeRef])

  return state
}
