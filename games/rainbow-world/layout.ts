import type { PieceDef } from './pieces'
import { STAGE } from './stage'

// Where everything is on the stage, in stage units, and what a touch lands on. The stage is 1180 by 820. The mat
// lies in the middle, the dolls stand in a row behind its far edge, the arches and the horse lie to its left, the
// silk and the basket to its right, and a window sill with a cat runs along the bottom, where wrists rest and
// nothing the play needs is put. Nothing here draws or reads a clock.

export type Spot = { x: number; y: number }

/** The mat as drawn: a wide oval of plain cream paper. */
export const MAT = { x: 590, y: 515, rx: 372, ry: 185 } as const

/** Where feet may stand on it: well inside the edge, and low enough that a thing on the mat stands clear of the dolls' row behind. */
export const FIELD = { x: 590, y: 558, rx: 262, ry: 94 } as const

/** The basket, which is never carried: its foot, half width and height. */
export const BASKET = { x: 1062, y: 618, halfWidth: 92, height: 140 } as const

/** The cat on the sill, a bystander. */
export const CAT = { x: 410, y: 800, halfWidth: 128, height: 96 } as const

/** The top of the window sill. Below it is the strip where wrists rest. */
export const SILL_TOP = 716

/** The jam's round home control: 48 across, at the top centre, 10 from the top edge. Nothing that answers a touch as a thing lies under it. */
export const HOME_CONTROL = { x: STAGE.width / 2, y: 34, r: 24 } as const

/** The grown-up's corner at the top right (overlay.ts). */
export const GROWN_UP_CORNER = 72

export function onMat(x: number, y: number): boolean {
  const dx = (x - MAT.x) / MAT.rx, dy = (y - MAT.y) / MAT.ry
  return dx * dx + dy * dy <= 1
}

export function inField(x: number, y: number, shrink = 0): boolean {
  const dx = (x - FIELD.x) / (FIELD.rx - shrink), dy = (y - FIELD.y) / FIELD.ry
  return dx * dx + dy * dy <= 1
}

/** The nearest point of the field to a point of the stage: a tap near the mat's edge still sets a thing down on it. `shrink` narrows the field for a wide thing. */
export function toField(x: number, y: number, shrink = 0): Spot {
  const rx = FIELD.rx - shrink, dx = (x - FIELD.x) / rx, dy = (y - FIELD.y) / FIELD.ry
  const far = Math.hypot(dx, dy)
  if (far <= 1) return { x, y }
  return { x: FIELD.x + (dx / far) * rx, y: FIELD.y + (dy / far) * FIELD.ry }
}

/** How much narrower the field is for a thing: a wide one stands further in, so that its whole foot is on the mat. */
export function shrinkFor(piece: PieceDef): number {
  return Math.max(0, piece.reach - 60)
}

/** Two feet on the mat stand in each other when they are in the same row of depth and nearer than their reaches. */
export const ROW_DEPTH = 44
export function feetCross(a: PieceDef, ax: number, ay: number, b: PieceDef, bx: number, by: number): boolean {
  return Math.abs(ay - by) < ROW_DEPTH && Math.abs(ax - bx) < a.reach + b.reach
}

/** Every place a foot may be asked to stand, as a grid over the field. Made once. */
const CANDIDATES: readonly Spot[] = (() => {
  const spots: Spot[] = []
  for (let y = FIELD.y - FIELD.ry; y <= FIELD.y + FIELD.ry; y += 11) for (let x = FIELD.x - FIELD.rx; x <= FIELD.x + FIELD.rx; x += 13) if (inField(x, y)) spots.push({ x, y })
  return spots
})()

/** The feet of the dolls' places behind the mat. A thing the game sets down keeps its head clear of that row. */
export const BACK_ROW = 302

/** How far two things may lie over each other, side to side, where the game itself sets one of them down. */
export const SLIVER = 18

