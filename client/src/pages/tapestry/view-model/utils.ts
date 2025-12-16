import { WritableDraft } from 'immer'
import { chunk, zip } from 'lodash-es'
import {
  getBoundingRectangle,
  MULTISELECT_RECTANGLE_PADDING,
} from 'tapestry-core-client/src/view-model/utils'
import { Point } from 'tapestry-core/src/data-format/schemas/common'
import { GroupCreateDto } from 'tapestry-shared/src/data-transfer/resources/dtos/group'
import {
  ActionButtonItemDto,
  ItemCreateDto,
  TextItemDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import {
  PresentationStepCreateDto,
  PresentationStepDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/presentation-step'
import { RelCreateDto } from 'tapestry-shared/src/data-transfer/resources/dtos/rel'
import {
  DirectionMask,
  EditableGroupViewModel,
  EditableItemViewModel,
  EditablePresentationStepViewModel,
  EditableRelViewModel,
  ItemUIComponent,
  MultiselectionUIComponent,
  SelectionResizeState,
  TapestryEditorStore,
} from '.'
import { DeserializeResult } from '../../../stage/data-transfer-handler'
import { addAndPositionItems } from './store-commands/items'
import { setIAImport, setLargeFiles, setSnackbar } from './store-commands/tapestry'

export function getMultiselectRectangle(
  selectionItems: EditableItemViewModel[],
  selectionResizeState?: SelectionResizeState | null,
) {
  return (selectionResizeState?.bounds ?? getBoundingRectangle(selectionItems)).expand(
    MULTISELECT_RECTANGLE_PADDING,
  )
}

export function uiComponentToDirectionMask(
  component: ItemUIComponent | MultiselectionUIComponent,
): DirectionMask {
  const dir = component.slice('resizeHandle'.length).toLowerCase()
  return {
    top: dir.startsWith('top'),
    right: dir.endsWith('right'),
    bottom: dir.startsWith('bottom'),
    left: dir.endsWith('left'),
  }
}

export interface GridState {
  rows: number
  cols: number
  spacing: number
  primary: 'cols' | 'rows'
}

export function getGridDimensions<T>(
  items: T[],
  { primary, rows: rowsCount, cols: colsCount }: GridState,
) {
  if (primary === 'cols') {
    const rows = chunk(items, colsCount)
    return { rows, cols: zip(...rows) }
  }
  const cols = chunk(items, rowsCount)
  return { cols, rows: zip(...cols) }
}

export function getGridIndices(ind: number, { primary, cols, rows }: GridState) {
  if (primary === 'cols') {
    return { col: ind % cols, row: Math.floor(ind / cols) }
  }
  return { row: ind % rows, col: Math.floor(ind / rows) }
}

export function createItemViewModel(itemCreate: ItemCreateDto): EditableItemViewModel {
  const now = new Date()
  const itemProps = {
    dto: {
      ...itemCreate,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      groupId: null,
    },
    hasBeenActive: true,
  }

  const type = itemProps.dto.type

  if (type === 'text') {
    return itemProps as EditableItemViewModel<TextItemDto>
  }

  if (type === 'actionButton') {
    return itemProps as EditableItemViewModel<ActionButtonItemDto>
  }

  return { ...itemProps, dto: { ...itemProps.dto, internallyHosted: false } }
}

export function createRelViewModel(relCreate: RelCreateDto): EditableRelViewModel {
  const now = new Date()
  return {
    dto: {
      ...relCreate,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    },
  }
}

export function createGroupViewModel(groupCreate: GroupCreateDto): EditableGroupViewModel {
  const now = new Date()
  return {
    dto: {
      ...groupCreate,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    },
  }
}

export function createPresentationStepViewModel(
  presentationStepCreate: PresentationStepCreateDto,
): EditablePresentationStepViewModel {
  const now = new Date()
  return {
    dto: {
      ...presentationStepCreate,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    },
  }
}

export function reassignPresentationStep(
  step: WritableDraft<PresentationStepDto>,
  targetType: PresentationStepDto['type'],
  targetId: string,
) {
  Object.assign(step, {
    type: targetType,
    [`${targetType}Id`]: targetId,
    [`${targetType === 'item' ? 'group' : 'item'}Id`]: null,
  })
}

export async function insertDataTransfer(
  dispatch: TapestryEditorStore['dispatch'],
  deserialize: () => Promise<DeserializeResult>,
  point?: Point,
) {
  try {
    dispatch((model) => {
      model.pendingRequests++
    })
    const { items, largeFiles, iaImport } = await deserialize()
    if (iaImport) {
      dispatch(setIAImport(iaImport))
      return
    }

    const viewModels = items.map(createItemViewModel)
    dispatch(
      viewModels.length !== 0 && addAndPositionItems(viewModels, { centerAt: point }),
      largeFiles.length !== 0 && setLargeFiles(largeFiles),
    )
  } catch {
    dispatch(setSnackbar({ text: 'Could not import', variant: 'error' }))
  } finally {
    dispatch((model) => {
      model.pendingRequests--
    })
  }
}
