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
import { get } from 'lodash-es'

type EventTypesMap = {
  stage: keyof HTMLElementEventMap
  document: keyof DocumentEventMap
}

const { eventListener, attachListeners, detachListeners } = createEventRegistry<EventTypesMap>()

interface DeactivateMessage {
  type: 'tapestry:deactivate'
}

interface FocusMessage {
  type: 'tapestry:focus'
  itemId?: string
  animate?: boolean
}

type TapestryPostMessageData = DeactivateMessage | FocusMessage

function isTapestryPostMessageData(data: unknown): data is TapestryPostMessageData {
  const type = get(data, 'type') as string | undefined
  return !!type && ['tapestry:deactivate', 'tapestry:focus'].includes(type)
}

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
    if (!isTapestryPostMessageData(event.data)) return

    if (event.data.type === 'tapestry:deactivate') {
      this.store.dispatch(deselectAll(), setInteractiveElement(null))
    } else {
      const { itemId, animate } = event.data
      this.store.dispatch(
        focusItems(itemId && [itemId], { addToolbarPadding: true, animate }),
        itemId ? setInteractiveElement({ modelId: itemId, modelType: 'item' }) : null,
      )
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