/**
 * Two things on the mat lie over each other when their bodies overlap by more than a sliver both ways. Feet in
 * different rows of depth do not cross, but on translucent paper a thing half behind another reads as one with
 * it, so the game keeps the things it sets down apart by this rule too.
 */
export function bodiesOverlap(a: PieceDef, ax: number, ay: number, b: PieceDef, bx: number, by: number): boolean {
  const across = a.halfWidth + b.halfWidth - Math.abs(ax - bx)
  const up = Math.min(ay, by) - Math.max(ay - a.height, by - b.height)
  return across > SLIVER && up > SLIVER
}

/** A place in whole stage units that is still on the field: rounded, and where rounding would step over the edge, rounded towards the middle instead. */
function whole(spot: Spot, shrink: number): Spot {
  const x = Math.round(spot.x), y = Math.round(spot.y)
  if (inField(x, y, shrink)) return { x, y }
  return { x: spot.x > FIELD.x ? Math.floor(spot.x) : Math.ceil(spot.x), y: spot.y > FIELD.y ? Math.floor(spot.y) : Math.ceil(spot.y) }
}

/**
 * Where a thing comes to stand when it is asked for a point: that point if nothing stands there, and otherwise
 * the nearest free place. `others` are the things already on the mat. When the mat is so full that no place is
 * free, the place that crosses the fewest feet is taken, so a thing is never refused. `strict` is for a thing
 * the game itself sets down at the end of a scene or an answer: it also keeps its body off every other body and
 * its head out of the dolls' row behind the mat, for as long as the mat has room.
 */
export function freeSpot(piece: PieceDef, wantX: number, wantY: number, others: readonly { def: PieceDef; x: number; y: number }[], strict = false): Spot {
  const shrink = shrinkFor(piece), want = toField(wantX, wantY, shrink)
  const crossings = (x: number, y: number): number => others.reduce((n, other) => n + (feetCross(piece, x, y, other.def, other.x, other.y) ? 1 : 0), 0)
  const crowding = (x: number, y: number): number => !strict ? 0 : others.reduce((n, other) => n + (bodiesOverlap(piece, x, y, other.def, other.x, other.y) ? 1 : 0), y - piece.height < BACK_ROW - SLIVER ? 1 : 0)
  if (crossings(want.x, want.y) === 0 && crowding(want.x, want.y) === 0) return whole(want, shrink)
  let best = want, bestCost = Infinity, bestFar = Infinity
  for (const spot of CANDIDATES) {
    if (!inField(spot.x, spot.y, shrink)) continue
    // A foot in another foot counts for more than a body over a body.
    const cost = crossings(spot.x, spot.y) * 10 + crowding(spot.x, spot.y)
    // Depth counts double: a thing that slides sideways still looks set down where the finger was.
    const far = Math.hypot(spot.x - want.x, (spot.y - want.y) * 2)
    if (cost < bestCost || (cost === bestCost && far < bestFar)) {
      best = spot; bestCost = cost; bestFar = far
    }
  }
  return whole(best, shrink)
}

/** A box round a thing standing at a foot point, for touches. */
export function inBox(x: number, y: number, footX: number, footY: number, halfWidth: number, height: number, pad = 6): boolean {
  return x >= footX - halfWidth - pad && x <= footX + halfWidth + pad && y >= footY - height - pad && y <= footY + pad
}

/** Whether a place by the mat keeps clear of the home control, the grown-up's corner and the wrist strip. */
export function homeIsClear(piece: PieceDef): boolean {
  const left = piece.home.x - piece.halfWidth, right = piece.home.x + piece.halfWidth, top = piece.home.y - piece.height
  const underControl = right > HOME_CONTROL.x - HOME_CONTROL.r && left < HOME_CONTROL.x + HOME_CONTROL.r && top < HOME_CONTROL.y + HOME_CONTROL.r
  const inCorner = right > STAGE.width - GROWN_UP_CORNER && top < GROWN_UP_CORNER
  return !underControl && !inCorner && piece.home.y < SILL_TOP && left >= 0 && right <= STAGE.width
}
