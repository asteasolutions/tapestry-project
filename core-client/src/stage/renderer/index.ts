import { CSSProperties } from 'react'
import { TapestryElementRenderer } from './tapestry-element-renderer'
import { RelRenderer } from './rel-renderer'
import { ContainerChild, Graphics } from 'pixi.js'
import { THEMES } from '../../theme/themes'
import { Store } from '../../lib/store/index'
import { idMapToArray } from 'tapestry-core/src/utils'
import {
  ItemViewModel,
  PointerInteraction,
  RelViewModel,
  TapestryElementViewModel,
  TapestryViewModel,
} from '../../view-model'
import { TapestryStage } from '..'
import { TapestryStageController } from '../controller'
import { isRelViewModel } from '../../view-model/utils'

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
  E extends TapestryElementViewModel,
> implements TapestryStageController {
  private tapestryElementRenderers = new Map<string, TapestryElementRenderer<E>>()

  constructor(
    protected store: Store<TapestryViewModel>,
    protected stage: TapestryStage,
  ) {}

  boundRender = this.render.bind(this)

  init() {
    this.store.subscribe(this.boundRender)
    this.render()
  }

  dispose() {
    this.store.unsubscribe(this.boundRender)
    this.tapestryElementRenderers.forEach((r) => r.dispose())
  }

  protected abstract getItems(): (E & ItemViewModel)[]

  protected abstract getRels(): (E & RelViewModel)[]

  protected get theme() {
    return THEMES[this.store.get('theme')]
  }

  protected render() {
    this.removeMissingStageItems()

    this.getRels().forEach(this.renderViewModel.bind(this))
    this.getItems().forEach(this.renderViewModel.bind(this))

    this.renderSelectionRect()

    this.updateItemZOrder()
    this.updateViewportTransformation()
    this.updatePointer()
    this.updateTheme()
  }

  protected renderSelectionRect() {
    const containerId = 'selection-rect'
    let container = this.stage.pixi.tapestry.stage.getChildByLabel(containerId) as Graphics | null
    const pointerSelection = this.store.get('pointerSelection')

    if (!pointerSelection) {
      container?.destroy()
      return
    }

    if (!container) {
      container = new Graphics({ label: containerId, eventMode: 'none' })
      this.stage.pixi.tapestry.stage.addChild(container)
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
    this.stage.pixi.tapestry.renderer.background.color = canvasBackground
  }

  protected updateViewportTransformation() {
    const { translation, scale } = this.store.get('viewport.transform')
    this.stage.pixi.tapestry.stage.scale = scale
    this.stage.pixi.tapestry.stage.position = { x: translation.dx, y: translation.dy }
  }

  protected determineCursorStyle(): CSSProperties['cursor'] | null {
    let cursor: CSSProperties['cursor'] | null = null
    const { pointerInteraction, pointerMode } = this.store.get()

    if (pointerInteraction) {
      cursor = USER_INTERACTION_CURSOR[pointerInteraction.action]
    }

    if (!cursor && pointerMode !== 'select') {
      cursor = 'grab'
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

  protected updateItemZOrder() {
    const { selection, interactiveElement } = this.store.get()
    if (selection.itemIds.size === 0 && selection.groupIds.size === 0 && !interactiveElement) return

    const selectedContainerIds = new Set(
      idMapToArray(this.store.get('items')).map((i) => TapestryElementRenderer.getContainerId(i)),
    )
    if (interactiveElement?.modelType === 'rel') {
      const rel = this.store.get('rels')[interactiveElement.modelId]
      // TODO: Remove this non-null check when the Store becomes consistent after undo stack updates
      if (rel) {
        selectedContainerIds.add(TapestryElementRenderer.getContainerId(rel))
      }
    }
    const pixiContainer = this.stage.pixi.tapestry.stage
    let firstSelectedIndex = pixiContainer.children.findIndex((child) =>
      selectedContainerIds.has(child.label),
    )
    for (let i = firstSelectedIndex + 1; i < pixiContainer.children.length; i += 1) {
      const child = pixiContainer.getChildAt<ContainerChild>(i)
      if (!selectedContainerIds.has(child.label)) {
        pixiContainer.setChildIndex(child, firstSelectedIndex)
        firstSelectedIndex += 1
      }
    }
  }

  protected renderViewModel(viewModel?: E | null) {
    if (!viewModel) {
      return
    }

    const id = TapestryElementRenderer.getContainerId(viewModel)
    let renderer = this.tapestryElementRenderers.get(id)

    if (!renderer) {
      renderer = this.createTapestryElementRenderer(viewModel)
      if (renderer) {
        this.tapestryElementRenderers.set(id, renderer)
      }
    }

    renderer?.render(viewModel)
  }

  protected getRenderedTapestryElementIds() {
    return new Set([
      ...idMapToArray<TapestryElementViewModel>(this.store.get('items'))
        .concat(idMapToArray(this.store.get('rels')))
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

  protected createTapestryElementRenderer(model: E): TapestryElementRenderer<E> | undefined {
    if (isRelViewModel(model)) {
      return new RelRenderer(this.store, this.stage, model)
    }

    return new (class extends TapestryElementRenderer<E> {})(this.store, this.stage, model)
  }
}
