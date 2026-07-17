import { Graphics, Point, StrokeStyle } from 'pixi.js'
import { TapestryElementRenderer } from './tapestry-element-renderer'
import {
  angleX,
  mul,
  Point as TapestryPoint,
  translate,
  Vector,
} from 'tapestry-core/src/lib/geometry'
import { Store } from '../../lib/store/index'
import { IdMap } from 'tapestry-core/src/utils'
import { isHoveredElement } from '../utils'
import {
  computeRelCurvePoints,
  Curve,
  REL_ARROWHEAD_SIZES,
  REL_LINE_WIDTHS,
} from '../../view-model/rel-geometry'
import { ItemViewModel, RelViewModel, TapestryViewModel } from '../../view-model'
import { TapestryStage } from '..'
import { ThemeName } from '../../theme/themes'
import { log } from 'tapestry-core/src/lib/algebra'

const DEFAULT_REL_Z_INDEX = 0
const LINE_SMOOTHNESS = 0.7

const SCALE_LOG_BASE = 1.3
const MIN_REL_VISIBLE_SCALING = 0.4

export function drawCurve(gfx: Graphics, curve: Curve, part: 'full' | 'head' | 'tail' = 'full') {
  const start = part === 'tail' ? curve.points.middle : curve.points.start
  gfx.moveTo(start.x, start.y)
  if (part !== 'tail') {
    gfx.quadraticCurveTo(
      curve.points.control1.x,
      curve.points.control1.y,
      curve.points.middle.x,
      curve.points.middle.y,
      LINE_SMOOTHNESS,
    )
  }
  if (part !== 'head') {
    gfx.quadraticCurveTo(
      curve.points.control2.x,
      curve.points.control2.y,
      curve.points.end.x,
      curve.points.end.y,
      LINE_SMOOTHNESS,
    )
  }
  return gfx
}

export interface RelRenderState<R extends RelViewModel> {
  viewModel: R
  fromItem?: ItemViewModel
  toItem?: ItemViewModel
  isHighlighted: boolean
  theme: ThemeName
  relScale: number
}

export class RelRenderer<R extends RelViewModel> extends TapestryElementRenderer<
  R,
  RelRenderState<R>
> {
  private line: Graphics
  private lineHighlightFrom: Graphics
  private lineHighlightTo: Graphics
  private fromArrowhead: Graphics
  private toArrowhead: Graphics

  constructor(store: Store<TapestryViewModel>, stage: TapestryStage, viewModel: R) {
    super(store, stage, viewModel)
    this.pixiContainer.zIndex = DEFAULT_REL_Z_INDEX
    this.line = new Graphics({ label: 'line', eventMode: 'auto' })
    this.pixiContainer.addChild(this.line)
    this.lineHighlightFrom = new Graphics({ label: 'line-highlight-from', eventMode: 'static' })
    this.pixiContainer.addChild(this.lineHighlightFrom)
    this.lineHighlightTo = new Graphics({ label: 'line-highlight-to', eventMode: 'static' })
    this.pixiContainer.addChild(this.lineHighlightTo)
    this.fromArrowhead = new Graphics({ label: 'from-arrowhead', eventMode: 'auto' })
    this.pixiContainer.addChild(this.fromArrowhead)
    this.toArrowhead = new Graphics({ label: 'to-arrowhead', eventMode: 'auto' })
    this.pixiContainer.addChild(this.toArrowhead)
  }

  protected computeRelCurvePoints(viewModel: R, relScale: number, items: IdMap<ItemViewModel>) {
    return computeRelCurvePoints(viewModel, relScale, items)
  }

  protected obtainRenderState(viewModel: R, store: Store<TapestryViewModel>): RelRenderState<R> {
    const { id, from, to } = viewModel.dto
    const { items } = store.get()
    const fromItem = items[from.itemId]
    const toItem = items[to.itemId]
    const isInteractive = id === store.get('interactiveElement.modelId')
    const pointerInteractionTarget = store.get('pointerInteraction.target')

    const discreteScale =
      SCALE_LOG_BASE ** Math.floor(log(SCALE_LOG_BASE, store.get('viewport.transform.scale')))

    return {
      viewModel,
      fromItem,
      toItem,
      isHighlighted:
        isInteractive ||
        (isHoveredElement(pointerInteractionTarget) && pointerInteractionTarget.modelId === id),
      theme: store.get('theme'),
      relScale: Math.max(1, MIN_REL_VISIBLE_SCALING / discreteScale),
    }
  }

  protected doRender(state: RelRenderState<R>, changedKeys: (keyof RelRenderState<R>)[]) {
    if (changedKeys.length === 1 && changedKeys[0] === 'isHighlighted') {
      // No need to redraw the paths, just update the highlights, if necessary
      this.lineHighlightFrom.alpha = this.lineHighlightTo.alpha = state.isHighlighted ? 0.1 : 0
      return
    }

    const { from, to, color, weight } = state.viewModel.dto

    this.line.clear()
    this.lineHighlightFrom.clear()
    this.lineHighlightTo.clear()
    this.fromArrowhead.clear()
    this.toArrowhead.clear()

    if (!state.fromItem || !state.toItem) return

    const curve = this.computeRelCurvePoints(state.viewModel, state.relScale, {
      [state.fromItem.dto.id]: state.fromItem,
      [state.toItem.dto.id]: state.toItem,
    })

    const arrowHeadSize = REL_ARROWHEAD_SIZES[weight] * state.relScale
    const lineStrokeWidth = REL_LINE_WIDTHS[weight] * state.relScale

    // Instead of a single cubic Bezier curve, draw two quadratic Bezier curves joined in the middle.
    // This way we will have two separate segments of the curve and we will be able to handle
    // user interactions with them more easily.
    drawCurve(this.line, curve).stroke({ width: lineStrokeWidth, color, cap: 'butt' })

    const highlightStrokeStyle: StrokeStyle = {
      width: 4 * lineStrokeWidth,
      color: 'white',
      cap: 'butt',
    }

    drawCurve(this.lineHighlightFrom, curve, 'head').stroke(highlightStrokeStyle)
    drawCurve(this.lineHighlightTo, curve, 'tail').stroke(highlightStrokeStyle)
    this.lineHighlightFrom.tint = this.lineHighlightTo.tint = color
    this.lineHighlightFrom.alpha = this.lineHighlightTo.alpha = state.isHighlighted ? 0.1 : 0

    if (from.arrowhead === 'arrow') {
      this.drawArrowhead(this.fromArrowhead, curve.from, curve.fromDirection, arrowHeadSize, color)
    }

    if (to.arrowhead === 'arrow') {
      this.drawArrowhead(this.toArrowhead, curve.to, curve.toDirection, arrowHeadSize, color)
    }
  }

  private drawArrowhead(
    graphics: Graphics,
    point: TapestryPoint,
    dir: Vector,
    size: number,
    color: string,
  ) {
    const corner = size / 8
    const triangleRadius = size / 2
    const middle = translate(point, mul(triangleRadius - corner * (Math.sqrt(2) - 1), dir))
    const midpoint = new Point(middle.x, middle.y)

    graphics
      .roundPoly(midpoint.x, midpoint.y, triangleRadius, 3, corner, angleX(dir) + Math.PI / 6)
      .fill({ color })
  }
}
