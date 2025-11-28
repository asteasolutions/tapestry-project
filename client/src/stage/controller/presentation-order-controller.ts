import { createEventRegistry } from 'tapestry-core-client/src/lib/events/event-registry'
import { EventTypes } from 'tapestry-core-client/src/lib/events/typed-events'
import {
  DragEndEvent,
  DragEvent,
  DragStartEvent,
  PixiDragHandler,
} from 'tapestry-core-client/src/stage/drag-handler'
import { PresentationOrderRenderer } from '../renderer/presentation-order-renderer'
import { AllFederatedEventMap, FederatedPointerEvent } from 'pixi.js'
import { getPresentationSequence, idMapToArray } from 'tapestry-core/src/utils'
import { reassignPresentationStep } from '../../pages/tapestry/view-model/utils'
import { PresentationStepDto } from 'tapestry-shared/src/data-transfer/resources/dtos/presentation-step'
import { getPresentedModelId } from 'tapestry-core/src/utils'
import {
  createPresentationStep,
  deletePresentationSteps,
} from '../../pages/tapestry/view-model/store-commands/presentation-steps'
import { mapValues } from 'lodash'
import {
  EditablePresentationStepViewModel,
  EditableTapestryViewModel,
  TapestryEditorStore,
} from '../../pages/tapestry/view-model'
import { TapestryStageController } from 'tapestry-core-client/src/stage/controller'
import { TapestryStage } from 'tapestry-core-client/src/stage'
import { getPresentationIndex } from 'tapestry-core-client/src/view-model/utils'

type EventTypesMap = {
  dragHandler: EventTypes<PixiDragHandler>
  stage: keyof AllFederatedEventMap
}

const { eventListener, attachListeners, detachListeners } = createEventRegistry<EventTypesMap>()

type DragTarget = EditablePresentationStepViewModel

export class PresentationOrderController implements TapestryStageController {
  private renderer: PresentationOrderRenderer | null = null
  private dragHandler: PixiDragHandler<DragTarget>
  private maybeRemoveId: string | null = null

  constructor(
    private store: TapestryEditorStore,
    private stage: TapestryStage<'presentationOrder'>,
  ) {
    this.dragHandler = new PixiDragHandler<DragTarget>(this.stage.pixi.presentationOrder.stage, {
      dragStartThreshold: 1,
      determineDragTarget: (event) => {
        const { id, uiComponent } = this.obtainHoveredUIElement(event.target.label) ?? {}
        if (!id || uiComponent !== 'slot') return null

        return (
          idMapToArray(this.store.get('presentationSteps')).find(
            ({ dto }) => getPresentedModelId(dto) === id,
          ) ?? null
        )
      },
    })
  }

  private obtainHoveredUIElement(label?: string):
    | {
        type: PresentationStepDto['type']
        id: string
        uiComponent: 'slot' | 'overlay'
      }
    | undefined {
    const [type, id, uiComponent] = label?.split('_') ?? []
    return id
      ? {
          id,
          type: type as PresentationStepDto['type'],
          uiComponent: uiComponent as 'slot' | 'overlay',
        }
      : undefined
  }

  init() {
    this.renderer = new PresentationOrderRenderer(this.store, this.stage)
    attachListeners(this, 'dragHandler', this.dragHandler)
    attachListeners(this, 'stage', this.stage.pixi.presentationOrder.stage)
    this.dragHandler.activate()
    this.store.subscribe(this.onStoreChange)
  }

  dispose() {
    this.renderer?.dispose()
    this.renderer = null
    detachListeners(this, 'dragHandler', this.dragHandler)
    detachListeners(this, 'stage', this.stage.pixi.presentationOrder.stage)
    this.dragHandler.deactivate()
    this.store.unsubscribe(this.onStoreChange)
  }

  private onStoreChange = (model: EditableTapestryViewModel) => {
    this.renderer?.render(model)
  }

  @eventListener('stage', 'pointertap')
  protected click(event: FederatedPointerEvent) {
    const { id, type } = this.obtainHoveredUIElement(event.target.label) ?? {}
    if (!id || !type) return

    const sequence = getPresentationSequence(
      mapValues(this.store.get('presentationSteps'), (vm) => vm?.dto),
    )
    const step = sequence.find((dto) => getPresentedModelId(dto) === id)
    if (step) {
      if (this.maybeRemoveId === id) {
        this.store.dispatch(deletePresentationSteps(step.id))
      } else {
        this.maybeRemoveId = id
        setTimeout(() => {
          if (this.maybeRemoveId === id) {
            this.maybeRemoveId = null
          }
        }, 500)
      }
    } else {
      const prevStepId = sequence.at(-1)?.id
      this.store.dispatch(
        createPresentationStep({
          dto:
            type === 'item'
              ? { type: 'item', itemId: id, prevStepId }
              : { type: 'group', groupId: id, prevStepId },
        }),
      )
    }
  }

  @eventListener('dragHandler', 'dragstart')
  protected onPixiDragStart(event: DragStartEvent<DragTarget>) {
    this.stage.gestureDetector.deactivate()
    const position = this.stage.pixi.presentationOrder.stage.worldTransform.applyInverse(
      event.detail.currentPoint,
    )
    const sequence = getPresentationSequence(
      mapValues(this.store.get('presentationSteps'), (vm) => vm?.dto),
    )
    const stepIndex = getPresentationIndex(sequence, event.detail.dragTarget.dto)
    this.store.dispatch((model) => {
      model.presentationOrderState!.dragState = { stepIndex, position }
    })
  }

  @eventListener('dragHandler', 'dragend')
  protected onPixiDragEnd(event: DragEndEvent<DragTarget>) {
    this.stage.gestureDetector.activate()
    this.store.dispatch((model) => {
      const state = model.presentationOrderState!
      const dropTarget = state.dragState?.dropTarget
      if (dropTarget) {
        const dropTargetStep = idMapToArray(this.store.get('presentationSteps')).find(
          ({ dto }) => getPresentedModelId(dto) === dropTarget.id,
        )
        const dragTargetId = event.detail.dragTarget.dto.id
        const sourceDto = model.presentationSteps[dragTargetId]!.dto
        if (dropTargetStep) {
          const targetDto = model.presentationSteps[dropTargetStep.dto.id]!.dto
          reassignPresentationStep(targetDto, sourceDto.type, getPresentedModelId(sourceDto))
        }
        reassignPresentationStep(sourceDto, dropTarget.type, dropTarget.id)
      }
      delete state.dragState
    })
  }

  @eventListener('dragHandler', 'drag')
  protected onPixiDrag(event: DragEvent<DragTarget>) {
    const { worldTransform } = this.stage.pixi.presentationOrder.stage
    const pointerPosition = worldTransform.applyInverse(event.detail.currentPoint)

    const hoveredElement = this.stage.pixi.presentationOrder.renderer.events.rootBoundary.hitTest(
      event.detail.currentPoint.x,
      event.detail.currentPoint.y,
    )

    const dropTarget = this.obtainHoveredUIElement(hoveredElement.label)

    this.store.dispatch((model) => {
      const dragState = model.presentationOrderState!.dragState!
      dragState.position = pointerPosition
      dragState.dropTarget = dropTarget
    })
  }
}
