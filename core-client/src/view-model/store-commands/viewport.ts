import { Tween, Easing } from '@tweenjs/tween.js'
import { AnimationOptions, tween } from '../tweening.js'
import { TapestryViewModel, ZOOM_STEP, MAX_INITIAL_SCALE, MAX_SCALE } from '../index.js'
import {
  LinearTransform,
  Vector,
  Size,
  coordMax,
  coordMin,
  add,
  Rectangle,
  neg,
  vector,
  mul,
  IDENTITY_TRANSFORM,
  ORIGIN,
} from 'tapestry-core/src/lib/geometry.js'
import { StoreMutationCommand } from '../../lib/store/index.js'
import {
  zoomToCenter,
  itemsFocusRect,
  zoomToFit,
  getTranslationRange,
  getMinScale,
  getGroupMembers,
} from '../utils.js'
import { idMapToArray, pickById } from 'tapestry-core/src/utils.js'
import {
  cubicBezierPoly,
  integrate,
  Polynomial,
  RungeKutta4,
} from 'tapestry-core/src/lib/algebra.js'
import { clamp } from 'lodash-es'
import { selectItems, setInteractiveElement } from './tapestry.js'
import { PresentationStep } from 'tapestry-core/src/data-format/schemas/presentation-step.js'

const CONTINUOUS_ZOOM_STEP = 0.15
const CONTINUOUS_ZOOM_ANIMATION_OPTIONS: AnimationOptions = {
  easing: Easing.Linear.None,
  duration: 0.1,
}
const ELEMENT_TOOLBAR_PADDING = 65

let zoomAnimation: Tween | undefined = undefined

export type AnimationEffect = 'linear' | 'bounce'

export interface ViewportAnimationOptions extends AnimationOptions {
  zoomEffect?: AnimationEffect
}

export function transformViewport(
  transform: Partial<LinearTransform>,
  animate: ViewportAnimationOptions | boolean = false,
): StoreMutationCommand<TapestryViewModel> {
  return (_, { store }) => {
    const {
      transform: { scale: fromScale, translation: fromTranslation },
      isZoomingLocked,
      size,
    } = store.get('viewport')

    const toScale = transform.scale ?? fromScale

    if (isZoomingLocked && toScale !== fromScale) {
      return
    }

    const dx = transform.translation?.dx ?? fromTranslation.dx
    const dy = transform.translation?.dy ?? fromTranslation.dy

    function updateViewport(transform: LinearTransform) {
      store.dispatch((model) => {
        model.viewport.transform = transform
        model.viewport.lastUpdateTimestamp = Date.now()
      })
    }

    zoomAnimation?.stop()
    if (animate) {
      const zoomEffect =
        typeof animate === 'object' && animate.zoomEffect ? animate.zoomEffect : 'linear'
      const center = { x: size.width / 2, y: size.height / 2 }
      const centerInCurrentTransform = mul(1 / fromScale, add(vector(center), neg(fromTranslation)))
      const centerInTargetTransform = mul(1 / toScale, add(vector(center), neg({ dx, dy })))
      const absoluteTranslation = add(centerInTargetTransform, neg(centerInCurrentTransform))
      const zoomPath =
        zoomEffect === 'linear'
          ? new Polynomial([fromScale, toScale - fromScale])
          : cubicBezierPoly([
              fromScale,
              Math.max(0, fromScale / 1.1),
              Math.max(0, toScale / 1.1),
              toScale,
            ])

      // The goal here is to "move" (i.e. translate) the viewport at a constant perceived velocity. The perceived
      // translation velocity depends on the zoom level. If we want to move, say, 10 tapestry pixels at zoom level
      // 2.5, this would result in a displacement of 25 screen pixels. Therefore, at higher zoom levels, we need to
      // move slower. Since we are animating the zoom level and the translation simultaneously, we need to consider
      // them as functions of time. If the timeline of the animation is t ∈ [0, 1], we can define position function
      // P(t) and zoom level function Z(t). To keep the perceived translation velocity constant, we need to have
      // P'(t)Z(t) = C, where C is a constant. To compute P(t) from this formula, we rearrange it to P'(t) = C / Z(t)
      // and solve this ordinary differential equation numerically. Assuming P(t) is actually the progress
      // of the translation, i.e. it ranges from 0 to 1, we need to have P(1) = 1. This lets is calculate
      // C = 1 / ∫dt/Z(t) where the integral is from 0 to 1.
      const C = 1 / integrate((x) => 1 / zoomPath.valueAt(x), 0, 1)
      const position = new RungeKutta4(0, 0, (x) => C / zoomPath.valueAt(x))

      zoomAnimation = tween(
        { progress: 0 },
        { progress: 1 },
        ({ progress }) => {
          const newScale = zoomPath.valueAt(progress)
          let newTranslation: Vector
          if (zoomEffect === 'linear') {
            // Preserving the translation velocity doesn't look very good for linear transitions, so here we apply
            // direct linear transformation to the translation instead of making it depend on the zoom level.
            newTranslation = add(
              fromTranslation,
              mul(progress, add({ dx, dy }, neg(fromTranslation))),
            )
          } else {
            const s = newScale / fromScale
            const translationProgress = progress === 1 ? 1 : clamp(position.step(progress), 0, 1)
            newTranslation = add(
              mul(s, fromTranslation),
              mul(1 - s, vector(center)),
              neg(mul(translationProgress * newScale, absoluteTranslation)),
            )
          }

          updateViewport({ scale: newScale, translation: newTranslation })
        },
        typeof animate === 'object' ? animate : {},
      )
    } else {
      updateViewport({ scale: toScale, translation: { dx, dy } })
    }
  }
}

