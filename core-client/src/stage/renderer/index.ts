import { CSSProperties } from 'react'
import { TapestryElementRenderer } from './tapestry-element-renderer'
import { RelRenderer } from './rel-renderer'
import { Container, Graphics } from 'pixi.js'
import { THEMES } from '../../theme/themes'
import { Store } from '../../lib/store/index'
import { idMapToArray } from 'tapestry-core/src/utils'
import {
  GroupViewModel,
  ItemViewModel,
  PointerInteraction,
  RelViewModel,
  Selection,
  TapestryElementRef,
  TapestryElementViewModel,
  TapestryViewModel,
} from '../../view-model'
import { TapestryStage } from '..'
import { TapestryStageController } from '../controller'
import { isItemViewModel, isRelViewModel } from '../../view-model/utils'
import { isHoveredElement } from '../utils'
import { ItemRenderer } from './item-renderer'
import { GroupBackgroundRenderer } from './group-background-renderer'
import { ThumbnailContainer } from './thumbnail-container'

export interface Renderer<T = unknown> {
  render(arg: T): void
  dispose(): void
}

const USER_INTERACTION_CURSOR: Partial<
  Record<PointerInteraction['action'], CSSProperties['cursor']>
> = {
  'pan-scroll': 'all-scroll',
  'pan-drag': 'grabbing',
  'zoom-in': 'zoom-in',
  'zoom-out': 'zoom-out',
  drag: 'grabbing',
}

const SCENE_CURSOR_CLASS = 'scene-cursor'
const SCENE_CURSOR_VARIABLE = '--scene-cursor'

export abstract class TapestryRenderer<
  E extends TapestryElementViewModel | GroupViewModel,
