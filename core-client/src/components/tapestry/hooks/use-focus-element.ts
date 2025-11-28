import { useLocation, useSearchParams } from 'react-router'
import { useEffect, useRef } from 'react'
import { focusGroup, focusItems } from '../../../view-model/store-commands/viewport'
import { setInteractiveElement } from '../../../view-model/store-commands/tapestry'
import { useTapestryConfig } from '..'

export function useFocusElement() {
  const [searchParams, setSearchParams] = useSearchParams()

  return (id: string, params?: Record<string, string>) => {
    setSearchParams(
      { focus: id, ...params },
      {
        state: { timestamp: Date.now() },
        replace: searchParams.get('focus') === id,
      },
    )
  }
}

export function useFocusedElement() {
  const { useStoreData, useDispatch } = useTapestryConfig()
  const [params] = useSearchParams()
  const modelId = params.get('focus')

  const locationState = useLocation().state as { timestamp: number } | null

  const timestamp = locationState?.timestamp

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
        focusItems([modelId], { addToolbarPadding: true }),
        setInteractiveElement({ modelId, modelType: 'item' }),
      )
    } else if (groups[modelId]) {
      dispatch(focusGroup(modelId))
    } else if (modelId === 'all') {
      dispatch(focusItems(Object.keys(items)))
    }
  }, [modelId, viewportReady, dispatch, timestamp])
}
