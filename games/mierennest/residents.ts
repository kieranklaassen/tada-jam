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

/** Half the queen's width and half a worker's, in cells: she is over four cells wide and a worker three. */
const QUEEN_HALF = 2.2
const WORKER_HALF = 1.5

/** Where the queen sits: at the left end of the floor of her room. Null while the kingdom has no chamber: she is wedged under the mouth. */
export function queenSeat(ground: Ground, rooms: readonly Room[], queenRoom: number | null): Standing | null {
  if (queenRoom === null) return null
  const floor = floorOf(ground, rooms[queenRoom])
  return { x: Math.min(floor.from + QUEEN_HALF, (floor.from + floor.to + 1) / 2), y: floor.y }
}

/** Where the wedged queen's feet are: the middle of the shaft, on the floor of its last cell. */
export const WEDGED: Standing = { x: (MOUTH[0] + MOUTH[MOUTH.length - 1] + 1) / 2, y: SHAFT_DEPTH }

/**
 * Where the workers stand, up to `most` of them: two to a chamber where its floor has room for two, one where it
 * has room for one, and in the queen's room only what is left beside her. Nobody stands in anybody.
 */
export function workerSpots(ground: Ground, rooms: readonly Room[], queenRoom: number | null, most: number): Standing[] {
  const spots: Standing[] = []
  rooms.forEach((room, n) => {
    const floor = floorOf(ground, room)
    // The stretch of floor that is free, from its left edge to its right edge in cell units.
    const left = n === queenRoom ? floor.from + 2 * QUEEN_HALF : floor.from, right = floor.to + 1
    const free = right - left
    const here = free >= 4 * WORKER_HALF ? [left + WORKER_HALF, right - WORKER_HALF] : free >= 2 * WORKER_HALF ? [(left + right) / 2] : []
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
