// The kit: four kinds of part that join only at pins on a drafting grid.
// Pure data and rules, no renderer and no DOM.
//
// Lengths are in grid cells and weights in crates (one crate is the unit of
// load). The strengths and stiffnesses are the game's own numbers, in no real
// unit, chosen so the four parts differ the way balsa, rolled paper and thread
// do (ART.md, "Where it is not science"). The frame model that reads them is
// frame.ts.

export type Kind = 'plank' | 'stick' | 'tube' | 'thread'

export const KINDS: readonly Kind[] = ['plank', 'stick', 'tube', 'thread']

/** A grid point, in whole cells: x to the right, y up. */
export type Point = readonly [x: number, y: number]

export type Part = {
  kind: Kind
  a: Point
  b: Point
  /** A plank turned on its edge. The other kinds are the same both ways, so it changes nothing for them. */
  turned: boolean
  /** The end that hangs loose because its pin was taken off, if one does. Such a part carries nothing until a pin goes back in. */
  loose?: 'a' | 'b'
}

export type KindSpec = {
  /** The longest this kind is cut, in cells. */
  maxLength: number
  /** Weight of one cell of it, in crates. */
  weight: number
  /** Stretch stiffness (EA). */
  stretch: number
  /** The pull it holds before it gives. */
  pull: number
  /** The squeeze it holds before it crushes; a thread holds none and goes slack. */
  squeeze: number
  /** Bending stiffness that resists bowing under squeeze (EI about its weak axis). */
  bow: number
}

export const SPEC: Readonly<Record<Kind, KindSpec>> = {
  plank: { maxLength: 4, weight: 0.12, stretch: 3000, pull: 16, squeeze: 16, bow: 40 },
  stick: { maxLength: 4, weight: 0.04, stretch: 2000, pull: 12, squeeze: 12, bow: 6 },
  tube: { maxLength: 5, weight: 0.05, stretch: 2000, pull: 5, squeeze: 14, bow: 40 },
  thread: { maxLength: 9, weight: 0.01, stretch: 600, pull: 14, squeeze: 0, bow: 0 },
}

/**
 * A plank is the one part that resists bending along its length. Flat, it is
 * shallow in the side view; on edge it is four times as deep, which makes it
 * sixteen times as stiff and four times as strong in bending (a rectangle's
 * stiffness goes with depth cubed and its strength with depth squared).
 */
export const PLANK_BEND = {
  flat: { stiffness: 40, strength: 1.2 },
  edge: { stiffness: 640, strength: 4.8 },
} as const

/**
 * A stick is no roadway: a wheel standing on it between its pins is carried by
 * bending, which a thin square stick is poor at. This is the bending it takes
 * before it snaps under the wheel.
 */
export const RAIL_BEND = 0.3

/** The most parts one bridge or one tracing may hold. The saved state's size rests on it (save.ts). */
export const MAX_PARTS = 48

export const key = (p: Point): string => `${p[0]},${p[1]}`

export const samePoint = (p: Point, q: Point): boolean => p[0] === q[0] && p[1] === q[1]

export const length = (part: Pick<Part, 'a' | 'b'>): number => Math.hypot(part.b[0] - part.a[0], part.b[1] - part.a[1])

/** The same part whichever end was laid first. */
export const sameSpan = (p: Pick<Part, 'a' | 'b'>, q: Pick<Part, 'a' | 'b'>): boolean =>
  (samePoint(p.a, q.a) && samePoint(p.b, q.b)) || (samePoint(p.a, q.b) && samePoint(p.b, q.a))

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b))

/**
 * The grid points a part passes through, ends included. A plank is one stiff
 * piece and can be pinned at each of them; the other kinds join at their two
 * ends only.
 */
export function gridPointsOn(part: Pick<Part, 'a' | 'b'>): Point[] {
  const dx = part.b[0] - part.a[0], dy = part.b[1] - part.a[1]
  const steps = gcd(dx, dy)
  const points: Point[] = []
  for (let i = 0; i <= steps; i++) points.push([part.a[0] + (dx / steps) * i, part.a[1] + (dy / steps) * i])
  return points
}

/** The points where this part is pinned to others: every grid point along a plank, the two ends of the other kinds, and never an end that hangs loose. */
export const pinsOf = (part: Part): Point[] =>
  (part.kind === 'plank' ? gridPointsOn(part) : [part.a, part.b]).filter((p) => !(part.loose && samePoint(p, part[part.loose])))

/** How many of each kind a sheet's kit holds. */
export type KitCount = Readonly<Record<Kind, number>>

export const countKinds = (parts: readonly Part[]): Record<Kind, number> => {
  const count: Record<Kind, number> = { plank: 0, stick: 0, tube: 0, thread: 0 }
  for (const part of parts) count[part.kind]++
  return count
}

/** Why a part cannot be laid, or null when it can. The view answers each with its own small refusal that costs nothing. */
export type LayProblem = 'no-length' | 'too-long' | 'doubled' | 'kit-empty' | 'full'

/**
 * Whether one more part may be laid on a bridge. A part that is too long is
 * cut by the caller to the last grid point within reach (`reach`), so the
 * simplest drag always lays something.
 */
export function layProblem(part: Part, bridge: readonly Part[], kit: KitCount): LayProblem | null {
  if (samePoint(part.a, part.b)) return 'no-length'
  if (length(part) > SPEC[part.kind].maxLength + 1e-9) return 'too-long'
  if (bridge.some((other) => sameSpan(other, part))) return 'doubled'
  if (countKinds(bridge)[part.kind] >= kit[part.kind]) return 'kit-empty'
  if (bridge.length >= MAX_PARTS) return 'full'
  return null
}

/** The grid point nearest to `to` that a part of this kind can reach from `from`: the drag's free end snaps here. */
export function reach(kind: Kind, from: Point, to: readonly [number, number]): Point {
  const max = SPEC[kind].maxLength
  const dx = to[0] - from[0], dy = to[1] - from[1]
  const far = Math.hypot(dx, dy)
  const scale = far > max ? max / far : 1
  let best: Point = from, bestGap = Infinity
  const cx = from[0] + dx * scale, cy = from[1] + dy * scale
  for (let x = Math.floor(cx) - 1; x <= Math.ceil(cx) + 1; x++) {
    for (let y = Math.floor(cy) - 1; y <= Math.ceil(cy) + 1; y++) {
      if (Math.hypot(x - from[0], y - from[1]) > max + 1e-9) continue
      const gap = Math.hypot(x - cx, y - cy)
      if (gap < bestGap) { best = [x, y]; bestGap = gap }
    }
  }
  return best
}

/** A plank turned over; any other kind comes back as it was, since turning changes nothing in it. */
export const turn = (part: Part): Part => (part.kind === 'plank' ? { ...part, turned: !part.turned } : part)

/** The squeeze at which a part of this length bows sideways (the buckling load of a slender part pinned at both ends). */
export const bowLoad = (kind: Kind, long: number): number => (SPEC[kind].bow > 0 ? (Math.PI ** 2 * SPEC[kind].bow) / long ** 2 : 0)

/** The squeeze a part of this length holds: it crushes or it bows, whichever comes first. */
export const squeezeLimit = (kind: Kind, long: number): number => Math.min(SPEC[kind].squeeze, bowLoad(kind, long))
