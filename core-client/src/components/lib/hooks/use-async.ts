import { defaults } from 'lodash-es'
import { DependencyList, useEffect } from 'react'

import { AsyncActionOptions, useAsyncAction } from './use-async-action.js'

type CleanupFn = () => unknown
type OnCleanupFn = (callback: CleanupFn) => void

export function useAsync<T>(
  action: (abortController: AbortController, onCleanup: OnCleanupFn) => Promise<T>,
  dependencies: DependencyList,
  options: Partial<AsyncActionOptions> = {},
) {
  const { data, loading, error, trigger, cancel } = useAsyncAction(
    action,
    defaults(options, { initiallyLoading: true }),
  )

  useEffect(() => {
    const cleanupFunctions: CleanupFn[] = []
    trigger((cleanup) => cleanupFunctions.unshift(cleanup))
    return () => cleanupFunctions.forEach((f) => f())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, ...dependencies])

  return { data, loading, error, reload: trigger, cancel }
}
