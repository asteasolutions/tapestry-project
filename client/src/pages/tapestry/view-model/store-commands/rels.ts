import { BaseResourceDto } from 'tapestry-shared/src/data-transfer/resources/dtos/common'
import { RelDto } from 'tapestry-shared/src/data-transfer/resources/dtos/rel'
import { EditableRelViewModel, EditableTapestryViewModel } from '..'
import { StoreMutationCommand } from 'tapestry-core-client/src/lib/store/index'
import { Draft } from 'immer'
import { merge } from 'lodash'
import { ensureArray, OneOrMore } from 'tapestry-core/src/utils'
import { isPoint } from 'tapestry-core/src/lib/geometry'

export function setNewRelPreview(
  rel: EditableRelViewModel | null,
): StoreMutationCommand<EditableTapestryViewModel> {
  return (model) => {
    model.newRelPreview = rel
  }
}

export function applyNewRelPreview(): StoreMutationCommand<EditableTapestryViewModel> {
  return (_, { store }) => {
    const newRelPreview = store.get('newRelPreview')
    store.dispatch(
      newRelPreview?.dragState &&
        !isPoint(newRelPreview.dragState.position) &&
        addRels(structuredClone(newRelPreview)),
      setNewRelPreview(null),
    )
  }
}

export function addRels(
  rels: OneOrMore<EditableRelViewModel>,
): StoreMutationCommand<EditableTapestryViewModel> {
  return (model) => {
    ensureArray(rels).forEach((rel) => (model.rels[rel.dto.id] = rel))
  }
}

export type RelUpdate = Partial<
  Omit<EditableRelViewModel, keyof BaseResourceDto | 'dto'> & { dto: Partial<RelDto> }
>

export function updateRel(
  id: string,
  update: RelUpdate | ((rel: Draft<EditableRelViewModel>) => void),
): StoreMutationCommand<EditableTapestryViewModel> {
  return (model) => {
    if (!(id in model.rels || id === model.newRelPreview?.dto.id)) return

    const rel = model.rels[id] ?? model.newRelPreview!
    if (typeof update === 'function') {
      update(rel)
    } else {
      merge(rel, update)
    }
  }
}

export function deleteRels(
  ids: OneOrMore<string>,
): StoreMutationCommand<EditableTapestryViewModel> {
  return (model) => {
    ensureArray(ids).forEach((id) => {
      delete model.rels[id]

      if (id === model.newRelPreview?.dto.id) {
        model.newRelPreview = null
      }

      if (model.interactiveElement?.modelId === id) {
        model.interactiveElement = null
      }
    })
  }
}
