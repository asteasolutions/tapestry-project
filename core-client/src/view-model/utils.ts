import { clamp } from 'lodash-es'
import {
  add,
  coordMax,
  coordMin,
  DirectionalOffsets,
  IDENTITY_TRANSFORM,
  linearMap,
  LinearTransform,
  mul,
  neg,
  ORIGIN,
  Point,
  Rectangle,
  resizeToWidth,
  scaleBy,
  Size,
  translate,
  Vector,
  ZERO_OFFSETS,
} from 'tapestry-core/src/lib/geometry.js'
import {
  TapestryElementViewModel,
  Viewport,
  RelViewModel,
  ItemViewModel,
  TapestryViewModel,
  MAX_SCALE,
  MIN_RESTRICTED_SCALE,
  MAX_RESTRICTED_SCALE,
  Selection,
  PresentationStepViewModel,
} from './index.js'
import { THEMES } from '../theme/themes.js'
import {
  arrayToIdMap,
  getPresentedModelId,
  IdMap,
  idMapToArray,
  isItem,
} from 'tapestry-core/src/utils.js'
import { Range } from 'tapestry-core/src/lib/algebra.js'
import { Item, ItemType } from 'tapestry-core/src/data-format/schemas/item.js'
import { PresentationStep } from 'tapestry-core/src/data-format/schemas/presentation-step.js'
import { Tapestry, TapestryElement } from 'tapestry-core/src/data-format/schemas/tapestry.js'
import { isMobile } from '../lib/user-agent.js'
import { Rel } from 'tapestry-core/src/data-format/schemas/rel.js'

const CONTENT_FIT_PADDING = 16
const ELEMENT_TOOLBAR_OFFSET = 30
const ELEMENT_TOOLBAR_HEIGHT = 48

export function viewModelFromTapestry(
  tapestry: Tapestry,
  presentationSteps: PresentationStep[],
): TapestryViewModel {
  const presentationStepViewModels = presentationSteps.map((dto) => ({ dto }))
  return {
    id: tapestry.id,
    title: tapestry.title,
    description: tapestry.description,
    thumbnail: tapestry.thumbnail,
    items: Object.fromEntries(tapestry.items.map((item) => [item.id, { dto: item }])),
    rels: Object.fromEntries(tapestry.rels.map((rel) => [rel.id, { dto: rel }])),
    groups: Object.fromEntries(tapestry.groups.map((group) => [group.id, { dto: group }])),
    presentationSteps: arrayToIdMap(presentationStepViewModels, (step) => step.dto.id),
    selection: {
      itemIds: new Set(),
      groupIds: new Set(),
    },
    viewport: {
      transform: IDENTITY_TRANSFORM,
      size: {
        width: 0,
        height: 0,
      },
      focusRectInsets: {},
      ready: false,
      isZoomingLocked: !tapestry.items.length,
    },
    theme: tapestry.theme,
    background: tapestry.background,
    pointerMode: isMobile ? 'pan' : 'select',
    startView: tapestry.startView,
    displaySidePane: null,
  }
}

export function isRelViewModel<T extends RelViewModel = RelViewModel>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj?: Record<string, any>,
): obj is T {
  return (
    !!obj &&
    typeof obj.dto === 'object' &&
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    typeof obj.dto.id === 'string' &&
    typeof obj.dto.from === 'object' &&
    typeof obj.dto.to === 'object'
  )
}

export function isItemViewModel<T extends ItemViewModel = ItemViewModel>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj?: Record<string, any>,
): obj is T {
  return (
    !!obj &&
    typeof obj.dto === 'object' &&
    typeof obj.dto.id === 'string' &&
    typeof obj.dto.type === 'string'
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */
  )
}

export function getType(viewModel: TapestryElementViewModel): 'rel' | `item:${ItemType}` {
  return isRelViewModel(viewModel) ? 'rel' : `item:${viewModel.dto.type}`
}

export function getAnchorCoordinates(item: Item, anchor: Point): Point {
  return {
    x: item.position.x + anchor.x * item.size.width,
    y: item.position.y + anchor.y * item.size.height,
  }
}

export function getBounds<I extends Item>(item: I): Rectangle
export function getBounds(rel: Rel, items: IdMap<Item | { dto: Item }>): Rectangle
export function getBounds(itemOrRel: TapestryElement, items?: IdMap<Item | { dto: Item }>) {
  if (isItem(itemOrRel)) {
    return new Rectangle(itemOrRel)
  }

  if (!items) {
    throw new Error('Cannot determine rel bounds without access to the tapestry items')
  }

  const fromItem = items[itemOrRel.from.itemId]!
  const toItem = items[itemOrRel.to.itemId]!
  const getItem = (item: Item | { dto: Item }) => ('dto' in item ? item.dto : item)
  const fromPoint = getAnchorCoordinates(getItem(fromItem), itemOrRel.from.anchor)
  const toPoint = getAnchorCoordinates(getItem(toItem), itemOrRel.to.anchor)
  return Rectangle.bounding([fromPoint, toPoint])
}

