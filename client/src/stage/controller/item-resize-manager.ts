import {
  DirectionMask,
  EditableItemViewModel,
  EditableTapestryViewModel,
  ItemResizeState,
  ItemUIComponent,
  MultiselectionUIComponent,
  TapestryEditorStore,
} from '../../pages/tapestry/view-model'
import { uiComponentToDirectionMask } from '../../pages/tapestry/view-model/utils'
import { StoreMutationCommand } from 'tapestry-core-client/src/lib/store/index'
import { setPointerInteraction } from '../../pages/tapestry/view-model/store-commands/tapestry'
import { updateItem } from '../../pages/tapestry/view-model/store-commands/items'
import {
  aspectRatio,
  clampSize,
  innerFit,
  mul,
  outerFit,
  Point,
  Rectangle,
  Size,
  translate,
  Vector,
} from 'tapestry-core/src/lib/geometry'
import { compact, map, max } from 'lodash-es'
import { snapToGrid, updateTransformTargets } from '../utils'
import { ItemType } from 'tapestry-core/src/data-format/schemas/item'
import { EPS } from 'tapestry-core/src/lib/algebra'
import { TapestryStage } from 'tapestry-core-client/src/stage'
import { HoveredItem, HoveredMultiselection } from 'tapestry-core-client/src/view-model'
import { isHoveredElement, isHoveredItem } from 'tapestry-core-client/src/stage/utils'
import {
  getBoundingRectangle,
  getSelectionItems,
  MULTISELECT_RECTANGLE_PADDING,
} from 'tapestry-core-client/src/view-model/utils'
import { MAX_ITEM_SIZE, MIN_ITEM_SIZE } from '../../lib/media'

export type ResizeTarget = HoveredItem | HoveredMultiselection

const maxSizeByType: Partial<Record<ItemType, Size>> = {
  text: { height: Infinity, width: Infinity },
}

export interface ResizeOptions {
  snapToGrid?: boolean
  forceLockAspectRatio?: boolean
}

export class ItemResizeManager {
  private resizeTarget: ResizeTarget | null = null

  constructor(
    private store: TapestryEditorStore,
    private stage: TapestryStage,
  ) {}

  startResize(target: ResizeTarget, { forceLockAspectRatio = false }: ResizeOptions) {
    const directionMask = uiComponentToDirectionMask(
      target.uiComponent as ItemUIComponent | MultiselectionUIComponent,
    )
    const resizedItems = isHoveredItem(target)
      ? compact([this.store.get(`items.${target.modelId}`)])
      : getSelectionItems(this.store.get(['items', 'selection']))

    const selectionBounds = getBoundingRectangle(resizedItems)
    const fakeSize = { width: 0, height: 0 }
    this.resizeTarget = target

    this.store.dispatch(
      setPointerInteraction('resize', target, 'dom'),
      updateTransformTargets(this.resizeTarget, (item) => {
        const bounds = new Rectangle(item.dto)

        item.resizeState = {
          initialBounds: bounds,
          relativePositionInSelection: this.relativePosition(bounds, selectionBounds),
          minSize: fakeSize,
          maxSize: fakeSize,
        }
      }),
      (model) => {
        model.selectionResizeState = {
          initialBounds: selectionBounds,
          direction: directionMask,
          minSize: fakeSize,
        }
      },
      ...this.updateSizeLimits(forceLockAspectRatio),
    )
  }

  forceLockAspectRatio(lock: boolean) {
    if (this.isResizing) {
      this.store.dispatch(...this.updateSizeLimits(lock))
    }
  }

  resize(
    target: ResizeTarget,
    cursorLocation: Point,
    { snapToGrid = false, forceLockAspectRatio = false }: ResizeOptions,
  ) {
    const isMultiselect = !isHoveredElement(target)
    const resizePoint = this.getResizePoint(cursorLocation, {
      direction: this.store.get('selectionResizeState')!.direction,
      snapToGrid,
      isMultiselect,
    })

    const newBounds = this.calculateBounds(target, resizePoint, forceLockAspectRatio)

    if (isMultiselect) {
      this.handleMultipleResize(newBounds)
    } else {
      this.handleItemResize(target.modelId, newBounds)
    }
  }

