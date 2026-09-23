import { chaikinClosed, createMask, maskArea, maskAt, perimeter, resampleClosed, simplifyClosed, traceMask, type Mask, type Point } from './geometry2d'
import { SCREEN } from './projection'

// The sleeping shadow creatures. Each is a union of simple primitives laid
// out on the screen plane (centimetres, the lamp's horizon at y = 23), split
// into a body and the parts that move once it wakes (wings, tails, fins).
// A creature is rasterized once into a mask; the mask gives the dotted
// outline, the inside samples for coverage, and the silhouettes of the
// paper creature that peels off the screen.

export const CREATURE_KINDS = ['bird', 'fish', 'snail', 'whale', 'fox', 'dragon'] as const
export type CreatureKind = (typeof CREATURE_KINDS)[number]

type Prim = (
  | { t: 'ellipse'; cx: number; cy: number; rx: number; ry: number; rot?: number }
  | { t: 'tri'; a: [number, number]; b: [number, number]; c: [number, number] }
  | { t: 'capsule'; ax: number; ay: number; bx: number; by: number; r: number }
) & { sub?: boolean }

export type CreaturePart = { name: string; pivot: Point; prims: Prim[] }

export type CreatureDef = {
  kind: CreatureKind
  /** The paper colour the creature turns out to be when it peels off (sRGB hex). */
  color: string
  /** A darker accent paper for its parts (sRGB hex). */
  accent: string
  body: Prim[]
  parts: CreaturePart[]
  eye: Point
  /** Where the little sleep rings rise from. */
  snore: Point
}

export type BuiltCreature = {
  def: CreatureDef
  mask: Mask
  area: number
  outline: Point[]
  bodyOutline: Point[]
  partOutlines: Point[][]
  dots: Point[]
  /** Per dot: the index of the moving part it outlines, or −1 for the body. */
  dotPart: Int8Array
  /** Coverage samples inside the outline, packed x,y. Each stands for `insideCell` cm². */
  inside: Float32Array
  insideCell: number
  /** Samples on the rest of the screen, packed x,y, for measuring spill. Each stands for `outsideCell` cm². */
  outside: Float32Array
  outsideCell: number
  center: Point
  bounds: { x0: number; y0: number; x1: number; y1: number }
}

const e = (cx: number, cy: number, rx: number, ry: number, rot = 0): Prim => ({ t: 'ellipse', cx, cy, rx, ry, rot })
const tri = (a: [number, number], b: [number, number], c: [number, number]): Prim => ({ t: 'tri', a, b, c })
const cap = (ax: number, ay: number, bx: number, by: number, r: number): Prim => ({ t: 'capsule', ax, ay, bx, by, r })
const sub = (prim: Prim): Prim => ({ ...prim, sub: true })

