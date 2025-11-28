import { Patch } from 'immer'
import { Observable } from 'tapestry-core-client/src/lib/events/observable'
import {
  DispatchOptions,
  UndoOperation,
  UndoStack,
  UndoStackPatchHandler,
  UndoStackState,
} from 'tapestry-core-client/src/lib/store/index'
import { isEqual } from 'lodash'

type StackElement = Patch[]

export interface UndoStackConfig {
  batchPeriod: number
}

const MAX_STACK_SIZE = 30

function arrayStartsWith<T>(a: T[], b: T[]) {
  if (a.length < b.length) return false

  for (let i = 0; i < b.length; i += 1) {
    if (!isEqual(a[i], b[i])) return false
  }

  return true
}

function removeRedundantPatches(patches: Patch[]) {
  return patches.filter((patch, index) => {
    // A manipulation of a value is redundant if the value was replaced or removed afterwards
    for (const { op, path } of patches.slice(index + 1)) {
      if ((op === 'remove' || op === 'replace') && arrayStartsWith(patch.path, path)) {
        return false
      }
    }
    return true
  })
}

export abstract class BaseUndoStack<T> extends Observable<UndoStackState> implements UndoStack<T> {
  private stacks: Record<UndoOperation, StackElement[]> = { undo: [], redo: [] }
  private lastUserChangeTimestamp = 0

  constructor(
    protected model: T,
    private readonly applyPatches: UndoStackPatchHandler,
    private config: UndoStackConfig,
  ) {
    super({ canUndo: false, canRedo: false })
  }

  private doUndoOrRedo(operation: UndoOperation) {
    let patches: StackElement | undefined
    do {
      patches = this.stacks[operation].pop()
    } while (patches && !this.canApply(patches))

    if (patches) {
      this.applyPatches(patches, operation)
    }

    this.updateState()
  }

  undo() {
    this.doUndoOrRedo('undo')
  }

  redo() {
    this.doUndoOrRedo('redo')
  }

  reset() {
    this.stacks = { undo: [], redo: [] }
    this.updateState()
  }

  handleChange(
    model: T,
    _patches: Patch[],
    inversePatches: Patch[],
    { source }: DispatchOptions,
  ): void {
    this.model = model

    // TODO: How should we handle server updates? They change the state, but not in a way which can be undone.
    // When a state is changed due to a server response, the undo/redo patches may become unapplicable.
    if (source === 'server') return

    const newPatches = this.sanitizePatches(inversePatches)
    if (newPatches.length === 0) return

    const now = Date.now()
    const shouldBatch =
      source === 'user' &&
      this.config.batchPeriod > 0 &&
      this.stacks.undo.length > 0 &&
      now - this.lastUserChangeTimestamp < this.config.batchPeriod

    if (shouldBatch) {
      const last = this.stacks.undo.length - 1
      this.stacks.undo[last] = removeRedundantPatches([...newPatches, ...this.stacks.undo[last]])
    } else {
      const stack = this.stacks[source === 'undo' ? 'redo' : 'undo']
      stack.push(newPatches)
      if (stack.length > MAX_STACK_SIZE) {
        stack.shift()
      }
    }

    if (source === 'user') {
      this.lastUserChangeTimestamp = now
    }

    this.updateState()
  }

  private updateState() {
    this.update((state) => {
      state.canUndo = this.stacks.undo.length > 0
      state.canRedo = this.stacks.redo.length > 0
    })
  }

  protected abstract sanitizePatches(patches: Patch[]): Patch[]

  protected abstract canApply(patches: Patch[]): boolean
}
