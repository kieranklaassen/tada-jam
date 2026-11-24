import type { Point } from './input'
import type { ThingId } from './things'

// Where everything stands, in stage units (1180 by 820).

export type Spot = Point

export const FLOOR = 735

/** The seven places in the basket: the heap, back to front. Never nearer than 95 to one another. */
export const PLACES: Record<ThingId, Spot> = {
  carrot: { x: 945, y: 336 }, bell: { x: 1062, y: 336 },
  biscuit: { x: 890, y: 440 }, porridge: { x: 1003, y: 440 }, mouse: { x: 1112, y: 440 },
  mandarin: { x: 945, y: 542 }, frog: { x: 1062, y: 540 },
}
export const BASKET = { x: 1003, top: 566, bottom: 768, half: 150 }
/** How near a finger takes a thing. */
export const REACH = 62

/** The sun in the window, and the moon where it was. */
export const WINDOW = { x: 748, y: 168, w: 240, h: 226 }
export const SUN = { x: 748, y: 160, r: 62 }

/** One owner with a boot, standing somewhere. `x` is the group's origin on the floor and `s` its size. */
export type Place = { x: number; y: number; s: number; /** Where the owner stands from the origin. */ ox: number }
export const STAGE_PLACE: Place = { x: 440, y: FLOOR, s: 1, ox: -165 }
/** The five shoes in a row, at night beside the basket and in the morning over the whole floor. */
export function rowPlace(i: number, spread: number): Place {
  const night = { x: 34 + i * 170, s: 0.56 }, day = { x: 98 + i * 216, s: 0.6 }
  return { x: night.x + (day.x - night.x) * spread, y: FLOOR + 20, s: night.s + (day.s - night.s) * spread, ox: -34 }
}

/** The boot in the group's own units: the middle of its opening, and the tip of its toe. */
export const BOOT = { x: 105, rim: -292, toeX: 292, toeY: -74, half: 88 }
/** The bare foot's ankle, held over the boot, and all the way in. */
export const ANKLE = { x: 62, y: -428, in: -262, inX: 104 }
/** A thing that sits in the boot, first and second: it peeps out over the rim. */
export const PEEP: readonly Spot[] = [{ x: BOOT.x - 34, y: -304 }, { x: BOOT.x + 38, y: -300 }]
/** The owner from where it stands: head and mouth. */
export const HEAD = { y: -452, top: -560, mouth: -418 }

/** The big bed of the night, and where each head lies in it. */
export const BED = { left: 18, right: 866, top: 330, bottom: 560 }
export function pillow(i: number): Spot {
  return { x: 96 + i * 170, y: 402 }
}
/** Where the next owner looks round the edge. */
export const PEEK = { x: 30, y: 440, r: 92 }

