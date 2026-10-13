import type { P, Spot } from './layout'

// The room at the table, where a walk ends: a second frame, in stage units.
// The table stands under the window, the bowl stands on it, and the door
// stands open on the path at the right, where the house's door is in the
// wood, so a thing carried out through it is in the same place in the hand.

/** The top of the table, where things lie: a thing's point is its middle. */
export const TABLE = { x0: 270, y0: 548, x1: 884, y1: 640 } as const
/** The bowl of water on the table. */
export const BOWL: Spot = { x: 150, y: 590, r: 78 }
/** Where a thing lies in the bowl, and where the worm climbs out of it onto the table. */
export const BOWL_SLOT: P = { x: 150, y: 584 }
export const BOWL_BANK: P = { x: 272, y: 606 }
/** The door back to the wood. */
export const ROOM_DOOR: Spot = { x: 1066, y: 452, r: 100 }
/** Along the near edge of the table: where things sent in through the door land, in the order they are used. */
export const EDGE_SPOTS: readonly P[] = [
  { x: 800, y: 628 }, { x: 690, y: 628 }, { x: 580, y: 628 }, { x: 470, y: 628 }, { x: 360, y: 628 }, { x: 290, y: 566 },
]
/** Two things on the table nearer than this are together, and do what the two of them do. */
export const PAIR_REACH = 84
/** How far apart the two of a pair stand. */
export const PAIR_GAP = 60
/** How much room a thing takes on the table. */
export const TABLE_R = 34
/** Where the toad may sit on the table: his feet. */
export const TOAD_TABLE = { x0: 380, x1: 760, y: 624 } as const
/** The edge a thing rolls off, and the sill of the door it rolls out over. */
export const TABLE_EDGE: P = { x: 884, y: 640 }
export const SILL: P = { x: 1040, y: 690 }

/** The nearest point of the table's top to a point. */
export function onTable(at: P): P {
  return { x: Math.min(TABLE.x1, Math.max(TABLE.x0, at.x)), y: Math.min(TABLE.y1, Math.max(TABLE.y0, at.y)) }
}

export function overTable(at: P): boolean {
  return at.x >= TABLE.x0 - 30 && at.x <= TABLE.x1 + 30 && at.y >= TABLE.y0 - 60 && at.y <= TABLE.y1 + 40
}
