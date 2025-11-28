import { useEffect } from 'react'
import { useSearchParams } from 'react-router'

interface UseQueryStateOptions<State> {
  paramsToState: (params: URLSearchParams) => State
  stateToParams: (state: State) => URLSearchParams
  defaultState?: State
}

function areParamsEqual(sp1: URLSearchParams, sp2: URLSearchParams) {
  const a = new URLSearchParams(sp1)
  const b = new URLSearchParams(sp2)

  a.sort()
  b.sort()

  return a.toString() === b.toString()
}

export function useQueryState<State>({
  paramsToState,
  stateToParams,
  defaultState,
}: UseQueryStateOptions<State>): [State, (state: State) => void] {
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    const defaultParams = defaultState ? stateToParams(defaultState) : undefined
    if (searchParams.size === 0 && defaultParams && !areParamsEqual(searchParams, defaultParams)) {
      setSearchParams(defaultParams, { replace: true })
    }
    // We only want to set the search params once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return [paramsToState(searchParams), (state: State) => setSearchParams(stateToParams(state))]
}
