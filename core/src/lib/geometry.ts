import { clamp, defaults, inRange, maxBy, sum, zipObject } from 'lodash-es'
import { EPS } from './algebra.js'
import { circularShift } from './array.js'

export interface LinearTransform {
  readonly scale: number
  readonly translation: Vector
}

export const IDENTITY_TRANSFORM: LinearTransform = {
  scale: 1,
  translation: { dx: 0, dy: 0 },
}

export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

// Guaranteed to be in clockwise order, starting from top
export const CARDINAL_DIRECTIONS = ['top', 'right', 'bottom', 'left'] as const
export const CARDINAL_OPPOSITE = zipObject(
  CARDINAL_DIRECTIONS,
  circularShift(CARDINAL_DIRECTIONS, 2),
)
export type CardinalDirection = (typeof CARDINAL_DIRECTIONS)[number]

export type DirectionalOffsets = Record<CardinalDirection, number>

export const ZERO_OFFSETS = Object.freeze({
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
})

function parseDirectionalOffsets(
  args: (number | Partial<DirectionalOffsets>)[],
): DirectionalOffsets {
  if (typeof args[0] === 'object') {
    return defaults(args[0], { top: 0, right: 0, bottom: 0, left: 0 })
  }

  if (args.some((arg) => !Number.isFinite(arg))) throw new Error('Invalid padding parameters')

  const vert = args[0]
  const horiz = (Number.isFinite(args[1]) ? args[1] : args[0]) as number
  return { top: vert, right: horiz, bottom: vert, left: horiz }
}

export interface Rectanglish {
  position: Point
  size: Size
}

export class Rectangle {
  public position: Point
  public size: Size

  constructor(arg: Rectanglish)
  constructor(position: Point, size: Size)
  constructor(x: number, y: number, width: number, height: number)
  constructor(x: Point | number | Rectanglish, y?: Size | number, width?: number, height?: number) {
    if (typeof x === 'number' && typeof y === 'number') {
      this.position = { x, y }
      this.size = { width: width!, height: height! }
    } else if (typeof y === 'undefined') {
      this.position = { ...(x as Rectanglish).position }
      this.size = { ...(x as Rectanglish).size }
    } else {
      this.position = { ...(x as Point) }
      this.size = { ...(y as Size) }
    }
  }

  static bounding(shapes: (Rectangle | Point)[]) {
    if (shapes.length === 0) {
      return new Rectangle(0, 0, 0, 0)
    }

    const topLeft: Point = {
      x: Math.min(...shapes.map((s) => (s instanceof Rectangle ? s.left : s.x))),
      y: Math.min(...shapes.map((s) => (s instanceof Rectangle ? s.top : s.y))),
    }
    const bottomRight: Point = {
      x: Math.max(...shapes.map((s) => (s instanceof Rectangle ? s.right : s.x))),
      y: Math.max(...shapes.map((s) => (s instanceof Rectangle ? s.bottom : s.y))),
    }

    return new Rectangle(topLeft, {
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    })
  }

  static fittedInto(arg: Rectangle | Size, aspectRatio: number, centerAnchor?: Point) {
    const container = arg instanceof Rectangle ? arg : new Rectangle(ORIGIN, arg)
    centerAnchor ??= container.center
    const targetSize = innerFit({ width: aspectRatio, height: 1 }, container.size)
    return new Rectangle(
      {
        x: clamp(
          centerAnchor.x - targetSize.width / 2,
          container.left,
          container.right - targetSize.width,
        ),
        y: clamp(
          centerAnchor.y - targetSize.height / 2,
          container.top,
          container.bottom - targetSize.height,
        ),
      },
      targetSize,
    )
  }

  intersects(other: Rectangle) {
    return (
      this.right >= other.left &&
      this.left <= other.right &&
      this.bottom >= other.top &&
      this.top <= other.bottom
    )
  }

  intersection(other: Rectangle) {
    if (!this.intersects(other)) {
      return null
    }

    const fromX = Math.max(this.left, other.left)
    const toX = Math.min(this.right, other.right)
    const fromY = Math.max(this.top, other.top)
    const toY = Math.min(this.bottom, other.bottom)

    return new Rectangle(fromX, fromY, toX - fromX, toY - fromY)
  }

