import { isPoint, Point } from 'tapestry-core/src/lib/geometry'
import { TapestryStage } from 'tapestry-core-client/src/stage'
import { HoveredItem, HoveredRel } from 'tapestry-core-client/src/view-model'
import { InteractionMode, TapestryEditorStore } from '../../pages/tapestry/view-model'
import { createEventRegistry } from 'tapestry-core-client/src/lib/events/event-registry'
import { EventTypes } from 'tapestry-core-client/src/lib/events/typed-events'
import {
  DragEndEvent,
  DragEvent as DragHandlerDragEvent,
  DragStartEvent,
  DomDragHandler,
} from 'tapestry-core-client/src/stage/drag-handler'
import { obtainHoveredDomTarget, obtainHoverTarget } from 'tapestry-core-client/src/stage/utils'
import { snapToItem } from '../utils'
import { userSettings } from '../../services/user-settings'
import { RelUpdateDto } from 'tapestry-shared/src/data-transfer/resources/dtos/rel'
import {
  selectItem,
  setInteractiveElement,
  setPointerInteraction,
} from '../../pages/tapestry/view-model/store-commands/tapestry'
import {
  applyNewRelPreview,
  setNewRelPreview,
  updateRel,
} from '../../pages/tapestry/view-model/store-commands/rels'
import { idMapToArray } from 'tapestry-core/src/utils'
import { createRelViewModel } from '../../pages/tapestry/view-model/utils'
import { RelEndpoint } from 'tapestry-core/src/data-format/schemas/rel'
import { TapestryStageController } from 'tapestry-core-client/src/stage/controller'

type EventTypesMap = {
  relDragHandler: EventTypes<DomDragHandler>
  anchorDragHandler: EventTypes<DomDragHandler>
}

const { eventListener, attachListeners, detachListeners } = createEventRegistry<
  EventTypesMap,
  InteractionMode
>()

export class EditorRelController implements TapestryStageController {
  private relDragHandler!: DomDragHandler
  private anchorDragHandler!: DomDragHandler

  constructor(
    private store: TapestryEditorStore,
    private stage: TapestryStage,
  ) {
    this.relDragHandler = new DomDragHandler(this.stage.root, {
      dragStartThreshold: 1,
      determineDragTarget: (event) => {
        const hoveredElement = obtainHoverTarget(this.stage, event)
        if (!hoveredElement) return null

        const isHoveredRelActive =
          hoveredElement.type === 'rel' &&
          hoveredElement.modelId === store.get('interactiveElement.modelId')

        if (this.store.get('pointerMode') !== 'select' && !isHoveredRelActive) return null

        return hoveredElement.type === 'rel' && hoveredElement.uiComponent?.startsWith('line')
          ? hoveredElement
          : null
      },
    })
    this.anchorDragHandler = new DomDragHandler(this.stage.root, {
      dragStartThreshold: 0,
      determineDragTarget: (event): HoveredItem | null => {
        const hoverTarget = obtainHoveredDomTarget(event.target as HTMLElement)
        return hoverTarget?.type === 'item' &&
          hoverTarget.uiComponent?.startsWith('createRelAnchor')
          ? hoverTarget
          : null
      },
    })
  }

  init() {
    this.store.subscribe('interactionMode', this.onInteractionModeChange)
    this.onInteractionModeChange(this.store.get('interactionMode'))

    this.relDragHandler.activate()
    this.anchorDragHandler.activate()
  }

  dispose() {
    this.store.unsubscribe(this.onInteractionModeChange)
    detachListeners(this, 'anchorDragHandler', this.anchorDragHandler)
    detachListeners(this, 'relDragHandler', this.relDragHandler)

    this.relDragHandler.deactivate()
    this.anchorDragHandler.deactivate()
  }

  private onInteractionModeChange = (interactionMode: InteractionMode) => {
    attachListeners(this, 'anchorDragHandler', this.anchorDragHandler, interactionMode)
    attachListeners(this, 'relDragHandler', this.relDragHandler, interactionMode)
  }

