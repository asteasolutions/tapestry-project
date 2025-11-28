import { elementIdFromLink } from 'tapestry-core-client/src/components/tapestry/items/text/viewer'
import { capturesPointerEvents } from 'tapestry-core-client/src/lib/dom'
import { createEventRegistry } from 'tapestry-core-client/src/lib/events/event-registry'
import { EventTypes } from 'tapestry-core-client/src/lib/events/typed-events'
import { isMeta } from 'tapestry-core-client/src/lib/keyboard-event'
import { TapestryStage } from 'tapestry-core-client/src/stage'
import { ItemController } from 'tapestry-core-client/src/stage/controller/item-controller'
import {
  DomDragHandler,
  DragEndEvent,
  DragEvent,
  DragStartEvent,
} from 'tapestry-core-client/src/stage/drag-handler'
import {
  isHoveredElement,
  isHoveredGroup,
  isHoveredMultiselection,
  obtainHoverTarget,
} from 'tapestry-core-client/src/stage/utils'
import {
  HoveredGroup,
  HoveredItem,
  HoveredMultiselection,
} from 'tapestry-core-client/src/view-model'
import { getSelectionItems, isItemInSelection } from 'tapestry-core-client/src/view-model/utils'
import { Id } from 'tapestry-core/src/data-format/schemas/common'
import { Point, Rectangle, translate, vector } from 'tapestry-core/src/lib/geometry'
import { router } from '../../main'
import { InteractionMode, TapestryEditorStore } from '../../pages/tapestry/view-model'
import {
  updateSelectionDragState,
  updateSelectionItems,
} from '../../pages/tapestry/view-model/store-commands/items'
import {
  selectGroups,
  selectItem,
  setInteractiveElement,
  setPointerInteraction,
  setSelectionRect,
  toggleGroupSelection,
  toggleItemSelection,
} from '../../pages/tapestry/view-model/store-commands/tapestry'
import {
  HoveredDragTarget,
  initDragState,
  isHoveredDragTarget,
  snapToGrid,
  updateTransformTargets,
} from '../utils'
import { ItemResizeManager, ResizeTarget } from './item-resize-manager'

type EventTypesMap = {
  resizeHandler: EventTypes<DomDragHandler>
  dragHandler: EventTypes<DomDragHandler>
  document: keyof DocumentEventMap
}

const { eventListener, attachListeners, detachListeners } = createEventRegistry<
  EventTypesMap,
  InteractionMode | 'desktop' | 'mobile'
>()

function isDraggingItems(
  event: DragEvent<HoveredDragTarget> | DragEndEvent<HoveredDragTarget>,
): event is DragEvent<HoveredDragTarget> | DragEndEvent<HoveredDragTarget> {
  return isHoveredDragTarget(event.detail.dragTarget)
}

function getDraggedItem(event: DragEvent<HoveredDragTarget> | DragStartEvent<HoveredDragTarget>) {
  const { dragTarget: draggedElement } = event.detail

  if (
    isHoveredElement(draggedElement) &&
    (draggedElement.uiComponent === 'dragHandle' || draggedElement.uiComponent === 'dragArea')
  ) {
    return draggedElement
  }
}

export class EditorItemController extends ItemController {
  private resizeHandler!: DomDragHandler
  private dragHandler!: DomDragHandler

  private resizeManager: ItemResizeManager

  constructor(
    private editorStore: TapestryEditorStore,
    stage: TapestryStage,
  ) {
    super(editorStore.as('base'), stage)
    this.resizeManager = new ItemResizeManager(editorStore, stage)
  }

