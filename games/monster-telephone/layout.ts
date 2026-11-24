import { PARTS, PLACES, type Body, type Monster, type Part, type Place } from './monster'
import type { Point } from './stage'

// Where everything stands, in stage units, and what a finger lands on.

export type Who = 'a' | 'b'
export const MIDDLE: Record<Who, Point> = { a: { x: 312, y: 352 }, b: { x: 795, y: 352 } }

/** How far a body reaches from its middle, across and up. */
export const REACH: Record<Body, { w: number; h: number }> = { round: { w: 138, h: 132 }, tall: { w: 100, h: 172 }, wide: { w: 152, h: 108 } }

const AT: Record<Body, Record<Place, Point>> = {
  round: { top: { x: 0, y: -160 }, upper: { x: 0, y: -53 }, left: { x: -166, y: 0 }, right: { x: 166, y: 0 }, lower: { x: 0, y: 53 }, bottom: { x: 0, y: 160 } },
  tall: { top: { x: 0, y: -198 }, upper: { x: 0, y: -72 }, left: { x: -128, y: 0 }, right: { x: 128, y: 0 }, lower: { x: 0, y: 72 }, bottom: { x: 0, y: 198 } },
  wide: { top: { x: 0, y: -158 }, upper: { x: 0, y: -53 }, left: { x: -178, y: 0 }, right: { x: 178, y: 0 }, lower: { x: 0, y: 53 }, bottom: { x: 0, y: 158 } },
}

export const LARGE = 100
export const SMALL = 60
export function sizeOf(large: boolean): number {
  return large ? LARGE : SMALL
}

/** A place on a body, from the body's middle. */
export function placeOn(body: Body, place: Place): Point {
  return AT[body][place]
}
export function placeAt(who: Who, body: Body, place: Place): Point {
  const o = AT[body][place], m = MIDDLE[who]
  return { x: m.x + o.x, y: m.y + o.y }
}

export const SHELF_Y = 716
export function shelfAt(i: number): Point {
  return { x: 330 + i * 102, y: SHELF_Y }
}
export function shelfOf(part: Part): Point {
  return shelfAt(PARTS.indexOf(part))
}

export const CURTAIN = { x0: 88, x1: 538, y0: 58, y1: 612 } as const
export const CORD = { x: 46, top: 44, y: 300 } as const
export const PULL = 45
export const OSTRICH = { x: 592, y: 556 } as const
export const OSTRICH_HEAD: Point = { x: 566, y: 190 }
export const MOLE = { x: 1086, y: 540 } as const
export const MOLE_FACE: Point = { x: 1086, y: 492 }
export const SACKS: readonly [Point, Point] = [{ x: 78, y: 712 }, { x: 206, y: 700 }]
export const WIPER: Point = { x: 1092, y: 728 }
export const DRAWINGS: readonly Point[] = [{ x: 720, y: 62 }, { x: 880, y: 62 }, { x: 1040, y: 62 }]
/** The string hangs from can to can. */
export const CANS: readonly [Point, Point] = [{ x: 640, y: 470 }, { x: 1010, y: 500 }]

/** Where the ostrich shows a place, on herself. */
export const ON_OSTRICH: Record<Place, Point> = { top: { x: 576, y: 112 }, upper: { x: 560, y: 218 }, left: { x: 508, y: 520 }, right: { x: 676, y: 548 }, lower: { x: 594, y: 566 }, bottom: { x: 594, y: 664 } }
/** Where the mole pats the same place, on itself. */
export const ON_MOLE: Record<Place, Point> = { top: { x: 1086, y: 420 }, upper: { x: 1086, y: 462 }, left: { x: 1012, y: 540 }, right: { x: 1160, y: 540 }, lower: { x: 1086, y: 574 }, bottom: { x: 1086, y: 636 } }

const near = (p: Point, q: Point): number => Math.hypot(p.x - q.x, p.y - q.y)

export function inBody(p: Point, who: Who, body: Body): boolean {
  const m = MIDDLE[who], r = REACH[body]
  return ((p.x - m.x) / r.w) ** 2 + ((p.y - m.y) / r.h) ** 2 <= 1
}

/** The place nearest to a point, and how far it is. */
export function nearestPlace(p: Point, who: Who, body: Body): { place: Place; far: number } {
  let best: Place = 'upper', far = Infinity
  for (const place of PLACES) {
    const d = near(p, placeAt(who, body, place))
    if (d < far) { far = d; best = place }
  }
  return { place: best, far }
}

