import { Patch } from 'immer'
import { get } from 'lodash-es'

/**
 * Gets the new value which will be applied at the given path by the given patch, or `undefined` if the patch
 * doesn't affect that path. "*" can be used as a wildcard in the path. For example:
 *
 *    getNewValueFromPatch<string>(patch, ['items', '*', 'dto', 'title'])
 *
 * will return the new value for the item title which this patch would apply, assuming the patch changes the
 * title of an item.
 */
export function getNewValueFromPatch<T>(patch: Patch, path: string[]): T | undefined {
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
export function getPatchedPathSegment(patch: Patch, path: string[]): string | undefined {
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
