import { MINI, bellyLayout } from './belly'
import { PLATE } from './bricks'
import { toySpan } from './builds'
import { rimHeight } from './gobblerBuild'
import { shapeOf, snackOf, type GobblerId } from './gobblers'
import { CRATE, SHELF, SLOT_Z, STEP, WAIT_Z, crateX, slotX } from './places'
import type { Toy } from './toys'

// Where things stand that the rules do not place: a crew at the tray, the
// ones who wait on the ledge, and what rides on a crate. One home for these
// numbers, read by the game and by the view.

/** How small a gobbler is while it rides on a crate. Like a toy in a belly, it is its full size once it is out. */
export const RIDER = 0.28
/** How much taller the taller crate stands: its deck is this far above the plain one's. */
export const TALLER = 4 * PLATE

export type Spot = { x: number; y: number; z: number }

/** Where a gobbler of the crew at the tray stands. */
export function crewSpot(slot: number, crew: number): Spot {
  return { x: slotX(slot, crew), y: STEP.top, z: SLOT_Z }
}

/** Where one of those who wait on the ledge stands: behind the parapet, seen from the eyes up. */
export function waitingSpot(slot: number, crew: number): Spot {
  return { x: slotX(slot, crew), y: SHELF.top, z: WAIT_Z }
}

/** The top of a gobbler's head above its feet: its eyes, or the model on its back. */
export function headTop(id: GobblerId): number {
  const shape = shapeOf(id)
  return rimHeight(shape) + (shape.model ? 0.8 + toySpan({ colour: 'red', kind: shape.model, size: 'small' }).height + 0.2 : 2.3)
}

/** Where the snack and then the toys of a group lie in a gobbler's belly, measured from its feet, in the order they went in. */
export function bellySpots(id: GobblerId, first: Toy, group: readonly Toy[]): Spot[] {
  return bellyLayout(shapeOf(id), [snackOf(id, first), ...group]) ?? []
}

/** The height of a crate's deck: where its load stands. */
export function deckTop(which: number): number {
  return CRATE.deck + (which > 0 ? TALLER : 0)
}

/**
 * Where each toy of a load stands on the deck of its crate, small, in rows
 * from the front, measured from the middle of the crate at the height of its
 * deck. A load always fits: the deck holds two rows of the widest load.
 */
export function deckSpots(toys: readonly Toy[]): Spot[] {
  const out: Spot[] = [], usable = CRATE.width - 1.2, gap = 0.3
  // Two rows at the front of the deck, each clear of the other and of the lip in front and the riders behind.
  const rowZ = [2.25, 0.82]
  const rows: Toy[][] = [[]]
  let used = 0
  for (const toy of toys) {
    const length = toySpan(toy).length * MINI
    if (used > 0 && used + gap + length > usable) { rows.push([]); used = 0 }
    rows[rows.length - 1].push(toy)
    used += (used > 0 ? gap : 0) + length
  }
  rows.forEach((row, r) => {
    const total = row.reduce((sum, toy) => sum + toySpan(toy).length * MINI, 0) + gap * (row.length - 1)
    let x = -total / 2
    for (const toy of row) {
      const length = toySpan(toy).length * MINI
      out.push({ x: x + length / 2, y: 0, z: rowZ[Math.min(r, rowZ.length - 1)] })
      x += length + gap
    }
  })
  return out
}

/**
 * Where each rider sits on a crate: one row for each crew, each row a step
 * higher and further back than the last, so more crews make a taller crate.
 * Measured like the deck spots. Returned crew by crew.
 */
export function riderSpots(crews: readonly (readonly GobblerId[])[]): Spot[][] {
  return crews.map((crew, row) => {
    const widths = crew.map((id) => shapeOf(id).width * RIDER + 0.75)
    const total = widths.reduce((sum, width) => sum + width, 0)
    let x = -total / 2
    return crew.map((_, i) => {
      const spot = { x: x + widths[i] / 2, y: RISER_BASE + row * RISER, z: RIDER_Z - row * RIDER_STEP }
      x += widths[i]
      return spot
    })
  })
}

/** The first row of riders stands this far above the deck and this far behind its middle; each further row a riser higher and a step further back. */
export const RISER_BASE = 0.4
export const RISER = 2
export const RIDER_Z = -0.75
export const RIDER_STEP = 1.6

/** The top of everything on a crate, above the shelf: what the claw has to clear. */
export function crateTop(which: number, crews: number): number {
  return deckTop(which) + Math.max(ARCH + HANDLE, RISER_BASE + Math.max(0, crews - 1) * RISER + 2.5)
}

/** Where a crate stands. */
export function crateSpot(which: number, crates: number): Spot {
  return { x: crateX(which, crates), y: 0, z: CRATE.z }
}

/**
 * The handle of a crate: an arch over the front of its load with a knob on
 * top, which the claw lifts the crate by. The height of the top of the arch
 * above the deck, the height of the knob on it, and where the middle of the
 * knob's top is, measured like the deck spots.
 */
export const ARCH = 3.6
export const HANDLE = 1.2
export function handleSpot(): Spot {
  return { x: 0, y: ARCH + HANDLE, z: 2.25 }
}
