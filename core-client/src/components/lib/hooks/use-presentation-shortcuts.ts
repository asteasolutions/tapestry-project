import { useKeyboardShortcuts } from './use-keyboard-shortcuts'
import { useTapestryConfig } from '../../tapestry'
import { getAdjacentPresentationSteps } from '../../../view-model/utils'
import {
  defaultBounceAnimation,
  focusPresentationStep,
} from '../../../view-model/store-commands/viewport'
import { useSingleGroupSelection } from './use-single-group-selection'
import { getPresentationSequence } from 'tapestry-core/src/utils'
import { mapValues } from 'lodash'

export function usePresentationShortcuts(enable = true) {
  const { useStoreData, useDispatch } = useTapestryConfig()

  const dispatch = useDispatch()
  const presentationSteps = useStoreData('presentationSteps')
  const selectedGroupId = useSingleGroupSelection()?.dto.id
  const interactiveId = useStoreData('interactiveElement.modelId') ?? selectedGroupId
  const adjacentPresentationSteps = interactiveId
    ? getAdjacentPresentationSteps(interactiveId, presentationSteps)
    : undefined

  useKeyboardShortcuts(
    enable && adjacentPresentationSteps
      ? {
          'ArrowRight | PageDown | ArrowLeft | PageUp': (e) => {
            const isNext = e.code === 'ArrowRight' || e.code === 'PageDown'
            const presentation =
              isNext && adjacentPresentationSteps.next
                ? 'next'
                : !isNext && adjacentPresentationSteps.prev
                  ? 'prev'
                  : null

            if (presentation) {
              dispatch(
                focusPresentationStep(
                  adjacentPresentationSteps[presentation]!.dto,
                  defaultBounceAnimation,
                ),
              )
            }
          },

          'Home | End': (e) => {
            const sequence = getPresentationSequence(mapValues(presentationSteps, (vm) => vm?.dto))

            const step =
              e.code === 'Home' && adjacentPresentationSteps.prev
                ? sequence[0]
                : e.code === 'End' && adjacentPresentationSteps.next
                  ? sequence[sequence.length - 1]
                  : undefined

            if (step) {
              dispatch(focusPresentationStep(step))
            }
          },
        }
      : {},
  )
}
