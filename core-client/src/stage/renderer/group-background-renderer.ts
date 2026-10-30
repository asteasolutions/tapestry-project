import { Graphics } from 'pixi.js'
import { Store } from '../../lib/store'
import { GroupViewModel, TapestryViewModel } from '../../view-model'
import { TapestryStage } from '..'
import {
  computeRestrictedScale,
  getBoundingRectangle,
  getGroupMembers,
  MULTISELECT_RECTANGLE_PADDING,
} from '../../view-model/utils'
import { idMapToArray } from 'tapestry-core/src/utils'
import { drawDashedPolyline, roundedRectPolyline } from '../../lib/pixi'
import { getOpaqueColor, LiteralColor } from '../../theme/types'
import { Point, Rectangle, Size } from 'tapestry-core/src/lib/geometry'
import { clamp, throttle } from 'lodash-es'
import { ThemeName, THEMES } from '../../theme/themes'
import { TapestryElementRenderer } from './tapestry-element-renderer'
import { roundToPrecision } from 'tapestry-core/src/lib/algebra'

export interface GroupBackgroundRenderState {
  origin: Point
  size: Size
  backgroundColor: LiteralColor | null
  borderColor: LiteralColor | null
  borderScale: number
  isSelected: boolean
  theme: ThemeName
}

const ZOOM_STEP = 0.5

export class GroupBackgroundRenderer<G extends GroupViewModel> extends TapestryElementRenderer<
  G,
  GroupBackgroundRenderState
> {
  private background = new Graphics({ eventMode: 'static' })
  private border = new Graphics({ eventMode: 'none' })
  private computeBorderScale = throttle(
    (store: Store<TapestryViewModel>) =>
      computeRestrictedScale(store.get('viewport'), idMapToArray(store.get('items'))) /
      store.get('viewport.transform.scale'),
    100,
  )

  constructor(store: Store<TapestryViewModel>, stage: TapestryStage, viewModel: G) {
    super(store, stage, viewModel)
    this.pixiContainer.addChild(this.background, this.border)
  }

  protected obtainRenderState(
    viewModel: G,
    store: Store<TapestryViewModel>,
  ): GroupBackgroundRenderState {
    const { id, color, hasBackground, hasBorder } = viewModel.dto
    const isSelected = store.get('selection.groupIds').has(id)
    const groupMembers = getGroupMembers(id, idMapToArray(store.get('items')))
    const bounds = getBoundingRectangle(groupMembers).expand(MULTISELECT_RECTANGLE_PADDING)
    const isDragged = isSelected && store.get('pointerInteraction')?.action === 'drag'
    const backgroundColor = (hasBackground && !isDragged && color) || null
    const borderColor = hasBorder && color ? getOpaqueColor(color) : null
    const borderScale = this.computeBorderScale(store)

    return {
      origin: bounds.position,
      size: bounds.size,
      backgroundColor,
      borderColor,
      borderScale: roundToPrecision(borderScale, ZOOM_STEP, 'ceil'),
      isSelected,
      theme: store.get('theme'),
    }
  }

  doRender(state: GroupBackgroundRenderState) {
    const radius = 16
    const borderWidth = 2 * state.borderScale

    this.background.clear()
    if (state.isSelected || state.backgroundColor || state.borderColor) {
      this.background.roundRect(
        state.origin.x,
        state.origin.y,
        state.size.width,
        state.size.height,
        state.isSelected ? 0 : radius,
      )
      const defaultColor = state.isSelected
        ? THEMES[state.theme].color('background.brand')
        : 'transparent'
      this.background.fill({
        color: state.backgroundColor ?? defaultColor,
        alpha: state.backgroundColor ? 1 : 0.1,
      })
      if (state.isSelected) {
        this.background.stroke({
          width: borderWidth,
          color: state.borderColor ?? defaultColor,
        })
      }
    }

    this.border.clear()
    if (state.borderColor && !state.isSelected) {
      const bounds = new Rectangle(state.origin, state.size)
      drawDashedPolyline(
        this.border,
        roundedRectPolyline(bounds, radius, clamp(Math.round(12 / state.borderScale), 4, 16)),
        Math.round(6 * state.borderScale),
        Math.round(6 * state.borderScale),
      )
      this.border.stroke({
        width: borderWidth,
        color: state.borderColor,
        cap: 'square',
      })
    }
  }
}
