import type { Point } from './input'

// Where everything in the parlour is, in stage units (1180 by 820), and what a
// touch on it means. Nothing here changes while the game runs.

export const SITTERS = ['dog', 'cat', 'aunt', 'grandpa'] as const
export type Who = (typeof SITTERS)[number]

export const PLACES = ['dish', 'teapot', 'boot', 'pot', 'gramophone'] as const
export type PlaceId = (typeof PLACES)[number]

/** Where a sausage can be believed to be: in a place, on the string, or on somebody's head. */
export type Spot = PlaceId | 'hook' | `head:${Who}`

export const headSpot = (who: Who): Spot => `head:${who}`
/** Whose head a spot is, or null when it is no head. */
export function headOf(spot: Spot): Who | null {
  return spot.startsWith('head:') ? (spot.slice(5) as Who) : null
}

export const FLOOR = 470

/** Each seat: the ground under the sitter, and the middle of its head when it sits. */
export const SEATS: Record<Who, { x: number; y: number; head: Point; top: Point; r: number; bodyW: number; bodyH: number }> = {
  dog: { x: 190, y: 590, head: { x: 205, y: 420 }, top: { x: 205, y: 362 }, r: 66, bodyW: 230, bodyH: 215 },
  cat: { x: 455, y: 530, head: { x: 455, y: 345 }, top: { x: 455, y: 285 }, r: 58, bodyW: 150, bodyH: 235 },
  aunt: { x: 712, y: 600, head: { x: 712, y: 365 }, top: { x: 712, y: 296 }, r: 70, bodyW: 260, bodyH: 290 },
  grandpa: { x: 1018, y: 600, head: { x: 1018, y: 350 }, top: { x: 1018, y: 288 }, r: 62, bodyW: 190, bodyH: 300 },
}

/** The mouth of each hiding place, where a sausage goes in, and its size for a finger. */
export const SPOTS: Record<PlaceId, { at: Point; r: number; high: boolean }> = {
  dish: { at: { x: 285, y: 700 }, r: 62, high: false },
  teapot: { at: { x: 590, y: 700 }, r: 62, high: false },
  boot: { at: { x: 870, y: 700 }, r: 62, high: false },
  pot: { at: { x: 1075, y: 190 }, r: 62, high: true },
  gramophone: { at: { x: 120, y: 235 }, r: 66, high: true },
}

/** The lowest sausage of the string that hangs from the hatch. */
export const HOOK: Point = { x: 590, y: 208 }
export const HOOK_R = 60
export const BELL: Point = { x: 835, y: 175 }
export const BELL_R = 60
export const FISH: Point = { x: 1090, y: 665 }
export const FISH_R = 66
export const BASKET: Point = { x: 90, y: 705 }
export const BASKET_R = 72

/** The middle of a spot, as eyes look at it. */
export function spotAt(spot: Spot): Point {
  if (spot === 'hook') return HOOK
  const who = headOf(spot)
  return who ? SEATS[who].top : SPOTS[spot as PlaceId].at
}

/** Where a sausage lies in a spot: the point a finger picks it up at. */
export function sausageAt(spot: Spot): Point {
  const at = spotAt(spot)
  switch (spot) {
    case 'dish': return { x: at.x, y: at.y - 6 }
    case 'teapot': return { x: at.x + 70, y: at.y - 20 }
    case 'boot': return { x: at.x - 14, y: at.y - 66 }
    case 'pot': return { x: at.x - 46, y: at.y - 34 }
    case 'gramophone': return { x: at.x + 40, y: at.y - 42 }
    default: return at
  }
}

export const SAUSAGE_R = 52

/** What a finger can land on. */
export type Thing =
  | { kind: 'sausage' }
  | { kind: 'place'; id: PlaceId }
  | { kind: 'sitter'; who: Who }
  | { kind: 'hook' }
  | { kind: 'bell' }
  | { kind: 'fish' }
  | { kind: 'basket' }
  | { kind: 'room' }

const near = (a: Point, b: Point, r: number) => Math.hypot(a.x - b.x, a.y - b.y) <= r

/** How near a spot a thing let go still counts as on it: small hands miss. */
export const CATCH = 1.45

function inSeat(who: Who, at: Point, grow = 0): boolean {
  const s = SEATS[who]
  return Math.abs(at.x - s.x) <= s.bodyW / 2 + grow && at.y <= s.y + 10 + grow && at.y >= s.top.y - 30 - grow
}

/**
 * What is at a point. `sausage` is where it can be picked up, or null while somebody is eating it; `standing` is
 * where each sitter is now, so someone who is out of its seat is touched where it runs.
 */
export function thingAt(at: Point, sausage: Point | null, out: Partial<Record<Who, Point>> = {}): Thing {
  if (sausage && near(at, sausage, SAUSAGE_R)) return { kind: 'sausage' }
  for (const who of SITTERS) {
    const p = out[who]
    if (p && near(at, { x: p.x, y: p.y - 90 }, 84)) return { kind: 'sitter', who }
  }
  if (near(at, BELL, BELL_R)) return { kind: 'bell' }
  if (near(at, HOOK, HOOK_R) || (Math.abs(at.x - HOOK.x) < 40 && at.y < HOOK.y)) return { kind: 'hook' }
  for (const id of PLACES) if (near(at, SPOTS[id].at, SPOTS[id].r)) return { kind: 'place', id }
  if (near(at, FISH, FISH_R)) return { kind: 'fish' }
  if (near(at, BASKET, BASKET_R)) return { kind: 'basket' }
  for (const who of SITTERS) if (!out[who] && inSeat(who, at)) return { kind: 'sitter', who }
  return { kind: 'room' }
}

/** Where a thing let go at a point lands: the nearest target in forgiving reach, or the room. */
export function dropAt(at: Point, out: Partial<Record<Who, Point>> = {}): Thing {
  let best: Thing = { kind: 'room' }, least = 1
  const offer = (thing: Thing, p: Point, r: number) => {
    const share = Math.hypot(at.x - p.x, at.y - p.y) / (r * CATCH)
    if (share < least) { least = share; best = thing }
  }
  for (const id of PLACES) offer({ kind: 'place', id }, SPOTS[id].at, SPOTS[id].r)
  offer({ kind: 'bell' }, BELL, BELL_R)
  offer({ kind: 'hook' }, HOOK, HOOK_R)
  offer({ kind: 'fish' }, FISH, FISH_R)
  offer({ kind: 'basket' }, BASKET, BASKET_R)
  if (best.kind !== 'room') return best
  for (const who of SITTERS) {
    const p = out[who]
    if (p ? near(at, { x: p.x, y: p.y - 90 }, 110) : inSeat(who, at, 8)) return { kind: 'sitter', who }
  }
  return best
}

/** The nearest to the side of the stage that the widest of them stands. */
const EDGE = 118

/** Where the hunters at one spot stand, the first in the middle and the others beside it. */
export function standAt(spot: Spot, slot: number): Point {
  const at = spotAt(spot)
  const clear = [0, 1, -1, 2, -2, 3, -3].map((k) => k * 120).filter((d) => at.x + d >= EDGE && at.x + d <= 1180 - EDGE)
  // A spot at the edge of the room is reached from inside it.
  const side = [0, ...clear.filter((d) => d !== 0)][slot] ?? 0
  const who = headOf(spot)
  if (who) return { x: at.x + side, y: SEATS[who].y + 30 }
  if (spot === 'hook') return { x: at.x + side, y: 520 }
  return { x: Math.max(EDGE, Math.min(1180 - EDGE, at.x + side)), y: SPOTS[spot as PlaceId].high ? at.y + 210 : at.y + 12 }
}
