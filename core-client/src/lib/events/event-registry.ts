import { get, isArray, uniqueId } from 'lodash-es'
import { TypedEvent, TypedEventTarget } from './typed-events.js'

type EventListenersMap<EventCategory extends string, M extends string = never> = Map<
  string,
  Map<
    EventCategory,
    {
      events: Map<
        string,
        { listener: EventListener; options?: AddEventListenerOptions; modes?: M[] | null }[]
      >
    }
  >
>

interface WithInstanceId {
  _instanceId?: string
}

export function createEventRegistry<
  EventTypesPerCategory extends Record<string, string>,
  Mode extends string = never,
>() {
  type EventCategory = keyof EventTypesPerCategory & string
  const eventListenersPerInstance: EventListenersMap<EventCategory, Mode> = new Map()

  function eventListener<T extends EventCategory, E extends EventTypesPerCategory[T]>(
    eventTarget: T,
    eventName: E,
    modes?: Mode[] | null,
    options?: AddEventListenerOptions,
  ) {
    return function (_method: CallableFunction, context: ClassMethodDecoratorContext) {
      context.addInitializer(function (this) {
        const thisWithInstanceId = this as WithInstanceId
        thisWithInstanceId._instanceId ??= uniqueId('instance-id-')
        if (!eventListenersPerInstance.has(thisWithInstanceId._instanceId)) {
          eventListenersPerInstance.set(thisWithInstanceId._instanceId, new Map())
        }
        const eventListeners = eventListenersPerInstance.get(thisWithInstanceId._instanceId)!
        if (!eventListeners.has(eventTarget)) {
          eventListeners.set(eventTarget, { events: new Map() })
        }
        const listeners = eventListeners.get(eventTarget)!
        if (!listeners.events.get(eventName)) {
          listeners.events.set(eventName, [])
        }
        // In case of inheritance, here `method` could be different from `this[context.name]` as the corresponding
        // event listener method may have been overridden in a descendant. In order to allow event listener
        // overriding, we take `this[context.name]` here.
        const listener = get(this, context.name) as EventListener
        listeners.events.get(eventName)!.push({ listener: listener.bind(this), options, modes })
      })
    }
  }

  function attachListeners<E extends EventCategory>(
    instance: object,
    category: E,
    target: EventTarget | TypedEventTarget<TypedEvent>,
    mode: Mode | Mode[] | '__all__' = '__all__',
  ) {
    mode = (mode !== '__all__' && !isArray(mode) ? [mode] : mode) as Mode[] | '__all__'
    const instanceId = (instance as WithInstanceId)._instanceId ?? null
    const eventListeners = instanceId !== null ? eventListenersPerInstance.get(instanceId) : null
    const listenersForTarget = eventListeners?.get(category)
    if (!listenersForTarget) return

    detachListeners(instance, category, target)

    for (const [eventName, listeners] of listenersForTarget.events.entries()) {
      for (const { listener, options, modes } of listeners) {
        if (mode === '__all__' || !modes || modes.every((m) => mode.includes(m))) {
          target.addEventListener(eventName, listener, options)
        }
      }
    }
  }

  function detachListeners<E extends EventCategory>(
    instance: object,
    category: E,
    target: EventTarget | TypedEventTarget<TypedEvent>,
  ) {
    const instanceId = (instance as WithInstanceId)._instanceId ?? null
    const eventListeners = instanceId !== null ? eventListenersPerInstance.get(instanceId) : null
    const listenersForTarget = eventListeners?.get(category)
    if (!listenersForTarget) return

    for (const [eventName, listeners] of listenersForTarget.events.entries()) {
      for (const { listener } of listeners) {
        target.removeEventListener(eventName, listener)
      }
    }
  }

  return { eventListener, attachListeners, detachListeners }
}