export function getBoundingRectangle<I extends ItemViewModel>(items: readonly I[]): Rectangle {
  return Rectangle.bounding(items.map((i) => getBounds(i.dto)))
}

export const MULTISELECT_RECTANGLE_PADDING = 10

export function itemsFocusRect<I extends ItemViewModel>(
  viewport: Viewport,
  items: readonly I[],
  minScale: number,
  addToolbarPadding = false,
) {
  const boundingRect = getBoundingRectangle(items)
  const { scale: itemsFitScale } = zoomToFit(viewport, boundingRect, minScale)
  const contentFitPadding = CONTENT_FIT_PADDING / itemsFitScale
  const toolbarPadding = addToolbarPadding
    ? ELEMENT_TOOLBAR_OFFSET + ELEMENT_TOOLBAR_HEIGHT / itemsFitScale
    : 0

  const padding = {
    top: contentFitPadding + toolbarPadding,
    right: contentFitPadding,
    bottom: contentFitPadding,
    left: contentFitPadding,
  }

  return boundingRect.expand(padding)
}

export function zoomToCenter(tapestry: TapestryViewModel, step: number) {
  const {
    size: { height, width },
    transform: { scale, translation },
  } = tapestry.viewport
  const center = { x: width / 2, y: height / 2 }
  const minScale = getMinScale(tapestry.viewport, idMapToArray(tapestry.items))
  return scaleBy(scale, translation, step, center, minScale, MAX_SCALE)
}

export function zoomToFit(
  viewport: Viewport,
  rect: Rectangle,
  minScale: number,
  maxScale = MAX_SCALE,
): LinearTransform {
  const { size, focusRectInsets } = viewport
  const maxInset = getMaxInset(Object.values(focusRectInsets))
  const focusRect = new Rectangle(ORIGIN, size).contract(maxInset)
  const coef = Math.min(focusRect.height / rect.height, focusRect.width / rect.width)
  const newScale = clamp(coef, minScale, maxScale)

  return {
    scale: newScale,
    translation: {
      dx: -((rect.left + rect.right) * newScale - (focusRect.left + focusRect.right)) / 2,
      dy: -((rect.top + rect.bottom) * newScale - (focusRect.top + focusRect.bottom)) / 2,
    },
  }
}

export function positionAtViewport(
  viewport: Viewport,
  point: Point = { x: 0, y: 0 },
  offset: Vector = { dx: 0, dy: 0 },
) {
  const { translation, scale } = viewport.transform
  return translate(translate(point, neg(translation), scale), offset)
}

export function computeRestrictedScale<I extends ItemViewModel>(
  viewport: Viewport,
  items: I[],
  range?: Partial<Range>,
) {
  const { scale } = viewport.transform
  const minScale = getMinScale(viewport, items)
  if (scale < 1) {
    return linearMap(scale, [minScale, 1], [range?.min ?? MIN_RESTRICTED_SCALE, 1])
  }
  return linearMap(scale, [1, MAX_SCALE], [1, range?.max ?? MAX_RESTRICTED_SCALE])
}

export function getTheme(tapestry: TapestryViewModel) {
  return THEMES[tapestry.theme]
}

const MIN_ZOOM_CONTENT_RATIO = 0.5
const MAX_MIN_SCALE = 0.5
export function getMinScale<I extends ItemViewModel>(viewport: Viewport, items: I[]) {
  const boundingRect = getBoundingRectangle(items)
  const widthRatio = (MIN_ZOOM_CONTENT_RATIO * viewport.size.width) / boundingRect.width
  const heightRatio = (MIN_ZOOM_CONTENT_RATIO * viewport.size.height) / boundingRect.height
  // Since the minimal scale is dynamic, it may become larger than the current scale of the tapestry.
  // In this case take the current scale to be the minimum to avoid jumps while zooming smoothly.
  const { scale } = viewport.transform
  return Math.min(scale, widthRatio, heightRatio, MAX_MIN_SCALE)
}

const TRANSLATION_RANGE_PADDING: Vector = { dx: 20, dy: 20 }
export function getTranslationRange(tapestry: TapestryViewModel): [Vector, Vector] {
  const {
    transform: { scale, translation },
    size: { width, height },
  } = tapestry.viewport
  const viewportOffset = { dx: width, dy: height }

  const boundingRect = getBoundingRectangle(idMapToArray(tapestry.items))
  const topLeftOffset = { dx: boundingRect.left, dy: boundingRect.top }
  const bottomRightOffset = { dx: boundingRect.right, dy: boundingRect.bottom }

  const minTranslation: Vector = add(neg(mul(scale, bottomRightOffset)), TRANSLATION_RANGE_PADDING)
  const maxTranslation = add(
    viewportOffset,
    neg(mul(scale, topLeftOffset)),
    neg(TRANSLATION_RANGE_PADDING),
  )

  return [coordMin(minTranslation, translation), coordMax(maxTranslation, translation)]
}

