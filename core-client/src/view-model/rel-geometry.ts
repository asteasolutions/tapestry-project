import { LineWeight } from 'tapestry-core/src/data-format/schemas/rel.js'
import {
  distance,
  translate,
  mul,
  Point,
  Vector,
  norm,
  normalize,
  vector,
  midpoint,
} from 'tapestry-core/src/lib/geometry.js'
import { Range } from 'tapestry-core/src/lib/algebra.js'
import { ItemViewModel, Viewport, RelViewModel, RelEndpointName } from './index.js'
import { computeRestrictedScale } from './utils.js'
import { IdMap, idMapToArray } from 'tapestry-core/src/utils.js'
import { clamp } from 'lodash-es'

export const REL_ARROWHEAD_SIZES: Record<LineWeight, number> = {
  light: 15,
  medium: 20,
  heavy: 25,
}

export const REL_LINE_WIDTHS: Record<LineWeight, number> = {
  light: 2,
  medium: 4,
  heavy: 6,
}

type CurvePoints = Record<'start' | 'control1' | 'middle' | 'control2' | 'end', Point>

// TODO: Maybe this should be part of the rel view model and get recalculated every time
// a rel is dragged or one of its related items is moved or resized.
export interface Curve {
  from: Point
  fromDirection: Vector
  to: Point
  toDirection: Vector
  points: CurvePoints
}

interface CurveEndpointParams {
  point: Point
  direction?: Vector
  hasArrow?: boolean
}

interface CurveParams {
  from: CurveEndpointParams
  to: CurveEndpointParams
  controlPointOffsetRange: Range
  lineWidth: number
}

export function computeCurvePoints({ from, to, controlPointOffsetRange, lineWidth }: CurveParams) {
  const curvePoints: Partial<CurvePoints> = {}

  const endpointDistance = distance(from.point, to.point)

  function computeSemiCurvePoints({ point, hasArrow }: CurveEndpointParams, direction: Vector) {
    const curveEndpoint = hasArrow ? translate(point, mul(lineWidth / 2, direction)) : point
    const dist = norm(mul(endpointDistance, direction)) / 3
    const controlPoint = translate(
      curveEndpoint,
      mul(clamp(dist, controlPointOffsetRange.min, controlPointOffsetRange.max), direction),
    )
    return { curveEndpoint, controlPoint }
  }

  let fromDirection = from.direction
  if (fromDirection) {
    const semiCurvePoints = computeSemiCurvePoints(from, fromDirection)
    curvePoints.start = semiCurvePoints.curveEndpoint
    curvePoints.control1 = semiCurvePoints.controlPoint
  }

  let toDirection = to.direction
  if (toDirection) {
    const semiCurvePoints = computeSemiCurvePoints(to, toDirection)
    curvePoints.end = semiCurvePoints.curveEndpoint
    curvePoints.control2 = semiCurvePoints.controlPoint
  }

  if (!fromDirection) {
    fromDirection = normalize(vector(from.point, curvePoints.control2 ?? to.point))
    const semiCurvePoints = computeSemiCurvePoints(from, fromDirection)
    curvePoints.start = semiCurvePoints.curveEndpoint
    curvePoints.control1 = semiCurvePoints.controlPoint
  }

  if (!toDirection) {
    toDirection = normalize(vector(to.point, curvePoints.control1 ?? from.point))
    const semiCurvePoints = computeSemiCurvePoints(to, toDirection)
    curvePoints.end = semiCurvePoints.curveEndpoint
    curvePoints.control2 = semiCurvePoints.controlPoint
  }

  curvePoints.middle = midpoint(curvePoints.control1!, curvePoints.control2!)

  return {
    from: from.point,
    fromDirection,
    to: to.point,
    toDirection,
    points: curvePoints as CurvePoints,
  }
}

export function computeRelCurvePoints<R extends RelViewModel>(
  relViewModel: R,
  viewport: Viewport,
  items: IdMap<ItemViewModel>,
  getArrowEndpoint = defaultGetArrowEndpoint<R>,
  computeAnchoredCurveDirection = defaultComputeAnchoredCurveDirection<R>,
): Curve {
  const scale = computeRestrictedScale(viewport, idMapToArray(items), { min: 1 })
  const { from, to, weight } = relViewModel.dto
  const controlPointOffsetRange: Range = {
    min: (4 * REL_ARROWHEAD_SIZES[weight]) / scale,
    max: 150,
  }

  return computeCurvePoints({
    from: {
      point: getArrowEndpoint(relViewModel, 'from', items),
      direction: computeAnchoredCurveDirection(relViewModel, 'from'),
      hasArrow: from.arrowhead === 'none',
    },
    to: {
      point: getArrowEndpoint(relViewModel, 'to', items),
      direction: computeAnchoredCurveDirection(relViewModel, 'to'),
      hasArrow: to.arrowhead === 'none',
    },
    controlPointOffsetRange,
    lineWidth: REL_LINE_WIDTHS[weight],
  })
}

export function curveDirection(anchor: Point): Vector {
  if (anchor.x === 0 || anchor.x === 1) {
    return { dx: 2 * (anchor.x - 0.5), dy: 0 }
  }

  if (anchor.y === 0 || anchor.y === 1) {
    return { dx: 0, dy: 2 * (anchor.y - 0.5) }
  }

  if (anchor.x === 0.5 && anchor.y === 0.5) {
    return { dx: 1, dy: 0 }
  }

  return normalize({ dx: anchor.x - 0.5, dy: anchor.y - 0.5 })
}

function defaultGetArrowEndpoint<R extends RelViewModel>(
  relViewModel: R,
  endpoint: 'from' | 'to',
  items: IdMap<ItemViewModel>,
) {
  const relEndpoint = relViewModel.dto[endpoint]
  const { dto } = items[relEndpoint.itemId]!

  return {
    x: dto.position.x + relEndpoint.anchor.x * dto.size.width,
    y: dto.position.y + relEndpoint.anchor.y * dto.size.height,
  }
}

function defaultComputeAnchoredCurveDirection<R extends RelViewModel>(
  relViewModel: R,
  endpoint: RelEndpointName,
) {
  return curveDirection(relViewModel.dto[endpoint].anchor) as Vector | undefined
}
