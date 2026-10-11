import type { Cell } from './build'
import type { Room } from './chambers'
import { EARTH, MOUTH, OPEN, SHAFT_DEPTH, at, type Ground } from './ground'

// Where the kingdom's own stand, worked out from the ground each time it comes to rest and never stored: the queen
// in the largest chamber (or wedged under the mouth while there is none), two workers to a chamber, and the one
// short drag the idle ladder may show.

/** A place to stand: the cell whose floor the feet are on, and the middle of the feet along the row, in cell units. */
export type Standing = { x: number; y: number }

/** The longest run of floor in the lowest row of a room: cells of the room with something firm under them. */
function floorOf(ground: Ground, room: Room): { y: number; from: number; to: number } {
  const { cols } = ground
  const lowest = Math.floor(room.cells[room.cells.length - 1] / cols)
  let best = { y: lowest, from: 0, to: -1 }
  let from = -1
  const inRow = new Set(room.cells.filter((i) => Math.floor(i / cols) === lowest).map((i) => i % cols))
  for (let x = 0; x <= cols; x++) {
    const floor = inRow.has(x) && at(ground, x, lowest + 1) !== OPEN
    if (floor && from < 0) from = x
    if (!floor && from >= 0) {
      if (x - 1 - from > best.to - best.from) best = { y: lowest, from, to: x - 1 }
      from = -1
    }
  }
  return best
}

/** The middle of the mouth, in cell units. */
const WEDGED_X = (MOUTH[0] + MOUTH[MOUTH.length - 1] + 1) / 2
/** Half the queen's width and half a worker's, in cells: she is over four cells wide and a worker three. */
const QUEEN_HALF = 2.2
const WORKER_HALF = 1.5

/** Whether the left end of a floor is the end nearer the mouth. */
const mouthIsLeft = (floor: { from: number; to: number }) => Math.abs(floor.from - WEDGED_X) <= Math.abs(floor.to + 1 - WEDGED_X)

/**
 * Where the queen sits: at the end of the floor of her room that is further from the mouth, and how much of her
 * full size she is drawn at there. A floor shorter than she is wide seats her in its middle, a little smaller, so
 * that she stands in nothing. Null while the kingdom has no chamber: she is wedged under the mouth.
 */
export function queenSeat(ground: Ground, rooms: readonly Room[], queenRoom: number | null): (Standing & { fit: number }) | null {
  if (queenRoom === null) return null
  const floor = floorOf(ground, rooms[queenRoom])
  const length = floor.to - floor.from + 1
  if (length <= 0) return null
  const fit = Math.min(1, length / (2 * QUEEN_HALF))
  const x = fit < 1 ? floor.from + length / 2 : mouthIsLeft(floor) ? floor.to + 1 - QUEEN_HALF : floor.from + QUEEN_HALF
  return { x, y: floor.y, fit }
}

/**
 * Where the wedged queen's feet are: the middle of the shaft, one cell above its foot. She stands on nothing: the
 * walls hold her. The cell under her is left for the child's ant.
 */
export const WEDGED: Standing = { x: (MOUTH[0] + MOUTH[MOUTH.length - 1] + 1) / 2, y: SHAFT_DEPTH - 1 }

/** How far apart two workers stand when they keep out of a visitor's way together: much closer than they are wide. */
export const HUDDLED = 0.9

/**
 * Where the workers stand, up to `most` of them: two to a chamber where its floor has room for two, one where it
 * has room for one, and in the queen's room only what is left beside her. Nobody stands in anybody. While a raid
 * runs they are `huddled`: the same workers stand close together at the end of their floor that is further from
 * the mouth, and in the queen's room behind the queen, peering out either side of her, so that the rest of the
 * floor is left to whoever comes in.
 */
export function workerSpots(ground: Ground, rooms: readonly Room[], queenRoom: number | null, most: number, huddled = false): Standing[] {
  const spots: Standing[] = []
  rooms.forEach((room, n) => {
    const floor = floorOf(ground, room)
    // The stretch of floor that is free, from its left edge to its right edge in cell units.
    const queenLeft = n === queenRoom && !mouthIsLeft(floor), queenRight = n === queenRoom && mouthIsLeft(floor)
    const left = queenLeft ? floor.from + 2 * QUEEN_HALF : floor.from, right = queenRight ? floor.to + 1 - 2 * QUEEN_HALF : floor.to + 1
    const free = right - left
    let here = free >= 4 * WORKER_HALF ? [left + WORKER_HALF, right - WORKER_HALF] : free >= 2 * WORKER_HALF ? [(left + right) / 2] : []
    if (huddled && here.length > 0) {
      const seat = n === queenRoom ? queenSeat(ground, rooms, queenRoom) : null
      if (seat) here = here.map((_, k) => seat.x + (k === 0 ? -1 : 1) * HUDDLED * seat.fit)
      else {
        // The end of the floor away from the mouth.
        const far = mouthIsLeft(floor) ? right - WORKER_HALF : left + WORKER_HALF, inward = mouthIsLeft(floor) ? -1 : 1
        here = here.map((_, k) => far + inward * HUDDLED * k)
      }
    }
    for (const x of here) if (spots.length < most) spots.push({ x, y: floor.y })
  })
  return spots
}

/**
 * One short drag through plain earth beside the ant, for the ghost hand: four cells along a row, starting next to
 * open ground the ant can stand in, through earth only, with earth above and below it, so it shows that a drag
 * digs and touches nothing that was built. Null where the ground offers no such place near the ant.
 */
export function demoDrag(ground: Ground, ant: Cell): { from: { x: number; y: number }; to: { x: number; y: number } } | null {
  const plain = (x: number, y: number) => {
    for (let dy = -1; dy <= 1; dy++) if (at(ground, x, y + dy) !== EARTH || at(ground, x, y + dy - 1) === OPEN) return false
    return true
  }
  for (let reach = 0; reach < 8; reach++) {
    for (const y of [ant.y, ant.y + reach, ant.y - reach]) {
      for (const side of [1, -1]) {
        // The first earth cell beside the open ground the ant is in, on this row.
        let x = ant.x
        while (at(ground, x, ant.y) === OPEN && Math.abs(x - ant.x) < 6) x += side
        if (y < 2 || y > ground.rows - 3) continue
        let clear = true
        for (let n = 0; n < 5 && clear; n++) clear = plain(x + side * n, y)
        if (clear) return { from: { x: x + 0.5 + side * 0.4, y: y + 0.5 }, to: { x: x + 0.5 + side * 3.6, y: y + 0.5 } }
      }
    }
  }
  return null
}
