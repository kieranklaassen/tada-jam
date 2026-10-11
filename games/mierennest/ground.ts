import { below, makeRng } from './rng'

// The ground of the nest: a grid of cells, and how each material moves and comes to rest. Pure, with no renderer
// and no clock: the same ground and the same moves give the same ground, cell for cell. The rules are the ones the
// design sheet states under "How the ground comes to rest" (ART.md).

export const COLS = 40
export const ROWS = 21
/** The side of a cell in stage units. */
export const CELL = 28
/** The two columns of the turf that are always open. */
export const MOUTH: readonly number[] = [19, 20]
/** How deep the shaft of a new nest goes under the mouth, in cells. */
export const SHAFT_DEPTH = 3

export const OPEN = 0
export const EARTH = 1
export const SAND = 2
export const MUD = 3
export const STONE = 4
export const ROCK = 5
export type Kind = typeof OPEN | typeof EARTH | typeof SAND | typeof MUD | typeof STONE | typeof ROCK
/** The three materials the child builds with. They are never made and never destroyed. */
export type Lump = typeof SAND | typeof MUD | typeof STONE
export const LUMPS: readonly Lump[] = [SAND, MUD, STONE]

export type Ground = { cols: number; rows: number; cells: Uint8Array }

export function makeGround(cols: number, rows: number, fill: Kind = EARTH): Ground {
  return { cols, rows, cells: new Uint8Array(cols * rows).fill(fill) }
}

/** The kind of a cell. Past any edge is rock: the frame and the glass. */
export function at(ground: Ground, x: number, y: number): Kind {
  if (x < 0 || y < 0 || x >= ground.cols || y >= ground.rows) return ROCK
  return ground.cells[y * ground.cols + x] as Kind
}

export function put(ground: Ground, x: number, y: number, kind: Kind): void {
  if (x < 0 || y < 0 || x >= ground.cols || y >= ground.rows) return
  ground.cells[y * ground.cols + x] = kind
}

export function clone(ground: Ground): Ground {
  return { cols: ground.cols, rows: ground.rows, cells: ground.cells.slice() }
}

export function equal(a: Ground, b: Ground): boolean {
  if (a.cols !== b.cols || a.rows !== b.rows) return false
  for (let i = 0; i < a.cells.length; i++) if (a.cells[i] !== b.cells[i]) return false
  return true
}

export function count(ground: Ground, kind: Kind): number {
  let n = 0
  for (let i = 0; i < ground.cells.length; i++) if (ground.cells[i] === kind) n++
  return n
}

export const isLump = (kind: Kind): kind is Lump => kind === SAND || kind === MUD || kind === STONE

const MARKS = '.#smoX'

/** A ground from rows of marks, for tests and fixtures: `.` open, `#` earth, `s` sand, `m` mud, `o` stone, `X` rock. */
export function fromPicture(rows: readonly string[]): Ground {
  const ground = makeGround(rows[0].length, rows.length, OPEN)
  rows.forEach((row, y) => {
    for (let x = 0; x < ground.cols; x++) {
      const kind = MARKS.indexOf(row[x])
      if (kind < 0) throw new Error(`no such mark: ${row[x]}`)
      ground.cells[y * ground.cols + x] = kind
    }
  })
  return ground
}

export function toPicture(ground: Ground): string[] {
  const rows: string[] = []
  for (let y = 0; y < ground.rows; y++) {
    let row = ''
    for (let x = 0; x < ground.cols; x++) row += MARKS[ground.cells[y * ground.cols + x]]
    rows.push(row)
  }
  return rows
}

/** Stone, mud, earth and rock bear a stone from the side; sand and air do not. */
const bearsFromTheSide = (kind: Kind) => kind === STONE || kind === MUD || kind === EARTH || kind === ROCK

/**
 * Which cells are held, 1 or 0 a cell, worked out from the rock and the earth outward, so that two lumps in the
 * air never hold each other up.
 * - Rock and earth are held.
 * - Sand is held when the cell under it is held.
 * - A stone is held when the cell under it is held, or when the cells on both its sides are held and each is
 *   stone, mud, earth or rock (a lintel).
 * - Mud is held when any of the four cells it touches is held.
 */
export function held(ground: Ground): Uint8Array {
  const { cols, rows, cells } = ground
  const h = new Uint8Array(cells.length)
  for (let i = 0; i < cells.length; i++) if (cells[i] === EARTH || cells[i] === ROCK) h[i] = 1
  const isHeld = (x: number, y: number) => x < 0 || y < 0 || x >= cols || y >= rows || h[y * cols + x] === 1
  let changed = true
  while (changed) {
    changed = false
    for (let y = rows - 1; y >= 0; y--) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x
        const kind = cells[i] as Kind
        if (h[i] === 1 || !isLump(kind)) continue
        let now = isHeld(x, y + 1)
        if (!now && kind === STONE) {
          now = isHeld(x - 1, y) && isHeld(x + 1, y) && bearsFromTheSide(at(ground, x - 1, y)) && bearsFromTheSide(at(ground, x + 1, y))
        }
        if (!now && kind === MUD) now = isHeld(x - 1, y) || isHeld(x + 1, y) || isHeld(x, y - 1)
        if (now) {
          h[i] = 1
          changed = true
        }
      }
    }
  }
  return h
}

