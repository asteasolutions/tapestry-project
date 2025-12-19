import { Rectangle } from 'tapestry-core/src/lib/geometry'
import { isMeta } from '../../lib/keyboard-event'
import { createEventRegistry } from '../../lib/events/event-registry'
import { EventTypes } from '../../lib/events/typed-events'
import { DragStartEvent, DragEvent, DomDragHandler } from '../drag-handler'
import { ClickEvent, GestureDetector } from '../gesture-detector'
import {
  isHoveredItem,
  isHoveredGroup,
  isHoveredRel,
  obtainHoveredDomTarget,
  obtainHoverTarget,
} from '../utils'
import { capturesPointerEvents, isTouchEvent } from '../../lib/dom'
import { Store } from '../../lib/store/index'
import {
  LongPressDetector,
  LongPressDownEvent,
  LongPressUpEvent,
} from '../../lib/long-press-detector'
import { isMobile } from '../../lib/user-agent'
import { TapestryViewModel } from '../../view-model'
import { TapestryStage } from '..'
import { TapestryStageController } from '.'
import {
  deselectAll,
  selectGroups,
  setInteractiveElement,
  setPointerInteraction,
  setPointerMode,
  setSelectionRect,
  toggleGroupSelection,
  toggleItemSelection,
} from '../../view-model/store-commands/tapestry'
import { isSingleGroupSelected } from '../../view-model/utils'
import { isHTTPURL } from 'tapestry-core/src/utils'
import { Id } from 'tapestry-core/src/data-format/schemas/common'

type EventTypesMap = {
  gesture: EventTypes<GestureDetector>
  selection: EventTypes<DomDragHandler>
  longPress: EventTypes<LongPressDetector>
}

const { eventListener, attachListeners, detachListeners } = createEventRegistry<
  EventTypesMap,
  'desktop' | 'mobile'
>()

export abstract class ItemController implements TapestryStageController {
  private selectionHandler!: DomDragHandler
  private longPressDetector: LongPressDetector

  constructor(
    protected store: Store<TapestryViewModel>,
    protected stage: TapestryStage,
  ) {
    this.longPressDetector = new LongPressDetector(stage.root)
  }

  init() {
    this.selectionHandler = new DomDragHandler(this.stage.root, {
      dragStartThreshold: 1,
      determineDragTarget: (event): TapestryStage | null => {
        if (this.store.get('pointerMode') !== 'select') {
          return null
        }

        const hoverTarget = obtainHoverTarget(this.stage, event)
        return hoverTarget || capturesPointerEvents(event.target as HTMLElement) ? null : this.stage
      },
    })

    this.selectionHandler.activate()
    this.longPressDetector.activate()

    attachListeners(this, 'selection', this.selectionHandler)
    attachListeners(this, 'gesture', this.stage.gestureDetector)
    attachListeners(this, 'longPress', this.longPressDetector, isMobile ? 'mobile' : 'desktop')
  }

  dispose() {
    detachListeners(this, 'selection', this.selectionHandler)
    detachListeners(this, 'gesture', this.stage.gestureDetector)
    detachListeners(this, 'longPress', this.longPressDetector)

    this.selectionHandler.deactivate()
    this.longPressDetector.deactivate()
  }

