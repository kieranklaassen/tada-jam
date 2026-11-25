import type { Point } from './input'

// Where everything in the room is, in stage units (1180 by 820). Nothing here
// changes while the game runs.

export const FIXED = ['bike', 'cat', 'grandpa', 'giraffe', 'tuba', 'tree'] as const
export type FixedId = (typeof FIXED)[number]
export const AIRS = ['air0', 'air1'] as const
export type AirId = (typeof AIRS)[number]
/** What can be wrapped: six things, and up to two circles of nothing. */
export type Id = FixedId | AirId
export const IDS: readonly Id[] = [...FIXED, ...AIRS]
export const isAir = (id: Id): id is AirId => id === 'air0' || id === 'air1'

export const PAPERS = 3
/** Crackly, stretchy, see-through. */
export type Paper = 0 | 1 | 2
export const MAX_LAYERS = 3

/** Paper is laid in wedges round the middle of a thing. */
export const WEDGES = 16
export const FULL = (1 << WEDGES) - 1

type Rect = { x: number; y: number; w: number; h: number }
export type Spec = {
  /** The middle of its foot. */
  x: number
  y: number
  /** The middle that paper goes round, and how far the thing reaches from it. */
  mid: Point
  rx: number
  ry: number
  /** Where a finger is on it. */
  touch: readonly Rect[]
  /** Where the bow sits. */
  bow: Point
}

const box = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h })

export const SPECS: Record<FixedId, Spec> = {
  grandpa: { x: 168, y: 620, mid: { x: 168, y: 500 }, rx: 150, ry: 135, touch: [box(28, 395, 285, 225), box(110, 300, 130, 110)], bow: { x: 168, y: 496 } },
  tree: { x: 412, y: 512, mid: { x: 412, y: 310 }, rx: 140, ry: 205, touch: [box(350, 110, 124, 160), box(300, 270, 225, 235)], bow: { x: 412, y: 300 } },
  giraffe: { x: 690, y: 575, mid: { x: 680, y: 370 }, rx: 140, ry: 225, touch: [box(580, 330, 220, 245), box(705, 45, 135, 290)], bow: { x: 690, y: 350 } },
  tuba: { x: 950, y: 590, mid: { x: 950, y: 470 }, rx: 112, ry: 130, touch: [box(850, 350, 200, 240)], bow: { x: 950, y: 480 } },
  bike: { x: 480, y: 755, mid: { x: 480, y: 645 }, rx: 190, ry: 128, touch: [box(295, 575, 370, 180), box(415, 520, 190, 70)], bow: { x: 480, y: 590 } },
  cat: { x: 810, y: 745, mid: { x: 810, y: 660 }, rx: 96, ry: 100, touch: [box(715, 560, 190, 190)], bow: { x: 810, y: 686 } },
}

/** A parcel of nothing, wherever the circle was. */
export function airSpec(at: Point, r: number): Spec {
  return { x: at.x, y: at.y + r, mid: at, rx: r, ry: r, touch: [box(at.x - r, at.y - r, r * 2, r * 2)], bow: { x: at.x, y: at.y - r * 0.7 } }
}

/** Above this a parcel of nothing hangs on the wall; below, it lies on the floor. */
export const WALL_FOOT = 452

/** How near the cat comes to the bicycle in its paper: the bump. */
export const BUMP_X = 752

/** Where faces are, and how far round them a parcel of nothing stays away. */
export const HEADS: readonly (readonly [number, number, number])[] = [[168, 350, 80], [780, 110, 85], [SPECS.cat.x, 600, 70]]

export const ROLLS: readonly Point[] = [{ x: 62, y: 712 }, { x: 156, y: 724 }, { x: 250, y: 712 }]
export const ROLL_R = 48

export const DOOR: Rect = box(1062, 170, 118, 360)
/** Where the family stands as it comes in. */
export const DOORSTEP: Point = { x: 1105, y: 560 }

export const MOUSE: Point = { x: 1040, y: 700 }
export const MOUSE_R = 74

/** The floor scraps lie on. */
export const FLOOR = { left: 40, right: 1140, top: 640, bottom: 772 }

export const inRect = (r: Rect, p: Point, grow = 0): boolean => p.x >= r.x - grow && p.x <= r.x + r.w + grow && p.y >= r.y - grow && p.y <= r.y + r.h + grow

/** How far a point is from a thing's middle, as a share of its reach that way: under 1 is on it. */
export const reach = (s: Spec, p: Point): number => Math.hypot((p.x - s.mid.x) / s.rx, (p.y - s.mid.y) / s.ry)

/** Which wedge a point is in. Wedge 0 begins to the right, and they go round clockwise as seen. */
export function wedgeAt(s: Spec, p: Point): number {
  const a = Math.atan2((p.y - s.mid.y) / s.ry, (p.x - s.mid.x) / s.rx)
  return ((Math.floor((a / (Math.PI * 2)) * WEDGES) % WEDGES) + WEDGES) % WEDGES
}

export function bits(mask: number): number {
  let n = 0
  for (let m = mask & FULL; m; m &= m - 1) n++
  return n
}
