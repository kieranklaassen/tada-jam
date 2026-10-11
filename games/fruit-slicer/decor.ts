import { COUNTER, DOG, RAIL_BOX, SHELF_BOX, WALL, inside, type Box, type Point } from './stage'
import { passersAt, type Passer, type PasserKind } from './street'

// The things about the stall that are no part of the task: whoever is walking
// down the street, the two street lamps, the keeper's cloth and paper bags,
// the dog's bone. None of them is asked for anything and none changes the
// game, but each answers a tap with one small thing of its own, seen and
// heard, and then is as it was. Where each is, and for how long it answers.
// Pure.

export type Decor = PasserKind | 'lamp' | 'bone' | 'cloth' | 'bags'

/** The line every foot in the street walks on: far enough up the panel for the feet to show over the sill. */
export const STREET = WALL.y + WALL.h - 24
/** Where the two street lamps stand along the street. */
export const LAMPS: readonly number[] = [WALL.x + 318, WALL.x + 884]
/** The middle of the dog's bone, under the sill of its arch. */
export const BONE: Point = { x: DOG.x + DOG.w / 2, y: DOG.y + DOG.h + 28 }
/** The top left corner of the cloth that hangs from its peg beside the rail. */
export const CLOTH: Point = { x: COUNTER.x + 12, y: RAIL_BOX.y + 6 }
/** The left end and the foot of the heap of paper bags beside the shelf. */
export const BAGS: Point = { x: COUNTER.x, y: SHELF_BOX.y + SHELF_BOX.h - 6 }

/** How long each one's answer to a tap lasts, in seconds. The long dog's is the longest: its tail wags after the rest of it has finished. */
export const ANSWER_SECONDS: Readonly<Record<Decor, number>> = { umbrella: 0.5, longDog: 0.9, barrow: 0.5, lamp: 0.9, bone: 0.5, cloth: 0.7, bags: 0.5 }

/** The box a passer-by fills as it goes: where a tap finds it. */
export function passerBox(one: Passer): Box {
  if (one.kind === 'umbrella') return { x: one.x - 40, y: STREET - 132, w: 80, h: 132 }
  if (one.kind === 'longDog') return { x: one.x - 196, y: STREET - 70, w: 392, h: 70 }
  return { x: one.x - 70, y: STREET - 84, w: 140, h: 84 }
}

/** Which of them is under a point after `time` attended seconds, if any, and where it is: a passer-by as it goes by, or a thing that stays where it is. */
export function decorAt(p: Point, time: number): { what: Decor; index: number; x: number; y: number } | null {
  for (const one of passersAt(time)) if (inside(p, passerBox(one))) return { what: one.kind, index: 0, x: one.x, y: STREET - 30 }
  for (const [index, at] of LAMPS.entries()) if (inside(p, { x: at - 24, y: WALL.y + 60, w: 48, h: STREET - WALL.y - 60 })) return { what: 'lamp', index, x: at, y: WALL.y + 85 }
  if (inside(p, { x: BONE.x - 36, y: BONE.y - 18, w: 72, h: 36 })) return { what: 'bone', index: 0, x: BONE.x, y: BONE.y }
  if (inside(p, { x: CLOTH.x - 6, y: CLOTH.y - 8, w: 54, h: 104 })) return { what: 'cloth', index: 0, x: CLOTH.x + 20, y: CLOTH.y + 44 }
  if (inside(p, { x: BAGS.x + 4, y: BAGS.y - 54, w: 62, h: 60 })) return { what: 'bags', index: 0, x: BAGS.x + 32, y: BAGS.y - 24 }
  return null
}
