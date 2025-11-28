import { Draft } from 'immer'
import { EditableGroupViewModel, EditableTapestryViewModel } from '..'
import { StoreMutationCommand } from 'tapestry-core-client/src/lib/store/index'
import { GroupDto } from 'tapestry-shared/src/data-transfer/resources/dtos/group'
import { merge } from 'lodash'
import { idMapToArray } from 'tapestry-core/src/utils'
import { addToGroup, updateItem } from './items'
import { getSelectionItems } from 'tapestry-core-client/src/view-model/utils'
import { createGroupViewModel } from '../utils'
import { deletePresentationSteps } from './presentation-steps'

export function createGroup(
  group: EditableGroupViewModel,
): StoreMutationCommand<EditableTapestryViewModel> {
  return (model) => {
    model.groups[group.dto.id] = group
  }
}

export type GroupUpdate = Partial<Omit<EditableGroupViewModel, 'dto'> & { dto: Partial<GroupDto> }>

export function updateGroup(
  id: string,
  update: GroupUpdate | ((group: Draft<EditableGroupViewModel>) => void),
): StoreMutationCommand<EditableTapestryViewModel> {
  return (model) => {
    if (!(id in model.groups)) return

    const group = model.groups[id]!
    if (typeof update === 'function') {
      update(group)
    } else {
      merge(group, update)
    }
  }
}

export function deleteGroups(
  groupIds: Iterable<string>,
): StoreMutationCommand<EditableTapestryViewModel> {
  return (model, { store }) => {
    const groupIdsSet = new Set(groupIds)

    idMapToArray(store.get('items')).forEach((item) => {
      if (item.dto.groupId && groupIdsSet.has(item.dto.groupId)) {
        store.dispatch(updateItem(item.dto.id, (item) => (item.dto.groupId = null)))

        if (store.get('selection.groupIds').has(item.dto.groupId)) {
          model.selection.itemIds.add(item.dto.id)
        }
      }
    })

    store.dispatch(
      deletePresentationSteps(
        idMapToArray(model.presentationSteps)
          .filter(({ dto }) => dto.type === 'group' && groupIdsSet.has(dto.groupId))
          .map(({ dto }) => dto.id),
      ),
    )

    groupIdsSet.forEach((id) => {
      model.selection.groupIds.delete(id)
      delete model.groups[id]
    })
  }
}

export function groupSelection(): StoreMutationCommand<EditableTapestryViewModel> {
  return (model, { store }) => {
    const selectedGroupIds = [...store.get('selection.groupIds')]
    let newGroup: EditableGroupViewModel
    if (selectedGroupIds.length === 0) {
      newGroup = createGroupViewModel({
        tapestryId: store.get('id'),
        hasBackground: true,
        hasBorder: true,
      })
    } else {
      newGroup = store.get(`groups.${selectedGroupIds[0]}`)!
    }

    store.dispatch(
      deleteGroups(selectedGroupIds.filter((groupId) => groupId != newGroup.dto.id)),
      createGroup(newGroup),
      ...getSelectionItems(store.get(['items', 'selection'])).map((item) =>
        addToGroup(item.dto.id, newGroup.dto.id),
      ),
    )
    model.selection.groupIds.add(newGroup.dto.id)
  }
}

export function ungroupSelection(): StoreMutationCommand<EditableTapestryViewModel> {
  return (_, { store }) => {
    store.dispatch(deleteGroups(store.get('selection.groupIds')))
  }
}