  init() {
    super.init()
    this.resizeHandler = new DomDragHandler(this.stage.root, {
      dragStartThreshold: 0,
      determineDragTarget: (event): HoveredItem | HoveredMultiselection | null => {
        const hoverTarget = obtainHoverTarget(this.stage, event)
        return (hoverTarget?.type === 'item' || hoverTarget?.type === 'multiselection') &&
          hoverTarget.uiComponent?.startsWith('resizeHandle')
          ? hoverTarget
          : null
      },
    })

    this.dragHandler = new DomDragHandler(this.stage.root, {
      dragStartThreshold: 1,
      determineDragTarget: (event): HoveredDragTarget | null => {
        const target = event.target as HTMLElement
        const capturesEvents = capturesPointerEvents(target)
        const { pointerMode, selection } = this.store.get()

        // We are first checking if the user is dragging a handle or multi selection before checking the pointer mode,
        // otherwise on a mobile device, where the pointer mode is 'pan', the next condition will be triggered
        // and the drag target will not be moved
        const hoverTarget = obtainHoverTarget(this.stage, event)

        if (!isHoveredDragTarget(hoverTarget)) {
          return null
        }

        if (hoverTarget.uiComponent === 'dragHandle') {
          return hoverTarget
        }

        if (
          !capturesEvents &&
          hoverTarget.uiComponent === 'dragArea' &&
          (hoverTarget.type === 'multiselection' ||
            (hoverTarget.type === 'item' &&
              isItemInSelection(this.editorStore.get(`items.${hoverTarget.modelId}`), selection)) ||
            (hoverTarget.type === 'group' && selection.groupIds.has(hoverTarget.modelId)))
        ) {
          return hoverTarget
        }

        if (pointerMode === 'select' && hoverTarget.uiComponent === 'dragArea') {
          return hoverTarget
        }

        return null
      },
    })

    this.editorStore.subscribe('interactionMode', this.onInteractionModeChange)
    this.onInteractionModeChange(this.editorStore.get('interactionMode'))

    this.resizeHandler.activate()
    this.dragHandler.activate()
  }

  dispose() {
    super.dispose()
    this.store.unsubscribe(this.onInteractionModeChange)
    detachListeners(this, 'resizeHandler', this.resizeHandler)
    detachListeners(this, 'dragHandler', this.dragHandler)
    detachListeners(this, 'document', document)

    this.resizeHandler.deactivate()
    this.dragHandler.deactivate()
  }

  private onInteractionModeChange = (interactionMode: InteractionMode) => {
    attachListeners(this, 'resizeHandler', this.resizeHandler, interactionMode)
    attachListeners(this, 'dragHandler', this.dragHandler, interactionMode)
    attachListeners(this, 'document', document, interactionMode)
  }

  protected tryNavigateToInternalLink(link: string) {
    const { items, groups } = this.editorStore.get(['items', 'groups'])
    const id = elementIdFromLink(link, items, groups)
    if (id) {
      void router.navigate(
        { search: new URL(link).search },
        {
          state: { timestamp: Date.now() },
          replace: new URL(location.href).searchParams.get('focus') === id,
        },
      )
      return true
    }
    return false
  }

  protected handleActionItemClick(id: Id) {
    if (this.editorStore.get('interactionMode') === 'edit') {
      return false
    }
    return super.handleActionItemClick(id)
  }

  @eventListener('resizeHandler', 'dragstart', ['edit'])
  protected onResizeDragStart(event: DragStartEvent<ResizeTarget>) {
    this.stage.gestureDetector.deactivate()

    const { dragTarget: draggedTarget, originalEvent } = event.detail
    this.resizeManager.startResize(draggedTarget, {
      forceLockAspectRatio: !!originalEvent?.shiftKey,
    })
  }

  @eventListener('resizeHandler', 'drag', ['edit'])
  protected onResizeDrag(event: DragEvent<ResizeTarget>) {
    const { dragTarget, currentPoint, originalEvent } = event.detail
    this.resizeManager.resize(dragTarget, currentPoint, {
      snapToGrid: !originalEvent?.ctrlKey,
      forceLockAspectRatio: !!originalEvent?.shiftKey,
    })
  }

  @eventListener('document', 'keydown', ['edit'])
  protected onKeyDown(event: KeyboardEvent) {
    if (event.code.startsWith('Shift')) {
      this.resizeManager.forceLockAspectRatio(true)
    }
  }

  @eventListener('document', 'keyup', ['edit'])
  protected onKeyUp(event: KeyboardEvent) {
    if (event.code.startsWith('Shift')) {
      this.resizeManager.forceLockAspectRatio(false)
    }
  }

  @eventListener('dragHandler', 'dragstart')
  protected onDragStart(event: DragStartEvent<HoveredDragTarget>) {
    this.stage.gestureDetector.deactivate()
    const draggedItem = getDraggedItem(event)

    if (!(draggedItem && this.store.get('interactiveElement.modelId') === draggedItem.modelId)) {
      this.editorStore.dispatch(setInteractiveElement(null))
    }

    if (this.editorStore.get('interactionMode') !== 'edit') {
      return
    }

    if (draggedItem) {
      this.onStartDragItem(draggedItem, event.detail.originalEvent)
    } else if (isHoveredMultiselection(event.detail.dragTarget)) {
      this.onStartMultiselectionDrag(event.detail.dragTarget)
    } else if (isHoveredGroup(event.detail.dragTarget)) {
      this.onStartDragGroup(event.detail.dragTarget)
    }
  }

