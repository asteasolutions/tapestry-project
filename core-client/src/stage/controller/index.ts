import { Store } from '../../lib/store/index'
import { TapestryViewModel } from '../../view-model'
import { TapestryStage } from '..'

export interface TapestryStageController {
  init(): void
  dispose(): void
}

export class TapestryLifecycleController<
  T extends TapestryViewModel,
  Mode extends Exclude<string, 'default'>,
> {
  private mode: Mode | 'default' | undefined

  constructor(
    protected store: Store<T>,
    protected stage: TapestryStage,
    private controllers: Record<Mode | 'default' | 'global', TapestryStageController[]>,
  ) {}

  init() {
    this.stage.gestureDetector.activate()
    this.enableMode('default')
  }

  dispose() {
    this.stage.gestureDetector.deactivate()
    this.enableMode(undefined)
  }

  protected enableMode(newMode: Mode | 'default' | undefined) {
    if (newMode === this.mode) return

    const toDispose = [
      ...(this.mode ? this.controllers[this.mode] : []),
      ...(!newMode ? this.controllers.global : []),
    ]
    const toInit = [
      ...(!this.mode ? this.controllers.global : []),
      ...(newMode ? this.controllers[newMode] : []),
    ]

    toDispose.forEach((ctrl) => ctrl.dispose())
    this.mode = newMode
    toInit.forEach((ctrl) => ctrl.init())
  }
}
