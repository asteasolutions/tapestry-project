import { Multiselection } from '.'
import { useTapestryConfig } from '..'
import { GroupViewModel } from '../../../view-model'
import {
  getBoundingRectangle,
  getSelectionItems,
  isSingleGroupSelected,
  MULTISELECT_RECTANGLE_PADDING,
} from '../../../view-model/utils'
import { useMultiselectMenu } from '../../lib/hooks/use-multiselect-menu'
import { ElementToolbar } from '../element-toolbar'

export function DefaultMultiselection() {
  const { useStoreData } = useTapestryConfig()
  const { items, selection, groups } = useStoreData(['items', 'selection', 'groups'])
  const selectionItems = getSelectionItems({ items, selection })
  const selectionBounds = getBoundingRectangle(selectionItems).expand(MULTISELECT_RECTANGLE_PADDING)

  let selectedGroup: GroupViewModel | undefined
  if (isSingleGroupSelected(selection)) {
    selectedGroup = groups[[...selection.groupIds][0]]
  }
  const toolbar = useMultiselectMenu(
    selectedGroup ? ['focus', 'separator', 'presentation'] : ['focus'],
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