  @eventListener('relDragHandler', 'dragstart', ['edit'])
  protected onRelDragStart(event: DragStartEvent<HoveredRel>) {
    this.stage.gestureDetector.deactivate()

    const draggedElement = event.detail.dragTarget
    const { uiComponent, modelId } = draggedElement
    if (!uiComponent?.startsWith('line-highlight')) return

    const endpoint = uiComponent.endsWith('from') ? 'from' : 'to'
    const position = this.stage.pixi.tapestry.stage.worldTransform.applyInverse(
      event.detail.currentPoint,
    )

    this.store.dispatch(
      setPointerInteraction('drag', draggedElement, 'pixi'),
      selectItem(null),
      updateRel(modelId, { dragState: { endpoint, position } }),
    )
  }

  @eventListener('relDragHandler', 'dragend', ['edit'])
  protected onRelDragEnd(event: DragEndEvent<HoveredRel>) {
    this.stage.gestureDetector.activate()

    const { modelId } = event.detail.dragTarget

    this.store.dispatch(
      applyNewRelPreview(),
      setPointerInteraction('hover', event.detail.dragTarget),
      updateRel(modelId, (rel) => {
        if (!rel.dragState) {
          return
        }

        let params: RelUpdateDto | undefined
        if (!isPoint(rel.dragState.position)) {
          // Snap to other element
          params = {
            [rel.dragState.endpoint]: {
              arrowhead: rel.dto[rel.dragState.endpoint].arrowhead,
              ...rel.dragState.position,
            },
          }
        }

        rel.dragState = null
        Object.assign(rel.dto, params)
        this.store.dispatch(setInteractiveElement({ modelType: 'rel', modelId: rel.dto.id }))
      }),
    )
  }

  @eventListener('relDragHandler', 'drag', ['edit'])
  protected onRelDrag(event: DragHandlerDragEvent<HoveredRel>) {
    const { modelId } = event.detail.dragTarget
    const { worldTransform } = this.stage.pixi.tapestry.stage

    const pointerPosition = worldTransform.applyInverse(event.detail.currentPoint)
    this.store.dispatch(
      updateRel(modelId, (rel) => {
        if (!rel.dragState) {
          return
        }

        for (const { dto: item } of idMapToArray(this.store.get('items'))) {
          const snapAnchorPoint = snapToItem(
            pointerPosition,
            item,
            this.store.get('viewport.transform.scale'),
          )
          if (snapAnchorPoint) {
            rel.dragState.position = {
              itemId: item.id,
              anchor: snapAnchorPoint,
            }
            return
          }
        }

        rel.dragState.position = pointerPosition
      }),
    )
  }

  @eventListener('anchorDragHandler', 'dragstart', ['edit'])
  protected onAnchorDragStart(event: DragStartEvent<HoveredRel>) {
    const draggedElement = event.detail.dragTarget
    if (!draggedElement.uiComponent?.startsWith('createRelAnchor')) {
      return
    }

    const direction = draggedElement.uiComponent.slice('createRelAnchor'.length).toLowerCase()
    const anchor = {
      top: { x: 0.5, y: 0 },
      right: { x: 1, y: 0.5 },
      bottom: { x: 0.5, y: 1 },
      left: { x: 0, y: 0.5 },
    }[direction] as Point

    const relEndpoint: RelEndpoint = {
      itemId: draggedElement.modelId,
      anchor,
      arrowhead: 'none',
    }

    const relViewModel = createRelViewModel({
      color: userSettings.currentSettings.relColorCode,
      weight: 'light',
      from: relEndpoint,
      to: { ...relEndpoint, arrowhead: 'arrow' },
      tapestryId: this.store.get('id'),
    })
    this.store.dispatch(setNewRelPreview(relViewModel))

    this.relDragHandler.simulateDragStart(
      {
        modelId: relViewModel.dto.id,
        modelType: 'rel',
        uiComponent: 'line-highlight-to',
      },
      event.detail.currentPoint,
    )
  }
}