  @eventListener('gesture', 'click')
  protected onClickItem({ detail: { hoverTarget, originalEvent } }: ClickEvent) {
    const isMultiselect = isMeta(originalEvent) || originalEvent.shiftKey

    // XXX: Here we depend on the existence of a UI component named 'dragArea'.
    const isItemClicked = isHoveredItem(hoverTarget) && hoverTarget.uiComponent === 'dragArea'
    const isRelClicked =
      isHoveredRel(hoverTarget) &&
      (hoverTarget.uiComponent === 'line-highlight-from' ||
        hoverTarget.uiComponent === 'line-highlight-to' ||
        hoverTarget.uiComponent === 'line')
    const clickedItemGroupId =
      isItemClicked && this.store.get(`items.${hoverTarget.modelId}.dto.groupId`)
    const clickedGroupId =
      (isHoveredGroup(hoverTarget) && hoverTarget.modelId) || clickedItemGroupId

    const selection = this.store.get('selection')
    // clicking on an item in a standalone selected group should make the item interactive
    // while preserving the selection
    const shouldActivateGroupedItem =
      clickedItemGroupId &&
      isSingleGroupSelected(selection) &&
      selection.groupIds.has(clickedItemGroupId)

    let preventClick = false
    const interactiveElement = this.store.get('interactiveElement')

    if (isMultiselect) {
      if (isItemClicked) {
        preventClick = true
        this.store.dispatch(toggleItemSelection(hoverTarget.modelId))
      } else if (clickedGroupId) {
        this.store.dispatch(toggleGroupSelection(clickedGroupId))
      }
    } else if (clickedGroupId && !shouldActivateGroupedItem) {
      // selecting a single group
      preventClick = true
      this.store.dispatch(selectGroups([clickedGroupId]))
    } else if (isItemClicked || isRelClicked) {
      const handled = this.handleActionItemClick(hoverTarget.modelId)
      if (!handled) {
        // activating a rel or item
        preventClick = interactiveElement?.modelId !== hoverTarget.modelId
        this.store.dispatch(
          setInteractiveElement({ modelType: hoverTarget.type, modelId: hoverTarget.modelId }),
        )
      }
    } else if (isHoveredGroup(hoverTarget)) {
      // clicking on empty space inside a standalone group
      preventClick = !!interactiveElement
      this.store.dispatch(setInteractiveElement(null))
    } else {
      // clicking inside a non-group multiselection, or on the canvas
      this.store.dispatch(deselectAll())
    }

    if (preventClick && isTouchEvent(originalEvent)) {
      //https://web.archive.org/web/20210924114816/https://developer.mozilla.org/en-US/docs/Web/API/Touch_events/Supporting_both_TouchEvent_and_MouseEvent
      originalEvent.preventDefault()
    }
  }

  @eventListener('selection', 'dragstart')
  protected onSelectionStart(event: DragStartEvent<TapestryStage>) {
    this.stage.gestureDetector.deactivate()

    const point = this.stage.pixi.tapestry.stage.worldTransform.applyInverse(
      event.detail.currentPoint,
    )
    this.store.dispatch(
      setInteractiveElement(null),
      setPointerInteraction('select', null, 'pixi'),
      setSelectionRect(new Rectangle(point.x, point.y, 1, 1)),
    )
  }

  @eventListener('selection', 'dragend')
  protected onSelectionEnd() {
    this.stage.gestureDetector.activate()
    this.store.dispatch(setPointerInteraction(null), setSelectionRect(null))
  }

  @eventListener('selection', 'drag')
  protected onSelectionDrag(event: DragEvent<TapestryStage>) {
    const pointerSelection = this.store.get('pointerSelection')
    if (!pointerSelection) return

    const point = this.stage.pixi.tapestry.stage.worldTransform.applyInverse(
      event.detail.currentPoint,
    )
    this.store.dispatch(
      setSelectionRect(
        new Rectangle(pointerSelection.rect.position, {
          width: point.x - pointerSelection.rect.position.x,
          height: point.y - pointerSelection.rect.position.y,
        }),
      ),
    )
  }

  @eventListener('longPress', 'down', ['mobile'])
  protected onLongPressDown(event: LongPressDownEvent) {
    const hoverTarget = obtainHoveredDomTarget(event.detail.target as HTMLElement)
    if (hoverTarget?.type === 'item') {
      this.store.dispatch(toggleItemSelection(hoverTarget.modelId))
    } else {
      this.store.dispatch(setPointerMode('select'))
      // XXX: We should also simulate "dragstart" for dragging items around in the editor.
      this.selectionHandler.simulateDragStart(event, event.detail)
    }
  }

  @eventListener('longPress', 'up', ['mobile'])
  protected onLongPressUp(_event: LongPressUpEvent) {
    this.store.dispatch(setPointerMode('pan'))
  }

  protected abstract tryNavigateToInternalState(params: URLSearchParams): boolean

  protected handleActionItemClick(id: Id) {
    const item = this.store.get(`items.${id}.dto`)
    if (item?.type === 'actionButton' && item.action) {
      if (item.actionType === 'internalLink') {
        const params = new URLSearchParams(item.action)
        return this.tryNavigateToInternalState(params)
      }

      if (isHTTPURL(item.action)) {
        window.open(item.action)
        return true
      }
    }
    return false
  }
}