/**
 * One step of the ground coming to rest, in place. What is not held drops one cell, lowest first; then resting
 * sand slides one cell down and sideways where the cell beside it and the cell under that are both open. Stone
 * never slides and mud never slumps. Gives the cells that changed; none means the ground is at rest.
 */
export function step(ground: Ground): number[] {
  const { cols, rows, cells } = ground
  const h = held(ground)
  const changed: number[] = []
  const moved = new Uint8Array(cells.length)
  const move = (from: number, to: number) => {
    cells[to] = cells[from]
    cells[from] = OPEN
    moved[to] = 1
    changed.push(from, to)
  }
  for (let y = rows - 2; y >= 0; y--) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x
      if (isLump(cells[i] as Kind) && h[i] === 0 && cells[i + cols] === OPEN) move(i, i + cols)
    }
  }
  for (let y = rows - 2; y >= 0; y--) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x
      if (cells[i] !== SAND || moved[i] === 1 || cells[i + cols] === OPEN) continue
      // Where both sides are open the side is fixed by where the cell is, never by chance.
      const first = (x + y) % 2 === 0 ? -1 : 1
      for (const side of [first, -first]) {
        const nx = x + side
        if (nx < 0 || nx >= cols) continue
        if (cells[i + side] === OPEN && cells[i + side + cols] === OPEN) {
          move(i, i + side + cols)
          break
        }
      }
    }
  }
  return changed
}

/** Steps the ground until it rests. Gives the number of steps that moved something. */
export function settle(ground: Ground, mostSteps = 4000): number {
  let steps = 0
  while (steps < mostSteps && step(ground).length > 0) steps++
  return steps
}

export function atRest(ground: Ground): boolean {
  return step(clone(ground)).length === 0
}

/**
 * A new nest from a seed: turf with the open mouth, a short shaft, bedrock, and earth between them with its seams:
 * two long lenses of sand across the middle with earth between them under the shaft, pockets of mud (one always
 * near the shaft), and stones, more of them deeper down.
 */
export function generate(seed: number): Ground {
  const rng = makeRng(seed)
  const ground = makeGround(COLS, ROWS, EARTH)
  for (let x = 0; x < COLS; x++) {
    put(ground, x, 0, MOUTH.includes(x) ? OPEN : ROCK)
    put(ground, x, ROWS - 1, ROCK)
  }
  // The seams keep clear of the shaft and the earth round its foot, where the first room will be dug.
  const clear = (x: number, y: number) => y >= 1 && y <= ROWS - 2 && x >= 0 && x < COLS && !(x >= 16 && x <= 23 && y <= 6)
  const lay = (x: number, y: number, kind: Lump) => {
    if (clear(x, y) && at(ground, x, y) === EARTH) put(ground, x, y, kind)
  }
  for (const [from, to] of [[2, 15], [24, 37]] as const) {
    let top = 8 + below(rng, 2)
    for (let x = from; x <= to; x++) {
      if (x > from && below(rng, 3) === 0) top = Math.max(7, Math.min(10, top + below(rng, 3) - 1))
      const thick = x === from || x === to ? 1 : 2 + below(rng, 2)
      for (let y = top; y < top + thick; y++) lay(x, y, SAND)
    }
  }
  const pocket = (cx: number, cy: number, size: number, kind: Lump) => {
    let x = cx
    let y = cy
    for (let n = 0; n < size; n++) {
      lay(x, y, kind)
      if (below(rng, 2) === 0) x += below(rng, 2) === 0 ? -1 : 1
      else y += below(rng, 3) === 0 ? -1 : 1
    }
  }
  pocket(13 + below(rng, 2), 3 + below(rng, 2), 6, MUD)
  pocket(25 + below(rng, 2), 3 + below(rng, 2), 6, MUD)
  for (let n = 0; n < 7; n++) pocket(2 + below(rng, 36), 2 + below(rng, 17), 4 + below(rng, 4), MUD)
  for (let n = 0; n < 3; n++) pocket(3 + below(rng, 34), 13 + below(rng, 5), 4 + below(rng, 3), SAND)
  for (let n = 0; n < 60 && count(ground, STONE) < 30; n++) {
    // Two draws, the deeper one kept, put more stones lower down.
    const y = Math.max(3 + below(rng, 17), 3 + below(rng, 17))
    lay(below(rng, COLS), y, STONE)
  }
  for (const x of MOUTH) for (let y = 1; y <= SHAFT_DEPTH; y++) put(ground, x, y, OPEN)
  settle(ground)
  return ground
}
