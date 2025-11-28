import { sortBy, max, sum, merge } from 'lodash'
import { tween } from 'tapestry-core-client/src/view-model/tweening'
import { ItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { selectItems } from './tapestry'
import { BaseResourceDto } from 'tapestry-shared/src/data-transfer/resources/dtos/common'
import { EditableItemViewModel, EditableTapestryViewModel, SelectionDragState } from '..'
import { StoreMutationCommand } from 'tapestry-core-client/src/lib/store/index'
import {
  getMultiselectRectangle,
  getGridDimensions,
  getGridIndices,
  GridState,
  reassignPresentationStep,
} from '../utils'
import {
  getBoundingRectangle,
  getGroupMembers,
  getSelectionItems,
  MULTISELECT_RECTANGLE_PADDING,
  resizeItem,
} from 'tapestry-core-client/src/view-model/utils'
import { ensureArray, idMapToArray, isMediaItem, OneOrMore } from 'tapestry-core/src/utils'
import {
  mul,
  Point,
  Rectangle,
  Rectanglish,
  Size,
  translate,
  vector,
} from 'tapestry-core/src/lib/geometry'
import { Draft } from 'immer'
import { setIsZoomingLocked } from './viewport'
import { deleteGroups, ungroupSelection } from './groups'
import { deletePresentationSteps } from './presentation-steps'
import { deleteRels } from './rels'
import { itemUpload } from '../../../../services/item-upload'

export function insertItems(
  items: OneOrMore<EditableItemViewModel>,
): StoreMutationCommand<EditableTapestryViewModel> {
  items = ensureArray(items)
  return (model, { store }) => {
    if (items.length > 0) {
      store.dispatch(setIsZoomingLocked(false))
    }
    items.forEach((item) => (model.items[item.dto.id] = item))
  }
}

export interface AddItemsOptions {
  centerAt?: Point
  coordinateSystem?: 'screen' | 'tapestry'
}

export function addAndPositionItems(
  items: OneOrMore<EditableItemViewModel>,
  { centerAt, coordinateSystem = 'screen' }: AddItemsOptions = {},
): StoreMutationCommand<EditableTapestryViewModel> {
  return (_, { store }) => {
    items = ensureArray(items)

    const areAllItemsAtOrigin = items.every(
      ({ dto }) => dto.position.x === 0 && dto.position.y === 0,
    )
    if (areAllItemsAtOrigin) {
      items.forEach((item, index) => {
        item.dto.position = translate(item.dto.position, mul(index * 20, { dx: 1, dy: 1 }))
      })
    }

    const boundingRect = getBoundingRectangle(items)
    const {
      size: { width, height },
      transform: { translation, scale },
    } = store.get('viewport')

    const centerAtPoint = centerAt ?? { x: width / 2, y: height / 2 }
    const center =
      coordinateSystem === 'screen'
        ? translate(centerAtPoint, mul(-1, translation), scale)
        : centerAtPoint
    const move = vector(boundingRect.center, center)
    items.forEach((item) => {
      item.dto.position = translate(item.dto.position, move)
    })

    store.dispatch(insertItems(items), selectItems(items.map((i) => i.dto.id)))
  }
}

export type ItemUpdate = Partial<
  Omit<EditableItemViewModel, keyof BaseResourceDto | 'dto'> & { dto: Partial<ItemDto> }
>

export function updateItem(
  id: string,
  update: ItemUpdate | ((item: Draft<EditableItemViewModel>) => void),
): StoreMutationCommand<EditableTapestryViewModel> {
  return (model) => {
    if (!(id in model.items)) return

    const item = model.items[id]!
    if (typeof update === 'function') {
      update(item)
    } else {
      merge(item, update)
    }
  }
}

export function deleteItems(
  ids: OneOrMore<string>,
): StoreMutationCommand<EditableTapestryViewModel> {
  const itemIds = ensureArray(ids)
  return (model, { store }) => {
    itemIds.forEach((id) => {
      store.dispatch(removeFromGroup(id))
      const item = model.items[id]

      if (item && isMediaItem(item.dto)) {
        itemUpload.cancel(item.dto.source)
      }
      delete model.items[id]
      model.selection.itemIds.delete(id)
      if (id === model.outlinedItemId) {
        delete model.outlinedItemId
      }
    })

    const { newRelPreview } = model

    store.dispatch(
      deleteRels(
        idMapToArray({
          ...model.rels,
          ...(newRelPreview ? { [newRelPreview.dto.id]: newRelPreview } : {}),
        })
          .filter(({ dto }) => itemIds.includes(dto.from.itemId) || itemIds.includes(dto.to.itemId))
          .map(({ dto }) => dto.id),
      ),
      deletePresentationSteps(
        idMapToArray(model.presentationSteps)
          .filter(({ dto }) => dto.type === 'item' && itemIds.includes(dto.itemId))
          .map(({ dto }) => dto.id),
      ),
    )

    model.interactiveElement = null
  }
}

export function deleteSelectionItems(): StoreMutationCommand<EditableTapestryViewModel> {
  return (_, { store }) => {
    store.dispatch(
      ungroupSelection(),
      deleteItems(getSelectionItems(store.get(['items', 'selection'])).map((item) => item.dto.id)),
    )
  }
}

export function updateSelectionItems(
  params: ItemUpdate | ((item: Draft<EditableItemViewModel>) => void),
): StoreMutationCommand<EditableTapestryViewModel> {
  return (_, { store }) => {
    const selectionItemIds = getSelectionItems(store.get(['items', 'selection'])).map(
      (item) => item.dto.id,
    )
    const updateItemCommands = [...selectionItemIds].map((id) => updateItem(id, params))
    store.dispatch(...updateItemCommands)
  }
}

export function updateSelectionDragState(
  position: SelectionDragState['position'],
): StoreMutationCommand<EditableTapestryViewModel> {
  return (model) => {
    if (model.selectionDragState) {
      model.selectionDragState.position = position
    }
  }
}

export function arrangeItems(
  grid: GridState,
  preview: boolean,
): StoreMutationCommand<EditableTapestryViewModel> {
  return (_, { store }) => {
    const { items, selection } = store.get(['items', 'selection'])
    const selectionItems = getSelectionItems({ items, selection })

    const selectionElements: (Rectanglish & { id: string })[] = [
      ...selectionItems
        .filter((item) => !item.dto.groupId)
        .map((item) => ({
          position: item.dto.position,
          size: item.dto.size,
          id: item.dto.id,
        })),
      ...[...selection.groupIds].map((groupId) => ({
        ...getMultiselectRectangle(getGroupMembers(groupId, idMapToArray(items))),
        id: groupId,
      })),
    ]

    const rect = getMultiselectRectangle(selectionItems)
    const sorted = sortBy(
      selectionElements,
      grid.primary === 'cols' ? ['position.y', 'position.x'] : ['position.x', 'position.y'],
    )
    const { cols, rows } = getGridDimensions(sorted, grid)

    const rowHeights = rows.map((elements) => max(elements.map((e) => e?.size.height)))
    const colWidths = cols.map((elements) => max(elements.map((e) => e?.size.width)))
    const offsetX =
      rect.left +
      MULTISELECT_RECTANGLE_PADDING +
      (rect.width -
        (sum(colWidths) +
          (colWidths.length - 1) * grid.spacing +
          MULTISELECT_RECTANGLE_PADDING * 2)) /
        2
    const offsetY =
      rect.top +
      MULTISELECT_RECTANGLE_PADDING +
      (rect.height -
        (sum(rowHeights) +
          (rowHeights.length - 1) * grid.spacing +
          MULTISELECT_RECTANGLE_PADDING * 2)) /
        2

    selectionItems.forEach(({ dto: { id, size, position, groupId }, previewBounds }) => {
      const startX = preview ? (previewBounds?.left ?? position.x) : position.x
      const startY = preview ? (previewBounds?.top ?? position.y) : position.y

      const ind = sorted.findIndex((e) => e.id === (groupId ?? id))
      const { col, row } = getGridIndices(ind, grid)

      let toX = sum(colWidths.slice(0, col)) + grid.spacing * col + offsetX
      let toY = sum(rowHeights.slice(0, row)) + grid.spacing * row + offsetY

      if (groupId) {
        toX += position.x - sorted[ind].position.x
        toY += position.y - sorted[ind].position.y
      }

      tween({ x: startX, y: startY }, { x: toX, y: toY }, (pos) => {
        store.dispatch(
          updateItem(
            id,
            preview ? { previewBounds: new Rectangle(pos, size) } : { dto: { position: pos } },
          ),
        )
      })
    })
  }
}

export function clearItemPreviews(): StoreMutationCommand<EditableTapestryViewModel> {
  return (model) => {
    for (const id in model.items) {
      model.items[id]!.previewBounds = undefined
    }
  }
}

export function copyItemSize(size: Size): StoreMutationCommand<EditableTapestryViewModel> {
  return (model) => {
    model.copiedItemSize = size
  }
}

export function pasteItemSize(itemId: string): StoreMutationCommand<EditableTapestryViewModel> {
  return (_, { store }) => {
    const size = store.get('copiedItemSize')
    if (!size) return

    store.dispatch(
      updateItem(itemId, (item) => {
        item.dto.size = resizeItem(item.dto, size)
      }),
    )
  }
}

export function addToGroup(
  itemId: string,
  groupId: string,
): StoreMutationCommand<EditableTapestryViewModel> {
  return (model, { store }) => {
    if (!store.get(`groups.${groupId}`)) {
      return
    }

    model.selection.itemIds.delete(itemId)
    store.dispatch(
      updateItem(itemId, (item) => {
        item.dto.groupId = groupId
      }),
    )

    const presentationSteps = idMapToArray(store.get('presentationSteps'))
    const itemPresentationStep = presentationSteps.find(
      ({ dto }) => dto.type === 'item' && dto.itemId === itemId,
    )
    if (itemPresentationStep) {
      const groupPresentationStep = presentationSteps.find(
        ({ dto }) => dto.type === 'group' && dto.groupId === groupId,
      )
      if (groupPresentationStep) {
        // If the group is already a part of the presentation, just remove the item from the presentation
        store.dispatch(deletePresentationSteps(itemPresentationStep.dto.id))
      } else {
        // Otherwise, insert the group in the presentation in place of the item.
        reassignPresentationStep(
          model.presentationSteps[itemPresentationStep.dto.id]!.dto,
          'group',
          groupId,
        )
      }
    }
  }
}

export function removeFromGroup(itemId: string): StoreMutationCommand<EditableTapestryViewModel> {
  return (model, { store }) => {
    const item = store.get(`items.${itemId}.dto`)

    if (!item?.groupId) {
      return
    }

    const groupMembers = getGroupMembers(item.groupId, idMapToArray(store.get('items')))
    if (groupMembers.length <= 2) {
      store.dispatch(deleteGroups([item.groupId]))
    } else {
      if (store.get('selection.groupIds').has(item.groupId)) {
        model.selection.itemIds.add(item.id)
      }
      store.dispatch(
        updateItem(itemId, (item) => {
          item.dto.groupId = null
        }),
      )
    }
  }
}
