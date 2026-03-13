import { Store } from '../../lib/store/index'
import { TapestryViewModel } from '../../view-model'
import { TapestryStage } from '..'

export interface TapestryStageController {
  init(): void | Promise<void>
  dispose(): void | Promise<void>
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

  async init() {
    this.stage.gestureDetector.activate()
    await this.enableMode('default')
  }

  async dispose() {
    this.stage.gestureDetector.deactivate()
    await this.enableMode(undefined)
  }

  protected async enableMode(newMode: Mode | 'default' | undefined) {
    if (newMode === this.mode) return

    const toDispose = [
      ...(this.mode ? this.controllers[this.mode] : []),
      ...(!newMode ? this.controllers.global : []),
    ]
    const toInit = [
      ...(!this.mode ? this.controllers.global : []),
      ...(newMode ? this.controllers[newMode] : []),
    ]

    for (const ctrl of toDispose) await ctrl.dispose()
    this.mode = newMode
    for (const ctrl of toInit) await ctrl.init()
  }
}
