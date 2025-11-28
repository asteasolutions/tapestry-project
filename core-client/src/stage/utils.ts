import { Container } from 'pixi.js'
import { Point } from 'tapestry-core/src/lib/geometry'
import { isTouchEvent } from '../lib/dom'
import {
  HoveredItem,
  HoverTarget,
  HoveredRel,
  HoveredMultiselection,
  HoveredGroup,
} from '../view-model'
import { ViewContainer } from './renderer/tapestry-element-renderer'
import { get } from 'lodash-es'
import { TapestryStage } from '.'

export const DOM_CONTAINER_CLASS = 'tapestry-component'
export const DOM_CONTAINER_TYPE_DATA_ATTR = 'componentType'
export const DOM_MODEL_ID_DATA_ATTR = 'modelId'

export function obtainHoveredDomTarget(eventTarget: HTMLElement): HoverTarget | null {
  const uiComponent = eventTarget.dataset.uiComponent
  const container = eventTarget.closest<HTMLElement>(`.${DOM_CONTAINER_CLASS}`)
  const type = container?.dataset[DOM_CONTAINER_TYPE_DATA_ATTR]
  const modelId = container?.dataset[DOM_MODEL_ID_DATA_ATTR]

  if ((type === 'item' || type === 'rel' || type === 'group') && modelId) {
    return { type, modelId, uiComponent }
  }

  if (type === 'multiselection') {
    return { type, uiComponent }
  }

  return null
}

function obtainHoveredRel(path: Container[]): HoveredRel | null {
  const viewContainerIndex = path.findIndex(
    (c) => c instanceof ViewContainer && c.tapestryElement.modelType === 'rel',
  )
  if (viewContainerIndex < 0 || viewContainerIndex === path.length - 1) return null

  const { modelId } = (path[viewContainerIndex] as ViewContainer).tapestryElement
  const handle = path[viewContainerIndex + 1].label || undefined

  return {
    type: 'rel',
    modelId,
    uiComponent: handle,
  }
}

export function obtainHoverTarget(
  stage: TapestryStage,
  event: MouseEvent | TouchEvent,
): HoverTarget | null {
  const hoveredDomElement = obtainHoveredDomTarget(event.target as HTMLElement)
  if (isHoveredElement(hoveredDomElement)) {
    return hoveredDomElement
  }

  const point = toPoint(event)
  const pixiElement = stage.pixi.tapestry.renderer.events.rootBoundary.hitTest(point.x, point.y)
  const hoveredRel = obtainHoveredRel([pixiElement.parent!, pixiElement])

  return hoveredRel ?? hoveredDomElement
}

function isHoverTarget(element?: object | null): element is HoverTarget {
  const type = get(element, 'type') as string | undefined
  if (!type) return false

  if (['item', 'rel', 'group'].includes(type)) {
    return !!get(element, 'modelId')
  }

  return type === 'multiselection'
}

export function isHoveredElement(element?: object | null): element is HoveredItem | HoveredRel {
  return isHoverTarget(element) && (element.type === 'item' || element.type === 'rel')
}

export function isHoveredItem(element?: object | null): element is HoveredItem {
  return isHoverTarget(element) && element.type === 'item'
}

export function isHoveredMultiselection(element?: object | null): element is HoveredMultiselection {
  return isHoverTarget(element) && element.type === 'multiselection'
}

export function isHoveredGroup(element?: object | null): element is HoveredGroup {
  return isHoverTarget(element) && element.type === 'group'
}

export function isHoveredRel(element?: object | null): element is HoveredRel {
  return isHoveredElement(element) && element.type === 'rel'
}

export function toPoint(event: MouseEvent | WheelEvent | Touch | TouchEvent): Point {
  return isTouchEvent(event)
    ? toPoint(event.touches.item(0) ?? event.changedTouches[0])
    : { x: event.clientX, y: event.clientY }
}
