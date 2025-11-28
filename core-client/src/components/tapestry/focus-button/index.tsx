import { useState } from 'react'
import { useKeyboardShortcuts } from '../../lib/hooks/use-keyboard-shortcuts'
import { LinearTransform } from 'tapestry-core/src/lib/geometry'
import { IconButton } from '../../lib/buttons/index'
import { transformViewport } from '../../../view-model/store-commands/viewport'
import { useTapestryConfig } from '..'

export interface FocusButtonProps {
  onFocus: () => unknown
}

export function FocusButton({ onFocus: focusFn }: FocusButtonProps) {
  const { useStore, useDispatch } = useTapestryConfig()
  const [returnToView, setReturnToView] = useState<LinearTransform | null>(null)
  const store = useStore()
  const dispatch = useDispatch()

  const onFocus = () => {
    if (returnToView) {
      dispatch(transformViewport(returnToView, true))
      setReturnToView(null)
    } else {
      setReturnToView(store.get('viewport.transform'))
      focusFn()
    }
  }

  useKeyboardShortcuts({ KeyF: onFocus }, [onFocus])

  return (
    <IconButton
      icon={returnToView ? 'crop_free' : 'center_focus_strong'}
      aria-label="Focus"
      onClick={onFocus}
    />
  )
}