  contains(other: Rectangle) {
    return (
      this.top <= other.top + EPS &&
      this.right >= other.right - EPS &&
      this.bottom >= other.bottom - EPS &&
      this.left <= other.left + EPS
    )
  }

  expand(padding: number): Rectangle
  expand(vertical: number, horizontal: number): Rectangle
  expand(padding: DirectionalOffsets): Rectangle
  expand(...args: (number | DirectionalOffsets)[]) {
    const padding = parseDirectionalOffsets(args)

    const { x, y } = this.position
    return new Rectangle(
      x - padding.left,
      y - padding.top,
      this.width + padding.left + padding.right,
      this.height + padding.top + padding.bottom,
    )
  }

  contract(padding: number): Rectangle
  contract(vertical: number, horizontal: number): Rectangle
  contract(padding: Partial<DirectionalOffsets>): Rectangle
  contract(...args: (number | Partial<DirectionalOffsets>)[]) {
    const inset = parseDirectionalOffsets(args)
    return this.expand({
      top: -inset.top,
      right: -inset.right,
      bottom: -inset.bottom,
      left: -inset.left,
    })
  }

  get left() {
    return this.position.x + Math.min(this.size.width, 0)
  }
  get right() {
    return this.position.x + Math.max(this.size.width, 0)
  }
  get top() {
    return this.position.y + Math.min(this.size.height, 0)
  }
  get bottom() {
    return this.position.y + Math.max(this.size.height, 0)
  }
  get center() {
    return translate(this.position, { dx: this.size.width / 2, dy: this.size.height / 2 })
  }
  get width() {
    return Math.abs(this.size.width)
  }
  get height() {
    return Math.abs(this.size.height)
  }
  get area() {
    return this.width * this.height
  }
  get aspectRatio() {
    return aspectRatio(this.size)
  }
}

export const ORIGIN: Point = { x: 0, y: 0 }

export interface Vector {
  dx: number
  dy: number
}

export function translate(point: Point, translation: Vector, scale = 1): Point {
  return {
    x: (point.x + translation.dx) / scale,
    y: (point.y + translation.dy) / scale,
  }
}

export function vector(start: Point, end?: Point): Vector {
  if (!end) {
    end = start
    start = ORIGIN
  }
  return {
    dx: end.x - start.x,
    dy: end.y - start.y,
  }
}

export function midpoint(a: Point, b: Point, ratio = 0.5) {
  return {
    x: a.x + (b.x - a.x) * ratio,
    y: a.y + (b.y - a.y) * ratio,
  }
}

export function neg(vector: Vector): Vector {
  return {
    dx: -vector.dx,
    dy: -vector.dy,
  }
}

export function add(...vectors: Vector[]): Vector {
  return {
    dx: sum(vectors.map((v) => v.dx)),
    dy: sum(vectors.map((v) => v.dy)),
  }
}

export function mul(multiplier: number, vector: Vector): Vector {
  return {
    dx: multiplier * vector.dx,
    dy: multiplier * vector.dy,
  }
}

export function norm(v: Vector) {
  return Math.sqrt(v.dx * v.dx + v.dy * v.dy)
}

export function normalize(v: Vector): Vector {
  const n = norm(v)
  return { dx: v.dx / n, dy: v.dy / n }
}

export function distance(a: Point, b: Point): number {
  return norm(vector(a, b))
}

