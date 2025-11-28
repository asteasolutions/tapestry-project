import { createDraft, Objectish, Patch } from 'immer'
import { compact, get, isEmpty, isEqual, isObjectLike, last, pick } from 'lodash-es'
import { Path, PickFromOptional, ValueAtPath, ValuesOf } from 'tapestry-core/src/type-utils.js'
import { Mutator, Transformer } from '../events/mutator.js'
import { ChangeEvent, Observable } from '../events/observable.js'

function normalizePath(path: (string | number)[]) {
  return path.length === 0 ? '/' : `/${path.join('/')}/`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SubscriberCallback<V = any> = (value: V, patches: Patch[], inversePatches: Patch[]) => void

interface Subscriber {
  path: string[]
  fields?: string[]
  strPaths: string[]
  callback: SubscriberCallback
}

interface TransformerParams<T extends Objectish> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: Store<T, any>
  mutator: Mutator<T, TransformerParams<T>>
}

export type StoreMutationCommand<T extends Objectish> = Transformer<T, TransformerParams<T>>

export type MaybeCommand<T extends Objectish> = StoreMutationCommand<T> | null | false | undefined

export type UndoOperation = 'undo' | 'redo'

export type UndoStackPatchHandler = (patches: Patch[], operation: UndoOperation) => void

export interface DispatchOptions {
  source: 'user' | 'server' | UndoOperation
}

export type StoreAlias = Record<string, Objectish>

// A Store can only be aliased to a supertype.
export type ValidStoreAlias<T extends Objectish, A extends StoreAlias> = {
  [K in keyof A & string]: T extends A[K] ? A[K] : never
}

export interface UndoStackState {
  canUndo: boolean
  canRedo: boolean
}

export type UndoStackClass<T> = new (model: T, applyPatches: UndoStackPatchHandler) => UndoStack<T>

export interface UndoStack<T> extends Observable<UndoStackState> {
  undo(): void
  redo(): void
  reset(): void
  handleChange(value: T, patches: Patch[], inversePatches: Patch[], opts: DispatchOptions): void
}

interface UndoStackClassOption<T> {
  isActive: (state: T) => boolean
  UndoStackClass: UndoStackClass<T>
}

interface UndoStackOption<T> {
  isActive: (state: T) => boolean
  undoStack: UndoStack<T>
}

class UndoStacksWrapper<T> extends Observable<UndoStackState> implements UndoStack<T> {
  private undoStacks: UndoStackOption<T>[]
  private activeUndoStack: UndoStack<T> | undefined

  constructor(
    undoStackOptions: UndoStackClassOption<T>[],
    ...args: ConstructorParameters<UndoStackClass<T>>
  ) {
    super({ canUndo: false, canRedo: false })
    this.undoStacks = undoStackOptions.map(({ isActive, UndoStackClass }) => ({
      isActive,
      undoStack: new UndoStackClass(...args),
    }))
    this.pickActiveUndoStack(args[0])
  }

  undo() {
    this.activeUndoStack?.undo()
  }

  redo() {
    this.activeUndoStack?.redo()
  }

  reset() {
    this.undoStacks.forEach(({ undoStack }) => undoStack.reset())
  }

  handleChange(value: T, patches: Patch[], inversePatches: Patch[], opts: DispatchOptions) {
    this.undoStacks.forEach(({ undoStack }) =>
      undoStack.handleChange(value, patches, inversePatches, opts),
    )
    this.pickActiveUndoStack(value)
  }

  private pickActiveUndoStack(model: T) {
    const previouslyActiveUndoStack = this.activeUndoStack
    this.activeUndoStack = this.undoStacks.find((opt) => opt.isActive(model))?.undoStack
    if (previouslyActiveUndoStack !== this.activeUndoStack) {
      previouslyActiveUndoStack?.removeEventListener('change', this.onUndoStackStateChange)
      this.activeUndoStack?.addEventListener('change', this.onUndoStackStateChange)
      this.update((undoState) => {
        undoState.canUndo = this.activeUndoStack?.value.canUndo ?? false
        undoState.canRedo = this.activeUndoStack?.value.canRedo ?? false
      })
    }
  }

  private onUndoStackStateChange = (event: ChangeEvent<UndoStackState>) => {
    this.update(() => createDraft(event.detail.value))
  }
}

export class Store<T extends Objectish, Alias extends StoreAlias = never> {
  private value: Readonly<T>
  private subscribers: Subscriber[] = []

  private readonly mutator: Mutator<T, TransformerParams<T>, DispatchOptions>

  public readonly undoStack: UndoStack<T>

  constructor(initialValue: T, undoStackOptions: UndoStackClassOption<T>[]) {
    this.value = initialValue

    this.mutator = new Mutator(
      () => this.value,
      (value, patches, inversePatches, opts) => {
        this.value = value
        this.notify(patches, inversePatches)
        const source = opts?.source ?? 'user'
        this.undoStack.handleChange(value, patches, inversePatches, { ...opts, source })
      },
      () => ({ store: this, mutator: this.mutator }),
    )

    this.undoStack = new UndoStacksWrapper(undoStackOptions, initialValue, (patches, op) => {
      this.mutator.updateWithPatches(patches, { source: op })
    })
  }

