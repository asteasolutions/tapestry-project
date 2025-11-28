import { Mutator } from './mutator.js'
import { TypedEvent, TypedEventTarget } from './typed-events.js'
import { Objectish, Patch } from 'immer'

export type ChangeEvent<T> = TypedEvent<
  'change',
  { value: T; patches: Patch[]; inversePatches: Patch[] }
>

export interface SetValueOptions {
  silent?: boolean
}

export class Observable<T extends Objectish> extends TypedEventTarget<ChangeEvent<T>> {
  protected mutator = new Mutator(
    () => this._value,
    (newValue, patches, inversePatches, { silent }: SetValueOptions = {}) => {
      this._value = newValue
      if (!silent) {
        this.dispatchEvent('change', { value: this._value, patches, inversePatches })
      }
    },
    () => undefined as never,
  )

  protected update = this.mutator.update.bind(this.mutator)
  protected updateWithPatches = this.mutator.updateWithPatches.bind(this.mutator)

  constructor(private _value: T) {
    super()
  }

  get value() {
    return this._value
  }
}
