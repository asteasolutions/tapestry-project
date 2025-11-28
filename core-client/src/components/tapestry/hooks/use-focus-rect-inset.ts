import { defaults } from 'lodash-es'
import { useEffect } from 'react'
import { DirectionalOffsets, ZERO_OFFSETS } from 'tapestry-core/src/lib/geometry'
import { useTapestryConfig } from '../../../components/tapestry'
import {
  addFocusRectInset,
  removeFocusRectInset,
} from '../../../view-model/store-commands/tapestry'

export function useFocusRectInset({ top, left, right, bottom }: Partial<DirectionalOffsets>) {
  const dispatch = useTapestryConfig().useDispatch()

  useEffect(() => {
    const id = crypto.randomUUID()
    dispatch(addFocusRectInset(id, defaults({ top, right, bottom, left }, ZERO_OFFSETS)))

    return () => {
      dispatch(removeFocusRectInset(id))
    }
  }, [dispatch, top, right, bottom, left])
}
