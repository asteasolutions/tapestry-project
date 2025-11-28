import { useEffect } from 'react'
import {
  AsyncActionOptions,
  useAsyncAction,
} from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import { usePropRef } from 'tapestry-core-client/src/components/lib/hooks/use-prop-ref'

interface UsePollOptions {
  callback: () => unknown
  interval: number
  leading?: boolean
  paused?: boolean
}

export function usePoll({ callback, interval, leading, paused }: UsePollOptions) {
  const cbRef = usePropRef(callback)

  useEffect(() => {
    if (paused) {
      return
    }

    if (leading) {
      cbRef.current()
    }

    const intervalId = window.setInterval(cbRef.current, interval)

    return () => clearInterval(intervalId)
  }, [paused, leading, interval, cbRef])
}

interface UseAsyncPolledOptions<T> {
  action: () => Promise<T>
  asyncActionOptions?: Partial<AsyncActionOptions>
  interval: number
  leading?: boolean
  paused?: boolean
}

export function useAsyncPolled<T>({
  action,
  interval,
  asyncActionOptions,
  leading,
  paused,
}: UseAsyncPolledOptions<T>) {
  const { data, trigger, loading, error } = useAsyncAction(() => action(), asyncActionOptions)

  usePoll({ callback: trigger, interval, leading, paused })

  return {
    data,
    loading,
    error,
    trigger,
  }
}
