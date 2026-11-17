import { GestureDetector, PanEvent, ViewportResizeEvent, ZoomEvent } from '../gesture-detector'
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
import {
  setPointerInteraction,
  setPointerMode,
  setSnackbar,
} from '../../view-model/store-commands/tapestry'
import { TapestryStageController } from '.'
import { TapestryStage } from '..'
import { throttle } from 'lodash'
import { Shortcut } from '../../components/tapestry/help-pane/shortcuts-pane'
import { shortcutLabel } from '../../lib/keyboard-event'
import { isMobile } from '../../lib/user-agent'

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

  private showPageZoomWarning = throttle(
    () =>
      this.store.dispatch(
        setSnackbar({
          content: (
            <div style={{ display: 'inline-flex', flexDirection: 'row', gap: '4px' }}>
              Your browser zoomed the page{' '}
              {isMobile ? 'Pinch out' : <Shortcut keys={[shortcutLabel('meta + 0')]} />}
              to reset.
            </div>
          ),
          variant: 'warning',
          duration: 5,
        }),
      ),
    1000,
    { trailing: false },
  )

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

  @eventListener('gesture', 'viewport-resize')
  protected onViewportResize(_e: ViewportResizeEvent) {
    // Pinch-zooming the page (e.g. over an iframe we can't intercept events from) changes the visual
    // viewport scale. Resetting it with Cmd/Ctrl + 0 also fires a resize, so ignore scale 1.
    if ((window.visualViewport?.scale ?? 1) > 1) {
      this.showPageZoomWarning()
    }
  }
}