  private onStartMultiselectionDrag(draggedMultiselection: HoveredMultiselection) {
    this.editorStore.dispatch(
      setPointerInteraction('drag', draggedMultiselection, 'dom'),
      initDragState(draggedMultiselection),
    )
  }

  private onStartDragItem(draggedElement: HoveredItem, originalEvent?: MouseEvent | null) {
    const isMultiselect = originalEvent ? isMeta(originalEvent) || originalEvent.shiftKey : false
    const wasSelected = getSelectionItems(this.store.get(['selection', 'items'])).some(
      (item) => item.dto.id === draggedElement.modelId,
    )

    this.editorStore.dispatch(
      setPointerInteraction('drag', draggedElement, 'dom'),
      isMultiselect && !wasSelected && toggleItemSelection(draggedElement.modelId),
      !isMultiselect && !wasSelected && selectItem(draggedElement.modelId),
      initDragState(draggedElement),
    )
  }

  private onStartDragGroup(draggedGroup: HoveredGroup, originalEvent?: MouseEvent | null) {
    const isMultiselect = originalEvent ? isMeta(originalEvent) || originalEvent.shiftKey : false
    const wasSelected = this.store.get('selection.groupIds').has(draggedGroup.modelId)

    this.editorStore.dispatch(
      setPointerInteraction('drag', draggedGroup, 'dom'),
      isMultiselect && !wasSelected && toggleGroupSelection(draggedGroup.modelId),
      !isMultiselect && !wasSelected && selectGroups([draggedGroup.modelId]),
      initDragState({ type: 'multiselection', uiComponent: 'dragArea' }),
    )
  }

  @eventListener('resizeHandler', 'dragend', ['edit'])
  protected onResizeEnd() {
    this.stage.gestureDetector.activate()
    this.resizeManager.endResize()
  }

  @eventListener('dragHandler', 'dragend')
  protected onDragEnd(e: DragEndEvent<HoveredDragTarget | ResizeTarget>) {
    this.stage.gestureDetector.activate()
    this.editorStore.dispatch(
      isDraggingItems(e)
        ? setPointerInteraction('hover', e.detail.dragTarget)
        : setPointerInteraction(null),
      setSelectionRect(null),
      updateSelectionItems({ dragState: null }),
      (model) => {
        model.selectionDragState = null
      },
    )
  }

  @eventListener('dragHandler', 'drag')
  protected onDrag(event: DragEvent<HoveredDragTarget>) {
    if (this.editorStore.get('interactionMode') === 'edit' && isDraggingItems(event)) {
      this.onDragItems(event)
    } else {
      this.onDragSelectionRect(event.detail.currentPoint)
    }
  }

  private onDragSelectionRect(cursorLocation: Point) {
    const pointerSelection = this.store.get('pointerSelection')
    if (!pointerSelection) return

    const point = this.stage.pixi.tapestry.stage.worldTransform.applyInverse(cursorLocation)
    this.editorStore.dispatch(
      setSelectionRect(
        new Rectangle(pointerSelection.rect.position, {
          width: point.x - pointerSelection.rect.position.x,
          height: point.y - pointerSelection.rect.position.y,
        }),
      ),
    )
  }

  private onDragItems(event: DragEvent<HoveredDragTarget>) {
    const { worldTransform } = this.stage.pixi.tapestry.stage
    const guidelineSpacing = event.detail.originalEvent?.ctrlKey
      ? null
      : this.editorStore.get('viewportGuidelines.spacing')
    const previousStagePoint = worldTransform.applyInverse(event.detail.previousPoint)
    const currentStagePoint = worldTransform.applyInverse(event.detail.currentPoint)
    const translation = vector(previousStagePoint, currentStagePoint)

    const selectionDragState = this.editorStore.get('selectionDragState')!

    const newSelectionPosition = translate(selectionDragState.position, translation)

    const itemTranslation = vector(
      selectionDragState.initialPosition,
      snapToGrid(newSelectionPosition, guidelineSpacing),
    )

    this.editorStore.dispatch(
      updateSelectionDragState(newSelectionPosition),
      updateTransformTargets(
        isHoveredGroup(event.detail.dragTarget)
          ? { type: 'multiselection', uiComponent: 'dragArea' }
          : event.detail.dragTarget,
        (item) => {
          if (item.dragState) {
            item.dto.position = translate(item.dragState.initialPosition, itemTranslation)
          }
        },
      ),
    )
  }
}
