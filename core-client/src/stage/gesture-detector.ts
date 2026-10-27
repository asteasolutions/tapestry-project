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

type ZoomData = { deltaScale: number; anchorPoint: Point }
export type ZoomEvent = TypedEvent<'zoom', ZoomData>
export type ZoomEndEvent = TypedEvent<'zoomend'>

type PanData = { translation: Vector; method: PanMethod }
export type PanEvent = TypedEvent<'pan', PanData>
export type PanEndEvent = TypedEvent<'panend'>

type ClickData = { hoverTarget: HoverTarget | null; originalEvent: PointerEvent | TouchEvent }
export type ClickEvent = TypedEvent<'click' | 'double-click', ClickData>

type PanMethod = 'scroll' | 'drag'

interface PanState {
  method: PanMethod
  lastPoint: Point
  stopTimeout?: number
}

interface ZoomState {
  stopTimeout?: number
}

interface SmoothZoomState {
  pending: number
  anchorPoint: Point
  frame: number
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
  private mouseWheelZoomState: SmoothZoomState | null = null

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

    attachListeners(
      this,
      'stage',
      this.stage.pixi.tapestry.app.stage,
      isMobile ? 'mobile' : 'desktop',
    )
    attachListeners(this, 'window', window)
    attachListeners(this, 'scene', this.stage.root, isMobile ? 'mobile' : 'desktop')
    this.dragHandler.activate()
  }

  deactivate() {
    if (!this.isActive) return
    this.isActive = false

    detachListeners(this, 'stage', this.stage.pixi.tapestry.app.stage)
    detachListeners(this, 'window', window)
    detachListeners(this, 'scene', this.stage.root)
    this.dragHandler.deactivate()
    this.maybeClick = null
    this.panState = null
    this.zoomState = null
    if (this.mouseWheelZoomState) {
      cancelAnimationFrame(this.mouseWheelZoomState.frame)
      this.mouseWheelZoomState = null
    }
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

  private mouseWheelZoom(delta: number, anchorPoint: Point) {
    const pending = this.mouseWheelZoomState?.pending ?? 0
    const frame = this.mouseWheelZoomState?.frame ?? requestAnimationFrame(this.smoothZoomStep)
    this.mouseWheelZoomState = { pending: pending + delta, anchorPoint, frame }
  }

  private smoothZoomStep = () => {
    const state = this.mouseWheelZoomState
    if (!state) return

    const last = Math.abs(state.pending) < 0.01
    const step = last ? state.pending : state.pending * 0.2
    state.pending -= step
    this.onZoom({ deltaScale: step, anchorPoint: state.anchorPoint })

    if (last) {
      this.mouseWheelZoomState = null
    } else {
      state.frame = requestAnimationFrame(this.smoothZoomStep)
    }
  }

  private onZoom = (data: ZoomData) => {
    this.dispatchEvent('zoom', data)
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
      this.onZoom({ deltaScale: (d1 - d2) * -0.005, anchorPoint: midpoint(p1, p2) })

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
      if (event.deltaX === 0 && Math.abs(event.deltaY) > 20) {
        this.mouseWheelZoom(-Math.sign(event.deltaY) * 0.15, cursorLocation)
      } else {
        this.onZoom({ deltaScale: -event.deltaY * 0.01, anchorPoint: cursorLocation })
      }
    } else {
      if (!this.panState) {
        this.onPanStart(cursorLocation, 'scroll')
      } else {
        const delta: Vector = { dx: -event.deltaX, dy: -event.deltaY }
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

  private firstClickTimeout?: number

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

      const data = { hoverTarget: obtainHoverTarget(this.stage, event), originalEvent: event }
      if (this.firstClickTimeout) {
        clearTimeout(this.firstClickTimeout)
        this.firstClickTimeout = undefined
        this.dispatchEvent('double-click', data)
      } else {
        this.firstClickTimeout = window.setTimeout(() => {
          this.firstClickTimeout = undefined
          this.dispatchEvent('click', data)
        }, 250)
      }
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
