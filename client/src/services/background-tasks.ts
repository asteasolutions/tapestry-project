import { Observable } from 'tapestry-core-client/src/lib/events/observable'
import { TapestryExport } from '../hooks/use-tapestry-export'
import { TapestryImport } from '../hooks/use-tapestry-import'

export interface BackgroundTasksState {
  imports: TapestryImport[]
  exports: TapestryExport[]
}

interface BackgroundTasksActions {
  triggerExport: (tapestryId: string, title: string) => unknown
  cancelExport: (id: string) => unknown
  clearFinishedExports: () => unknown
  importTapestries: (files: File[]) => unknown
  resetImports: () => unknown
}

class BackgroundTasksObservable extends Observable<BackgroundTasksState> {
  private actions?: BackgroundTasksActions

  connect(state: BackgroundTasksState, actions: BackgroundTasksActions) {
    this.actions = actions
    this.update((value) => {
      value.imports = state.imports
      value.exports = state.exports
    })
  }

  getActiveExport(tapestryId: string) {
    return this.value.exports.find((e) => e.tapestryId === tapestryId && e.status === 'exporting')
  }

  triggerExport(tapestryId: string, title: string) {
    return this.actions?.triggerExport(tapestryId, title)
  }

  cancelExport(id: string) {
    this.actions?.cancelExport(id)
  }

  importTapestries(files: File[]) {
    return this.actions?.importTapestries(files)
  }

  clearFinished() {
    this.actions?.resetImports()
    this.actions?.clearFinishedExports()
  }
}

export const backgroundTasks = new BackgroundTasksObservable({ imports: [], exports: [] })