/** How near a place a magnet let go of still jumps on. */
export const CATCH = 92

/** The place that would take a magnet let go here, or null. */
export function catches(p: Point, who: Who, m: Monster): Place | null {
  const { place, far } = nearestPlace(p, who, m.body)
  return far <= CATCH || inBody(p, who, m.body) ? place : null
}

export type Target =
  | { kind: 'shelf'; part: Part }
  | { kind: 'stuck'; who: Who; place: Place }
  | { kind: 'body'; who: Who }
  | { kind: 'curtain' | 'cord' | 'ostrich' | 'mole' | 'wiper' | 'string' | 'board' }
  | { kind: 'sack'; i: 0 | 1 }
  | { kind: 'drawing'; i: number }

export type Standing = { open: boolean; a: Monster; b: Monster; sacks: boolean; drawings: number }

function stringY(x: number): number {
  const [p, q] = CANS, t = (x - p.x) / (q.x - p.x)
  return p.y + (q.y - p.y) * t + Math.sin(Math.PI * t) * 96
}
/** The string's line, with a bump somewhere along it, or none. */
export function stringAt(t: number): Point {
  const x = CANS[0].x + (CANS[1].x - CANS[0].x) * t
  return { x, y: stringY(x) }
}

export function onOstrich(p: Point): boolean {
  return ((p.x - OSTRICH.x) / 78) ** 2 + ((p.y - OSTRICH.y) / 92) ** 2 <= 1 || near(p, OSTRICH_HEAD) < 58 || (p.x > 544 && p.x < 606 && p.y > 190 && p.y < OSTRICH.y)
}
export function onMole(p: Point): boolean {
  return ((p.x - MOLE.x) / 92) ** 2 + ((p.y - MOLE.y) / 124) ** 2 <= 1
}

/** What a finger lands on. What can be taken comes before what it lies on. */
export function targetAt(p: Point, s: Standing): Target {
  if (s.sacks) for (const i of [0, 1] as const) if (near(p, SACKS[i]) < (i === 0 ? 56 : 66)) return { kind: 'sack', i }
  if (Math.abs(p.x - CORD.x) < 46 && p.y > CORD.y - 120 && p.y < CORD.y + 64) return { kind: 'cord' }
  for (let i = 0; i < PARTS.length; i++) if (near(p, shelfAt(i)) < 52) return { kind: 'shelf', part: PARTS[i] }
  for (const who of s.open ? (['b', 'a'] as const) : (['b'] as const)) {
    const m = s[who]
    let found: Place | null = null, far = Infinity
    for (const place of PLACES) {
      const stuck = m.on[place]
      if (!stuck) continue
      const d = near(p, placeAt(who, m.body, place)), r = stuck.large ? 52 : 44
      if (d < r && d < far) { far = d; found = place }
    }
    if (found) return { kind: 'stuck', who, place: found }
    if (inBody(p, who, m.body)) return { kind: 'body', who }
  }
  if (onMole(p)) return { kind: 'mole' }
  if (onOstrich(p)) return { kind: 'ostrich' }
  if (!s.open && p.x > CURTAIN.x0 - 8 && p.x < CURTAIN.x1 && p.y > CURTAIN.y0 - 30 && p.y < CURTAIN.y1 + 20) return { kind: 'curtain' }
  if (near(p, WIPER) < 58) return { kind: 'wiper' }
  for (let i = 0; i < s.drawings; i++) if (near(p, DRAWINGS[i]) < 60) return { kind: 'drawing', i }
  if (p.x > CANS[0].x && p.x < CANS[1].x && Math.abs(p.y - stringY(p.x)) < 22) return { kind: 'string' }
  return { kind: 'board' }
}

/** Every monster there can be fits between these, so the curtain hides it and the ostrich and the mole stay clear of it. */
export function bounds(who: Who): { x0: number; x1: number; y0: number; y1: number } {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
  for (const body of Object.keys(AT) as Body[]) for (const place of PLACES) {
    const p = placeAt(who, body, place)
    x0 = Math.min(x0, p.x - LARGE / 2); x1 = Math.max(x1, p.x + LARGE / 2); y0 = Math.min(y0, p.y - LARGE / 2); y1 = Math.max(y1, p.y + LARGE / 2)
  }
  return { x0, x1, y0, y1 }
}