export function setDefaultViewport(animate: boolean): StoreMutationCommand<TapestryViewModel> {
  return (_, { store }) => {
    const { viewport, items, startView } = store.get()
    const minScale = getMinScale(viewport, idMapToArray(items))

    if (startView) {
      store.dispatch(setIsZoomingLocked(false))
    }

    const focusRect = startView
      ? new Rectangle(startView)
      : itemsFocusRect(viewport, idMapToArray(items), minScale)
    const maxScale = startView ? undefined : MAX_INITIAL_SCALE
    const viewportRect = new Rectangle(ORIGIN, viewport.size)
    const obstructions = idMapToArray(viewport.obstructions)

    // if start view is not set and there are no items, itemsFocusRect returns a small rectangle in the centre
    // of the coordinate system. If MAX_INITIAL_SCALE is 1 the viewport fits around it
    store.dispatch(
      transformViewport(
        zoomToFit(viewportRect, obstructions, focusRect, minScale, maxScale),
        animate,
      ),
    )
  }
}

export function initializeViewport(): StoreMutationCommand<TapestryViewModel> {
  return (model) => {
    model.viewport.ready = true
  }
}

export function resetViewportTransform(): StoreMutationCommand<TapestryViewModel> {
  return (_, { store }) => store.dispatch(transformViewport(IDENTITY_TRANSFORM, true))
}

export function resizeViewport(size: Size): StoreMutationCommand<TapestryViewModel> {
  return (model) => {
    model.viewport.size = size
    model.viewport.lastUpdateTimestamp = Date.now()
  }
}

export function zoomIn(continuous = false): StoreMutationCommand<TapestryViewModel> {
  return (_, { store }) => {
    const zoomStep = continuous ? CONTINUOUS_ZOOM_STEP : ZOOM_STEP
    const animate = continuous ? CONTINUOUS_ZOOM_ANIMATION_OPTIONS : true
    store.dispatch(transformViewport(zoomToCenter(store.get(), zoomStep), animate))
  }
}

export function zoomOut(continuous = false): StoreMutationCommand<TapestryViewModel> {
  return (_, { store }) => {
    const zoomStep = continuous ? CONTINUOUS_ZOOM_STEP : ZOOM_STEP
    const animate = continuous ? CONTINUOUS_ZOOM_ANIMATION_OPTIONS : true
    store.dispatch(transformViewport(zoomToCenter(store.get(), -zoomStep), animate))
  }
}

export function zoomTo(
  value: number,
  animate: AnimationOptions | boolean,
): StoreMutationCommand<TapestryViewModel> {
  return (_, { store }) => {
    store.dispatch(
      transformViewport(
        zoomToCenter(
          store.get(),
          Math.log(value) - Math.log(store.get('viewport.transform.scale')),
        ),
        animate,
      ),
    )
  }
}

export interface FocusOptions {
  addToolbarPadding?: boolean
  animate?: boolean | ViewportAnimationOptions
}
export function focusItems(
  itemIds?: Iterable<string>,
  { addToolbarPadding = false, animate = true }: FocusOptions = {},
): StoreMutationCommand<TapestryViewModel> {
  return (_, { store }) => {
    const { viewport, items: allItemsMap } = store.get()
    const allItems = idMapToArray(allItemsMap)
    const items = itemIds ? pickById(allItemsMap, itemIds) : allItems
    if (items.length === 0) {
      return
    }
    const minScale = getMinScale(viewport, allItems)
    const focusRect = itemsFocusRect(viewport, items, minScale)
    const viewportOrigin = addToolbarPadding ? { x: 0, y: ELEMENT_TOOLBAR_PADDING } : ORIGIN
    const viewportSize = addToolbarPadding
      ? { width: viewport.size.width, height: viewport.size.height - ELEMENT_TOOLBAR_PADDING }
      : viewport.size
    const viewportRect = new Rectangle(viewportOrigin, viewportSize)
    const centralAnchor = { x: viewport.size.width / 2, y: viewport.size.height / 2 }
    store.dispatch(
      transformViewport(
        zoomToFit(
          viewportRect,
          idMapToArray(viewport.obstructions),
          focusRect,
          minScale,
          MAX_SCALE,
          centralAnchor,
        ),
        animate,
      ),
    )
  }
}

export function focusGroup(
  id: string,
  animate?: FocusOptions['animate'],
): StoreMutationCommand<TapestryViewModel> {
  return (_, { store }) => {
    const groupItemIds = getGroupMembers(id, idMapToArray(store.get('items'))).map(
      (item) => item.dto.id,
    )
    store.dispatch(
      focusItems(groupItemIds, { addToolbarPadding: true, animate }),
      selectItems(groupItemIds),
    )
  }
}

export function focusPresentationStep(
  step: PresentationStep,
  animate?: FocusOptions['animate'],
): StoreMutationCommand<TapestryViewModel> {
  return (_, { store }) => {
    if (step.type === 'item') {
      store.dispatch(
        focusItems([step.itemId], { addToolbarPadding: true, animate }),
        setInteractiveElement({ modelType: 'item', modelId: step.itemId }),
      )
    } else {
      store.dispatch(focusGroup(step.groupId, animate))
    }
  }
}

export function panViewport({
  dx = 0,
  dy = 0,
}: Partial<Vector>): StoreMutationCommand<TapestryViewModel> {
  return (_, { store }) => {
    const translation = add(store.get('viewport.transform.translation'), { dx, dy })
    const [min, max] = getTranslationRange(store.get())
    const clippedTranslation = coordMax(min, coordMin(translation, max))

    store.dispatch(transformViewport({ translation: clippedTranslation }))
  }
}

export function setIsZoomingLocked(
  isZoomingLocked: boolean,
): StoreMutationCommand<TapestryViewModel> {
  return (model) => {
    model.viewport.isZoomingLocked = isZoomingLocked
  }
}