  endResize() {
    this.store.dispatch(
      setPointerInteraction(null),
      updateTransformTargets(this.resizeTarget, {
        resizeState: null,
        previewBounds: null,
      }),
      (model) => {
        model.selectionResizeState = null
      },
    )
    this.resizeTarget = null
  }

  private handleItemResize(itemId: string, newBounds: Rectangle) {
    this.store.dispatch(
      updateItem(itemId, {
        dto: {
          size: newBounds.size,
          position: newBounds.position,
        },
      }),
    )
  }

  private handleMultipleResize(newSelectionBounds: Rectangle) {
    const { initialBounds } = this.store.get('selectionResizeState')!

    const scaleX = newSelectionBounds.width / initialBounds.width
    const scaleY = newSelectionBounds.height / initialBounds.height
    this.store.dispatch(
      (model) => {
        model.selectionResizeState!.bounds = newSelectionBounds
      },
      updateTransformTargets(this.resizeTarget, (item) => {
        const requestedBounds = this.calculateRequestedItemBounds(
          newSelectionBounds,
          item.resizeState!,
          scaleX,
          scaleY,
        )
        const lockAspectRatio = this.shouldLockAspectRatio(item)
        const { initialBounds: initialItemBounds, minSize, maxSize } = item.resizeState!
        const targetItemSize = lockAspectRatio
          ? innerFit(initialItemBounds, requestedBounds)
          : requestedBounds
        const actualItemSize = clampSize(targetItemSize, minSize, maxSize)

        item.dto.size = actualItemSize
        item.dto.position = {
          x: requestedBounds.left + (requestedBounds.width - item.dto.size.width) / 2,
          y: requestedBounds.top + (requestedBounds.height - item.dto.size.height) / 2,
        }
        const shouldPreviewRequestedBounds =
          Math.abs(1 - aspectRatio(actualItemSize) / aspectRatio(requestedBounds)) > 0.05
        item.previewBounds = shouldPreviewRequestedBounds ? requestedBounds : null
      }),
    )
  }

  private calculateRequestedItemBounds(
    selectionBounds: Rectangle,
    {
      initialBounds: initialItemBounds,
      relativePositionInSelection: relativePosition,
      minSize,
      maxSize,
    }: ItemResizeState,
    scaleX: number,
    scaleY: number,
  ) {
    const requestedSize = clampSize(
      {
        width: initialItemBounds.width * scaleX,
        height: initialItemBounds.height * scaleY,
      },
      minSize,
      maxSize,
    )
    const requestedPosition = {
      x: selectionBounds.left + relativePosition.x * (selectionBounds.width - requestedSize.width),
      y: selectionBounds.top + relativePosition.y * (selectionBounds.height - requestedSize.height),
    }
    return new Rectangle(requestedPosition, requestedSize)
  }

  private calculateBounds(target: ResizeTarget, resizePoint: Point, forceLockAspectRatio: boolean) {
    const { initialBounds, direction, minSize } = this.store.get('selectionResizeState')!
    let maxSize: Size
    let lockAspectRatio = forceLockAspectRatio
    if (isHoveredElement(target)) {
      const item = this.store.get('items')[target.modelId]!
      lockAspectRatio ||= this.shouldLockAspectRatio(item)
      maxSize = item.resizeState!.maxSize
    } else {
      maxSize = { width: Infinity, height: Infinity }
    }

    let newSize = { ...initialBounds.size }
    if (direction.top) {
      newSize.height = initialBounds.bottom - resizePoint.y
    }
    if (direction.bottom) {
      newSize.height = resizePoint.y - initialBounds.top
    }
    if (direction.left) {
      newSize.width = initialBounds.right - resizePoint.x
    }
    if (direction.right) {
      newSize.width = resizePoint.x - initialBounds.left
    }
    newSize = clampSize(newSize, minSize, maxSize)

    if (lockAspectRatio) {
      newSize = this.preserveAspectRatio(initialBounds.size, newSize, minSize, maxSize, direction)
    }

    const position = { ...initialBounds.position }
    if (direction.top) {
      position.y -= newSize.height - initialBounds.size.height
    }
    if (direction.left) {
      position.x -= newSize.width - initialBounds.size.width
    }

    return new Rectangle(position, newSize)
  }

