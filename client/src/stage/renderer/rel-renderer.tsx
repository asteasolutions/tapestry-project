import { isPoint, Point, Vector } from 'tapestry-core/src/lib/geometry'
import {
  computeRelCurvePoints,
  curveDirection,
} from 'tapestry-core-client/src/view-model/rel-geometry'
import { RelRenderer, RelRenderState } from 'tapestry-core-client/src/stage/renderer/rel-renderer'
import { EditableRelViewModel, TapestryEditorStore } from '../../pages/tapestry/view-model'
import { ItemViewModel, TapestryViewModel } from 'tapestry-core-client/src/view-model'
import { IdMap } from 'tapestry-core/src/utils'
import { TapestryStage } from 'tapestry-core-client/src/stage'
import { RelEndpoint } from 'tapestry-core/src/data-format/schemas/rel'
import { Store } from 'tapestry-core-client/src/lib/store'
import {
  CommentsIndicatorContainer,
  CommentsIndicatorContainerState,
} from './comments-indicator-container'
import { THEMES } from 'tapestry-core-client/src/theme/themes'

export class EditorRelRenderer extends RelRenderer<EditableRelViewModel> {
  private commentsIndicator?: CommentsIndicatorContainer

  constructor(
    editorStore: TapestryEditorStore,
    stage: TapestryStage,
    viewModel: EditableRelViewModel,
  ) {
    super(editorStore.as('base'), stage, viewModel)
  }

  protected obtainRenderState(
    viewModel: EditableRelViewModel,
    store: Store<TapestryViewModel>,
  ): RelRenderState<EditableRelViewModel> {
    const state = super.obtainRenderState(viewModel, store)
    const { dragState } = state.viewModel
    if (dragState?.endpoint && !isPoint(dragState.position)) {
      state[`${dragState.endpoint}Item`] = store.get('items')[dragState.position.itemId]!
    }
    return state
  }

  protected computeRelCurvePoints(
    viewModel: EditableRelViewModel,
    relScale: number,
    items: IdMap<ItemViewModel>,
  ) {
    return computeRelCurvePoints<EditableRelViewModel>(
      viewModel,
      relScale,
      items,
      (relViewModel, endpoint) => {
        if (
          relViewModel.dragState?.endpoint === endpoint &&
          isPoint(relViewModel.dragState.position)
        ) {
          return relViewModel.dragState.position
        }

        const relEndpoint =
          relViewModel.dragState?.endpoint === endpoint
            ? (relViewModel.dragState.position as Omit<RelEndpoint, 'arrowhead'>)
            : relViewModel.dto[endpoint]

        const { dto } = items[relEndpoint.itemId]!

        return {
          x: dto.position.x + relEndpoint.anchor.x * dto.size.width,
          y: dto.position.y + relEndpoint.anchor.y * dto.size.height,
        }
      },
      (viewModel, endpointName) => {
        let dir: Vector | undefined
        if (viewModel.dragState?.endpoint !== endpointName) {
          dir = curveDirection(viewModel.dto[endpointName].anchor)
        } else if (!isPoint(viewModel.dragState.position)) {
          dir = curveDirection(viewModel.dragState.position.anchor)
        }
        return dir
      },
    )
  }

  private obtainCommentIndicatorContainerState({
    viewModel,
    fromItem,
    toItem,
    theme,
    relScale,
  }: RelRenderState<EditableRelViewModel>):
    | (CommentsIndicatorContainerState & { position: Point })
    | undefined {
    if (!fromItem || !toItem) {
      return
    }

    const curve = this.computeRelCurvePoints(viewModel, relScale, {
      [fromItem.dto.id]: fromItem,
      [toItem.dto.id]: toItem,
    })

    const bgColor = viewModel.dto.color

    return {
      position: {
        x: curve.points.middle.x,
        y: curve.points.middle.y,
      },
      bgColor,
      fgColor: CommentsIndicatorContainer.getDefaultFgColor(bgColor, THEMES[theme]),
      commentsCount: viewModel.commentThread?.size ?? 0,
    }
  }

  private updateCommentIndicator(state: RelRenderState<EditableRelViewModel>) {
    const indicatorState = this.obtainCommentIndicatorContainerState(state)
    if (!indicatorState) {
      return
    }

    if (indicatorState.commentsCount === 0) {
      if (!this.commentsIndicator) {
        return
      }
      this.commentsIndicator.visible = false
    } else {
      if (!this.commentsIndicator) {
        this.commentsIndicator = new CommentsIndicatorContainer(indicatorState, 'center')
        this.pixiContainer.addChild(this.commentsIndicator)
      } else {
        this.commentsIndicator.visible = true
        this.commentsIndicator.update(indicatorState)
      }
      this.commentsIndicator.position = indicatorState.position
    }
  }

  protected doRender(
    state: RelRenderState<EditableRelViewModel>,
    changedKeys: (keyof RelRenderState<EditableRelViewModel>)[],
  ) {
    super.doRender(state, changedKeys)
    this.updateCommentIndicator(state)
  }
}
