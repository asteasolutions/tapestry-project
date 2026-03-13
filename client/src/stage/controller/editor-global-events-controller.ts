import z from 'zod/v4'
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
  deselectAll,
  setInteractiveElement,
  setSnackbar,
  setViewAsStart,
} from '../../pages/tapestry/view-model/store-commands/tapestry'
import { createItemViewModel, insertDataTransfer } from '../../pages/tapestry/view-model/utils'
import { DataTransferHandler } from '../data-transfer-handler'
import { CURSOR_BROADCAST_PERIOD } from '../utils'
import { focusItems } from '../../pages/tapestry/view-model/store-commands/viewport'

type EventTypesMap = {
  scene: keyof GlobalEventHandlersEventMap
  document: keyof DocumentEventMap
}

const { eventListener, attachListeners, detachListeners } = createEventRegistry<
  EventTypesMap,
  InteractionMode
>()

// Deactivates the currently active tapestry element (if any)
const DeactivateMessageSchema = z.object({ type: z.literal('tapestry:deactivate') })

// Focuses the specified item. If no itemId is given, focuses all items instead.
const FocusMessageSchema = z.object({
  type: z.literal('tapestry:focus'),
  itemId: z.string().optional(),
  animate: z.boolean().optional(),
})

// Hides all items on the Tapestry (including the Pixi canvas) by setting their `display` to `none`. A single
// whose ID is passed in the `except` parameter is left visible. Useful, for example, for taking automated
// screenshots of isolated items in the Tapestry.
const HideAllItemsSchema = z.object({
  type: z.literal('tapestry:hideAllItems'),
  except: z.string(),
})

// Shows all items that have been previously hidden via `tapestry:hideAllItems`.
const ShowAllItemsSchema = z.object({
  type: z.literal('tapestry:showAllItems'),
})

const TapestryPostMessageDataSchema = z.discriminatedUnion('type', [
  DeactivateMessageSchema,
  FocusMessageSchema,
  HideAllItemsSchema,
  ShowAllItemsSchema,
])

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
    addEventListener('message', this.onPostMessage)
  }

  dispose() {
    super.dispose()
    this.editorStore.unsubscribe(this.onInteractionModeChange)
    detachListeners(this, 'scene', this.stage.root)
    detachListeners(this, 'document', document)
    removeEventListener('message', this.onPostMessage)
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

  private onPostMessage = (event: MessageEvent<unknown>) => {
    const message = TapestryPostMessageDataSchema.safeParse(event.data)
    if (!message.success) return

    if (message.data.type === 'tapestry:deactivate') {
      this.editorStore.dispatch(deselectAll(), setInteractiveElement(null))
    } else if (message.data.type === 'tapestry:focus') {
      const { itemId, animate } = message.data
      this.editorStore.dispatch(
        focusItems(itemId && [itemId], { addToolbarPadding: true, animate }),
        itemId ? setInteractiveElement({ modelId: itemId, modelType: 'item' }) : null,
      )
    } else if (message.data.type === 'tapestry:hideAllItems') {
      window.document
        .querySelectorAll(
          `.pixi-container, [data-model-id]:not([data-model-id="${message.data.except}"])`,
        )
        .forEach((elem) => {
          const element = elem as HTMLElement & { _originalDisplay?: string }
          element._originalDisplay = element.style.display
          element.style.display = 'none'
        })
      // We leave this check here in case more values are added to the enum in the future.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (message.data.type === 'tapestry:showAllItems') {
      window.document.querySelectorAll('.pixi-container, [data-model-id]').forEach((elem) => {
        const element = elem as HTMLElement & { _originalDisplay?: string }
        if (typeof element._originalDisplay === 'string') {
          element.style.display = element._originalDisplay
          delete element._originalDisplay
        }
      })
    }
  }
}
