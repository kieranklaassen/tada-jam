import { outlineFromSegments, wobble, type Point } from './geometry2d'

// The seven cut-paper shapes the child plays with. Coordinates are card-local
// centimetres with the brass pin at the origin and +v up; every shape is
// pinned near one edge, so turning it swings it around the pin like a clock
// hand. Inside tests are analytic (the cut-edge wobble is too small to matter
// for coverage).

export const SHAPE_KINDS = ['bigTri', 'smallTri', 'semiA', 'semiB', 'square', 'strip', 'crescent'] as const
export type ShapeKind = (typeof SHAPE_KINDS)[number]

export const OUTLINE_POINTS = 48

export type ShapeSpec = {
  kind: ShapeKind
  /** Paper colour (sRGB hex). */
  color: string
  /** Closed card outline, counter-clockwise, exactly OUTLINE_POINTS points, with a hand-cut wobble. */
  outline: Point[]
  /** Card-local centre and radius used for touch hit tests and glow rings. */
  center: Point
  radius: number
  inside: (u: number, v: number) => boolean
}

const TAU = Math.PI * 2

function triangleInside(a: Point, b: Point, c: Point): (u: number, v: number) => boolean {
  return (u, v) => {
    const d1 = (u - b.x) * (a.y - b.y) - (a.x - b.x) * (v - b.y)
    const d2 = (u - c.x) * (b.y - c.y) - (b.x - c.x) * (v - c.y)
    const d3 = (u - a.x) * (c.y - a.y) - (c.x - a.x) * (v - a.y)
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0
    return !(hasNeg && hasPos)
  }
}

function spec(kind: ShapeKind, color: string, outline: Point[], seed: number, inside: (u: number, v: number) => boolean): ShapeSpec {
  const cut = wobble(outline, 0.07, seed)
  let cx = 0
  let cy = 0
  for (const p of outline) {
    cx += p.x
    cy += p.y
  }
  cx /= outline.length
  cy /= outline.length
  let radius = 0
  for (const p of outline) radius = Math.max(radius, Math.hypot(p.x - cx, p.y - cy))
  return { kind, color, outline: cut, center: { x: cx, y: cy }, radius, inside }
}

function triangle(kind: ShapeKind, color: string, a: Point, b: Point, c: Point, seed: number): ShapeSpec {
  const outline = outlineFromSegments(a, [
    { kind: 'line', to: b },
    { kind: 'line', to: c },
    { kind: 'line', to: a },
  ], OUTLINE_POINTS)
  return spec(kind, color, outline, seed, triangleInside(a, b, c))
}

function halfDisc(kind: ShapeKind, color: string, r: number, base: number, seed: number): ShapeSpec {
  const outline = outlineFromSegments({ x: r, y: base }, [
    { kind: 'arc', cx: 0, cy: base, r, from: 0, to: Math.PI },
    { kind: 'line', to: { x: r, y: base } },
  ], OUTLINE_POINTS)
  return spec(kind, color, outline, seed, (u, v) => v >= base && u * u + (v - base) * (v - base) <= r * r)
}

function rect(kind: ShapeKind, color: string, x0: number, y0: number, x1: number, y1: number, seed: number): ShapeSpec {
  const outline = outlineFromSegments({ x: x0, y: y0 }, [
    { kind: 'line', to: { x: x1, y: y0 } },
    { kind: 'line', to: { x: x1, y: y1 } },
    { kind: 'line', to: { x: x0, y: y1 } },
    { kind: 'line', to: { x: x0, y: y0 } },
  ], OUTLINE_POINTS)
  return spec(kind, color, outline, seed, (u, v) => u >= x0 && u <= x1 && v >= y0 && v <= y1)
}

function crescent(kind: ShapeKind, color: string, seed: number): ShapeSpec {
  // Outer disc centred above the pin, bitten by a smaller disc: a moon lying on its back, horns up.
  const R = 4.4
  const oc = { x: 0, y: 3.6 }
  const r = 3.7
  const ic = { x: 0, y: 5.6 }
  // Where the two circles meet.
  const d = ic.y - oc.y
  const along = (d * d + R * R - r * r) / (2 * d)
  const half = Math.sqrt(R * R - along * along)
  const hornY = oc.y + along
  // Counter-clockwise: the outer rim from the left horn round the bottom to
  // the right horn, then back along the bite (clockwise on the bite circle).
  const outerRight = Math.atan2(hornY - oc.y, half)
  const outerLeft = Math.PI - outerRight
  const biteRight = Math.atan2(hornY - ic.y, half)
  const biteLeft = Math.PI - biteRight
  const outline = outlineFromSegments({ x: -half, y: hornY }, [
    { kind: 'arc', cx: oc.x, cy: oc.y, r: R, from: outerLeft, to: outerRight + TAU },
    { kind: 'arc', cx: ic.x, cy: ic.y, r, from: biteRight, to: biteLeft - TAU },
  ], OUTLINE_POINTS)
  return spec(kind, color, outline, seed, (u, v) => {
    const outer = u * u + (v - oc.y) * (v - oc.y) <= R * R
    const bite = u * u + (v - ic.y) * (v - ic.y) <= r * r
    return outer && !bite
  })
}

export const SHAPES: Record<ShapeKind, ShapeSpec> = {
  bigTri: triangle('bigTri', '#f2b43c', { x: -4.4, y: -0.8 }, { x: 4.4, y: -0.8 }, { x: 0, y: 7.6 }, 1),
  smallTri: triangle('smallTri', '#ef8fb0', { x: -0.9, y: -0.9 }, { x: 5.4, y: -0.9 }, { x: -0.9, y: 5.4 }, 2),
  semiA: halfDisc('semiA', '#e8664a', 4.7, -0.8, 3),
  semiB: halfDisc('semiB', '#5c9be0', 4.7, -0.8, 4),
  square: rect('square', '#39a39a', -3.1, -0.8, 3.1, 5.4, 5),
  strip: rect('strip', '#7cbf52', -1.15, -0.9, 1.15, 9.2, 6),
  crescent: crescent('crescent', '#f6dc8a', 7),
}

export function isShapeKind(value: unknown): value is ShapeKind {
  return typeof value === 'string' && (SHAPE_KINDS as readonly string[]).includes(value)
}
