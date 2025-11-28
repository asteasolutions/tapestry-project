import { Container, FederatedPointerEvent } from 'pixi.js'
import { TypedEvent, TypedEventTarget } from '../lib/events/typed-events'
import { createEventRegistry } from '../lib/events/event-registry'
import { norm, Point, vector } from 'tapestry-core/src/lib/geometry'
import { isMobile } from '../lib/user-agent'

export interface DragState<T> {
  dragTarget: T
  startPoint: Point
  previousPoint: Point
  currentPoint: Point
  totalDragDistance: number
}

export interface DragHandlerConfig<E, T> {
  dragStartThreshold: number
  determineDragTarget: (event: E) => T | null
}

export interface DragEventDetail<T> extends DragState<T> {
  originalEvent?: MouseEvent | null
}

export type DragStartEvent<T> = TypedEvent<'dragstart', DragEventDetail<T>>
export type DragEvent<T> = TypedEvent<'drag', DragEventDetail<T>>
export type DragEndEvent<T> = TypedEvent<'dragend', DragEventDetail<T>>

type EventTypesMap = {
  container:
    | 'pointerdown'
    | 'pointermove'
    | 'pointerup'
    | 'pointerleave'
    | 'touchstart'
    | 'touchmove'
    | 'touchend'
}

const { eventListener, attachListeners, detachListeners } = createEventRegistry<
  EventTypesMap,
  'mobile' | 'desktop'
>()

abstract class DragHandler<
  C extends EventTarget = EventTarget,
  E extends MouseEvent = MouseEvent,
  T = unknown,
> extends TypedEventTarget<DragStartEvent<T> | DragEvent<T> | DragEndEvent<T>> {
  private dragState: DragState<T> | null = null
  private isDragging = false

  constructor(
    protected container: C,
    private config: DragHandlerConfig<E, T>,
  ) {
    super()
  }

  protected abstract convertToPoint(event: E): Point

  activate() {
    attachListeners(this, 'container', this.container, isMobile ? 'mobile' : 'desktop')
  }

  deactivate() {
    detachListeners(this, 'container', this.container)
    this.dragState = null
    this.isDragging = false
  }

  simulateDragStart(dragTarget: T, point: Point) {
    this.dragState = {
      startPoint: point,
      previousPoint: point,
      currentPoint: point,
      totalDragDistance: 0,
      dragTarget,
    }
    this.isDragging = true
    this.dispatchEvent('dragstart', this.dragState)
  }

  @eventListener('container', isMobile ? 'touchstart' : 'pointerdown')
  protected onPointerDown(event: E) {
    if (event instanceof MouseEvent && event.buttons !== 1) {
      return
    }
    const dragTarget = this.config.determineDragTarget(event)
    if (!dragTarget) return

    const point = this.convertToPoint(event)
    this.dragState = {
      startPoint: point,
      previousPoint: point,
      currentPoint: point,
      totalDragDistance: 0,
      dragTarget,
    }
    this.isDragging = this.config.dragStartThreshold === 0
    if (this.isDragging) {
      event.stopImmediatePropagation()
      this.dispatchEvent('dragstart', { ...this.dragState, originalEvent: event })
    }
  }

  @eventListener('container', isMobile ? 'touchmove' : 'pointermove')
  protected onPointerMove(event: E) {
    if (!this.dragState) {
      return
    }
    this.updateDragState(event)
    if (!this.isDragging && this.dragState.totalDragDistance > this.config.dragStartThreshold) {
      this.isDragging = true
      this.dispatchEvent('dragstart', { ...this.dragState, originalEvent: event })
    }
    if (this.isDragging) {
      this.dispatchEvent('drag', { ...this.dragState, originalEvent: event })
    }
  }

  @eventListener('container', isMobile ? 'touchend' : 'pointerup')
  @eventListener('container', 'pointerleave', ['desktop'])
  protected onPointerUp(event: E) {
    if (!this.dragState) return

    if (this.isDragging) {
      this.updateDragState(event)
      this.dispatchEvent('dragend', { ...this.dragState, originalEvent: event })
    }
    this.dragState = null
    this.isDragging = false
  }

  private updateDragState(event: E) {
    if (!this.dragState) return

    const point = this.convertToPoint(event)
    const translation = vector(this.dragState.currentPoint, point)
    this.dragState.totalDragDistance += norm(translation)
    if (this.isDragging) {
      // Until we start actual dragging, the previous point remains equal to the start point
      this.dragState.previousPoint = this.dragState.currentPoint
    }
    this.dragState.currentPoint = point
  }
}

export class PixiDragHandler<T = unknown> extends DragHandler<Container, FederatedPointerEvent, T> {
  protected convertToPoint(event: FederatedPointerEvent): Point {
    return { x: event.screenX, y: event.screenY }
  }
}

export class DomDragHandler<T = unknown> extends DragHandler<HTMLElement, MouseEvent, T> {
  protected convertToPoint(event: MouseEvent | TouchEvent): Point {
    return {
      x:
        (event instanceof MouseEvent ? event.pageX : event.changedTouches[0].pageX) -
        this.container.offsetLeft,
      y:
        (event instanceof MouseEvent ? event.pageY : event.changedTouches[0].pageY) -
        this.container.offsetTop,
    }
  }
}
