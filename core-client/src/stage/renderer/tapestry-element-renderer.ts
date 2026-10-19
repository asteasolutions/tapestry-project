import {
  GroupModelRef,
  GroupViewModel,
  TapestryElementRef,
  TapestryElementViewModel,
  TapestryViewModel,
} from '../../view-model'
import { Renderer } from '.'
import { Container, ContainerChild, ContainerOptions } from 'pixi.js'
import { Store } from '../../lib/store/index'
import { getType, isItemViewModel, isRelViewModel } from '../../view-model/utils'
import { TapestryStage } from '..'
import { get, isEqual } from 'lodash-es'

export class ViewContainer<C extends ContainerChild = ContainerChild> extends Container<C> {
  public readonly modelRef: TapestryElementRef | GroupModelRef

  constructor(viewModel: TapestryElementViewModel | GroupViewModel, options?: ContainerOptions<C>) {
    super(options)
    if (isRelViewModel(viewModel)) {
      this.modelRef = {
        modelType: 'rel',
        modelId: viewModel.dto.id,
      }
    } else if (isItemViewModel(viewModel)) {
      this.modelRef = {
        modelType: 'item',
        modelId: viewModel.dto.id,
      }
    } else {
      this.modelRef = {
        modelType: 'group',
        modelId: viewModel.dto.id,
      }
    }
  }
}

export abstract class TapestryElementRenderer<
  T extends TapestryElementViewModel | GroupViewModel,
  R extends object,
> implements Renderer<T> {
  public readonly pixiContainer: ViewContainer

  private lastRenderedState?: R

  constructor(
    private store: Store<TapestryViewModel>,
    private stage: TapestryStage,
    viewModel: T,
  ) {
    const containerId = TapestryElementRenderer.getContainerId(viewModel)
    this.pixiContainer = new ViewContainer(viewModel, { label: containerId })
  }

  render(viewModel: T) {
    this.checkMatchingModel(viewModel)

    const renderState = this.obtainRenderState(viewModel, this.store, this.stage)
    const changedKeys = (Object.keys(renderState) as (keyof R)[]).filter(
      (key) => !isEqual(renderState[key], get(this.lastRenderedState, key)),
    )
    if (changedKeys.length > 0) {
      this.doRender(renderState, changedKeys)
      this.lastRenderedState = renderState
    }
  }

  dispose(): void {
    this.pixiContainer.destroy()
  }

  protected abstract obtainRenderState(
    viewModel: T,
    store: Store<TapestryViewModel>,
    stage: TapestryStage,
  ): R
  protected abstract doRender(state: R, changedKeys: (keyof R)[]): void

  private checkMatchingModel(viewModel: T) {
    const containerId = this.pixiContainer.label
    const id = TapestryElementRenderer.getContainerId(viewModel)
    if (id !== containerId) {
      throw new Error(
        `render() called with different view model (id = ${id}) than the initialized on (${containerId})`,
      )
    }
  }

  static getContainerId(viewModel: TapestryElementViewModel | GroupViewModel) {
    return `${getType(viewModel)}:${viewModel.dto.id}`.replace(/:/g, '-')
  }
}
