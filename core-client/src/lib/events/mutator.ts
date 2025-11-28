import {
  applyPatches,
  createDraft,
  current,
  Draft,
  finishDraft,
  Objectish,
  Patch,
  isDraft,
} from 'immer'
import { isEqual } from 'lodash-es'

export type Transformer<T, C> = (value: Draft<T>, context: C) => Draft<T> | void

export class Mutator<T extends Objectish, C = never, O = never> {
  private _draft?: Draft<T>

  constructor(
    private getValue: () => T,
    private setValue: (value: T, patches: Patch[], inversePatches: Patch[], opts?: O) => void,
    private getTransformerParams: () => C,
  ) {}

  get draft() {
    return this._draft ? (current(this._draft) as T) : undefined
  }

  update(transformers: Transformer<T, C> | Transformer<T, C>[], opts?: O): void {
    if (Array.isArray(transformers) && transformers.length === 0) return

    if (Array.isArray(transformers) && transformers.length > 1) {
      return this.update(() => {
        transformers.forEach((t) => this.update(t))
      }, opts)
    }

    const transformer = Array.isArray(transformers) ? transformers[0] : transformers

    const isNested = this._draft !== undefined
    const currentValue = this.getValue()
    this._draft ??= createDraft(currentValue)
    const result = transformer(this._draft, this.getTransformerParams())
    if (result) {
      if (!isDraft(result)) {
        throw new Error('Transformer returned a non-null, non-draft result!')
      }

      this._draft = result
    }
    if (!isNested) {
      let patches: Patch[] = []
      let inversePatches: Patch[] = []
      const newValue = finishDraft(this._draft, (p, ip) => {
        patches = p
        inversePatches = ip
      }) as T
      this._draft = undefined
      if (!isEqual(newValue, currentValue)) {
        this.setValue(newValue, patches, inversePatches, opts)
      }
    }
  }

  updateWithPatches(patches: Patch[], opts?: O) {
    this.update((currentValue) => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      applyPatches(currentValue, patches)
    }, opts)
  }
}
