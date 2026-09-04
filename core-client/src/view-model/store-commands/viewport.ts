import { Tween } from '@tweenjs/tween.js'
import { AnimationOptions, tween } from '../tweening.js'
import { TapestryViewModel, MAX_INITIAL_SCALE, MAX_SCALE } from '../index.js'
import {
  LinearTransform,
  Vector,
  Size,
  add,
  Rectangle,
  neg,
  vector,
  mul,
  IDENTITY_TRANSFORM,
  ORIGIN,
  clampCoords,
} from 'tapestry-core/src/lib/geometry.js'
import { StoreMutationCommand } from '../../lib/store/index.js'
import {
  zoomToCenter,
  itemsFocusRect,
  zoomToFit,
  getTranslationRange,
  getMinScale,
  getGroupMembers,
  getZoomParameters,
  getBoundingRectangle,
  getSelectionItems,
} from '../utils.js'
import { idMapToArray, pickById } from 'tapestry-core/src/utils.js'
import {
  cubicBezierPoly,
  Exponent,
  integrate,
  Polynomial,
  RungeKutta4,
} from 'tapestry-core/src/lib/algebra.js'
import { clamp, debounce, isEqual } from 'lodash-es'
import { selectItems, setInteractiveElement } from './tapestry.js'
import { PresentationStep } from 'tapestry-core/src/data-format/schemas/presentation-step.js'

export const defaultBounceAnimation: FocusOptions['animate'] = {
  zoomEffect: 'bounce',
  duration: 1,
}

export const CONTINUOUS_ZOOM_SPEED = 3
const ELEMENT_TOOLBAR_PADDING = 65

let zoomAnimation: Tween | undefined = undefined
let continuousZoom: 'ZOOM-IN' | 'ZOOM-OUT' | null = null
const stopContinuosZoom = debounce(() => {
  if (continuousZoom !== null) {
    zoomAnimation?.stop()
    continuousZoom = null
  }
}, 100)

export type AnimationEffect = 'linear' | 'bounce' | 'exponential'

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

    continuousZoom = null
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
          : zoomEffect === 'exponential'
            ? new Exponent(toScale / fromScale).shifted(
                Math.log(fromScale) / Math.log(toScale / fromScale),
              )
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
          const newScale = progress === 1 ? toScale : zoomPath.valueAt(progress)
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

          updateViewport({
            scale: newScale,
            translation: progress === 1 ? { dx, dy } : newTranslation,
          })
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
        zoomToFit(viewportRect, startView ? [] : obstructions, focusRect, minScale, maxScale),
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
    if (continuous && continuousZoom === 'ZOOM-IN') {
      stopContinuosZoom()
      return
    }
    const scale = store.get('viewport.transform.scale')
    const { zoomStep, animate } = getZoomParameters(scale, MAX_SCALE, continuous)
    store.dispatch(transformViewport(zoomToCenter(store.get(), zoomStep), animate))
    if (continuous) {
      continuousZoom = 'ZOOM-IN'
      stopContinuosZoom()
    }
  }
}

export function zoomOut(continuous = false): StoreMutationCommand<TapestryViewModel> {
  return (_, { store }) => {
    if (continuous && continuousZoom === 'ZOOM-OUT') {
      stopContinuosZoom()
      return
    }
    const { viewport, items } = store.get(['viewport', 'items'])
    const scale = viewport.transform.scale
    const minScale = getMinScale(viewport, idMapToArray(items))
    const { zoomStep, animate } = getZoomParameters(scale, minScale, continuous)
    store.dispatch(transformViewport(zoomToCenter(store.get(), zoomStep), animate))
    if (continuous) {
      continuousZoom = 'ZOOM-OUT'
      stopContinuosZoom()
    }
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
  previousTransform?: LinearTransform
}

export function focusItems(
  itemIds?: Iterable<string>,
  { addToolbarPadding = false, animate = true, previousTransform }: FocusOptions = {},
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
    const transformed = zoomToFit(
      viewportRect,
      idMapToArray(viewport.obstructions),
      focusRect,
      minScale,
      MAX_SCALE,
      centralAnchor,
    )

    const shouldRestore =
      previousTransform !== undefined && isEqual(transformed, viewport.transform)

    store.dispatch(transformViewport(shouldRestore ? previousTransform : transformed, animate))
  }
}

export function focusGroup(
  id: string,
  options: Pick<FocusOptions, 'animate' | 'previousTransform'> = {},
): StoreMutationCommand<TapestryViewModel> {
  return (_, { store }) => {
    const groupItemIds = getGroupMembers(id, idMapToArray(store.get('items'))).map(
      (item) => item.dto.id,
    )
    store.dispatch(
      focusItems(groupItemIds, { addToolbarPadding: true, ...options }),
      selectItems(groupItemIds),
    )
  }
}

export function focusRel(
  id: string,
  options: Pick<FocusOptions, 'previousTransform'> = {},
): StoreMutationCommand<TapestryViewModel> {
  return (_, { store }) => {
    const rel = store.get('rels')[id]
    if (!rel) return

    store.dispatch(focusItems([rel.dto.from.itemId, rel.dto.to.itemId], options))
  }
}

export function focusMultiselection(
  options: Pick<FocusOptions, 'previousTransform'> = {},
): StoreMutationCommand<TapestryViewModel> {
  return (_, { store }) => {
    const items = getSelectionItems(store.get()).map((i) => i.dto.id)
    store.dispatch(focusItems(items, { addToolbarPadding: true, ...options }))
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
      store.dispatch(focusGroup(step.groupId, { animate }))
    }
  }
}

export function panViewport({
  dx = 0,
  dy = 0,
}: Partial<Vector>): StoreMutationCommand<TapestryViewModel> {
  return (_, { store }) => {
    const translation = add(store.get('viewport.transform.translation'), { dx, dy })
    const {
      viewport: {
        size,
        transform: { scale },
        maxTranslationRatio,
      },
      items,
    } = store.get(['viewport', 'items'])
    const [min, max] = getTranslationRange(
      size,
      scale,
      getBoundingRectangle(idMapToArray(items)),
      maxTranslationRatio,
    )
    const clippedTranslation = clampCoords(translation, min, max)

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

export function setThumbnailsInitialized(): StoreMutationCommand<TapestryViewModel> {
  return (model) => {
    model.thumbnailsInitialized = true
  }
}
