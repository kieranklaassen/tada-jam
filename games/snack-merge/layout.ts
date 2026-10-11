import { BIGGEST } from './kinds'
import { STAGE } from './stage'

// Where everything stands, in stage units (stage.ts). One home for the
// numbers the rules, the view and the tests all read. Pure.

/** The inside of the jar: the walls, the floor and the rim. A snack is in the jar between them. */
export const JAR = { left: 390, right: 770, rim: 228, floor: 664, glass: 14 } as const
export const JAR_MID = (JAR.left + JAR.right) / 2

/** The rail the claw runs on, and how high a snack hangs under it (its centre). */
export const RAIL = { y: 82, left: 372, right: 788 } as const
export const HANG_Y = 162
/** The trolley that runs on the rail, about the rail: it stays below the home control wherever the claw stands. */
export const TROLLEY = { half: 30, up: 20, down: 24 } as const

/** The six places on the wall shelf, in shelf order: two rows of three. */
export const SHELF: readonly { x: number; y: number }[] = [0, 1, 2, 3, 4, 5].map((i) => ({ x: 70 + (i % 3) * 90, y: i < 3 ? 392 : 520 }))
/** A touch this near a shelf place takes its thing. */
export const SHELF_REACH = 46

/** The counter's back edge, where the jar stands, and the four places on it, counted from the paper bag. */
export const COUNTER_Y = 648
export const PLACES: readonly { x: number; y: number }[] = [0, 1, 2, 3].map((i) => ({ x: 400 + i * 118, y: 756 }))
/** The open top of the paper bag at the end of the counter. */
export const BAG = { x: 104, y: 668, left: 40, right: 170, top: 640, bottom: 800 } as const

/** The jar's handle, on the side away from the monster. */
export const HANDLE = { left: 296, right: 376, top: 326, bottom: 526 } as const

/** The shop window, where the next monster waits. */
export const WINDOW = { left: 36, right: 284, top: 52, bottom: 300 } as const

/** The lamp's shade, on its cord. */
export const LAMP = { x: 330, top: 0, y: 122, half: 44 } as const

/** The sugar mouse, by the bag. */
export const MOUSE = { x: 236, y: 762, half: 48 } as const

/** Where the monster at the jar sits: its head's middle, and the box a poke at it lands in. */
export const SEAT = { x: 1000, y: 270, left: 800, right: 1180, top: 112, bottom: COUNTER_Y } as const
/** Its tail, which lies along the counter: a poke at it is a poke at the monster. */
export const TAIL = { left: 900, right: 1180, top: 706, bottom: 812 } as const

/**
 * The back shelf of stoppered jars, under the ceiling on the monster's side. Its jars stop short of the top
 * right corner of the surface, which is the grown-up's (overlay.ts): a press there never reaches the game.
 */
export const BACK_SHELF = { left: 812, right: 1092, top: 26, bottom: 108 } as const
/** The jars on it: how many, how wide, and how far apart they stand. */
export const BACK_JARS = { count: 6, width: 40, step: 45, inset: 14 } as const

/** A touch between these, above the counter, is over the jar: it moves the claw. */
export const OVER_JAR = { left: JAR.left - 14, right: JAR.right + 14, bottom: COUNTER_Y + 30 } as const

/** The stool behind the counter that the monster at the jar sits on: the middle of its seat. */
export const STOOL = { x: 1004, y: 430, half: 78 } as const
/** Where the mouth of the monster at the jar is, whichever of the three sits there. */
export const MOUTH = { x: 895, y: 305 } as const
/** No part of a seated monster at rest lies left of this, so none covers the space over the jar. */
export const SEAT_EDGE = OVER_JAR.right + 4

/** The jar tips on its foot, towards the monster: the corner it turns on and how far it goes, in radians. */
export const TIP = { x: JAR.right + JAR.glass, y: JAR.floor + JAR.glass, angle: 0.3 } as const
/** How far the handle is pulled for a whole tip, in stage units. Half of it counts. */
export const PULL = 220

/** Where a point of the upright jar is when the jar is tipped `tip` of the way, 0 to 1. */
export function tipped(p: { x: number; y: number }, tip: number): { x: number; y: number } {
  const a = tip * TIP.angle, dx = p.x - TIP.x, dy = p.y - TIP.y
  return { x: TIP.x + dx * Math.cos(a) - dy * Math.sin(a), y: TIP.y + dx * Math.sin(a) + dy * Math.cos(a) }
}

/** How far the claw may go for a snack of radius `r`, so that what it lets go falls into the jar. */
export function clawReach(r: number): { min: number; max: number } {
  return { min: JAR.left + r + 2, max: JAR.right - r - 2 }
}

/** The jam's round home control: 48 pixels across at the top centre of the surface, 10 from its top edge. */
export const HOME = { size: 48, top: 10 } as const
/** The grown-up's corner at the top right of the surface (overlay.ts). */
export const CORNER_SIZE = 72

export type Box = { left: number; right: number; top: number; bottom: number }

/** Everything a child may tap or pull, as boxes in stage units: the shelf places, the counter places and the handle. */
export function tappable(): Box[] {
  const around = (p: { x: number; y: number }, r: number): Box => ({ left: p.x - r, right: p.x + r, top: p.y - r, bottom: p.y + r })
  return [...SHELF.map((p) => around(p, SHELF_REACH)), ...PLACES.map((p) => around(p, BIGGEST)), { ...HANDLE }]
}

/** The space over the jar where a finger carries the claw, as a box from the top of the stage down. */
export function overJar(): Box {
  return { left: OVER_JAR.left, right: OVER_JAR.right, top: 0, bottom: OVER_JAR.bottom }
}

/**
 * Everything the game brings to rest, as boxes in stage units: the monster at the jar, the monster at the
 * window, the paper bag and the mouse. A snack thrown out lies on a counter place, which `tappable` holds.
 * None of these may cover anything a child aims at (layout.test.ts).
 */
export function resting(): Box[] {
  const around = (p: { x: number; y: number }, r: number): Box => ({ left: p.x - r, right: p.x + r, top: p.y - r, bottom: p.y + r })
  return [{ left: SEAT_EDGE, right: SEAT.right, top: SEAT.top, bottom: SEAT.bottom }, { ...TAIL }, { ...WINDOW }, { left: BAG.left, right: BAG.right, top: BAG.top, bottom: BAG.bottom }, around(MOUSE, MOUSE.half)]
}

export { STAGE }