  private isCornerSelected({ top, left, bottom, right }: DirectionMask) {
    return !!(top && left) || !!(top && right) || !!(bottom && left) || !!(bottom && right)
  }

  private preserveAspectRatio(
    initialSize: Size,
    newSize: Size,
    minSize: Size,
    maxSize: Size,
    resizeDirection: DirectionMask,
  ): Size {
    let shouldOuterFit: boolean
    if (this.isCornerSelected(resizeDirection)) {
      shouldOuterFit = true
    } else {
      const dimension = !!resizeDirection.left || !!resizeDirection.right ? 'width' : 'height'
      shouldOuterFit = newSize[dimension] > initialSize[dimension]
    }

    const size = shouldOuterFit ? outerFit(initialSize, newSize) : innerFit(initialSize, newSize)
    return clampSize(size, minSize, maxSize)
  }

  private get isResizing() {
    return !!this.store.get('selectionResizeState')
  }

  /**
   * Computes the relative position of the nested rectangle inside the containing rectangle.
   *
   * The relative position on a given axis is a number between 0 and 1. 0 means that the
   * left edges of the two rectangles coincide and 1 means that their right edges coincide.
   *
   * The nested rect must be entirely contained inside `container`, otherwise an error will be thrown.
   */
  private relativePosition(nested: Rectangle, container: Rectangle) {
    if (!container.contains(nested)) {
      throw new Error('Invalid arguments!')
    }
    function compute(start: number, length: number, cStart: number, cLength: number) {
      // Use "< EPS" instead of comparing cLength === length directly to avoid floating point errors.
      return Math.abs(cLength - length) < EPS ? 0.5 : (start - cStart) / (cLength - length)
    }
    return {
      x: compute(nested.left, nested.width, container.left, container.width),
      y: compute(nested.top, nested.height, container.top, container.height),
    }
  }

  private shouldLockAspectRatio(item: EditableItemViewModel) {
    return item.dto.type === 'video'
  }

  private updateSizeLimits(
    forceLockAspectRatio: boolean,
  ): StoreMutationCommand<EditableTapestryViewModel>[] {
    const minItemSizes: Size[] = []
    return [
      updateTransformTargets(this.resizeTarget, (item) => {
        item.resizeState!.minSize =
          this.shouldLockAspectRatio(item) || forceLockAspectRatio
            ? outerFit(item.resizeState!.initialBounds.size, MIN_ITEM_SIZE)
            : MIN_ITEM_SIZE
        minItemSizes.push(item.resizeState!.minSize)

        const maxSize = maxSizeByType[item.dto.type] ?? MAX_ITEM_SIZE
        item.resizeState!.maxSize =
          this.shouldLockAspectRatio(item) || forceLockAspectRatio
            ? innerFit(item.resizeState!.initialBounds.size, maxSize)
            : maxSize
      }),
      (model) => {
        model.selectionResizeState!.minSize = {
          width: max(map(minItemSizes, 'width'))!,
          height: max(map(minItemSizes, 'height'))!,
        }
      },
    ]
  }
  private getResizePoint(
    cursorPosition: Point,
    opts: {
      direction: DirectionMask
      snapToGrid: boolean
      isMultiselect: boolean
    },
  ): Point {
    const { worldTransform } = this.stage.pixi.tapestry.stage

    const currentPointInTapestry = worldTransform.applyInverse(cursorPosition)
    const resizePointCandidate = !opts.isMultiselect
      ? currentPointInTapestry
      : translate(
          currentPointInTapestry,
          mul(MULTISELECT_RECTANGLE_PADDING, this.dirMaskToVector(opts.direction)),
        )
    const guidelineSpacing = opts.snapToGrid ? this.store.get('viewportGuidelines.spacing') : null

    return snapToGrid(resizePointCandidate, guidelineSpacing)
  }

  private dirMaskToVector({ top, bottom, left, right }: DirectionMask): Vector {
    return {
      dx: left ? 1 : right ? -1 : 0,
      dy: top ? 1 : bottom ? -1 : 0,
    }
  }
}
