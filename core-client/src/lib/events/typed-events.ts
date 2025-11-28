export type TypedEvent<T extends string = string, D = unknown> = CustomEvent<D> & { type: T }

export type TypedEventListener<E extends TypedEvent> = E extends TypedEvent
  ? (event: E) => void
  : never

type AddOrRemoveEventListener<E extends TypedEvent> = <T extends E['type']>(
  type: T,
  listener: TypedEventListener<E & { type: T }>,
) => void

export type EventTypes<T> = T extends TypedEventTarget<infer E> ? E['type'] : never

export class TypedEventTarget<E extends TypedEvent> {
  private eventTarget = new EventTarget()

  addEventListener: AddOrRemoveEventListener<E> = (type, listener) => {
    // @ts-expect-error TypeScript correctly complains that `listener` can be invoked with an
    // arbitrary `Event` which is not assignable to `E`. However, we make sure this doesn't
    // happen by providing a custom typed implementation of `dispatchEvent` below.
    this.eventTarget.addEventListener(type, listener)
  }

  removeEventListener: AddOrRemoveEventListener<E> = (type, listener) => {
    // @ts-expect-error Same as above.
    this.eventTarget.removeEventListener(type, listener)
  }

  protected dispatchEvent<T extends E['type']>(type: T, detail: (E & { type: T })['detail']) {
    this.eventTarget.dispatchEvent(new CustomEvent(type, { detail }))
  }
}
