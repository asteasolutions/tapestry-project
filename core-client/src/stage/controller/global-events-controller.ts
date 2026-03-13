import z from 'zod/v4'
import { createEventRegistry } from '../../lib/events/event-registry'
import { arrowShortcuts, matchesShortcut } from '../../lib/keyboard-event'
import { Store } from '../../lib/store/index'
import {
  focusItems,
  panViewport,
  setDefaultViewport,
} from '../../view-model/store-commands/viewport'
import {
  deselectAll,
  selectAll,
  setInteractiveElement,
  setPointerInteraction,
} from '../../view-model/store-commands/tapestry'
import { TapestryStage } from '..'
import { TapestryStageController } from '.'
import { PointerMode, TapestryViewModel } from '../../view-model'
import { isMultiselection } from '../../view-model/utils'
import { obtainHoverTarget } from '../utils'

type EventTypesMap = {
  stage: keyof HTMLElementEventMap
  document: keyof DocumentEventMap
}

const { eventListener, attachListeners, detachListeners } = createEventRegistry<EventTypesMap>()

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

export type KeyMapping = Record<string, (event: KeyboardEvent) => void>

export class GlobalEventsController implements TapestryStageController {
  private universalKeyMappings: KeyMapping

  constructor(
    protected readonly store: Store<TapestryViewModel>,
    protected readonly stage: TapestryStage,
  ) {
    this.universalKeyMappings = {
      'meta + shift + Digit0': () => store.dispatch(setDefaultViewport(true)),
      ...arrowShortcuts((dir, distance) =>
        store.dispatch(panViewport({ [dir === 'x' ? 'dx' : 'dy']: -distance })),
      ),
      'meta + KeyA': () => store.dispatch(selectAll()),
    }
  }

  init() {
    this.store.subscribe(['pointerMode'], this.onPointerModeChange)
    attachListeners(this, 'stage', this.stage.root)
    attachListeners(this, 'document', document)
    addEventListener('message', this.onPostMessage)
  }

  dispose() {
    this.store.unsubscribe(this.onPointerModeChange)
    detachListeners(this, 'stage', this.stage.root)
    detachListeners(this, 'document', document)
    removeEventListener('message', this.onPostMessage)
  }

  private onPostMessage = (event: MessageEvent<unknown>) => {
    const message = TapestryPostMessageDataSchema.safeParse(event.data)
    if (!message.success) return

    if (message.data.type === 'tapestry:deactivate') {
      this.store.dispatch(deselectAll(), setInteractiveElement(null))
    } else if (message.data.type === 'tapestry:focus') {
      const { itemId, animate } = message.data
      this.store.dispatch(
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

  private onPointerModeChange = ({ pointerMode }: { pointerMode: PointerMode }) => {
    const dragToPan = pointerMode === 'pan'
    this.stage.gestureDetector.updateOptions({
      scrollGesture: dragToPan ? 'zoom' : 'pan',
      dragToPan,
    })
  }

  @eventListener('stage', 'pointermove')
  protected onPointerMove(event: PointerEvent) {
    const pointerInteraction = this.store.get('pointerInteraction')
    if (pointerInteraction && pointerInteraction.action !== 'hover') return

    const hoverTarget = obtainHoverTarget(this.stage, event)
    this.store.dispatch(setPointerInteraction('hover', hoverTarget))
  }

  @eventListener('document', 'keydown')
  protected handleShortcut(event: KeyboardEvent) {
    if (
      this.store.get('interactiveElement') ||
      isMultiselection(this.store.get('selection')) ||
      event.defaultPrevented
    ) {
      return
    }

    const keyMappings = this.getKeyMappings()

    for (const [shortcut, action] of Object.entries(keyMappings)) {
      if (matchesShortcut(event, shortcut)) {
        action(event)
        event.preventDefault()
        return
      }
    }
  }

  protected getKeyMappings() {
    return this.universalKeyMappings
  }

  @eventListener('stage', 'dragover')
  protected onDragOver(event: DragEvent) {
    event.preventDefault()
  }
}
