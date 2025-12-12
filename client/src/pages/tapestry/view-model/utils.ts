import { Patch, WritableDraft } from 'immer'
import { chunk, zip } from 'lodash-es'
import {
  getBoundingRectangle,
  MULTISELECT_RECTANGLE_PADDING,
} from 'tapestry-core-client/src/view-model/utils'
import { Identifiable } from 'tapestry-core/src/data-format/schemas/common'
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
import { TapestryDto } from 'tapestry-shared/src/data-transfer/resources/dtos/tapestry'
import {
  DirectionMask,
  EditableGroupViewModel,
  EditableItemViewModel,
  EditablePresentationStepViewModel,
  EditableRelViewModel,
  ItemUIComponent,
  MultiselectionUIComponent,
  SelectionResizeState,
} from '.'
import { EDITABLE_TAPESTRY_PROPS } from '../../../model/data/utils'

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

type PatchSource = Identifiable[] | undefined | null

const updatePatches = (from: PatchSource, to: PatchSource, path: string) =>
  to?.reduce<Patch[]>((acc, item) => {
    if (from?.find((i) => i.id === item.id)) {
      acc.push({ op: 'replace', path: [path, item.id], value: item })
    }
    return acc
  }, []) ?? []

const removePatches = (from: PatchSource, to: PatchSource, path: string) =>
  from?.reduce<Patch[]>((acc, item) => {
    if (!to?.find((i) => i.id === item.id)) {
      acc.push({ op: 'remove', path: [path, item.id] })
    }
    return acc
  }, []) ?? []

const addPatches = (from: PatchSource, to: PatchSource, path: string) =>
  to?.reduce<Patch[]>((acc, item) => {
    if (!from?.find((i) => i.id === item.id)) {
      acc.push({ op: 'add', path: [path, item.id], value: item })
    }
    return acc
  }, []) ?? []

export function diffTapestryDtos(from: TapestryDto, to: TapestryDto): Patch[] {
  const tapestryId = from.id
  const tapestryPatches = EDITABLE_TAPESTRY_PROPS.map(
    (prop): Patch => ({
      op: 'replace',
      path: ['tapestries', tapestryId, prop],
      value: to[prop],
    }),
  )

  return [
    ...tapestryPatches,
    ...(['items', 'rels', 'groups'] as const).flatMap((path) => [
      ...updatePatches(from[path], to[path], path),
      ...removePatches(from[path], to[path], path),
      ...addPatches(from[path], to[path], path),
    ]),
  ]
}

export function diffPresentationSteps(from: PresentationStepDto[], to: PresentationStepDto[]) {
  return [
    ...updatePatches(from, to, 'presentationSteps'),
    ...removePatches(from, to, 'presentationSteps'),
    ...addPatches(from, to, 'presentationSteps'),
  ]
}
