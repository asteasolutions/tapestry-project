import { isEmpty, merge } from 'lodash'
import { OneOrMore, pickById, ensureArray, idMapToArray } from 'tapestry-core/src/utils'
import { EditablePresentationStepViewModel, EditableTapestryViewModel } from '..'
import { StoreMutationCommand } from 'tapestry-core-client/src/lib/store/index'
import {
  PresentationStepCreateDto,
  PresentationStepDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/presentation-step'
import { createPresentationStepViewModel } from '../utils'

export function deletePresentationSteps(
  ids: OneOrMore<string>,
): StoreMutationCommand<EditableTapestryViewModel> {
  return (model) => {
    if (isEmpty(model.presentationSteps)) return

    pickById(model.presentationSteps, ensureArray(ids)).forEach(({ dto }) => {
      for (const otherStep of idMapToArray(model.presentationSteps)) {
        if (otherStep.dto.prevStepId === dto.id) {
          otherStep.dto.prevStepId = dto.prevStepId
        }
      }
      delete model.presentationSteps[dto.id]
    })
  }
}

function isStepDto(
  arg: PresentationStepDto | PresentationStepCreateDto,
): arg is PresentationStepDto {
  return !!(arg as PresentationStepDto).id
}

export function createPresentationStep({
  dto,
}: {
  dto: PresentationStepCreateDto | PresentationStepDto
}): StoreMutationCommand<EditableTapestryViewModel> {
  return (model) => {
    const viewModel: EditablePresentationStepViewModel = isStepDto(dto)
      ? { dto }
      : createPresentationStepViewModel(dto)

    model.presentationSteps[viewModel.dto.id] = viewModel
  }
}

export function updatePresentationStep(
  id: string,
  update: { dto: PresentationStepDto },
): StoreMutationCommand<EditableTapestryViewModel> {
  return (model) => {
    if (!(id in model.presentationSteps)) return

    merge(model.presentationSteps[id], update)
  }
}