> implements TapestryStageController {
  private tapestryElementRenderers = new Map<string, TapestryElementRenderer<E, object>>()

  private world = new Container()
  private selected = new Container()

  constructor(
    protected store: Store<TapestryViewModel>,
    protected stage: TapestryStage,
  ) {
    this.stage.pixi.tapestry.app.stage.addChild(this.world, this.selected)
  }

  boundRender = this.render.bind(this)

  async init() {
    await ThumbnailContainer.loadIconTextures()
    this.store.subscribe(this.boundRender)
    this.render()
  }

  async dispose() {
    this.store.unsubscribe(this.boundRender)
    this.tapestryElementRenderers.forEach((r) => r.dispose())
    await ThumbnailContainer.unloadIconTextures()
  }

  protected getGroups() {
    return idMapToArray(this.store.get('groups')) as (E & GroupViewModel)[]
  }

  protected abstract getItems(): (E & ItemViewModel)[]

  protected abstract getRels(): (E & RelViewModel)[]

  protected get theme() {
    return THEMES[this.store.get('theme')]
  }

  protected render() {
    this.removeMissingStageItems()

    const selection = this.store.get('selection')
    const interactiveElement = this.store.get('interactiveElement')
    this.getGroups().forEach((group) => this.renderViewModel(group, selection, interactiveElement))
    this.getRels().forEach((rel) => this.renderViewModel(rel, selection, interactiveElement))
    this.getItems().forEach((item) => this.renderViewModel(item, selection, interactiveElement))

    this.renderSelectionRect()

    this.updateViewportTransformation()
    this.updatePointer()
    this.updateTheme()

    this.stage.pixi.tapestry.scheduleRedraw()
  }

  protected renderSelectionRect() {
    const containerId = 'selection-rect'
    let container = this.stage.pixi.tapestry.app.stage.getChildByLabel(
      containerId,
    ) as Graphics | null
    const pointerSelection = this.store.get('pointerSelection')

    if (!pointerSelection) {
      container?.destroy()
      return
    }

    if (!container) {
      container = new Graphics({ label: containerId, eventMode: 'none' })
      this.stage.pixi.tapestry.app.stage.addChild(container)
    }

    const { left, top, width, height } = pointerSelection.rect
    const selectionRectColor = this.theme.color('background.brand')

    container
      .clear()
      .rect(left, top, width, height)
      .fill({ color: selectionRectColor, alpha: 0.1 })
      .stroke({ color: selectionRectColor, width: 1, alpha: 0.8 })
  }

  protected updateTheme() {
    const canvasBackground = this.store.get('background')
    this.stage.pixi.tapestry.app.renderer.background.color = canvasBackground
  }

  protected updateViewportTransformation() {
    const { translation, scale } = this.store.get('viewport.transform')
    this.stage.pixi.tapestry.app.stage.scale = scale
    this.stage.pixi.tapestry.app.stage.position = { x: translation.dx, y: translation.dy }
  }

  protected determineCursorStyle(): CSSProperties['cursor'] | null {
    let cursor: CSSProperties['cursor'] | null = null
    const { pointerInteraction, pointerMode, interactiveElement } = this.store.get()

    if (pointerInteraction) {
      cursor = USER_INTERACTION_CURSOR[pointerInteraction.action]
    }

    if (!cursor && pointerMode !== 'select') {
      cursor = 'grab'
    }

    if (pointerInteraction?.action === 'hover') {
      const isHoveringInactiveElement =
        isHoveredElement(pointerInteraction.target) &&
        interactiveElement?.modelId !== pointerInteraction.target.modelId

      if (isHoveringInactiveElement) {
        cursor = 'pointer'
      }
    }

    return cursor
  }

  protected updatePointer() {
    const cursor = this.determineCursorStyle()

    if (cursor) {
      this.stage.root.style.setProperty(SCENE_CURSOR_VARIABLE, cursor)
      this.stage.root.classList.add(SCENE_CURSOR_CLASS)
    } else {
      this.stage.root.style.removeProperty(SCENE_CURSOR_VARIABLE)
      this.stage.root.classList.remove(SCENE_CURSOR_CLASS)
    }
  }

  protected renderViewModel(
    viewModel?: E | null,
    selection?: Selection,
    interactiveElement?: TapestryElementRef | null,
  ) {
    if (!viewModel) {
      return
    }

    const id = TapestryElementRenderer.getContainerId(viewModel)
    let renderer = this.tapestryElementRenderers.get(id)

    if (!renderer) {
      renderer = this.createTapestryElementRenderer(viewModel)
      this.tapestryElementRenderers.set(id, renderer)
    }

    const isSelected = this.isSelected(viewModel, selection, interactiveElement)

    const container = isSelected ? this.selected : this.world
    if (renderer.pixiContainer.parent !== container) {
      container.addChild(renderer.pixiContainer)
    }

    renderer.render(viewModel)
  }

  protected isSelected(
    viewModel: E,
    selection?: Selection,
    interactiveElement?: TapestryElementRef | null,
  ) {
    return (
      selection?.itemIds.has(viewModel.dto.id) ||
      selection?.groupIds.has(viewModel.dto.id) ||
      interactiveElement?.modelId === viewModel.dto.id ||
      (isItemViewModel(viewModel) &&
        viewModel.dto.groupId &&
        selection?.groupIds.has(viewModel.dto.groupId))
    )
  }

  protected getRenderedTapestryElementIds() {
    return new Set([
      ...idMapToArray<TapestryElementViewModel | GroupViewModel>(this.store.get('items'))
        .concat(idMapToArray(this.store.get('rels')))
        .concat(idMapToArray(this.store.get('groups')))
        .map((elem) => TapestryElementRenderer.getContainerId(elem)),
    ])
  }

  protected removeMissingStageItems() {
    const renderIds = this.getRenderedTapestryElementIds()

    for (const [id, renderer] of this.tapestryElementRenderers) {
      if (!renderIds.has(id)) {
        renderer.dispose()
        this.tapestryElementRenderers.delete(id)
      }
    }
  }

  protected createTapestryElementRenderer(model: E): TapestryElementRenderer<E, object> {
    return isRelViewModel(model)
      ? new RelRenderer(this.store, this.stage, model)
      : isItemViewModel(model)
        ? new ItemRenderer(this.store, this.stage, model)
        : new GroupBackgroundRenderer(this.store, this.stage, model as E & GroupViewModel)
  }
}
