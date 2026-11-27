import { Graphics } from 'pixi.js'
import { EditableItemViewModel, TapestryEditorStore } from '../../pages/tapestry/view-model'
import { TapestryStage } from 'tapestry-core-client/src/stage'
import {
  ItemRenderer,
  ItemRenderState,
} from 'tapestry-core-client/src/stage/renderer/item-renderer'
import {
  CommentsIndicatorContainer,
  CommentsIndicatorContainerState,
} from './comments-indicator-container'
import { Point } from 'tapestry-core/src/lib/geometry'
import { THEMES } from 'tapestry-core-client/src/theme/themes'

const DEFAULT_ITEM_Z_INDEX = 1

export const ITEM_BORDER_RADIUS = 8

const COMMENTS_INDICATOR_OFFSET = 4

export class EditorItemRenderer<T extends EditableItemViewModel> extends ItemRenderer<T> {
  private preview = new Graphics({ label: 'preview', zIndex: 0 })
  private commentsIndicator?: CommentsIndicatorContainer

  constructor(
    private editorStore: TapestryEditorStore,
    stage: TapestryStage,
    viewModel: T,
  ) {
    super(editorStore.as('base'), stage, viewModel)

    this.pixiContainer.zIndex = DEFAULT_ITEM_Z_INDEX
  }

  protected hasButtonFeedback() {
    return this.editorStore.get('interactionMode') !== 'edit'
  }

  private drawPreview(state: ItemRenderState<T>) {
    const {
      viewModel: { previewBounds },
      theme,
    } = state
    if (previewBounds) {
      const { left, top, width, height } = previewBounds

      this.preview
        .clear()
        .roundRect(left, top, width, height, ITEM_BORDER_RADIUS)
        .fill({ color: THEMES[theme].color('background.secondaryInverse'), alpha: 0.25 })

      if (!this.preview.parent) {
        this.pixiContainer.addChild(this.preview)
      }
    } else {
      this.preview.removeFromParent()
    }
  }

  private obtainCommentIndicatorContainerState(
    state: ItemRenderState<T>,
  ): CommentsIndicatorContainerState & { position: Point } {
    const {
      commentThread,
      dto: { size, position },
    } = state.viewModel

    const bgColor = THEMES[state.theme].color('background.disabled')

    return {
      position: {
        x: position.x + size.width - COMMENTS_INDICATOR_OFFSET,
        y: position.y - COMMENTS_INDICATOR_OFFSET,
      },
      bgColor,
      fgColor: CommentsIndicatorContainer.getDefaultFgColor(bgColor, THEMES[state.theme]),
      commentsCount: commentThread?.size ?? 0,
    }
  }

  private updateCommentIndicator(state: ItemRenderState<T>) {
    const indicatorState = this.obtainCommentIndicatorContainerState(state)

    if (indicatorState.commentsCount === 0) {
      if (!this.commentsIndicator) {
        return
      }
      this.commentsIndicator.visible = false
    } else {
      if (!this.commentsIndicator) {
        this.commentsIndicator = new CommentsIndicatorContainer(indicatorState, 'bottom-right')
        this.pixiContainer.addChild(this.commentsIndicator)
      } else {
        this.commentsIndicator.visible = true
        this.commentsIndicator.update(indicatorState)
      }
      this.commentsIndicator.position = indicatorState.position
    }
  }

  protected doRender(state: ItemRenderState<T>): void {
    super.doRender(state)
    this.drawPreview(state)
    this.updateCommentIndicator(state)
  }
}