export const CREATURES: Record<CreatureKind, CreatureDef> = {
  bird: {
    kind: 'bird',
    color: '#f5b83d',
    accent: '#e0892c',
    body: [e(1, 21.5, 11, 6.2, 0.12), e(11, 25.5, 5.2, 4.8), tri([15, 27.6], [21, 25.4], [15, 23.4]), tri([-8, 22.5], [-19, 29], [-18, 17.5])],
    parts: [{ name: 'wing', pivot: { x: 1, y: 25 }, prims: [tri([-5, 24.5], [6, 25.5], [-9, 40]), e(-5.5, 34, 4.2, 6.8, -0.45)] }],
    eye: { x: 12.4, y: 26.6 },
    snore: { x: 15, y: 31 },
  },
  fish: {
    kind: 'fish',
    color: '#4fb8ae',
    accent: '#2f8f8a',
    body: [e(-1, 23, 15, 8.4), tri([-4, 30], [5, 30.2], [-7, 36.5]), tri([1, 16], [7, 16.2], [-3, 11])],
    parts: [{ name: 'tail', pivot: { x: -14, y: 23 }, prims: [tri([-12, 23], [-25, 32.5], [-25, 13.5]), sub(e(-26.5, 23, 3.2, 4.2))] }],
    eye: { x: 8.5, y: 25.2 },
    snore: { x: 13, y: 30 },
  },
  snail: {
    kind: 'snail',
    color: '#ef93b2',
    accent: '#c4607f',
    body: [cap(-15, 16.2, 13, 16.2, 3.6), e(14.5, 18.6, 4.2, 3.8), cap(14.8, 20.5, 17.8, 29, 0.9), cap(12.2, 21, 12.6, 29.5, 0.9), e(18, 29.4, 1.5, 1.5), e(12.7, 30, 1.5, 1.5)],
    parts: [{ name: 'shell', pivot: { x: -2, y: 17 }, prims: [e(-2, 27, 10, 9.8)] }],
    eye: { x: 16, y: 19.4 },
    snore: { x: 20, y: 25 },
  },
  whale: {
    kind: 'whale',
    color: '#6ea4e8',
    accent: '#3f73c0',
    body: [e(3, 21, 19, 9.5), e(14.5, 22, 9.5, 9.2), cap(-13, 22.5, -20, 28, 3)],
    parts: [{ name: 'flukes', pivot: { x: -20, y: 28 }, prims: [e(-24.5, 31.5, 5.6, 2.2, 0.55), e(-17, 33, 5.4, 2.1, -0.5)] }],
    eye: { x: 17.5, y: 22.5 },
    snore: { x: 21, y: 33 },
  },
  fox: {
    kind: 'fox',
    color: '#ef8340',
    accent: '#c45d25',
    body: [e(-2, 18.5, 9, 11.2), e(5, 31.5, 6, 5.6), tri([9.5, 33.6], [18, 30], [9.5, 27.6]), tri([0.4, 34.5], [2.4, 42.5], [6.8, 36]), tri([6.2, 36], [11.4, 41.5], [10.4, 33.2])],
    parts: [{ name: 'tail', pivot: { x: -9, y: 12 }, prims: [e(-16, 13.5, 9, 4.2, 0.35), e(-22, 18.5, 3.8, 4.4, 0.2)] }],
    eye: { x: 8, y: 32.4 },
    snore: { x: 14, y: 37 },
  },
  dragon: {
    kind: 'dragon',
    color: '#72c45e',
    accent: '#3f9447',
    body: [
      cap(-26, 14, -14, 20.5, 3.4),
      cap(-14, 20.5, -2, 18, 5.2),
      cap(-2, 18, 9, 23.5, 4.2),
      cap(9, 23.5, 15, 29, 3.2),
      e(19.5, 30, 6, 4.2, 0.15),
      tri([23, 32], [29, 30], [23.5, 27.5]),
      tri([15, 33], [14, 38.5], [18.5, 34]),
      tri([-10, 25], [-7, 29.5], [-5, 23.5]),
      tri([2, 26.5], [5.5, 30.5], [7, 25.5]),
    ],
    parts: [{ name: 'wing', pivot: { x: -4, y: 24 }, prims: [tri([-9, 23.5], [2, 24.5], [-14, 38]), e(-8.5, 32, 3.6, 6, -0.5)] }],
    eye: { x: 20.5, y: 31.2 },
    snore: { x: 26, y: 35 },
  },
}

export const CREATURE_ORDER: readonly CreatureKind[] = CREATURE_KINDS

export function isCreatureKind(value: unknown): value is CreatureKind {
  return typeof value === 'string' && (CREATURE_KINDS as readonly string[]).includes(value)
}

function primInside(prim: Prim, x: number, y: number): boolean {
  switch (prim.t) {
    case 'ellipse': {
      const c = Math.cos(prim.rot ?? 0)
      const s = Math.sin(prim.rot ?? 0)
      const dx = x - prim.cx
      const dy = y - prim.cy
      const u = (dx * c + dy * s) / prim.rx
      const v = (-dx * s + dy * c) / prim.ry
      return u * u + v * v <= 1
    }
    case 'tri': {
      const [ax, ay] = prim.a
      const [bx, by] = prim.b
      const [cx, cy] = prim.c
      const d1 = (x - bx) * (ay - by) - (ax - bx) * (y - by)
      const d2 = (x - cx) * (by - cy) - (bx - cx) * (y - cy)
      const d3 = (x - ax) * (cy - ay) - (cx - ax) * (y - ay)
      return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))
    }
    case 'capsule': {
      const dx = prim.bx - prim.ax
      const dy = prim.by - prim.ay
      const t = Math.max(0, Math.min(1, ((x - prim.ax) * dx + (y - prim.ay) * dy) / (dx * dx + dy * dy)))
      return Math.hypot(x - (prim.ax + dx * t), y - (prim.ay + dy * t)) <= prim.r
    }
    default: {
      const unreachable: never = prim
      return unreachable
    }
  }
}

