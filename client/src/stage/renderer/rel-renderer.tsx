import { isPoint, Vector } from 'tapestry-core/src/lib/geometry'
import {
  computeRelCurvePoints,
  curveDirection,
} from 'tapestry-core-client/src/view-model/rel-geometry'
import { RelRenderer } from 'tapestry-core-client/src/stage/renderer/rel-renderer'
import { EditableRelViewModel, TapestryEditorStore } from '../../pages/tapestry/view-model'
import { ItemViewModel, Viewport } from 'tapestry-core-client/src/view-model'
import { IdMap } from 'tapestry-core/src/utils'
import { TapestryStage } from 'tapestry-core-client/src/stage'
import { RelEndpoint } from 'tapestry-core/src/data-format/schemas/rel'

export class EditorRelRenderer extends RelRenderer<EditableRelViewModel> {
  constructor(
    editorStore: TapestryEditorStore,
    stage: TapestryStage,
    viewModel: EditableRelViewModel,
  ) {
    super(editorStore.as('base'), stage, viewModel)
  }

  protected computeRelCurvePoints(
    viewModel: EditableRelViewModel,
    viewport: Viewport,
    items: IdMap<ItemViewModel>,
  ) {
    return computeRelCurvePoints<EditableRelViewModel>(
      viewModel,
      viewport,
      items,
      (relViewModel, endpoint, items) => {
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
}
