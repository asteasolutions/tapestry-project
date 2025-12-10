import { useTapestryConfig } from '../..'
import { IconButton } from '../../../../../src/components/lib/buttons/index'
import { useKeyboardShortcuts } from '../../../../../src/components/lib/hooks/use-keyboard-shortcuts'
import { deselectAll, setSidePane } from '../../../../view-model/store-commands/tapestry'
import { focusItems } from '../../../../view-model/store-commands/viewport'

export function SearchButton() {
  const { useDispatch, useStoreData } = useTapestryConfig()
  const dispatch = useDispatch()
  const showing = useStoreData('displaySidePane') === 'search'

  function toggleDialog() {
    dispatch(setSidePane('search', true))
    if (!showing) {
      // TODO: The timeout is here so the SearchPane can render and call useViewportObstruction,
      // so that focusing the items will take into account the new panel that has just appeared.
      // We should explore ways to detect in-flight updates that affect the focus rect during focus
      setTimeout(() => dispatch(deselectAll(), focusItems()), 0)
    }
  }

  useKeyboardShortcuts({
    Slash: toggleDialog,
  })

  return (
    <IconButton
      icon="feature_search"
      aria-label="Search items"
      onClick={toggleDialog}
      isActive={showing}
    />
  )
}
