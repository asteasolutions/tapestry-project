import { useLocation, useSearchParams } from 'react-router'
import { useEffect, useRef } from 'react'
import { focusGroup, focusItems } from '../../../view-model/store-commands/viewport'
import { setInteractiveElement } from '../../../view-model/store-commands/tapestry'
import { useTapestryConfig } from '..'
import { InternalNavigationState } from '../../../stage/controller/item-controller'

export function useFocusElement() {
  const [searchParams, setSearchParams] = useSearchParams()

  return (id: string, params?: Record<string, string>) => {
    setSearchParams(
      { focus: id, ...params },
      {
        state: { timestamp: Date.now() } satisfies InternalNavigationState,
        replace: searchParams.get('focus') === id,
      },
    )
  }
}

export function useFocusedElement() {
  const { useStoreData, useDispatch } = useTapestryConfig()
  const [params] = useSearchParams()
  const modelId = params.get('focus')

  const locationState = useLocation().state as InternalNavigationState | null

  const { timestamp, animate } = locationState ?? {}

  const elements = useStoreData(['items', 'groups'])
  const elementsRef = useRef(elements)
  elementsRef.current = elements

  const viewportReady = useStoreData('viewport.ready')

  const dispatch = useDispatch()

  useEffect(() => {
    if (!modelId || !viewportReady) {
      return
    }

    const { items, groups } = elementsRef.current
    if (items[modelId]) {
      dispatch(
        focusItems([modelId], { addToolbarPadding: true, animate }),
        setInteractiveElement({ modelId, modelType: 'item' }),
      )
    } else if (groups[modelId]) {
      dispatch(focusGroup(modelId, animate))
    } else if (modelId === 'all') {
      dispatch(focusItems(Object.keys(items), { animate }))
    }
  }, [modelId, viewportReady, dispatch, timestamp, animate])
}