export interface ScrollbarPosition {
  offset: number
  size: number
}

export function getScrollbarPositions<I extends ItemViewModel>(
  viewport: Viewport,
  items: I[],
): Record<'horizontal' | 'vertical', ScrollbarPosition> {
  const {
    size: viewportSize,
    transform: { scale, translation },
  } = viewport

  const tapestryBoundingBox = getBoundingRectangle(items)
  const viewportSizeOnTapestry: Size = {
    width: viewportSize.width / scale,
    height: viewportSize.height / scale,
  }
  const canvasPadding: Vector = {
    dx: viewportSizeOnTapestry.width - TRANSLATION_RANGE_PADDING.dx / scale,
    dy: viewportSizeOnTapestry.height - TRANSLATION_RANGE_PADDING.dy / scale,
  }
  const canvasSize: Size = {
    width: tapestryBoundingBox.width + 2 * canvasPadding.dx,
    height: tapestryBoundingBox.height + 2 * canvasPadding.dy,
  }
  const viewportPosition: Point = {
    x: canvasPadding.dx - tapestryBoundingBox.left - translation.dx / scale,
    y: canvasPadding.dy - tapestryBoundingBox.top - translation.dy / scale,
  }
  const movableAreaSize: Size = {
    width: canvasSize.width - viewportSizeOnTapestry.width,
    height: canvasSize.height - viewportSizeOnTapestry.height,
  }

  return {
    horizontal: {
      offset: viewportPosition.x / movableAreaSize.width,
      size: viewportSizeOnTapestry.width / canvasSize.width,
    },
    vertical: {
      offset: viewportPosition.y / movableAreaSize.height,
      size: viewportSizeOnTapestry.height / canvasSize.height,
    },
  }
}

export function resizeItem(item: Item, size: Size) {
  return item.type === 'video' ? resizeToWidth(item.size, size.width) : size
}

const ITEM_OVERLAY_SIZE_THRESHOLD = 450

export function getItemOverlayScale(itemSize: Size) {
  const { width, height } = itemSize
  const minSide = Math.min(height, width)

  return Math.max(minSide / ITEM_OVERLAY_SIZE_THRESHOLD, 1)
}

export function getMaxInset(insets: DirectionalOffsets[]) {
  return insets.reduce(
    (acc, inset) => ({
      top: Math.max(acc.top, inset.top),
      right: Math.max(acc.right, inset.right),
      bottom: Math.max(acc.bottom, inset.bottom),
      left: Math.max(acc.left, inset.left),
    }),
    ZERO_OFFSETS,
  )
}

export function isSingleGroupSelected(selection: Selection) {
  return selection.itemIds.size === 0 && selection.groupIds.size === 1
}

export function isMultiselection(selection: Selection) {
  return selection.groupIds.size >= 1 || selection.itemIds.size >= 2
}

export function isItemInSelection<I extends ItemViewModel>(
  item: I | undefined,
  selection: TapestryViewModel['selection'],
): boolean {
  return (
    selection.itemIds.has(item?.dto.id ?? '') || selection.groupIds.has(item?.dto.groupId ?? '')
  )
}

export function getSelectionItems<I extends ItemViewModel>({
  items,
  selection,
}: Pick<TapestryViewModel<I>, 'items' | 'selection'>): I[] {
  return idMapToArray(items).filter((item) => isItemInSelection(item, selection))
}

export function getGroupMembers<I extends ItemViewModel>(groupId: string, items: I[]): I[] {
  return items.filter((item) => item.dto.groupId === groupId)
}

export function getPresentationIndex(
  sequence: PresentationStep[],
  target: PresentationStep | string,
) {
  // Presentation indices are 1-based. Here we return 0 if the given ID is not in the sequence.
  return (
    sequence.findIndex((dto) =>
      typeof target === 'string' ? getPresentedModelId(dto) === target : dto.id === target.id,
    ) + 1
  )
}

export function getAdjacentPresentationSteps<P extends PresentationStepViewModel>(
  targetId: string,
  presentationSteps: IdMap<P>,
) {
  const stepArray = idMapToArray(presentationSteps)
  const step = stepArray.find(({ dto }) => getPresentedModelId(dto) === targetId)
  const prevStepId = step?.dto.prevStepId
  return {
    prev: prevStepId ? presentationSteps[prevStepId] : null,
    next: stepArray.find((s) => s.dto.prevStepId === step?.dto.id),
  }
}

export function supportsCustomThumbnail(item: Item) {
  return (
    item.type === 'video' || item.type === 'webpage' || item.type === 'pdf' || item.type === 'audio'
  )
}

export function supportsThumbnail(item: Item) {
  return item.type === 'video' || item.type === 'webpage' || item.type === 'pdf'
}

export function isBlobURL(str: string) {
  return str.startsWith('blob:')
}
