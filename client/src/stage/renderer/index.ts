import {
  DirectionMask,
  EditableTapestryElementViewModel,
  TapestryEditorStore,
} from '../../pages/tapestry/view-model/index'
import { Graphics, Rectangle as PixiRectangle, TilingSprite } from 'pixi.js'
import { neg, ORIGIN, translate } from 'tapestry-core/src/lib/geometry'
import { ThemeName } from 'tapestry-core-client/src/theme/themes'
import { isEqual } from 'lodash-es'
import { ItemRenderer } from './item-renderer'
import { TapestryRenderer } from 'tapestry-core-client/src/stage/renderer'
import { TapestryStage } from 'tapestry-core-client/src/stage'
import { isRelViewModel } from 'tapestry-core-client/src/view-model/utils'
import {
  isHoveredElement,
  isHoveredGroup,
  isHoveredMultiselection,
} from 'tapestry-core-client/src/stage/utils'
import { idMapToArray } from 'tapestry-core/src/utils'
import { EditorRelRenderer } from './rel-renderer'

function getResizeCursor({ top, right, bottom, left }: DirectionMask) {
  if ((top && right) || (bottom && left)) {
    return 'nesw-resize'
  }
  if ((top && left) || (bottom && right)) {
    return 'nwse-resize'
  }
  if (top || bottom) {
    return 'ns-resize'
  }
  if (left || right) {
    return 'ew-resize'
  }
}

interface RenderedGridTextureProps {
  scale: number
  theme: ThemeName
}

export class EditorTapestryRenderer extends TapestryRenderer<EditableTapestryElementViewModel> {
  private guidelineGridTextureProps: RenderedGridTextureProps | null = null

  constructor(
    private editorStore: TapestryEditorStore,
    stage: TapestryStage,
  ) {
    super(editorStore.as('base'), stage)
  }

  dispose() {
    super.dispose()
  }

  protected getItems() {
    return idMapToArray(this.editorStore.get('items'))
  }

  protected getRels() {
    return idMapToArray(this.editorStore.get('rels'))
  }

  protected render() {
    super.render()

    this.renderGuidelines()
    this.renderViewModel(this.editorStore.get('newRelPreview'))
  }

  protected getRenderedTapestryElementIds() {
    const renderIds = super.getRenderedTapestryElementIds()
    const newRelPreview = this.editorStore.get('newRelPreview')

    if (newRelPreview) {
      renderIds.add(newRelPreview.dto.id)
    }
    return renderIds
  }

  private renderGuidelines() {
    const {
      viewportGuidelines: guidelines,
      viewport: { transform },
      interactionMode,
    } = this.editorStore.get()
    let grid = this.stage.pixi.tapestry.stage.getChildByLabel('grid') as TilingSprite | null
    if (!guidelines || interactionMode !== 'edit') {
      grid?.destroy()
      this.guidelineGridTextureProps = null
      return
    }

    if (!grid) {
      grid = new TilingSprite({ label: 'grid' })
      this.stage.pixi.tapestry.stage.addChildAt(grid, 0)
    }

    const dotRadius = 1 / Math.min(1, transform.scale * 1.5)
    const spacing = Math.ceil(1 / Math.min(1, transform.scale * 1.5)) * guidelines.spacing

    const gridTextureProps = { scale: transform.scale, theme: this.theme.name }

    if (!isEqual(this.guidelineGridTextureProps, gridTextureProps)) {
      // Make sure to destroy the old texture's source, otherwise it leaks GPU memory!
      grid.texture.destroy(true)

      if (spacing > 200) {
        // When spacing becomes too large, we need to build huge textures to display the grid.
        // At this point it's better to hide the grid altogether, it isn't useable at this level anyway.
        // We do this by generating a small dummy texture for the tile
        grid.texture = this.stage.pixi.tapestry.renderer.generateTexture({
          target: new Graphics(),
          frame: new PixiRectangle(0, 0, 1, 1),
        })
      } else {
        const tile = new Graphics()
          .circle(dotRadius, dotRadius, dotRadius)
          .fill({ color: this.theme.color('background.inverse'), alpha: 0.25 })
        grid.texture = this.stage.pixi.tapestry.renderer.generateTexture({
          target: tile,
          frame: new PixiRectangle(0, 0, spacing, spacing),
          resolution: 4,
        })
      }

      this.guidelineGridTextureProps = gridTextureProps
    }

    grid.width = this.stage.root.clientWidth / transform.scale + spacing
    grid.height = this.stage.root.clientHeight / transform.scale + spacing
    const gridPosition = translate(ORIGIN, neg(transform.translation), transform.scale)
    grid.x = gridPosition.x - (gridPosition.x % spacing) - dotRadius
    grid.y = gridPosition.y - (gridPosition.y % spacing) - dotRadius
  }

  protected determineCursorStyle() {
    let cursor = super.determineCursorStyle()

    if (!cursor) {
      const { pointerInteraction, selectionResizeState, interactionMode, interactiveElement } =
        this.editorStore.get()

      if (pointerInteraction?.action === 'hover') {
        const isHoveringDragArea = pointerInteraction.target?.uiComponent === 'dragArea'
        const isHoveringInactiveElement =
          isHoveredElement(pointerInteraction.target) &&
          interactiveElement?.modelId !== pointerInteraction.target.modelId
        const isHoveringMultiselection =
          isHoveringDragArea && isHoveredMultiselection(pointerInteraction.target)
        const isHoveringGroup = isHoveringDragArea && isHoveredGroup(pointerInteraction.target)

        if (interactionMode === 'view' && isHoveringInactiveElement) {
          cursor = 'pointer'
        } else if (
          interactionMode === 'edit' &&
          (isHoveringInactiveElement || isHoveringMultiselection || isHoveringGroup)
        ) {
          cursor = 'grab'
        }
      } else if (pointerInteraction?.action === 'resize' && selectionResizeState) {
        cursor = getResizeCursor(selectionResizeState.direction)
      }
    }

    return cursor
  }

  protected createTapestryElementRenderer(model: EditableTapestryElementViewModel) {
    if (isRelViewModel(model)) {
      return new EditorRelRenderer(this.editorStore, this.stage, model)
    }

    return new ItemRenderer(this.editorStore, this.stage, model)
  }
}
