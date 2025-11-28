import { defaults } from 'lodash-es'
import { useCallback, useEffect, useRef, useState } from 'react'

import { makeCancelable } from 'tapestry-core/src/lib/promise.js'
import { usePropRef } from './use-prop-ref.js'

export interface AsyncActionOptions {
  clearDataOnReload: boolean
  initiallyLoading: boolean
  onAfterAction?: (dataOrError: unknown) => unknown
}

interface AsyncAction<T> {
  data: T | undefined
  loading: boolean
  error: unknown
}

const DEFAULT_OPTIONS: AsyncActionOptions = {
  initiallyLoading: false,
  clearDataOnReload: true,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useAsyncAction<T, Args extends any[]>(
  action: (abortController: AbortController, ...args: Args) => Promise<T>,
  opts: Partial<AsyncActionOptions> = {},
) {
  const options = defaults(opts, DEFAULT_OPTIONS)

  const [state, setState] = useState<AsyncAction<T>>({
    data: undefined,
    error: undefined,
    loading: options.initiallyLoading,
  })

  const abortControllerRef = useRef<AbortController>(undefined)

  const actionRef = usePropRef(action)
  const optionsRef = usePropRef(options)

  const cancelActionRef = useRef<() => void>(undefined)

  const requestIdRef = useRef(0)

  const perform = useCallback(
    async (...args: Args) => {
      const handler = async () => {
        requestIdRef.current += 1
        const myRequest = requestIdRef.current
        let dataOrError
        try {
          setState((current) => ({
            loading: true,
            error: undefined,
            data: optionsRef.current.clearDataOnReload ? undefined : current.data,
          }))
          const abortCtrl = new AbortController()
          abortControllerRef.current = abortCtrl
          const data = await actionRef.current(abortCtrl, ...args)
          dataOrError = data

          if (myRequest === requestIdRef.current) {
            setState({ data, loading: false, error: undefined })
          }

          return data
        } catch (error) {
          dataOrError = error
          if (myRequest === requestIdRef.current) {
            setState({ data: undefined, loading: false, error })
          }

          throw error
        } finally {
          optionsRef.current.onAfterAction?.(dataOrError)
        }
      }

      const { promise, cancel } = makeCancelable(handler())

      cancelActionRef.current = cancel

      return promise
    },
    [actionRef, optionsRef],
  )

  const trigger = useCallback(
    (...args: Args) => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      perform(...args).catch(() => {})
    },
    [perform],
  )

  const cancel = useCallback(() => cancelActionRef.current?.(), [])

  useEffect(
    () => () => {
      abortControllerRef.current?.abort()
      cancel()
    },
    [cancel],
  )

  return {
    ...state,
    perform,
    trigger,
    cancel,
  }
}
