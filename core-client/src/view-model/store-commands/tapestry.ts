import { Rectangle, DirectionalOffsets } from 'tapestry-core/src/lib/geometry.js'
import {
  TapestryElementRef,
  PointerInteraction,
  PointerMode,
  TapestryViewModel,
  SnackbarData,
} from '../index.js'
import { StoreMutationCommand } from '../../lib/store/index.js'
import { isItemInSelection } from '../utils.js'
import { idMapToArray } from 'tapestry-core/src/utils.js'

export function setInteractiveElement(
  element: TapestryElementRef | null,
): StoreMutationCommand<TapestryViewModel> {
  return (model, { store }) => {
    if (element?.modelType === 'item') {
      store.dispatch(selectItem(element.modelId))
      model.items[element.modelId]!.hasBeenActive = true
    } else if (element) {
      model.selection = {
        itemIds: new Set(),
        groupIds: new Set(),
      }
    }
    model.interactiveElement = element
  }
}

export function selectGroups(ids: string[]): StoreMutationCommand<TapestryViewModel> {
  return (model) => {
    model.selection = {
      itemIds: new Set(),
      groupIds: new Set(ids),
    }
    model.interactiveElement = null
  }
}

export function selectItems(ids: string[]): StoreMutationCommand<TapestryViewModel> {
  return (model, { store }) => {
    const itemIdsToSelect = new Set<string>()
    const groupIdsToSelect = new Set<string>()
    const items = store.get('items')

    ids.forEach((id) => {
      const itemId = items[id]?.dto.id
      const groupId = items[id]?.dto.groupId
      if (groupId) {
        groupIdsToSelect.add(groupId)
      } else if (itemId) {
        itemIdsToSelect.add(itemId)
      }
    })

    model.selection = {
      itemIds: itemIdsToSelect,
      groupIds: groupIdsToSelect,
    }
    model.interactiveElement = null
  }
}

export function selectItem(id: string | null): StoreMutationCommand<TapestryViewModel> {
  return (_, { store }) => {
    store.dispatch(selectItems(id ? [id] : []))
  }
}

export function selectAll(): StoreMutationCommand<TapestryViewModel> {
  return (_, { store }) => {
    store.dispatch(selectItems(Object.keys(store.get('items'))))
  }
}

export function deselectAll(): StoreMutationCommand<TapestryViewModel> {
  return (_, { store }) => {
    store.dispatch(selectItems([]))
  }
}

function setPointerSelection(rect: Rectangle | null): StoreMutationCommand<TapestryViewModel> {
  return (model) => {
    model.pointerSelection = rect ? { rect } : null
  }
}

export function setSelectionRect(rect: Rectangle | null): StoreMutationCommand<TapestryViewModel> {
  return (_, { store }) => {
    if (!rect) {
      store.dispatch(setPointerSelection(null))
    } else {
      const pointerSelectionItemIds = idMapToArray(store.get('items'))
        .filter(({ dto }) => rect.intersects(new Rectangle(dto)))
        .map((i) => i.dto.id)

      store.dispatch(setPointerSelection(rect), selectItems(pointerSelectionItemIds))
    }
  }
}

export function toggleItemSelection(id: string): StoreMutationCommand<TapestryViewModel> {
  return (model, { store }) => {
    const items = store.get('items')
    const isInSelection = isItemInSelection(items[id], store.get('selection'))

    const shouldBeInSelection = !isInSelection
    const groupId = items[id]?.dto.groupId

    if (shouldBeInSelection) {
      if (groupId) {
        model.selection.groupIds.add(groupId)
      } else {
        model.selection.itemIds.add(id)
      }
    } else {
      if (groupId) {
        model.selection.groupIds.delete(groupId)
      } else {
        model.selection.itemIds.delete(id)
      }
    }

    model.interactiveElement = null
  }
}

export function toggleGroupSelection(id: string): StoreMutationCommand<TapestryViewModel> {
  return (model) => {
    if (model.selection.groupIds.has(id)) {
      model.selection.groupIds.delete(id)
    } else {
      model.selection.groupIds.add(id)
    }

    model.interactiveElement = null
  }
}

export function setPointerInteraction(
  action: PointerInteraction['action'] | null,
  target?: PointerInteraction['target'],
  constrainToLayer?: PointerInteraction['constrainToLayer'],
): StoreMutationCommand<TapestryViewModel> {
  return (model) => {
    model.pointerInteraction = action
      ? {
          action,
          target,
          constrainToLayer,
        }
      : null
  }
}

export function setPointerMode(mode: PointerMode): StoreMutationCommand<TapestryViewModel> {
  return (model) => {
    model.pointerMode = mode
  }
}

export function setSnackbar(
  snackbarData?: SnackbarData | string,
): StoreMutationCommand<TapestryViewModel> {
  return (model) => {
    model.snackbarData = typeof snackbarData === 'string' ? { text: snackbarData } : snackbarData
  }
}

export function addFocusRectInset(
  id: string,
  inset: DirectionalOffsets,
): StoreMutationCommand<TapestryViewModel> {
  return (model) => {
    model.viewport.focusRectInsets[id] = inset
  }
}

export function removeFocusRectInset(id: string): StoreMutationCommand<TapestryViewModel> {
  return (model) => {
    delete model.viewport.focusRectInsets[id]
  }
}

export function setSearchTerm(searchTerm: string | null): StoreMutationCommand<TapestryViewModel> {
  return (model) => {
    model.searchTerm = searchTerm
  }
}

export function toggleOutline(id: string | null): StoreMutationCommand<TapestryViewModel> {
  return (model) => {
    if (!id || model.outlinedItemId === id) {
      delete model.outlinedItemId
    } else {
      model.outlinedItemId = id
    }
  }
}

export function setSidePane(
  displaySidePane: string | null,
  toggle = false,
): StoreMutationCommand<TapestryViewModel> {
  return (model) => {
    model.displaySidePane =
      toggle && displaySidePane === model.displaySidePane ? null : displaySidePane
  }
}
