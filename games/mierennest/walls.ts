import { EARTH, MUD, OPEN, ROCK, SAND, STONE, at, isLump, put, type Ground } from './ground'

// What a wall holds when an invader leans on it, as the design sheet states under "What a wall holds" (ART.md).
// Pure: `lean` changes the ground it is given by at most one shove, and the caller lets the ground come to rest.

/** The hold of one cell of a run. */
export const HOLD = { sand: 1, packedSand: 2, stone: 2, mud: 3, beddedStone: 5 } as const

const touchesMud = (ground: Ground, x: number, y: number) =>
  at(ground, x - 1, y) === MUD || at(ground, x + 1, y) === MUD || at(ground, x, y - 1) === MUD || at(ground, x, y + 1) === MUD

/** The hold of the lump in a cell: sand that touches mud is packed, and a stone that touches mud is bedded. */
export function holdOfCell(ground: Ground, x: number, y: number): number {
  const kind = at(ground, x, y)
  if (kind === MUD) return HOLD.mud
  if (kind === SAND) return touchesMud(ground, x, y) ? HOLD.packedSand : HOLD.sand
  if (kind === STONE) return touchesMud(ground, x, y) ? HOLD.beddedStone : HOLD.stone
  return 0
}

export type Run = {
  /** The lumps in front of the pusher along its way, nearest first. */
  cells: { x: number; y: number }[]
  /** The sum of their holds. */
  hold: number
  /** There is an open cell beyond the run for it to be shoved into; without one it has earth or rock behind it. */
  room: boolean
}

/** The run of lumps from a cell along a way (`dx` is 1 or -1 along the row), up to the first open cell, earth or rock. */
export function runFrom(ground: Ground, x: number, y: number, dx: number): Run {
  const run: Run = { cells: [], hold: 0, room: false }
  let cx = x
  while (isLump(at(ground, cx, y))) {
    run.cells.push({ x: cx, y })
    run.hold += holdOfCell(ground, cx, y)
    cx += dx
  }
  run.room = at(ground, cx, y) === OPEN
  return run
}

/** What a lean did. */
export type Leaned =
  /** Nothing stood in the way. */
  | { did: 'nothing' }
  /** The run was shoved one cell on. */
  | { did: 'shoved'; cells: number[] }
  /** Loose sand that could not be shoved was ploughed through: it changed places with the pusher's cell. */
  | { did: 'ploughed'; cells: number[] }
  /** The wall held. */
  | { did: 'held'; hold: number }

/**
 * A push on the cell at (x, y) along the row, from a pusher standing in the cell behind it.
 * - A push greater than the run's hold, with room beyond, shoves the whole run one cell on.
 * - A push that is not greater is held.
 * - A run with earth or rock behind it cannot be shoved; loose sand at its front is ploughed through all the same.
 */
export function lean(ground: Ground, x: number, y: number, dx: number, push: number): Leaned {
  const front = at(ground, x, y)
  if (front === OPEN) return { did: 'nothing' }
  if (front === EARTH || front === ROCK) return { did: 'held', hold: Infinity }
  const run = runFrom(ground, x, y, dx)
  if (run.room && push > run.hold) {
    const changed: number[] = []
    for (let n = run.cells.length - 1; n >= 0; n--) {
      const cell = run.cells[n]
      put(ground, cell.x + dx, cell.y, at(ground, cell.x, cell.y))
      changed.push(cell.y * ground.cols + cell.x + dx)
    }
    put(ground, x, y, OPEN)
    changed.push(y * ground.cols + x)
    return { did: 'shoved', cells: changed }
  }
  if (!run.room && front === SAND && holdOfCell(ground, x, y) === HOLD.sand && push > 0 && at(ground, x - dx, y) === OPEN) {
    put(ground, x - dx, y, SAND)
    put(ground, x, y, OPEN)
    return { did: 'ploughed', cells: [y * ground.cols + x, y * ground.cols + x - dx] }
  }
  return { did: 'held', hold: run.room ? run.hold : Infinity }
}
