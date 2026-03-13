import { times } from 'lodash-es'
import { Graphics } from 'pixi.js'
import {
  mul,
  norm,
  normalize,
  Point,
  Rectangle,
  translate,
  Vector,
  vector,
} from 'tapestry-core/src/lib/geometry'

const EPS = 1e-3

/**
 * Creates a polyline that approximates a rectangle with rounded corners.
 *
 * @param rect The rectangle to approximate.
 * @param radius The corner radius.
 * @param arcSegments How many line segments to break the corners into.
 * @returns A circular list of points (first point equals last) describing a polyline that approximates the given rect.
 */
export function roundedRectPolyline(rect: Rectangle, radius: number, arcSegments = 8): Point[] {
  radius = Math.max(0, Math.min(radius, Math.min(rect.width, rect.height) / 2))

  const arc = (center: Point, start: number, end: number) =>
    times(arcSegments - 1, (i): Point => {
      const alpha = start + ((end - start) * (i + 1)) / arcSegments
      return { x: center.x + Math.cos(alpha) * radius, y: center.y + Math.sin(alpha) * radius }
    })

  return [
    { x: rect.left + radius, y: rect.top },
    { x: rect.right - radius, y: rect.top },
    ...arc({ x: rect.right - radius, y: rect.top + radius }, -Math.PI / 2, 0),
    { x: rect.right, y: rect.bottom - radius },
    ...arc({ x: rect.right - radius, y: rect.bottom - radius }, 0, Math.PI / 2),
    { x: rect.left + radius, y: rect.bottom },
    ...arc({ x: rect.left + radius, y: rect.bottom - radius }, Math.PI / 2, Math.PI),
    { x: rect.left, y: rect.top + radius },
    ...arc({ x: rect.left + radius, y: rect.top + radius }, Math.PI, (3 * Math.PI) / 2),
    { x: rect.left + radius, y: rect.top },
  ]
}

/**
 * Traces a dashed line along the given polyline using the given Graphics context.
 *
 * Note that this method only invokes graphics.moveTo() and graphics.lineTo() to create a path representing the dashed
 * line. It doesn't actually draw the path. In order to draw the dashed line, invoke graphics.stroke() afterwards.
 *
 * @param graphics The Graphics context to draw on.
 * @param points The polyline along which the dashed line will be drawn.
 * @param dash The size of a single dash in the patter.
 * @param gap The size of the gap between dashes. Equals the dash size by default.
 */
export function drawDashedPolyline(graphics: Graphics, points: Point[], dash: number, gap = dash) {
  if (points.length < 2) return

  const segments: { from: Point; to: Point; length: number; direction: Vector }[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i]
    const to = points[i + 1]
    const segment = vector(from, to)
    const length = norm(segment)
    if (length > EPS) {
      segments.push({ from, to, length, direction: normalize(segment) })
    }
  }

  const pattern = dash + gap

  let cursor = 0

  for (const { from, length, direction } of segments) {
    const segmentStart = cursor

    while (cursor < segmentStart + length - EPS) {
      const phase = cursor % pattern
      const inDash = phase < dash
      const step = inDash ? dash - phase : pattern - phase

      const start = cursor - segmentStart
      const end = Math.min(length, start + step)

      if (end <= start) break

      if (inDash) {
        const p1 = translate(from, mul(start, direction))
        const p2 = translate(from, mul(end, direction))
        graphics.moveTo(p1.x, p1.y)
        graphics.lineTo(p2.x, p2.y)
      }

      cursor += end - start
    }
  }
}
