import { Patch } from 'immer'
import { BaseUndoStack } from '.'
import { EditableTapestryViewModel } from '..'
import { compact, get } from 'lodash-es'
import { UndoStackPatchHandler } from 'tapestry-core-client/src/lib/store/index'

/**
 * Gets the new value which will be applied at the given path by the given patch, or `undefined` if the patch
 * doesn't affect that path. "*" can be used as a wildcard in the path. For example:
 *
 *    getNewValueFromPatch<string>(patch, ['items', '*', 'dto', 'title'])
 *
 * will return the new value for the item title which this patch would apply, assuming the patch changes the
 * title of an item.
 */
function getNewValueFromPatch<T>(patch: Patch, path: string[]): T | undefined {
  if (path.length < patch.path.length || patch.op === 'remove') {
    return
  }

  for (let i = 0; i < patch.path.length; i += 1) {
    if (path[i] !== '*' && path[i] !== patch.path[i]) {
      // The patch modifies something which is unrelated to the requested path
      return
    }
  }

  return (
    path.length === patch.path.length
      ? patch.value
      : get(patch.value, path.slice(patch.path.length))
  ) as T | undefined
}

/**
 * Finds the actual value of a designated path segment ("^") which denotes an object that will be modified by the given
 * patch. For example, assuming a path structure of ['items', <id>, 'dto', <itemField>], the invocation
 *
 *   ```getPatchedPathSegment(patch, ['items', '^', 'dto', 'position'])```
 *
 * will return the <id> of the item which position is being modified by the given patch, or `undefined` if the patch
 * doesn't modify an item's position.
 */
function getPatchedPathSegment(patch: Patch, path: string[]): string | undefined {
  let segment: string | undefined
  for (let i = 0; i < Math.min(path.length, patch.path.length); i += 1) {
    if (path[i] === '^') {
      segment = `${patch.path[i]}`
    } else if (path[i] !== patch.path[i]) {
      return
    }
  }

  if (patch.path.length === path.indexOf('^') + 1 && patch.op === 'add') {
    // This is a specific case where the target value is being added by the patch. We don't consider it "patched"
    // in this case, because it is a brand new value.
    return
  }

  return segment
}

export class PresentationOrderUndoStack extends BaseUndoStack<EditableTapestryViewModel> {
  constructor(model: EditableTapestryViewModel, applyPatches: UndoStackPatchHandler) {
    super(model, applyPatches, { batchPeriod: 0 })
  }

  protected sanitizePatches(patches: Patch[]): Patch[] {
    return patches.filter(({ path }) => path[0] === 'presentationSteps')
  }

  protected canApply(patches: Patch[]): boolean {
    const newPresentationStepIds = patches
      .filter((patch) => patch.op === 'add' && patch.path.length === 2)
      .map(({ path }) => path[1])

    const referredPresentationStepIds = compact([
      ...patches.map((patch) => getPatchedPathSegment(patch, ['presentationSteps', '^'])),
      ...patches.map((patch) =>
        getNewValueFromPatch<string>(patch, ['presentationSteps', '*', 'dto', 'prevStepId']),
      ),
    ])

    // XXX: This expression doesn't handle the case where the whole `presentationSteps` ID map is replaced.
    const referredItemIds = compact(
      patches.map((patch) =>
        getNewValueFromPatch<string>(patch, ['presentationSteps', '*', 'dto', 'itemId']),
      ),
    )

    const referredGroupIds = compact(
      patches.map((patch) =>
        getNewValueFromPatch<string>(patch, ['presentationSteps', '*', 'dto', 'groupId']),
      ),
    )

    return (
      referredPresentationStepIds.every(
        (id) => id in this.model.presentationSteps || newPresentationStepIds.includes(id),
      ) &&
      referredItemIds.every((id) => id in this.model.items) &&
      referredGroupIds.every((id) => id in this.model.groups)
    )
  }
}
