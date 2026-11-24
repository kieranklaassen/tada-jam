// Where everything stands, in stage units, and how big it is. A place is a
// point on the ground. The yard is seen from a little above, so a step away
// from the child is drawn shorter than a step sideways.

export type ThingKey = 'boot' | 'teapot' | 'pig' | 'farmer' | 'ball' | 'bell'
export type BroodId = 'c0' | 'c1' | 'c2' | 'c3' | 'c4'
export type Id = ThingKey | BroodId | 'hen' | 'puddle'
export type Spot = { x: number; y: number }

export const THINGS: readonly ThingKey[] = ['boot', 'teapot', 'pig', 'farmer', 'ball', 'bell']
export const BROOD: readonly BroodId[] = ['c0', 'c1', 'c2', 'c3', 'c4']
export const PAIRS: readonly (readonly [ThingKey, ThingKey])[] = THINGS.flatMap((a, i) => THINGS.slice(i + 1).map((b) => [a, b] as const))

/** How much shorter a step into the yard is drawn than one across it. */
export const SQUAT = 0.6

/** The ground a thing may stand on. Bodies reach up from it, so nothing that must be touched is in the bottom strip. */
export const GROUND = { left: 84, right: 1096, top: 420, bottom: 738 } as const

/** Farther back is drawn smaller. */
export function scaleAt(y: number): number {
  return 0.86 + ((y - GROUND.top) / (GROUND.bottom - GROUND.top)) * 0.2
}

export type Size = {
  /** How wide and tall the body is drawn, and how far from its middle it stands on the ground. */
  w: number; h: number; r: number
  /** Where a chick sits on it: how high, and how far to the side it faces. */
  seat: number; seatX: number
}

export const SIZE: Record<ThingKey | 'hen' | 'egg' | 'chick', Size> = {
  boot: { w: 150, h: 178, r: 64, seat: 154, seatX: -14 },
  teapot: { w: 196, h: 150, r: 76, seat: 112, seatX: 0 },
  pig: { w: 208, h: 150, r: 84, seat: 122, seatX: -10 },
  farmer: { w: 292, h: 190, r: 112, seat: 110, seatX: 44 },
  ball: { w: 126, h: 126, r: 60, seat: 118, seatX: 0 },
  bell: { w: 130, h: 150, r: 60, seat: 138, seatX: 0 },
  hen: { w: 260, h: 250, r: 112, seat: 0, seatX: 0 },
  egg: { w: 92, h: 114, r: 45, seat: 0, seatX: 0 },
  chick: { w: 102, h: 124, r: 41, seat: 106, seatX: 0 },
}

export const HEN: Spot = { x: 978, y: 478 }
export const PUDDLE = { x: 872, y: 688, rx: 122, ry: 44 } as const

/** Where the six loose things stand on a first visit. */
export const FIRST_THINGS: Record<ThingKey, Spot & { dir: 1 | -1 }> = {
  boot: { x: 150, y: 496, dir: 1 },
  teapot: { x: 372, y: 448, dir: 1 },
  pig: { x: 664, y: 474, dir: -1 },
  farmer: { x: 240, y: 730, dir: 1 },
  ball: { x: 1052, y: 668, dir: -1 },
  bell: { x: 628, y: 700, dir: 1 },
}

/** Where the eggs stand on a first visit, each nearest to something else, so tapping alone meets different mothers. */
export const FIRST_EGGS: readonly Spot[] = [
  { x: 326, y: 566 },
  { x: 540, y: 556 },
  { x: 712, y: 624 },
  { x: 470, y: 700 },
  { x: 800, y: 486 },
]

/** The round home control the jam draws, and the grown-up's corner, are outside the yard. */

export function clampSpot(p: Spot): Spot {
  return { x: Math.min(GROUND.right, Math.max(GROUND.left, p.x)), y: Math.min(GROUND.bottom, Math.max(GROUND.top, p.y)) }
}

/** How far apart two places are on the ground. */
export function apart(a: Spot, b: Spot): number {
  return Math.hypot(a.x - b.x, (a.y - b.y) / SQUAT)
}

/** How far a place is from the rim of the puddle: below nothing inside it. */
export function fromPuddle(p: Spot): number {
  const dx = p.x - PUDDLE.x, dy = (p.y - PUDDLE.y) / SQUAT, d = Math.hypot(dx, dy)
  if (d < 0.01) return -PUDDLE.ry
  return d - 1 / Math.hypot(dx / d / PUDDLE.rx, dy / d / (PUDDLE.ry / SQUAT))
}

/**
 * The free place nearest to `want` for a body of radius `r`: rings of places
 * round it, nearer ones first, none within `r` of a thing in `solids`, and all
 * with nothing hidden that `sight` asks to be seen. Always
 * finds one, since the yard is larger than all that stands in it; if it could
 * not, the place asked for is given back.
 */
export function freeSpot(want: Spot, r: number, solids: readonly (Spot & { r: number })[], sight: (p: Spot) => boolean = () => true): Spot {
  const clear = (p: Spot) => solids.every((s) => apart(p, s) >= s.r + r)
  const start = clampSpot(want)
  if (clear(start) && sight(start)) return start
  for (let d = 12; d < 1100; d += 12) {
    const n = Math.max(12, Math.round(d / 8))
    let best: Spot | null = null, bestD = Infinity
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      const p = { x: want.x + Math.cos(a) * d, y: want.y + Math.sin(a) * d * SQUAT }
      if (p.x < GROUND.left || p.x > GROUND.right || p.y < GROUND.top || p.y > GROUND.bottom || !clear(p) || !sight(p)) continue
      const e = apart(p, start)
      if (e < bestD) { best = p; bestD = e }
    }
    if (best) return best
  }
  return start
}

/** The scenery that answers a touch as itself. Round areas, in stage units. */
export type SceneryKey = 'sheep' | 'cow' | 'sun' | 'cloudA' | 'cloudB' | 'tree' | 'fence'
export const SCENERY: Record<SceneryKey, Spot & { r: number }> = {
  sheep: { x: 516, y: 330, r: 66 },
  cow: { x: 190, y: 300, r: 66 },
  sun: { x: 856, y: 112, r: 72 },
  cloudA: { x: 420, y: 116, r: 78 },
  cloudB: { x: 1030, y: 150, r: 62 },
  tree: { x: 1080, y: 285, r: 66 },
  /** The fence runs across the yard; this is the post that a test reaches. */
  fence: { x: 700, y: 356, r: 34 },
}
/** The band the fence stands in. */
export const FENCE = { top: 322, bottom: 400 } as const
/** Where there is fence in that band. */
export const FENCES: readonly (readonly [number, number])[] = [[-520, 92], [300, 446], [584, 800], [1130, 1700]]
