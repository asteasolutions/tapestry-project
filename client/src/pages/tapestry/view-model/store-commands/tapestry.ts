import { omit, sample } from 'lodash-es'
import { maxEmptyArea, ORIGIN, Point, Rectangle } from 'tapestry-core/src/lib/geometry'
import { TapestryDto } from 'tapestry-shared/src/data-transfer/resources/dtos/tapestry'
import { EditableTapestryViewModel, InteractionMode, IAImport, convertCommand } from '..'
import { StoreMutationCommand } from 'tapestry-core-client/src/lib/store/index'
import { EditableTapestryProps } from '../../../../model/data/utils'
import { positionAtViewport } from 'tapestry-core-client/src/view-model/utils'
import { idMapToArray } from 'tapestry-core/src/utils'
import { COLLABORATOR_COLORS } from 'tapestry-core-client/src/theme'
import { PublicUserProfileDto } from 'tapestry-shared/src/data-transfer/resources/dtos/user'
import * as baseCommands from 'tapestry-core-client/src/view-model/store-commands/tapestry'

export const addViewportObstruction = convertCommand(baseCommands.addViewportObstruction)
export const deselectAll = convertCommand(baseCommands.deselectAll)
export const removeViewportObstruction = convertCommand(baseCommands.removeViewportObstruction)
export const selectAll = convertCommand(baseCommands.selectAll)
export const selectGroups = convertCommand(baseCommands.selectGroups)
export const selectItem = convertCommand(baseCommands.selectItem)
export const selectItems = convertCommand(baseCommands.selectItems)
export const setInteractiveElement = convertCommand(baseCommands.setInteractiveElement)
export const setPointerInteraction = convertCommand(baseCommands.setPointerInteraction)
export const setPointerMode = convertCommand(baseCommands.setPointerMode)
export const setSearchTerm = convertCommand(baseCommands.setSearchTerm)
export const setSelectionRect = convertCommand(baseCommands.setSelectionRect)
export const setSnackbar = convertCommand(baseCommands.setSnackbar)
export const toggleGroupSelection = convertCommand(baseCommands.toggleGroupSelection)
export const toggleItemSelection = convertCommand(baseCommands.toggleItemSelection)
export const toggleOutline = convertCommand(baseCommands.toggleOutline)
export const setSidePane = convertCommand(baseCommands.setSidePane)

export function updateTapestry(
  data: Partial<Pick<TapestryDto, EditableTapestryProps>>,
): StoreMutationCommand<EditableTapestryViewModel> {
  return (model) => {
    Object.assign(model, omit(data, 'items', 'rels'))
  }
}

export function setViewAsStart(): StoreMutationCommand<EditableTapestryViewModel> {
  return (model) => {
    const { viewport } = model
    const visibleArea = maxEmptyArea(
      new Rectangle(ORIGIN, viewport.size),
      idMapToArray(viewport.obstructions),
    )!
    model.startView = {
      position: positionAtViewport(viewport, ORIGIN, {
        dx: visibleArea.left / viewport.transform.scale,
        dy: visibleArea.top / viewport.transform.scale,
      }),
      size: {
        width: visibleArea.width / viewport.transform.scale,
        height: visibleArea.height / viewport.transform.scale,
      },
    }
  }
}

export function setInteractionMode(
  mode: InteractionMode,
): StoreMutationCommand<EditableTapestryViewModel> {
  return (_, { store }) => {
    if (mode === store.get('interactionMode')) return

    store.dispatch(
      selectItem(null),
      (model) => {
        model.interactionMode = mode
      },
      setSnackbar(`You are in ${mode === 'edit' ? 'Author' : 'Viewer'} mode`),
    )
  }
}

export function hideEditControls(toggle = true): StoreMutationCommand<EditableTapestryViewModel> {
  return (model) => {
    model.hideEditControls = toggle
  }
}

export function setIsConfiguringPresentationOrder(
  isConfiguring: boolean,
): StoreMutationCommand<EditableTapestryViewModel> {
  return (model, { store }) => {
    if (isConfiguring) {
      model.presentationOrderState ??= {}
      store.dispatch(selectItems([]), setSidePane(null), hideEditControls())
    } else {
      model.presentationOrderState = null
      store.dispatch(hideEditControls(false))
    }
  }
}

export function setIAImport(
  iaImports: IAImport[],
): StoreMutationCommand<EditableTapestryViewModel> {
  return (model) => {
    model.iaImports = iaImports
  }
}

export function setLargeFiles(files: File[]): StoreMutationCommand<EditableTapestryViewModel> {
  return (model) => {
    model.largeFiles = files
  }
}

export function addCollaborator(
  id: string,
  user: PublicUserProfileDto,
): StoreMutationCommand<EditableTapestryViewModel> {
  return (model) => {
    const freeColors = COLLABORATOR_COLORS.filter(
      (color) =>
        !idMapToArray(model.collaborators).some((collabolator) => collabolator.color === color),
    )

    model.collaborators[id] = {
      id,
      userData: user,
      color: sample(freeColors.length > 0 ? freeColors : COLLABORATOR_COLORS)!,
    }
  }
}

export function updateCollaboratorCursor(
  id: string,
  position: Point,
): StoreMutationCommand<EditableTapestryViewModel> {
  return (model) => {
    if (model.collaborators[id]) {
      model.collaborators[id].cursorPosition = position
    }
  }
}

export function removeCollaborator(id: string): StoreMutationCommand<EditableTapestryViewModel> {
  return (model) => {
    delete model.collaborators[id]
  }
}
