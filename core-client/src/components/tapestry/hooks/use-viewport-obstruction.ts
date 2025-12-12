import { Ref, useCallback, useEffect, useMemo, useState } from 'react'
import { useTapestryConfig } from '..'
import {
  addViewportObstruction,
  removeViewportObstruction,
} from '../../../view-model/store-commands/tapestry'
import { getBoundingRectangle } from '../../../lib/dom'
import { useResizeObserver } from '../../lib/hooks/use-resize-observer'
import { ViewportObstruction } from 'tapestry-core/src/lib/geometry'

export interface UseViewportObstructionProps<T extends HTMLElement> {
  ref: Ref<T | null>
  id: string
}

export function useViewportObstruction<T extends HTMLElement = HTMLDivElement>(
  opts: { clear?: ViewportObstruction['clear'] } = {},
): UseViewportObstructionProps<T> {
  const { useStoreData, useDispatch } = useTapestryConfig()
  const viewportSize = useStoreData('viewport.size')
  const [id] = useState(() => crypto.randomUUID())
  const [elem, setElem] = useState<HTMLElement | null>(null)
  const dispatch = useDispatch()
  const elemRef = useMemo(() => ({ current: elem }), [elem])
  // Stringify the clear parameter so that it doesn't cause rerenders.
  const clearStr = JSON.stringify(opts.clear) as string | undefined
  const registerViewportObstruction = useCallback(() => {
    const rect = getBoundingRectangle(elem)
    if (rect) {
      dispatch(
        addViewportObstruction(id, {
          rect,
          clear: clearStr ? (JSON.parse(clearStr) as ViewportObstruction['clear']) : undefined,
        }),
      )
    }

    // We have artificially added the viewportSize here even though it is not directly necessary.
    // However, each viewport obstruction's coordinates need to be re-evaluated when the viewport is resized.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, elem, id, clearStr, viewportSize])

  useResizeObserver({ ref: elemRef, callback: registerViewportObstruction })

  useEffect(() => {
    registerViewportObstruction()

    return () => {
      dispatch(removeViewportObstruction(id))
    }
  }, [dispatch, registerViewportObstruction, id])

  return { ref: setElem, id }
}
