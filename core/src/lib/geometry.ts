import { clamp, sum } from 'lodash'
import { EPS } from './algebra.js'

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

export type DirectionalOffsets = Record<'top' | 'right' | 'bottom' | 'left', number>

export const ZERO_OFFSETS = Object.freeze({
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
})

function parseDirectionalOffsets(args: (number | DirectionalOffsets)[]): DirectionalOffsets {
  if (typeof args[0] === 'object') {
    return args[0]
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

  intersects(other: Rectangle) {
    return (
      this.right >= other.left &&
      this.left <= other.right &&
      this.bottom >= other.top &&
      this.top <= other.bottom
    )
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
  contract(padding: DirectionalOffsets): Rectangle
  contract(...args: (number | DirectionalOffsets)[]) {
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
