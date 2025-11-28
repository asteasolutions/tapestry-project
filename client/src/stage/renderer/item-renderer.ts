import { Graphics } from 'pixi.js'
import { THEMES } from 'tapestry-core-client/src/theme/themes'
import { EditableItemViewModel, TapestryEditorStore } from '../../pages/tapestry/view-model'
import { TapestryElementRenderer } from 'tapestry-core-client/src/stage/renderer/tapestry-element-renderer'
import { TapestryStage } from 'tapestry-core-client/src/stage'

const DEFAULT_ITEM_Z_INDEX = 1

export const ITEM_BORDER_RADIUS = 8

export class ItemRenderer<T extends EditableItemViewModel> extends TapestryElementRenderer<T> {
  private preview = new Graphics({ label: 'preview', zIndex: 0 })
  private previewBackground: string

  constructor(store: TapestryEditorStore, stage: TapestryStage, viewModel: T) {
    super(store.as('base'), stage, viewModel)

    this.pixiContainer.zIndex = DEFAULT_ITEM_Z_INDEX
    this.previewBackground = THEMES[this.store.get('theme')].color('background.secondaryInverse')
  }

  private drawPreview(viewModel: T) {
    const { previewBounds } = viewModel
    if (previewBounds) {
      const { left, top, width, height } = previewBounds

      this.preview
        .clear()
        .roundRect(left, top, width, height, ITEM_BORDER_RADIUS)
        .fill({ color: this.previewBackground, alpha: 0.25 })

      if (!this.preview.parent) {
        this.stage.pixi.tapestry.stage.addChild(this.preview)
      }
    } else {
      this.preview.removeFromParent()
    }
  }

  protected renderInternal(viewModel: T) {
    super.renderInternal(viewModel)
    const { position } = viewModel.dto
    this.pixiContainer.x = position.x
    this.pixiContainer.y = position.y

    this.drawPreview(viewModel)
  }

  dispose(): void {
    super.dispose()
    this.preview.removeFromParent()
  }
}
