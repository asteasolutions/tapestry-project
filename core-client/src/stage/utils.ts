import { Container } from 'pixi.js'
import { LinearTransform, Point } from 'tapestry-core/src/lib/geometry'
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
import { CSSProperties } from 'react'

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

function obtainHoveredPixiTarget(
  container: Container,
): HoveredItem | HoveredRel | HoveredGroup | null {
  let viewContainer: Container | null = container
  while (viewContainer && !(viewContainer instanceof ViewContainer)) {
    viewContainer = viewContainer.parent
  }
  if (!viewContainer || !(viewContainer instanceof ViewContainer)) {
    return null
  }

  if (viewContainer.modelRef.modelType === 'rel') {
    return {
      type: 'rel',
      modelId: viewContainer.modelRef.modelId,
      uiComponent: container.label || undefined,
    }
  }

  if (viewContainer.modelRef.modelType === 'item') {
    return {
      type: 'item',
      modelId: viewContainer.modelRef.modelId,
      // Assume that when an item is clicked in Pixi, only its drag area can be hovered
      // XXX: Here again we assume there is a UI component called "dragArea" (see ItemController)
      // Maybe we should generalize this concept in some way as Tapestry viewer applications
      // would not have a "drag" area.
      uiComponent: 'dragArea',
    }
  }

  return {
    type: 'group',
    modelId: viewContainer.modelRef.modelId,
    uiComponent: 'dragArea',
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
  const pixiElement = stage.pixi.tapestry.app.renderer.events.rootBoundary.hitTest(point.x, point.y)
  const hoveredRel = obtainHoveredPixiTarget(pixiElement)

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

export function cssTransformForLocation(
  { x, y }: Point,
  tapestryTransform: LinearTransform,
): CSSProperties {
  const { translation, scale } = tapestryTransform
  return {
    transformOrigin: `${-x}px ${-y}px`,
    transform: `translate(${translation.dx}px, ${translation.dy}px) scale(${scale})`,
  }
}
