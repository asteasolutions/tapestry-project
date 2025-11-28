import { AllFederatedEventMap, Container } from 'pixi.js'
import {
  translate,
  Point,
  vector,
  Vector,
  distance,
  midpoint,
} from 'tapestry-core/src/lib/geometry'
import { EventTypes, TypedEvent, TypedEventTarget } from '../lib/events/typed-events'
import { TapestryStage } from './index'
import { createEventRegistry } from '../lib/events/event-registry'
import { DomDragHandler, DragEvent, DragStartEvent } from './drag-handler'
import { obtainHoverTarget, toPoint } from './utils'
import { capturesPointerEvents } from '../lib/dom'
import { isMobile } from '../lib/user-agent'
import { HoverTarget } from '../view-model'

export interface GestureDetectorOptions {
  scrollGesture: 'zoom' | 'pan'
  dragToPan: boolean
}

export type ZoomEvent = TypedEvent<'zoom', { deltaScale: number; anchorPoint: Point }>
export type ZoomEndEvent = TypedEvent<'zoomend'>
export type PanEvent = TypedEvent<'pan', { translation: Vector; method: PanMethod }>
export type PanEndEvent = TypedEvent<'panend'>
export type ClickEvent = TypedEvent<
  'click',
  {
    hoverTarget: HoverTarget | null
    originalEvent: PointerEvent | TouchEvent
  }
>

type PanMethod = 'scroll' | 'drag'

interface PanState {
  method: PanMethod
  lastPoint: Point
  stopTimeout?: number
}

interface ZoomState {
  stopTimeout?: number
}

interface PinchState {
  p1: Point
  p2: Point
}

interface MaybeClick {
  point: Point
  timestamp: number
}

type EventTypesMap = {
  stage: keyof AllFederatedEventMap
  dragHandler: EventTypes<DomDragHandler>
  window: keyof HTMLElementEventMap
  scene: keyof HTMLElementEventMap
}

const { eventListener, attachListeners, detachListeners } = createEventRegistry<
  EventTypesMap,
  'mobile' | 'desktop'
>()

export class GestureDetector extends TypedEventTarget<
  ZoomEvent | ZoomEndEvent | PanEvent | PanEndEvent | ClickEvent
