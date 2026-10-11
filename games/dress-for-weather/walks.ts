import { FIGURES, type Figure } from './kinds'
import { DOG_PLACE, DOOR, MIDDLE, standOf, type Point } from './layout'

// How the figures change places, and the dog's turn of the hall. Pure
// numbers. The hall is flat paper, so depth is the height of a stand on the
// floor: whoever stands lower on the sheet is nearer and is drawn in front.
// Two figures may only overlap while they are in different lanes, and
// walks.test.ts holds that for every change of places at every moment.

/** Seconds a change of places takes. */
export const SWAP_SECONDS = 1.3
/** The lane the one who comes to the middle walks in: in front of everyone who stands. */
export const FRONT_LANE = MIDDLE.y + 10
/** The lane the dog struts in: in front of the front lane, along the bottom edge of the hall sheet. */
export const STRUT_LANE = MIDDLE.y + 20
/** Seconds the dog's turn of the hall takes, and how far along the hall it goes. */
export const STRUT_SECONDS = 2.8
export const STRUT_TO = 664

const span = (u: number, a: number, b: number): number => Math.max(0, Math.min(1, (u - a) / (b - a)))
const ease = (t: number): number => t * t * (3 - 2 * t)
const mix = (a: number, b: number, t: number): number => a + (b - a) * t

/**
 * Where a figure is `u` of the way through a change of places in which `from` leaves the middle and `to` takes
 * it. The one who comes steps forward into the front lane, walks along it and steps back into the middle; the
 * one who leaves walks in the middle's own lane and steps back at its place; the third, if its place changes,
 * shifts along the back.
 */
export function swapAt(who: Figure, from: Figure, to: Figure, u: number): Point {
  const a = standOf(who, from), b = standOf(who, to)
  const along = ease(span(u, 0.15, 0.85))
  if (who === to) {
    const lane = u < 0.5 ? mix(a.y, FRONT_LANE, ease(span(u, 0, 0.15))) : mix(FRONT_LANE, b.y, ease(span(u, 0.85, 1)))
    return { x: mix(a.x, b.x, along), y: lane }
  }
  if (who === from) return { x: mix(a.x, b.x, along), y: mix(a.y, b.y, ease(span(u, 0.85, 1))) }
  return { x: mix(a.x, b.x, along), y: mix(a.y, b.y, along) }
}

/** Seconds the one in the middle takes to walk out of the door. */
export const LEAVE_SECONDS = 0.6
/** Where it stands in the doorway as it goes out: the middle of the opening the leaf has left. */
export const DOORWAY: Point = { x: DOOR.x0 + 62, y: FRONT_LANE }

/**
 * Where the one in the middle is `u` of the way out of the door: a step forward into the front lane, along it
 * in front of the two who wait and the dog, and into the doorway.
 */
export function leaveAt(u: number): Point {
  return { x: mix(MIDDLE.x, DOORWAY.x, ease(span(u, 0.08, 1))), y: mix(MIDDLE.y, FRONT_LANE, ease(span(u, 0, 0.14))) }
}

/** Each figure's own way of going along, at `u` of its walk: nothing at either end. */
export function gaitOf(who: Figure, u: number): { hop: number; tilt: number } {
  const going = Math.sin(Math.PI * span(u, 0.12, 0.88))
  switch (who) {
    // Skips.
    case 'child':
      return { hop: 18 * going * Math.abs(Math.sin(u * Math.PI * 6)), tilt: 0.03 * going * Math.sin(u * Math.PI * 6) }
    // Shuffles, a foot at a time.
    case 'grandfather':
      return { hop: 0, tilt: 0.045 * going * Math.sin(u * Math.PI * 5) }
    // Rocks itself along on its rounded stand.
    case 'baby':
      return { hop: 4 * going * Math.abs(Math.sin(u * Math.PI * 7)), tilt: 0.17 * going * Math.sin(u * Math.PI * 7) }
  }
}

/** Where the dog is `u` of the way round its turn of the hall, and which way it faces: 1 as it sits, -1 on the way back. */
export function strutAt(u: number): Point & { facing: 1 | -1; trot: number } {
  const out = ease(span(u, 0.08, 0.5)), back = ease(span(u, 0.52, 0.92))
  const lane = u < 0.5 ? mix(DOG_PLACE.y, STRUT_LANE, ease(span(u, 0, 0.08))) : mix(STRUT_LANE, DOG_PLACE.y, ease(span(u, 0.92, 1)))
  const going = Math.sin(Math.PI * span(u, 0.06, 0.94))
  return { x: mix(DOG_PLACE.x, STRUT_TO, out - back), y: lane, facing: u > 0.5 && u < 0.92 ? -1 : 1, trot: 7 * going * Math.abs(Math.sin(u * Math.PI * 14)) }
}

/** The figures other than one. */
export function othersOf(who: Figure): Figure[] {
  return FIGURES.filter((figure) => figure !== who)
}
