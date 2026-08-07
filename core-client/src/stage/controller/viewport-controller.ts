import { GestureDetector, PanEvent, ZoomEvent } from '../gesture-detector'
import { createEventRegistry } from '../../lib/events/event-registry'
import { EventTypes } from '../../lib/events/typed-events'
import { Store } from '../../lib/store/index'
import {
  initializeViewport,
  panViewport,
  resizeViewport,
  setDefaultViewport,
  transformViewport,
} from '../../view-model/store-commands/viewport'
import { TapestryViewModel } from '../../view-model'
import { zoomToPoint } from '../../view-model/utils'
import { setPointerInteraction, setPointerMode } from '../../view-model/store-commands/tapestry'
import { TapestryStageController } from '.'
import { TapestryStage } from '..'

type EventTypesMap = {
  gesture: EventTypes<GestureDetector>
  document: keyof DocumentEventMap
}

const { eventListener, attachListeners, detachListeners } = createEventRegistry<EventTypesMap>()

export class ViewportController implements TapestryStageController {
  private isInitialViewSet = false
  private sceneResizeObserver = new ResizeObserver(() => {
    this.store.dispatch(
      resizeViewport({
        width: this.stage.root.clientWidth,
        height: this.stage.root.clientHeight,
      }),
    )
    if (this.isInitialViewSet) {
      return
    }

    this.store.dispatch(setDefaultViewport(false), initializeViewport())
    this.isInitialViewSet = true
  })

  constructor(
    private store: Store<TapestryViewModel>,
    private stage: TapestryStage,
  ) {}

  init() {
    attachListeners(this, 'gesture', this.stage.gestureDetector)
    attachListeners(this, 'document', document)

    this.sceneResizeObserver.observe(this.stage.root)
  }

  dispose() {
    detachListeners(this, 'gesture', this.stage.gestureDetector)
    detachListeners(this, 'document', document)

    this.sceneResizeObserver.disconnect()
  }

  @eventListener('gesture', 'zoom')
  protected onZoom({ detail: { deltaScale, anchorPoint } }: ZoomEvent) {
    const tapestry = this.store.get()
    const transformed = zoomToPoint(tapestry, deltaScale, anchorPoint)

    const action = transformed.scale < tapestry.viewport.transform.scale ? 'zoom-out' : 'zoom-in'

    this.store.dispatch(setPointerInteraction(action, null, 'dom'), transformViewport(transformed))
  }

  @eventListener('gesture', 'panend')
  @eventListener('gesture', 'zoomend')
  protected onZoomEnd() {
    this.store.dispatch(setPointerInteraction(null))
  }

  @eventListener('gesture', 'pan')
  protected onPan(event: PanEvent) {
    this.store.dispatch(
      setPointerInteraction(`pan-${event.detail.method}`, null, 'dom'),
      panViewport(event.detail.translation),
    )
  }

  @eventListener('document', 'keydown')
  @eventListener('document', 'keyup')
  protected switchPointerMode(event: KeyboardEvent) {
    if (event.code === 'Space') {
      this.store.dispatch(setPointerMode(event.type === 'keydown' ? 'pan' : 'select'))
    }
  }
}
