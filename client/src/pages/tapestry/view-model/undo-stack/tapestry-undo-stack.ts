import { Patch, produce } from 'immer'
import { BaseUndoStack } from '.'
import { compact } from 'lodash'
import { isItemViewModel, isRelViewModel } from 'tapestry-core-client/src/view-model/utils'
import { GroupViewModel } from 'tapestry-core-client/src/view-model'
import { EditableTapestryElementViewModel, EditableTapestryViewModel } from '..'
import { UndoStackPatchHandler } from 'tapestry-core-client/src/lib/store/index'

function sanitizeViewModel(model: EditableTapestryElementViewModel | GroupViewModel) {
  return produce(model, (draft) => {
    if (isItemViewModel(draft)) {
      draft.dragState = undefined
      draft.previewBounds = undefined
      draft.resizeState = undefined
    } else if (isRelViewModel(draft)) {
      draft.dragState = undefined
    }
  })
}

export class TapestryUndoStack extends BaseUndoStack<EditableTapestryViewModel> {
  constructor(model: EditableTapestryViewModel, applyPatches: UndoStackPatchHandler) {
    super(model, applyPatches, { batchPeriod: 200 })
  }

  protected sanitizePatches(patches: Patch[]): Patch[] {
    return compact(
      patches.map((patch) => {
        // Ignore patches unrelated to items, groups or rels
        if (!['items', 'rels', 'groups'].includes(patch.path[0] as string)) return

        // When adding, deleting, or replacing items, groups or rels, sanitize the view model.
        if (patch.path.length === 2) {
          return {
            ...patch,
            value: patch.value
              ? sanitizeViewModel(patch.value as EditableTapestryElementViewModel | GroupViewModel)
              : undefined,
          }
        }

        // When modifying item, group or rel DTOs with paths like ["items", <id>, "dto", ...], accept the patch as-is
        if (patch.path[2] === 'dto') {
          return patch
        }
      }),
    )
  }

  protected canApply(_patches: Patch[]): boolean {
    // TODO: We will probably need more sophisticated conflict resolution when we start fetching updates from the server.
    return true
  }
}
