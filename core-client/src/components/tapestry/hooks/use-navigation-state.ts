import { useLocation, useNavigate } from 'react-router'
import { InternalNavigationState } from '../../../stage/controller/item-controller'

export function useNavigationState<T extends Record<string, string>>() {
  const location = useLocation()
  const navigate = useNavigate()

  return {
    locationState: location.state as InternalNavigationState,
    params: Object.fromEntries(new URLSearchParams(location.search)) as Partial<T>,
    setNavigationState: async (
      params: T,
      options?: { state?: InternalNavigationState; replace?: boolean },
    ) => {
      const newParams = new URLSearchParams(params)
      const { state, replace } = options ?? {}
      await navigate(
        { search: newParams.toString() },
        {
          state: { timestamp: Date.now(), ...state },
          replace:
            replace ??
            (newParams.has('focus') &&
              new URLSearchParams(location.search).get('focus') === newParams.get('focus')),
        },
      )
    },
  }
}
