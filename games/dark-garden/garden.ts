import type { Kind } from './cast'
import type { Point } from './input'

// The garden on paper: one path that winds in from the gate to the flame, ten
// places along it, and which part of the dark belongs to which place. A spot
// on the path is one number, the way walked from the gate.

export const CENTRE: Point = { x: 645, y: 405 }
export const RADIUS: Point = { x: 382, y: 252 }
/** Angles in degrees, growing clockwise on the screen; the path runs the other way, in from the gate. */
export const START = 148, END = -388
/** How far in the path has come at its end, as a share of the outer radius. */
const INNER = 0.19

export const GATE: Point = { x: 152, y: 748 }
/** Half the width of the path. */
export const HALF = 25

export const rad = (deg: number) => (deg * Math.PI) / 180

/** How far out the path runs at an angle, 1 at its start. */
export function reach(deg: number): number {
  return 1 - (1 - INNER) * ((START - deg) / (START - END))
}

export function onSpiral(deg: number, share = reach(deg)): Point {
  return { x: CENTRE.x + RADIUS.x * share * Math.cos(rad(deg)), y: CENTRE.y + RADIUS.y * share * Math.sin(rad(deg)) }
}

/** The way out of the middle at an angle, one unit long. */
export function outward(deg: number): Point {
  const x = Math.cos(rad(deg)) / RADIUS.x, y = Math.sin(rad(deg)) / RADIUS.y, length = Math.hypot(x, y)
  return { x: x / length, y: y / length }
}

type Sample = Point & { u: number }
const SAMPLES: Sample[] = []
{
  const first = onSpiral(START), steps = 24
  // From the gate up to the spiral, bending into it.
  const bend = { x: 205, y: 640 }
  for (let i = 0; i < steps; i++) {
    const t = i / steps, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), c = t * t
    SAMPLES.push({ x: GATE.x * a + bend.x * b + first.x * c, y: GATE.y * a + bend.y * b + first.y * c, u: 0 })
  }
  for (let deg = START; deg >= END; deg -= 1) SAMPLES.push({ ...onSpiral(deg), u: 0 })
  for (let i = 1; i < SAMPLES.length; i++) SAMPLES[i].u = SAMPLES[i - 1].u + Math.hypot(SAMPLES[i].x - SAMPLES[i - 1].x, SAMPLES[i].y - SAMPLES[i - 1].y)
}

/** The whole way from the gate to the flame. */
export const LENGTH = SAMPLES[SAMPLES.length - 1].u
/** Where the path from the gate meets the spiral. */
export const ENTRY = SAMPLES[24].u

export function at(u: number): Point {
  if (u <= 0) return { x: SAMPLES[0].x, y: SAMPLES[0].y }
  if (u >= LENGTH) { const end = SAMPLES[SAMPLES.length - 1]; return { x: end.x, y: end.y } }
  let low = 0, high = SAMPLES.length - 1
  while (high - low > 1) {
    const mid = (low + high) >> 1
    if (SAMPLES[mid].u <= u) low = mid
    else high = mid
  }
  const a = SAMPLES[low], b = SAMPLES[high], t = (u - a.u) / (b.u - a.u || 1)
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

/** The spot on the path nearest to a point, over every winding. */
export function nearest(to: Point): number {
  let best = 0, far = Infinity
  for (const s of SAMPLES) {
    const d = (s.x - to.x) ** 2 + (s.y - to.y) ** 2
    if (d < far) { far = d; best = s.u }
  }
  return best
}

/** How large someone is drawn at a spot: large at the gate, small in the garden. */
export function sizeAt(u: number): number {
  const t = Math.min(1, Math.max(0, u / ENTRY))
  return 1 - 0.45 * t * t * (3 - 2 * t)
}

export type Place = {
  id: number
  kind: Kind
  /** Its angle on the spiral. */
  deg: number
  /** Where it is along the path. */
  u: number
  /** Where its apple stands. */
  apple: Point
  /** The middle of the foot of what is there, and how large it is drawn. */
  den: Point
  size: number
  /** The part of the turn that belongs to it. */
  from: number
  to: number
}

const PLAN: readonly { kind: Kind; deg: number; den: Point; size: number }[] = [
  { kind: 'moss', deg: 96, den: { x: 626, y: 812 }, size: 1.02 },
  { kind: 'pond', deg: 44, den: { x: 1010, y: 776 }, size: 1.3 },
  { kind: 'tree', deg: 1, den: { x: 1085, y: 492 }, size: 1.24 },
  { kind: 'burrow', deg: -44, den: { x: 1010, y: 220 }, size: 1.26 },
  { kind: 'tree', deg: -89, den: { x: 660, y: 206 }, size: 0.98 },
  { kind: 'pond', deg: -136, den: { x: 352, y: 208 }, size: 1.3 },
  { kind: 'burrow', deg: -182, den: { x: 258, y: 430 }, size: 1.24 },
  { kind: 'moss', deg: -230, den: { x: 466, y: 558 }, size: 0.64 },
  { kind: 'moss', deg: -285, den: { x: 690, y: 588 }, size: 0.7 },
  { kind: 'burrow', deg: -342, den: { x: 846, y: 468 }, size: 0.76 },
]

const uOf = (deg: number) => SAMPLES[24 + Math.round(START - deg)].u

export const PLACES: readonly Place[] = PLAN.map((one, id) => {
  const p = onSpiral(one.deg), out = outward(one.deg)
  return {
    id, ...one,
    u: uOf(one.deg),
    apple: { x: p.x + out.x * 33, y: p.y + out.y * 33 },
    from: id === 0 ? 122 : (PLAN[id - 1].deg + one.deg) / 2,
    to: id === PLAN.length - 1 ? END : (PLAN[id + 1].deg + one.deg) / 2,
  }
})

/** The middle of what is at a place, for a finger and for an eye. */
export function heart(place: Place): Point {
  return { x: place.den.x, y: place.den.y - 70 * place.size }
}

/** The place a finger means: the nearest by what is there, its light or its part of the path. */
export function placeAt(to: Point): { place: Place; far: number } {
  let best = PLACES[0], far = Infinity
  for (const place of PLACES) {
    const h = heart(place), d = Math.min(
      Math.hypot(h.x - to.x, h.y - to.y) / place.size,
      Math.hypot(place.apple.x - to.x, place.apple.y - to.y) * 1.2,
    )
    if (d < far) { far = d; best = place }
  }
  return { place: best, far }
}

export const FLAME: Point = { x: CENTRE.x, y: CENTRE.y + 8 }
/** Near enough to the flame to mean it. */
export const FLAME_NEAR = 92

export function byFlame(to: Point): boolean {
  return Math.hypot(to.x - FLAME.x, to.y - (FLAME.y - 34)) < FLAME_NEAR
}
