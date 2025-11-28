import { EditorTapestryRenderer } from '../renderer'
import { EditorGlobalEventsController } from './editor-global-events-controller'
import { EditorRelController } from './editor-rel-controller'
import {
  EditableTapestryViewModel,
  PresentationOrderState,
  TapestryEditorStore,
} from '../../pages/tapestry/view-model'
import { TapestryDataSyncCommands } from '../../pages/tapestry/tapestry-providers'
import { PresentationOrderController } from './presentation-order-controller'
import { TapestryLifecycleController } from 'tapestry-core-client/src/stage/controller'
import { TapestryStage } from 'tapestry-core-client/src/stage'
import { ViewportController } from 'tapestry-core-client/src/stage/controller/viewport-controller'
import { EditorItemController } from './editor-item-controller'

export class EditorLifecycleController extends TapestryLifecycleController<
  EditableTapestryViewModel,
  'edit-presentation-order'
> {
  constructor(
    store: TapestryEditorStore,
    stage: TapestryStage<'presentationOrder'>,
    tapestryDataSyncCommands: Pick<TapestryDataSyncCommands, 'broadcastCursorPosition'>,
  ) {
    super(store, stage, {
      global: [
        new ViewportController(store.as('base'), stage),
        new EditorTapestryRenderer(store, stage),
      ],
      default: [
        new EditorItemController(store, stage),
        new EditorRelController(store, stage),
        // TODO: The `onPointerModeChange` handler that is currently in GlobalEventsController was
        // previously 'global' and now it will be disabled along with the controller itself when
        // "edit presentation order" mode is enabled
        new EditorGlobalEventsController(store, stage, tapestryDataSyncCommands),
      ],
      'edit-presentation-order': [new PresentationOrderController(store, stage)],
    })
  }

  init() {
    super.init()
    this.store.subscribe('presentationOrderState', this.onPresentationOrderStateChange)
  }

  dispose() {
    super.dispose()
    this.store.unsubscribe(this.onPresentationOrderStateChange)
  }

  private onPresentationOrderStateChange = (state?: PresentationOrderState | null) => {
    this.enableMode(state ? 'edit-presentation-order' : 'default')
  }
}
