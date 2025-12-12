import {
  HoveredGroup,
  HoveredItem,
  HoveredMultiselection,
} from 'tapestry-core-client/src/view-model'
import { EditableItemViewModel, EditableTapestryViewModel } from '../pages/tapestry/view-model'
import { Point, Rectangle } from 'tapestry-core/src/lib/geometry'
import { ItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import {
  ItemUpdate,
  updateItem,
  updateSelectionItems,
} from '../pages/tapestry/view-model/store-commands/items'
import { Draft } from 'immer'
import { StoreMutationCommand } from 'tapestry-core-client/src/lib/store/index'
import { getBoundingRectangle, getSelectionItems } from 'tapestry-core-client/src/view-model/utils'
import { compact } from 'lodash-es'
import {
  isHoveredGroup,
  isHoveredItem,
  isHoveredMultiselection,
} from 'tapestry-core-client/src/stage/utils'

export const CURSOR_BROADCAST_PERIOD = 100

const REL_SNAP_THRESHOLD = 20

export type HoveredDragTarget = HoveredItem | HoveredMultiselection | HoveredGroup

export function isHoveredDragTarget(element?: object | null): element is HoveredDragTarget {
  return isHoveredMultiselection(element) || isHoveredGroup(element) || isHoveredItem(element)
}

export function snapToItem(pointerPosition: Point, item: ItemDto, scale: number): Point | null {
  const p: Point = {
    x: (pointerPosition.x - item.position.x) / item.size.width,
    y: (pointerPosition.y - item.position.y) / item.size.height,
  }

  const snapThresholds = {
    x: REL_SNAP_THRESHOLD / (item.size.width * scale),
    y: REL_SNAP_THRESHOLD / (item.size.height * scale),
  }

  // If the point is inside the item snap to the nearest side
  if (new Rectangle(item).contains(new Rectangle(pointerPosition, { width: 0, height: 0 }))) {
    if (Math.min(p.x, 1 - p.x) < Math.min(p.y, 1 - p.y)) {
      return { x: Math.round(p.x), y: p.y }
    }
    return { x: p.x, y: Math.round(p.y) }
  }

  let snap = false
  for (const [coord, otherCoord] of [['x', 'y'] as const, ['y', 'x'] as const]) {
    if (0 < p[otherCoord] && p[otherCoord] < 1) {
      if (
        Math.abs(p[coord]) < snapThresholds[coord] ||
        Math.abs(1 - p[coord]) < snapThresholds[coord]
      ) {
        p[coord] = Math.round(p[coord])
        snap = true
      }
    }
  }

  return snap ? p : null
}

export function snapToGrid1D(coord: number, gridSize?: number | null) {
  return !gridSize ? coord : Math.round(coord / gridSize) * gridSize
}

export function snapToGrid(point: Point, gridSize?: number | null): Point {
  return !gridSize
    ? point
    : {
        x: snapToGrid1D(point.x, gridSize),
        y: snapToGrid1D(point.y, gridSize),
      }
}

export function updateTransformTargets(
  target: HoveredItem | HoveredMultiselection | null,
  params: ItemUpdate | ((item: Draft<EditableItemViewModel>) => void),
): StoreMutationCommand<EditableTapestryViewModel> {
  return (_, { store }) => {
    if (isHoveredItem(target) && store.get('interactiveElement')?.modelId === target.modelId) {
      store.dispatch(updateItem(target.modelId, params))
    } else if (target) {
      store.dispatch(updateSelectionItems(params))
    }
  }
}

export function initDragState(
  target: HoveredItem | HoveredMultiselection,
): StoreMutationCommand<EditableTapestryViewModel> {
  return (model, { store }) => {
    store.dispatch(
      updateTransformTargets(target, (item) => {
        item.dragState = {
          initialPosition: item.dto.position,
        }
      }),
    )
    const selectionRect = getBoundingRectangle(
      isHoveredItem(target)
        ? compact([store.get(`items.${target.modelId}`)])
        : getSelectionItems(store.get(['items', 'selection'])),
    )

    model.selectionDragState = {
      initialPosition: selectionRect.position,
      position: selectionRect.position,
    }
  }
}