export function scaleBy(
  scale: number,
  translation: Vector,
  deltaScale: number,
  anchorPoint: Point,
  minScale = 0,
  maxScale = Infinity,
): LinearTransform {
  const newScale = clamp(Math.exp(Math.log(scale) + deltaScale), minScale, maxScale)
  const s = newScale / scale

  return {
    scale: newScale,
    translation: add(mul(s, translation), mul(1 - s, vector(anchorPoint))),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isPoint(obj?: any): obj is Point {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return !!obj && typeof obj.x === 'number' && typeof obj.y === 'number'
}

export type Interval = [number, number]

export function linearMap(x: number, [a, b]: Interval, [c, d]: Interval) {
  return c + ((x - a) * (d - c)) / (b - a)
}

export function coordMin(...vectors: Vector[]): Vector {
  return {
    dx: Math.min(...vectors.map((v) => v.dx)),
    dy: Math.min(...vectors.map((v) => v.dy)),
  }
}

export function coordMax(...vectors: Vector[]): Vector {
  return {
    dx: Math.max(...vectors.map((v) => v.dx)),
    dy: Math.max(...vectors.map((v) => v.dy)),
  }
}

export function resizeToWidth(size: Size, width: number): Size {
  return {
    width: width,
    height: width / (size.width / size.height),
  }
}

export function aspectRatio(size: Size) {
  return size.width / size.height
}

function fitSize(type: 'inner' | 'outer', size: Size, { width, height }: Size): Size {
  const scaleX = width / size.width
  const scaleY = height / size.height
  const scale = type === 'inner' ? Math.min(scaleX, scaleY) : Math.max(scaleX, scaleY)
  return {
    width: size.width * scale,
    height: size.height * scale,
  }
}

export function outerFit(size: Size, onto: Size) {
  return fitSize('outer', size, onto)
}

export function innerFit(size: Size, into: Size) {
  return fitSize('inner', size, into)
}

export function clampSize(size: Size, min: Size, max: Size) {
  return {
    width: clamp(size.width, min.width, max.width),
    height: clamp(size.height, min.height, max.height),
  }
}

export function scaleSize(size: Size, scale: number): Size {
  return {
    width: size.width * scale,
    height: size.height * scale,
  }
}

export interface MaxEmptyAreaOptions {
  // Setting an aspect ratio finds the maximal empty area with the given ratio.
  aspectRatio?: number
  // Specifies a point toward which the center of the returned rectangle will be shifted, if possible. This setting
  // only makes sense if `aspectRatio` is specified. If so, the largest empty area A may not have the desired
  // aspect ratio. Then another rectangle R with the desired ratio will be inner-fitted inside A and returned instead.
  // Since R will be smaller than A in exactly one dimension, it can be shifted along this dimension by some amount
  // without overlapping any obstructions. The `centralAnchor` parameter determines the direction in which it will be
  // shifted - the center of R will be as close as possible to `centralAnchor` without R leaving A.
  centralAnchor?: Point
}

export interface ViewportObstruction {
  rect: Rectangle
  clear?: Partial<Record<CardinalDirection, true>>
}

// Finds the maximal rectangle, in terms of area, that can fit inside the viewport without overlapping any obstructions.
export function maxEmptyArea(
  viewport: Rectangle,
  obstructions: ViewportObstruction[],
  { aspectRatio, centralAnchor }: MaxEmptyAreaOptions = {},
) {
  const candidateEdges = Object.fromEntries(
    CARDINAL_DIRECTIONS.map((edge) => [edge, new Set([viewport[edge]])]),
  ) as Record<CardinalDirection, Set<number>>

  obstructions.forEach((obstruction: ViewportObstruction) => {
    CARDINAL_DIRECTIONS.forEach((edge) => {
      // Ignore sub-pixel differences
      const edgeCoord = Math.round(obstruction.rect[edge])
      const [from, to] = [viewport[edge], viewport[CARDINAL_OPPOSITE[edge]]].sort((a, b) => a - b)
      if (!inRange(edgeCoord, from, to) || obstruction.clear?.[edge]) return

      // Add an offset so the empty area edge doesn't overlap with the obstruction edge
      const offset = edge === 'left' || edge === 'top' ? -1 : 1
      candidateEdges[CARDINAL_OPPOSITE[edge]].add(edgeCoord + offset)
    })
  })

  const candidateRects: Rectangle[] = []
  for (const top of candidateEdges.top) {
    for (const bottom of candidateEdges.bottom) {
      if (bottom <= top) continue

      for (const left of candidateEdges.left) {
        for (const right of candidateEdges.right) {
          if (right <= left) continue

          const rect = new Rectangle(left, top, right - left, bottom - top)
          if (!obstructions.some((obstruction) => rect.intersects(obstruction.rect))) {
            candidateRects.push(
              aspectRatio
                ? Rectangle.fittedInto(rect, aspectRatio, centralAnchor ?? viewport.center)
                : rect,
            )
          }
        }
      }
    }
  }

  return maxBy(candidateRects, (rect) => rect.area)
}