  as<K extends keyof Alias>(_alias: K) {
    // XXX: At this point, this is just a hack to avoid TS problems. The use case it handles is the following:
    // Say we have a base model `A` and an extended model `B extends A` that adds additional properties to `A`.
    // If we had a `Store<B>` and wanted to treat it as if it were `Store<A>` (say, in a reusable React component
    // like the Tapestry components defined in this package), this would introduce a lot of generics and type
    // complexities. This method basically allows to cast `Store<B>` directly and work with it as if it were `Store<A>`.
    // This cast swipes under the rug all runtime problems that could arise if, say, B not only adds but also alters
    // properties of A. For now we just assume that we won't have such cases. In the future we may add specific logic
    // that creates a proper wrapper around `Store<B>` and makes sure it can properly be treated as `Store<A>` by
    // translating `Store<A>` mutation commands to `Store<B>` commands, etc.
    return this as unknown as Store<ValuesOf<ValidStoreAlias<T, Alias>>, never>
  }

  subscribe(callback: SubscriberCallback<T>): void
  subscribe<P extends Path<T>>(
    path: P | undefined,
    callback: SubscriberCallback<ValueAtPath<T, P>>,
  ): void
  subscribe<const K extends keyof T>(
    fields: K[] | undefined,
    callback: SubscriberCallback<Pick<T, K>>,
  ): void
  subscribe<P extends Path<T>, const K extends keyof NonNullable<ValueAtPath<T, P>>>(
    path: P | undefined,
    fields: K[] | undefined,
    callback: SubscriberCallback<PickFromOptional<ValueAtPath<T, P>, K>>,
  ): void
  subscribe(
    arg0?: string | string[] | SubscriberCallback,
    arg1?: string[] | SubscriberCallback,
    arg2?: SubscriberCallback,
  ) {
    let path: string[] = []
    let fields: string[] | undefined = undefined
    let callback: SubscriberCallback
    if (typeof arg0 === 'function') {
      callback = arg0
    } else if (typeof arg1 === 'function') {
      callback = arg1
      if (typeof arg0 === 'string') {
        path = arg0.split('.')
      } else {
        fields = arg0
      }
    } else {
      callback = arg2!
      if (arg0) {
        path = (arg0 as string).split('.')
      }
      fields = arg1
    }

    this.subscribers.push({
      path,
      fields,
      callback,
      strPaths: fields?.map((f) => normalizePath([...path, f])) ?? [normalizePath(path)],
    })
  }

  unsubscribe(callback: SubscriberCallback) {
    this.subscribers = this.subscribers.filter(({ callback: cb }) => cb !== callback)
  }

  get(): T
  get<P extends Path<T>>(path?: P): ValueAtPath<T, P>
  get<const K extends keyof T>(fields?: K[]): Pick<T, K>
  get<P extends Path<T>, const K extends keyof NonNullable<ValueAtPath<T, P>>>(
    path?: P,
    fields?: K[],
  ): PickFromOptional<ValueAtPath<T, P>, K>
  get(arg0?: string | string[], arg1?: string[]) {
    const path = typeof arg0 === 'string' ? arg0 : undefined

    const fields = arg1 ?? (Array.isArray(arg0) ? arg0 : undefined)

    if (!path && !fields) return this.value

    const value = this.mutator.draft ?? this.value
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const valueAtPath = path ? get(value, path) : value

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return fields ? pick(valueAtPath, fields) : valueAtPath
  }

  dispatch(command: MaybeCommand<T>, opts?: DispatchOptions): void
  dispatch(...commands: MaybeCommand<T>[]): void
  dispatch(...commands: [...MaybeCommand<T>[], DispatchOptions]): void
  dispatch(...commandsOrOpts: (MaybeCommand<T> | DispatchOptions)[]) {
    const hasOptions = isObjectLike(last(commandsOrOpts))
    const opts = hasOptions ? (last(commandsOrOpts) as DispatchOptions) : undefined
    const commands = (
      hasOptions ? commandsOrOpts.slice(0, -1) : commandsOrOpts
    ) as MaybeCommand<T>[]

    this.mutator.update(compact(commands), opts)
  }

  private isRelatedPatch(path: string[], fields?: string[]) {
    return (patch: Patch) => {
      let i = 0
      while (i < path.length) {
        if (path[i] !== `${patch.path[i]}`) return false
        i += 1
      }

      return !fields || fields.includes(`${patch.path[i]}`)
    }
  }

  private notify(patches: Patch[], inversePatches: Patch[]) {
    // Filter out the patches that replace a value with an identical value and obtain the paths of the remaining ones.
    const changedPaths = patches
      .filter(
        (patch) =>
          patch.op !== 'replace' ||
          inversePatches.every(
            (inversePatch) =>
              patch.path !== inversePatch.path || !isEqual(patch.value, inversePatch.value),
          ),
      )
      .map((patch) => `${normalizePath(patch.path)}`)

    if (isEmpty(changedPaths)) {
      return
    }

    for (const subscriber of this.subscribers) {
      if (
        subscriber.strPaths.some((strPath) =>
          changedPaths.some(
            (changedPath) => changedPath.startsWith(strPath) || strPath.startsWith(changedPath),
          ),
        )
      ) {
        const path = subscriber.path
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const value = path.length > 0 ? get(this.value, path) : this.value
        const isRelatedPatch = this.isRelatedPatch(path, subscriber.fields)
        const relatedPatches = patches
          .filter(isRelatedPatch)
          .map((p) => ({ ...p, path: p.path.slice(path.length) }))
        const relatedInversePatches = inversePatches
          .filter(isRelatedPatch)
          .map((p) => ({ ...p, path: p.path.slice(path.length) }))

        subscriber.callback(
          subscriber.fields ? pick(value, subscriber.fields) : value,
          relatedPatches,
          relatedInversePatches,
        )
      }
    }
  }
}