> {
  private maybeClick: MaybeClick | null = null
  private panState: PanState | null = null
  private zoomState: ZoomState | null = null
  private pinchState: PinchState | null = null

  private dragHandler!: DomDragHandler

  private isActive = false

  constructor(
    private stage: TapestryStage,
    private options: GestureDetectorOptions,
  ) {
    super()
    this.dragHandler = new DomDragHandler(stage.root, {
      dragStartThreshold: 1,
      determineDragTarget: (e) => {
        if (capturesPointerEvents(e.target as HTMLElement)) {
          return
        }

        return stage.root
      },
    })

    attachListeners(this, 'dragHandler', this.dragHandler)
  }

  updateOptions(options: Partial<GestureDetectorOptions>) {
    Object.assign(this.options, options)
  }

  activate() {
    if (this.isActive) return
    this.isActive = true

    attachListeners(this, 'stage', this.stage.pixi.tapestry.stage, isMobile ? 'mobile' : 'desktop')
    attachListeners(this, 'window', window)
    attachListeners(this, 'scene', this.stage.root, isMobile ? 'mobile' : 'desktop')
    this.dragHandler.activate()
  }

  deactivate() {
    if (!this.isActive) return
    this.isActive = false

    detachListeners(this, 'stage', this.stage.pixi.tapestry.stage)
    detachListeners(this, 'window', window)
    detachListeners(this, 'scene', this.stage.root)
    this.dragHandler.deactivate()
    this.maybeClick = null
    this.panState = null
    this.zoomState = null
  }

  private onPanStart = (point: Point, method: PanMethod) => {
    if (method !== 'drag' || this.options.dragToPan) {
      this.panState = { lastPoint: point, method }
    }
  }

  private onPan = (point: Point, method: PanMethod) => {
    if (this.panState?.method !== method) return

    this.dispatchEvent('pan', { translation: vector(this.panState.lastPoint, point), method })
    this.panState.lastPoint = point
  }

  private onPanEnd = (method: PanMethod) => {
    if (this.panState?.method !== method) return

    this.dispatchEvent('panend', undefined)
    this.panState = null
  }

  private onZoom = (deltaScale: number, anchorPoint: Point) => {
    this.dispatchEvent('zoom', { deltaScale, anchorPoint })
    clearTimeout(this.zoomState?.stopTimeout)
    this.zoomState = { stopTimeout: window.setTimeout(this.onZoomEnd, 200) }
  }

  private onZoomEnd = () => {
    this.dispatchEvent('zoomend', undefined)
    this.zoomState = null
  }

  @eventListener('window', 'wheel', null, { passive: false })
  protected onWindowWheel(event: WheelEvent) {
    // Prevent the browser's built-in zoom when pinching on a trackpad.
    if (event.ctrlKey) {
      event.preventDefault()
    }
  }

  @eventListener('scene', 'touchstart')
  protected onTouchStart(event: TouchEvent) {
    if (event.touches.length > 1 && !this.pinchState) {
      this.pinchState = { p1: toPoint(event.touches[0]), p2: toPoint(event.touches[1]) }
    }
  }

  @eventListener('scene', 'touchmove')
  protected onTouchMove(event: TouchEvent) {
    // First check seems redundant, but better safe than sorry
    if (event.touches.length > 1 && this.pinchState) {
      const p1 = toPoint(event.touches[0])
      const p2 = toPoint(event.touches[1])

      const d1 = distance(this.pinchState.p1, this.pinchState.p2)
      const d2 = distance(p1, p2)
      this.onZoom((d1 - d2) * -0.005, midpoint(p1, p2))

      this.pinchState = { p1, p2 }
    }
  }

  @eventListener('scene', 'touchend')
  protected onTouchEnd(event: TouchEvent) {
    if (event.touches.length < 2) {
      this.pinchState = null
    }
  }

  @eventListener('scene', 'wheel')
  protected onWheel(event: WheelEvent) {
    if (capturesPointerEvents(event.target as HTMLElement)) {
      return
    }
    const cursorLocation = toPoint(event)

    // The pinch gesture toggles the control key
    if (this.options.scrollGesture === 'zoom' || event.ctrlKey) {
      this.onZoom(-event.deltaY * 0.01, cursorLocation)
    } else {
      if (!this.panState) {
        this.onPanStart(cursorLocation, 'scroll')
      } else {
        const { deltaX: dx, deltaY: dy } = event
        const delta: Vector = event.shiftKey ? { dx: -dy, dy: -dx } : { dx: -dx, dy: -dy }
        this.onPan(translate(this.panState.lastPoint, delta), 'scroll')
        clearTimeout(this.panState.stopTimeout)
        this.panState.stopTimeout = window.setTimeout(() => this.onPanEnd('scroll'), 200)
      }
    }
  }

  @eventListener('scene', 'touchstart', ['mobile'])
  @eventListener('scene', 'pointerdown', ['desktop'])
  protected onPointerDown(event: PointerEvent | TouchEvent) {
    if (event instanceof PointerEvent ? event.buttons !== 1 : event.touches.length !== 1) {
      return
    }
    this.maybeClick = {
      point: toPoint(event),
      timestamp: performance.now(),
    }
  }

  @eventListener('scene', 'touchend', ['mobile'])
  @eventListener('scene', 'pointerup', ['desktop'])
  protected onPointerUp(event: PointerEvent | TouchEvent) {
    if (!this.maybeClick) {
      return
    }
    if (
      performance.now() - this.maybeClick.timestamp < 200 &&
      distance(this.maybeClick.point, toPoint(event)) < 3 &&
      !capturesPointerEvents(event.target as HTMLElement)
    ) {
      // It's a click!
      this.dispatchEvent('click', {
        hoverTarget: obtainHoverTarget(this.stage, event),
        originalEvent: event,
      })
    }

    this.maybeClick = null
  }

  @eventListener('stage', 'pointerleave', ['desktop'])
  protected onPointerLeave() {
    this.maybeClick = null
  }

  @eventListener('dragHandler', 'dragstart')
  protected onDragStart(event: DragStartEvent<Container>) {
    this.onPanStart(event.detail.currentPoint, 'drag')
  }

  @eventListener('dragHandler', 'drag')
  protected onDrag(event: DragEvent<Container>) {
    if (this.pinchState) {
      return
    }
    this.onPan(event.detail.currentPoint, 'drag')
  }

  @eventListener('dragHandler', 'dragend')
  protected onDragEnd() {
    this.onPanEnd('drag')
  }
}
