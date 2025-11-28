import { TapestryElementRef, TapestryElementViewModel, TapestryViewModel } from '../../view-model'
import { Renderer } from '.'
import { Container, ContainerChild, ContainerOptions } from 'pixi.js'
import { Store } from '../../lib/store/index'
import { getType, isRelViewModel } from '../../view-model/utils'
import { TapestryStage } from '..'

export class ViewContainer<C extends ContainerChild = ContainerChild> extends Container<C> {
  public readonly tapestryElement: TapestryElementRef
  constructor(viewModel: TapestryElementViewModel, options?: ContainerOptions<C>) {
    super(options)
    if (isRelViewModel(viewModel)) {
      this.tapestryElement = {
        modelType: 'rel',
        modelId: viewModel.dto.id,
      }
    } else {
      this.tapestryElement = {
        modelType: 'item',
        modelId: viewModel.dto.id,
      }
    }
  }
}

export abstract class TapestryElementRenderer<T extends TapestryElementViewModel>
  implements Renderer<T>
{
  protected lastRenderedModel?: T
  protected pixiContainer: ViewContainer

  constructor(
    protected store: Store<TapestryViewModel>,
    protected stage: TapestryStage,
    protected viewModel: T,
  ) {
    const containerId = TapestryElementRenderer.getContainerId(viewModel)
    this.pixiContainer = new ViewContainer(viewModel, { label: containerId })
    stage.pixi.tapestry.stage.addChild(this.pixiContainer)
  }

  render(viewModel: T) {
    this.renderInternal(viewModel)
    this.lastRenderedModel = viewModel
  }

  dispose(): void {
    this.pixiContainer.destroy()
  }

  protected renderInternal(viewModel: T) {
    const containerId = this.pixiContainer.label
    const id = TapestryElementRenderer.getContainerId(viewModel)
    if (id !== containerId) {
      throw new Error(
        `render() called with different view model (id = ${id}) than the initialized on (${containerId})`,
      )
    }
  }

  static getContainerId(viewModel: TapestryElementViewModel) {
    return `${getType(viewModel)}:${viewModel.dto.id}`.replace(/:/g, '-')
  }
}
