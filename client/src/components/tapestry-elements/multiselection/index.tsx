import { MultiselectMenu } from '../multiselect-menu'
import { useTapestryData } from '../../../pages/tapestry/tapestry-providers'
import { getSelectionItems, isSingleGroupSelected } from 'tapestry-core-client/src/view-model/utils'
import { Multiselection as BaseMultiselection } from 'tapestry-core-client/src/components/tapestry/multiselection'
import { getMultiselectRectangle } from '../../../pages/tapestry/view-model/utils'
import { ResizeHandles } from '../resize-handles'
import { EditableGroupViewModel } from '../../../pages/tapestry/view-model'

export function Multiselection() {
  const { items, selection, interactionMode, selectionResizeState, interactiveElement, groups } =
    useTapestryData([
      'items',
      'selection',
      'interactionMode',
      'selectionResizeState',
      'interactiveElement',
      'groups',
    ])
  const selectionItems = getSelectionItems({ items, selection })
  const selectionBounds = getMultiselectRectangle(selectionItems, selectionResizeState)
  const isEditMode = interactionMode === 'edit'

  let selectedGroup: EditableGroupViewModel | undefined
  if (isSingleGroupSelected(selection)) {
    selectedGroup = groups[[...selection.groupIds][0]]
  }

  return (
    <BaseMultiselection
      bounds={selectionBounds}
      style={{ pointerEvents: isEditMode ? 'auto' : 'none' }}
      halo={<MultiselectMenu selectionBounds={selectionBounds} selectedGroup={selectedGroup} />}
    >
      {isEditMode && !interactiveElement && <ResizeHandles />}
    </BaseMultiselection>
  )
}
