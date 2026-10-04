import { bellyLayout } from './belly'
import { ON_STUDS, PLATE } from './bricks'
import { toySpan } from './builds'
import { EYE, rimHeight } from './gobblerBuild'
import { shapeOf, snackOf, type GobblerId } from './gobblers'
import { CRATE, SHELF, SLOT_Z, STEP, TRAY, WAIT_Z, crateX, slotX } from './places'
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
  // A hair above the step: a gobbler stands on its studs and is never in one plane with it.
  return { x: slotX(slot, crew), y: STEP.top + ON_STUDS, z: SLOT_Z }
}

/** Where one of those who wait on the ledge stands: behind the parapet, seen from the eyes up. */
export function waitingSpot(slot: number, crew: number): Spot {
  return { x: slotX(slot, crew), y: SHELF.top + ON_STUDS, z: WAIT_Z }
}

/** The top of a gobbler's head above its feet: its eyes, or the model on its back. */
export function headTop(id: GobblerId): number {
  const shape = shapeOf(id)
  return rimHeight(shape) + (shape.model ? 0.8 + toySpan({ colour: 'red', kind: shape.model, size: 'small' }).height + 0.2 : EYE + 0.3)
}

/** Where the snack and then the toys of a group lie in a gobbler's belly, measured from its feet, in the order they went in. */
export function bellySpots(id: GobblerId, first: Toy, group: readonly Toy[]): Spot[] {
  return bellyLayout(shapeOf(id), [snackOf(id, first), ...group]) ?? []
}

/** The height of a crate's deck: where its load stands. */
export function deckTop(which: number): number {
  return CRATE.deck + (which > 0 ? TALLER : 0)
}

/** How small a toy is on the deck of a crate: smaller than in a belly, so that two rows of any load fit the deck. */
export const ON_DECK = 0.4

/**
 * Where each toy of a load stands on the bed of its crate, small, measured
 * from the middle of the crate at the height of its deck. The bed is a small
 * picture of the tray the load is going to: the toys for the front row of the
 * tray stand along the front of the bed and the others behind them, each row
 * in the order of its places across the tray. So when the bed tips, the front
 * row pours off first and falls furthest, and no toy crosses another on its
 * way down. `places` is the place on the tray of each toy.
 */
export function deckSpots(toys: readonly Toy[], places: readonly number[]): Spot[] {
  const usable = BED.half * 2 - 0.1
  // Two rows, each clear of the other and of the riders behind, whichever toys stand in them: the deepest toy is
  // a big car with its wheels out at either side.
  const rowZ = [2.3, 0.75]
  const lengths = toys.map((toy) => toySpan(toy).length * ON_DECK)
  const out: Spot[] = toys.map(() => ({ x: 0, y: BED.top, z: 0 }))
  for (const row of [0, 1]) {
    // Places count along the back row of the tray first: the front row of the tray is the front row of the bed.
    const mine = toys.map((_, i) => i).filter((i) => (Math.floor((places[i] ?? i) / TRAY.columns) === 0 ? 1 : 0) === row).sort((a, b) => (places[a] ?? a) - (places[b] ?? b))
    const long = mine.reduce((sum, i) => sum + lengths[i], 0)
    // Five big toys in one row stand a little closer than fewer do.
    const gap = mine.length > 1 ? Math.min(0.3, (usable - long) / (mine.length - 1)) : 0
    let x = -(long + gap * (mine.length - 1)) / 2
    for (const i of mine) {
      out[i] = { x: x + lengths[i] / 2, y: BED.top, z: rowZ[row] }
      x += lengths[i] + gap
    }
  }
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
export const RIDER_Z = -1
export const RIDER_STEP = 1.8

/** The top of everything on a crate, above the shelf: what the claw has to clear. */
export function crateTop(which: number, crews: number): number {
  return deckTop(which) + Math.max(ARCH + HANDLE, RISER_BASE + Math.max(0, crews - 1) * RISER + 2.5)
}

/**
 * A crate waits on a cart: a low truck on the shelf that holds it up over the parapet, so that the whole crate,
 * its load and its riders are seen from the front. The claw lifts the crate off its cart and sets it back on it;
 * the cart stays where it is, and slides away with the crate at the end. `CART` is how high its top is over the
 * studs of the shelf, and `CRATE_STANDS` the height of the foot of a crate that stands on it.
 */
export const CART = 3.6
export const CRATE_STANDS = SHELF.top + ON_STUDS + CART + 0.02

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

/**
 * The bed of a crate: a plain plate on the front of its deck, which the load stands on. It rests on the studs
 * of the deck and tips forward about its front edge to pour, like the bed of a tipper truck; the crate itself
 * stays level, so its riders and the knob the claw holds it by never move. `lift` and `top` are heights above
 * the top of the deck.
 */
export const BED = { back: -0.05, front: CRATE.depth / 2, half: CRATE.width / 2 - 0.6, lift: 0.2, top: 0.2 + PLATE } as const
/** How far the bed tips forward to pour its load, in radians. */
export const TIP = 0.6

/**
 * Where a point over the bed is when the bed is tipped. `above` is its height over the top of the deck and `z`
 * is measured from the middle of the crate; `tip` runs from 0 level to 1 poured. A point past the front edge is
 * on the line of the bed, out in the air.
 */
export function tipped(above: number, z: number, tip: number): { y: number; z: number } {
  const a = tip * TIP, cos = Math.cos(a), sin = Math.sin(a), up = above - BED.lift, out = z - BED.front
  return { y: BED.lift + up * cos - out * sin, z: BED.front + up * sin + out * cos }
}
