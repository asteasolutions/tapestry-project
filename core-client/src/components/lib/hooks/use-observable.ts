import { useEffect, useState } from 'react'
import { ChangeEvent, Observable } from '../../../lib/events/observable.js'
import { Objectish } from 'immer'

export function useObservable<T extends Objectish>(observable: Observable<T>): T
export function useObservable<T extends Objectish>(observable: Observable<T> | null): T | undefined
export function useObservable<T extends Objectish>(observable: Observable<T> | null) {
  const [state, setState] = useState(observable?.value)

  useEffect(() => {
    setState(observable?.value)
    const onChangeListener = (val: ChangeEvent<T>) => {
      setState(val.detail.value)
    }

    observable?.addEventListener('change', onChangeListener)
    return () => {
      observable?.removeEventListener('change', onChangeListener)
    }
  }, [observable])

  return state
}
