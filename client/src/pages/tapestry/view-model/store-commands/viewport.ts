import * as baseCommands from 'tapestry-core-client/src/view-model/store-commands/viewport'
import { convertCommand } from '..'

export const focusGroup = convertCommand(baseCommands.focusGroup)
export const focusItems = convertCommand(baseCommands.focusItems)
export const focusPresentationStep = convertCommand(baseCommands.focusPresentationStep)
export const initializeViewport = convertCommand(baseCommands.initializeViewport)
export const panViewport = convertCommand(baseCommands.panViewport)
export const resetViewportTransform = convertCommand(baseCommands.resetViewportTransform)
export const resizeViewport = convertCommand(baseCommands.resizeViewport)
export const setDefaultViewport = convertCommand(baseCommands.setDefaultViewport)
export const setIsZoomingLocked = convertCommand(baseCommands.setIsZoomingLocked)
export const transformViewport = convertCommand(baseCommands.transformViewport)
export const zoomIn = convertCommand(baseCommands.zoomIn)
export const zoomOut = convertCommand(baseCommands.zoomOut)
export const zoomTo = convertCommand(baseCommands.zoomTo)
