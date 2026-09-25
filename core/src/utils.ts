import { compact, fromPairs, isEmpty, set, zip } from 'lodash-es'
import { Id, Identifiable } from './data-format/schemas/common.js'
import {
  ACTION_ITEM_TYPES,
  ActionItemType,
  Item,
  ITEM_TYPES,
  MEDIA_ITEM_TYPES,
  MediaItem,
} from './data-format/schemas/item.js'
import { PresentationStep } from './data-format/schemas/presentation-step.js'
import { Rel } from './data-format/schemas/rel.js'
import mime from 'mime'

export function isHTTPURL(str: string | null | undefined): str is `http${string}` {
  if (!str) {
    return false
  }
  try {
    const url = new URL(str)
    return /https?:/.test(url.protocol)
  } catch {
    return false
  }
}

export function isObject(obj: unknown): obj is Record<string, unknown> {
  return !!obj && typeof obj === 'object'
}

export function isItem(obj: unknown): obj is Item {
  return (
    isObject(obj) &&
    typeof obj.id === 'string' &&
    typeof obj.type === 'string' &&
    ITEM_TYPES.includes(obj.type) &&
    isObject(obj.position) &&
    isObject(obj.size)
  )
}

export function isRel(obj: unknown): obj is Rel {
  return isObject(obj) && typeof obj.id === 'string' && isObject(obj.from) && isObject(obj.to)
}

export function isMediaItem(item: unknown): item is MediaItem {
  return isItem(item) && MEDIA_ITEM_TYPES.includes(item.type)
}

export function hasActionType<T extends { type: string }>(
  item: T,
): item is Extract<T, { type: ActionItemType }> {
  return (ACTION_ITEM_TYPES as string[]).includes(item.type)
}

export function fileExtension(name: string): [string, string | undefined] {
  const [filename, extension] = name.split(/\.(?=[^\\.]+$)/) as [string, string | undefined]
  return [filename, extension?.toLowerCase()]
}

export function transferProperty<S extends object, D extends object>(
  obj1: S,
  obj2: D,
  key: keyof S & keyof D,
) {
  set(obj1, key, obj2[key])
}

export type IdMap<T> = Partial<Record<Id, T>>

export function idMapToArray<T>(idMap: IdMap<T>): T[] {
  return Object.values(idMap) as T[]
}

export function arrayToIdMap<T extends Identifiable>(array: T[]): IdMap<T>
export function arrayToIdMap<T>(array: T[], getId: (elem: T) => Id): IdMap<T>
export function arrayToIdMap<T>(array: T[], getId?: (elem: T) => Id): IdMap<T> {
  const idGetter = typeof getId === 'function' ? getId : (x: unknown) => (x as Identifiable).id
  return Object.fromEntries(array.map((obj) => [idGetter(obj), obj]))
}

export function pickById<T>(idMap: IdMap<T>, ids: Iterable<Id>): T[] {
  return compact([...ids].map((id) => idMap[id]))
}

export type OneOrMore<T> = T | T[]
export type ExtractType<T> = T extends (infer E)[] ? E : T

export function ensureArray<T>(elem: OneOrMore<T>): T[] {
  return Array.isArray(elem) ? elem : [elem]
}

export function getCopyName(nameToCopy: string) {
  const copySuffix = / \(copy(?: (\d+))?\)$/
  let nextVersion = 0
  if (copySuffix.test(nameToCopy)) {
    const currentVersion = copySuffix.exec(nameToCopy)?.[1]
    nextVersion = currentVersion ? Number(currentVersion) + 1 : 1
    nameToCopy = nameToCopy.substring(0, nameToCopy.lastIndexOf(' ('))
  }

  return `${nameToCopy} (copy${nextVersion === 0 ? '' : ` ${nextVersion}`})`
}

export function deepFreeze<T extends object>(obj: T): T {
  for (const key of Reflect.ownKeys(obj)) {
    const value = obj[key as keyof typeof obj]
    if (typeof value === 'object') {
      deepFreeze(value as object)
    }
  }
  return Object.freeze(obj)
}

export function getPresentedModelId(presentationStep: PresentationStep) {
  return presentationStep.type === 'item' ? presentationStep.itemId : presentationStep.groupId
}

export function getPresentationSequence<P extends PresentationStep>(stepsById: IdMap<P>) {
  if (isEmpty(stepsById)) return []

  const steps = idMapToArray(stepsById)
  const supersededStepIds = new Set(steps.map(({ prevStepId }) => prevStepId))
  const finalSteps = steps.filter(({ id }) => !supersededStepIds.has(id))
  let finalStepInSequence: P
  if (finalSteps.length === 0) {
    // There is a cycle in the sequence. This shouldn't normally happen, but if it does, we fall back
    // to picking the last step by creation date and "unwinding" the cycle from there.
    finalStepInSequence = steps.at(-1)!
  } else if (finalSteps.length > 1) {
    // There are multiple disjoint sequences. We currently don't support this case, although we might in the future.
    // For now, just pick the sequence whose final step was last created.
    finalStepInSequence = finalSteps.at(-1)!
  } else {
    finalStepInSequence = finalSteps[0]
  }

  const sequence = [finalStepInSequence]
  const stepIdsInSequence = new Set([finalStepInSequence.id])
  while (sequence[0].prevStepId) {
    const { prevStepId } = sequence[0]
    if (stepIdsInSequence.has(prevStepId) || !stepsById[prevStepId]) {
      // Reference cycle or missing step!
      break
    }
    sequence.unshift(stepsById[prevStepId])
    stepIdsInSequence.add(prevStepId)
  }

  return sequence
}

export function mapIds<T extends Identifiable, U extends Identifiable>(arr1: T[], arr2: U[]) {
  return fromPairs(zip(arr1, arr2).map(([e1, e2]) => [e1!.id, e2!.id]))
}

export function determineImageFormat(url: string) {
  const mimeType = mime.getType(url)
  if (!mimeType?.startsWith('image/')) return ''

  return mimeType.split('/')[1]
}
