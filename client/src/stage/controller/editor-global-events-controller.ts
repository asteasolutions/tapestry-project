import { throttle } from 'lodash-es'
import { createEventRegistry } from 'tapestry-core-client/src/lib/events/event-registry'
import { TapestryStage } from 'tapestry-core-client/src/stage'
import {
  GlobalEventsController,
  KeyMapping,
} from 'tapestry-core-client/src/stage/controller/global-events-controller'
import { positionAtViewport } from 'tapestry-core-client/src/view-model/utils'
import { Point } from 'tapestry-core/src/lib/geometry'
import { createTextItem } from '../../model/data/utils'
import { TapestryDataSyncCommands } from '../../pages/tapestry/tapestry-providers'
import { InteractionMode, TapestryEditorStore } from '../../pages/tapestry/view-model'
import {
  addAndPositionItems,
  deleteSelectionItems,
} from '../../pages/tapestry/view-model/store-commands/items'
import {
  setSnackbar,
  setViewAsStart,
} from '../../pages/tapestry/view-model/store-commands/tapestry'
import { createItemViewModel, insertDataTransfer } from '../../pages/tapestry/view-model/utils'
import { DataTransferHandler } from '../data-transfer-handler'
import { CURSOR_BROADCAST_PERIOD } from '../utils'

type EventTypesMap = {
  scene: keyof GlobalEventHandlersEventMap
  document: keyof DocumentEventMap
}

const { eventListener, attachListeners, detachListeners } = createEventRegistry<
  EventTypesMap,
  InteractionMode
>()

export class EditorGlobalEventsController extends GlobalEventsController {
  private dataTransferHandler = new DataTransferHandler()
  private editorKeyMappings: KeyMapping
  private broadcastCursorPosition = throttle(
    (cursorPosition: Point) =>
      this.tapestryDataSyncCommands.broadcastCursorPosition(cursorPosition),
    CURSOR_BROADCAST_PERIOD,
  )

  constructor(
    private editorStore: TapestryEditorStore,
    stage: TapestryStage,
    private tapestryDataSyncCommands: Pick<TapestryDataSyncCommands, 'broadcastCursorPosition'>,
  ) {
    super(editorStore.as('base'), stage)
    this.editorKeyMappings = {
      'Delete | Backspace': () => editorStore.dispatch(deleteSelectionItems()),
      KeyT: () =>
        this.editorStore.dispatch(
          addAndPositionItems(createItemViewModel(createTextItem('', editorStore.get('id')))),
        ),
      'meta + shift + KeyS': () =>
        editorStore.dispatch(setViewAsStart(), setSnackbar('Start view has been set')),
    }
  }

  init() {
    super.init()
    this.editorStore.subscribe('interactionMode', this.onInteractionModeChange)
    this.onInteractionModeChange(this.editorStore.get('interactionMode'))
  }

  dispose() {
    super.dispose()
    this.editorStore.unsubscribe(this.onInteractionModeChange)
    detachListeners(this, 'scene', this.stage.root)
    detachListeners(this, 'document', document)
  }

  private onInteractionModeChange = (interactionMode: InteractionMode) => {
    attachListeners(this, 'scene', this.stage.root, interactionMode)
    attachListeners(this, 'document', document, interactionMode)
  }

  protected getKeyMappings() {
    let keyMappings = super.getKeyMappings()
    if (this.editorStore.get('interactionMode') === 'edit') {
      keyMappings = { ...keyMappings, ...this.editorKeyMappings }
    }
    return keyMappings
  }

  @eventListener('document', 'paste', ['edit'])
  protected async onPaste(event: ClipboardEvent) {
    // When pasting text inside the tiptap editor sometimes the onPaste event is not fired,
    // however the default behavior is prevented, so we use that not to create extra elements
    if (event.defaultPrevented) {
      return
    }
    await this.addItems(event.clipboardData)
  }

  @eventListener('scene', 'drop', ['edit'])
  protected async onDrop(event: DragEvent) {
    event.preventDefault()

    await this.addItems(event.dataTransfer, event)
  }

  @eventListener('scene', 'mousemove')
  protected onMouseMove(event: MouseEvent) {
    this.broadcastCursorPosition(
      positionAtViewport(this.store.get('viewport'), {
        x: event.clientX,
        y: event.clientY,
      }),
    )
  }

  private async addItems(dataTransfer: DataTransfer | null, point?: Point) {
    await insertDataTransfer(
      this.editorStore.dispatch.bind(this.editorStore),
      async () => this.dataTransferHandler.deserialize(dataTransfer, this.editorStore.get('id')),
      point,
    )
  }
}
