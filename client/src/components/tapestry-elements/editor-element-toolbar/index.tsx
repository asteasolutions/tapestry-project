import {
  ElementToolbar,
  ElementToolbarProps,
} from 'tapestry-core-client/src/components/tapestry/element-toolbar'
import { useTapestryData } from '../../../pages/tapestry/tapestry-providers'
import { isHoveredDragTarget } from '../../../stage/utils'

export type EditorElementToolbarProps = Omit<ElementToolbarProps, 'lockOffsets'>

export function EditorElementToolbar(props: EditorElementToolbarProps) {
  const pointerInteraction = useTapestryData('pointerInteraction')

  // lock offsets when initiating a drag operation, so that the drag handle follows the cursor
  const shouldLockOffsets =
    pointerInteraction?.action === 'drag' &&
    isHoveredDragTarget(pointerInteraction.target) &&
    pointerInteraction.target.uiComponent === 'dragHandle'

  return <ElementToolbar {...props} lockOffsets={shouldLockOffsets} />
}
