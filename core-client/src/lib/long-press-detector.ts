import { distance } from 'tapestry-core/src/lib/geometry.js'
import { TypedEvent, TypedEventTarget } from './events/typed-events.js'
import { createEventRegistry } from './events/event-registry.js'

export type LongPressDownEvent = TypedEvent<'down', PointerEvent>
export type LongPressMoveEvent = TypedEvent<'move', PointerEvent>
export type LongPressUpEvent = TypedEvent<'up', PointerEvent>

interface MaybeLongPress {
  event: PointerEvent
  longPressTimeout: number
  longPressFired: boolean
}

type EventTypesMap = { scene: keyof HTMLElementEventMap }

const { eventListener, attachListeners, detachListeners } = createEventRegistry<EventTypesMap>()

export class LongPressDetector extends TypedEventTarget<
  LongPressDownEvent | LongPressMoveEvent | LongPressUpEvent
> {
  private maybeLongPress: MaybeLongPress | null = null

  private isActive = false

  constructor(private element: HTMLElement) {
    super()
  }

  activate() {
    if (this.isActive) return
    this.isActive = true

    attachListeners(this, 'scene', this.element)
  }

  deactivate() {
    if (!this.isActive) return
    this.isActive = false

    detachListeners(this, 'scene', this.element)
    this.maybeLongPress = null
  }

  @eventListener('scene', 'pointerdown')
  protected onPointerDown(event: PointerEvent) {
    if (event.buttons !== 1) {
      return
    }

    if (this.maybeLongPress) {
      if (!this.maybeLongPress.longPressFired) {
        clearTimeout(this.maybeLongPress.longPressTimeout)
        this.maybeLongPress = null
      }
      return
    }

    this.maybeLongPress = {
      event,
      longPressTimeout: window.setTimeout(() => {
        if (this.maybeLongPress) {
          this.maybeLongPress.longPressFired = true
          this.dispatchEvent('down', event)
        }
      }, 400),
      longPressFired: false,
    }
  }

  @eventListener('scene', 'pointermove')
  protected onPointerMove(event: PointerEvent) {
    if (!this.maybeLongPress) {
      return
    }

    if (this.maybeLongPress.longPressFired) {
      this.dispatchEvent('move', event)
    } else if (distance(this.maybeLongPress.event, event) > 20) {
      clearTimeout(this.maybeLongPress.longPressTimeout)
      this.maybeLongPress = null
    }
  }

  @eventListener('scene', 'pointercancel')
  @eventListener('scene', 'pointerup')
  protected onPointerUp(event: PointerEvent) {
    if (!this.maybeLongPress) {
      return
    }

    clearTimeout(this.maybeLongPress.longPressTimeout)
    if (
      this.maybeLongPress.longPressFired &&
      this.maybeLongPress.event.pointerId === event.pointerId
    ) {
      this.dispatchEvent('up', event)
      this.maybeLongPress = null
    }
  }
}
