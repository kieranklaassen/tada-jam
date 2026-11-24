import type { Point } from './input'
import { PLACES, THINGS, thingOf, type Place, type ThingId } from './things'

// Where everything stands, in stage units. The stage is 1180 by 820: a house cut
// open from the side, with a shelf of small things across the top, the family
// along the back of the floor, the butler's lane before them, and the bed,
// the soup and the bath in front.

export const SHELF_Y = 206
/** The things on the shelf, left to right: no two of one colour or one kind stand side by side. */
export const SHELF_ORDER = ['red-sock', 'yellow-hat', 'blue-pot', 'yellow-sock', 'red-hat', 'blue-sock', 'yellow-pot', 'blue-hat', 'red-pot'] as const
export const SHELF_X0 = 154
export const SHELF_STEP = 104

/** A spot is the middle of a thing's foot, and the scale it is drawn at there. */
export type Spot = { x: number; y: number; s: number }

/** How large each kind is at scale 1: its width and its height above its foot. */
export const SIZE: Readonly<Record<string, { w: number; h: number }>> = {
  sock: { w: 78, h: 88 },
  hat: { w: 92, h: 74 },
  teapot: { w: 96, h: 80 },
  cat: { w: 108, h: 116 },
  hen: { w: 104, h: 108 },
  piglet: { w: 116, h: 100 },
  gran: { w: 150, h: 196 },
  queen: { w: 140, h: 300 },
  king: { w: 216, h: 262 },
  butler: { w: 210, h: 410 },
}

const HOMES: Readonly<Record<string, Spot>> = {
  gran: { x: 142, y: 530, s: 1 },
  cat: { x: 258, y: 556, s: 1 },
  king: { x: 398, y: 528, s: 1 },
  queen: { x: 794, y: 528, s: 1 },
  hen: { x: 918, y: 558, s: 1 },
  piglet: { x: 1046, y: 560, s: 1 },
}

export const BUTLER_HOME = { x: 606, y: 612 }
/** The stretch of floor the butler's feet keep to. */
export const LANE = { left: 110, right: 1070 } as const

export function homeOf(id: ThingId): Spot {
  const shelf = (SHELF_ORDER as readonly string[]).indexOf(id)
  if (shelf >= 0) return { x: SHELF_X0 + shelf * SHELF_STEP, y: SHELF_Y, s: 1 }
  return HOMES[id]
}

/** A place to put things: its middle, half its width, and the height of its front edge. */
export type Vessel = { x: number; half: number; rim: number; foot: number }
export const VESSELS: Readonly<Record<Place, Vessel>> = {
  bed: { x: 222, half: 176, rim: 676, foot: 784 },
  soup: { x: 606, half: 162, rim: 676, foot: 784 },
  bath: { x: 966, half: 172, rim: 676, foot: 784 },
}

/** Where each thing lies in a place. Each has a spot of its own, so a full place is a heap with every face showing. */
const BACK: Readonly<Record<string, { dx: number; dy: number; s: number }>> = {
  butler: { dx: 6, dy: 90, s: 0.8 },
  king: { dx: -72, dy: 40, s: 0.76 },
  queen: { dx: 92, dy: 50, s: 0.72 },
  gran: { dx: 14, dy: 12, s: 0.74 },
  cat: { dx: -134, dy: 8, s: 0.72 },
  hen: { dx: 136, dy: 4, s: 0.72 },
  piglet: { dx: 32, dy: 14, s: 0.72 },
}

export function slotOf(id: ThingId, place: Place): Spot {
  const vessel = VESSELS[place]
  // The quilt comes up higher than the soup does.
  const up = place === 'bed' ? 24 : 0
  const back = BACK[id]
  if (back) return { x: vessel.x + back.dx, y: vessel.rim + back.dy - up, s: back.s }
  const n = (SHELF_ORDER as readonly string[]).indexOf(id)
  // Five float behind, four in front, their feet under the edge.
  const front = n % 2 === 1
  const row = Math.floor(n / 2)
  const across = front ? (row - 1.5) * 74 : (row - 2) * 64
  return { x: vessel.x + across, y: vessel.rim + (front ? 38 : 20) - up, s: 0.62 }
}

export function bodyMiddle(id: ThingId, spot: Spot): Point {
  const size = SIZE[thingOf(id).kind]
  return { x: spot.x, y: spot.y - (size.h * spot.s) / 2 }
}

/** Whether a point is on a thing standing at a spot, with a little more than is drawn for a small finger. */
export function onThing(id: ThingId, spot: Spot, at: Point, extra = 8): boolean {
  const size = SIZE[thingOf(id).kind]
  const half = Math.max((size.w * spot.s) / 2 + extra, 30), top = spot.y - size.h * spot.s - extra
  return Math.abs(at.x - spot.x) <= half && at.y >= top && at.y <= spot.y + extra
}

/** The place a thing let go here falls into. Generous: anything over it or near it goes in. */
export function placeAt(at: Point): Place | null {
  if (at.y < 560) return null
  return PLACES.find((place) => Math.abs(at.x - VESSELS[place].x) <= VESSELS[place].half + 18) ?? null
}

/** The bell rope: its tassel hangs here and is pulled down. */
export const ROPE = { x: 1122, top: 112, y: 330, r: 46 } as const
export const ROPE_PULL = 54
export const ROPE_MOST = 120

/** The grandmother's dream hangs over her chair. */
export const DREAM = { x: 150, y: 274, w: 224, h: 130 } as const

export const SMALL = THINGS.filter((one) => (SHELF_ORDER as readonly string[]).includes(one.id)).map((one) => one.id)