function insidePrims(prims: readonly Prim[], x: number, y: number): boolean {
  let inside = false
  for (const prim of prims) if (!prim.sub && primInside(prim, x, y)) inside = true
  if (!inside) return false
  for (const prim of prims) if (prim.sub && primInside(prim, x, y)) return false
  return true
}

const MASK_CELL = 0.3

function rasterize(prims: readonly Prim[]): Mask {
  const mask = createMask(SCREEN.left - 2, SCREEN.bottom - 2, SCREEN.right + 2, SCREEN.top + 2, MASK_CELL)
  for (let j = 0; j < mask.h; j++) {
    for (let i = 0; i < mask.w; i++) {
      if (insidePrims(prims, mask.x0 + i * mask.cell, mask.y0 + j * mask.cell)) mask.data[j * mask.w + i] = 1
    }
  }
  return mask
}

function smoothOutline(mask: Mask): Point[] {
  return chaikinClosed(simplifyClosed(traceMask(mask), 0.22), 2)
}

export const INSIDE_CELL = 1.3
export const OUTSIDE_CELL = 2

const built = new Map<CreatureKind, BuiltCreature>()

/** Build (once per page) everything derived from a creature's primitives. */
export function buildCreature(kind: CreatureKind): BuiltCreature {
  const cached = built.get(kind)
  if (cached) return cached
  const def = CREATURES[kind]
  // Subtractions only cut their own group, so the union is body ∪ each part.
  const groups = [def.body, ...def.parts.map((part) => part.prims)]
  const inAny = (x: number, y: number) => groups.some((group) => insidePrims(group, x, y))
  const mask = createMask(SCREEN.left - 2, SCREEN.bottom - 2, SCREEN.right + 2, SCREEN.top + 2, MASK_CELL)
  for (let j = 0; j < mask.h; j++) {
    for (let i = 0; i < mask.w; i++) {
      if (inAny(mask.x0 + i * mask.cell, mask.y0 + j * mask.cell)) mask.data[j * mask.w + i] = 1
    }
  }
  const outline = smoothOutline(mask)
  const bodyOutline = smoothOutline(rasterize(def.body))
  const partOutlines = def.parts.map((part) => smoothOutline(rasterize(part.prims)))

  const inside: number[] = []
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const p of outline) {
    x0 = Math.min(x0, p.x)
    y0 = Math.min(y0, p.y)
    x1 = Math.max(x1, p.x)
    y1 = Math.max(y1, p.y)
  }
  for (let y = y0 + INSIDE_CELL / 2; y < y1; y += INSIDE_CELL) {
    for (let x = x0 + INSIDE_CELL / 2; x < x1; x += INSIDE_CELL) if (maskAt(mask, x, y)) inside.push(x, y)
  }
  const outside: number[] = []
  for (let y = SCREEN.bottom + OUTSIDE_CELL / 2; y < SCREEN.top; y += OUTSIDE_CELL) {
    for (let x = SCREEN.left + OUTSIDE_CELL / 2; x < SCREEN.right; x += OUTSIDE_CELL) if (!maskAt(mask, x, y)) outside.push(x, y)
  }
  const dots = resampleClosed(outline, Math.max(24, Math.round(perimeter(outline) / 1.55)))
  // A dot belongs to a moving part when the part (not the body) is right under it.
  const near = [0, 0.5, -0.5]
  const dotPart = new Int8Array(dots.length).fill(-1)
  dots.forEach((dot, d) => {
    if (insidePrims(def.body, dot.x, dot.y)) return
    def.parts.forEach((part, p) => {
      if (dotPart[d] < 0 && near.some((ox) => near.some((oy) => insidePrims(part.prims, dot.x + ox, dot.y + oy)))) dotPart[d] = p
    })
  })
  const result: BuiltCreature = {
    def,
    mask,
    area: maskArea(mask),
    outline,
    bodyOutline,
    partOutlines,
    dots,
    dotPart,
    inside: new Float32Array(inside),
    insideCell: INSIDE_CELL,
    outside: new Float32Array(outside),
    outsideCell: OUTSIDE_CELL,
    center: { x: (x0 + x1) / 2, y: (y0 + y1) / 2 },
    bounds: { x0, y0, x1, y1 },
  }
  built.set(kind, result)
  return result
}
