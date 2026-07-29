import { Multiselection } from '.'
import { useTapestryConfig } from '..'
import {
  getBoundingRectangle,
  getSelectionItems,
  MULTISELECT_RECTANGLE_PADDING,
} from '../../../view-model/utils'
import { useMultiselectMenu } from '../../lib/hooks/use-multiselect-menu'
import { useSingleGroupSelection } from '../../lib/hooks/use-single-group-selection'
import { ElementToolbar } from '../element-toolbar'

export function DefaultMultiselection() {
  const { useStoreData } = useTapestryConfig()
  const { items, selection } = useStoreData(['items', 'selection'])
  const selectionItems = getSelectionItems({ items, selection })
  const selectionBounds = getBoundingRectangle(selectionItems).expand(MULTISELECT_RECTANGLE_PADDING)
  const selectedGroup = useSingleGroupSelection()

  const toolbar = useMultiselectMenu(
    selectedGroup
      ? ['focus', 'separator', 'presentation', 'separator', 'deselect']
      : ['focus', 'separator', 'deselect'],
    selectedGroup?.dto.id,
  )

  return (
    <Multiselection
      bounds={selectionBounds}
      style={{ pointerEvents: 'none' }}
      halo={<ElementToolbar elementBounds={selectionBounds} items={toolbar} isOpen />}
    />
  )
}
