import { chambers } from './chambers'
import { EARTH, MOUTH, MUD, OPEN, ROCK, STONE, at, type Ground } from './ground'

// Where each kind of invader can be, and how it gets from one place to the next: its habits (habits.ts) turned
// into steps on the grid. Pure: a ground in, places and ways out, the same every time.
//
// A place is the cell an invader's feet are in. A raider ant is one cell high; a beetle is two, so the cell over
// its feet is clear as well; a fly needs a clear block two cells wide and three high, and its place is the lower
// left cell of that block.

export type Walker = 'ant' | 'beetle' | 'fly'

const open = (ground: Ground, x: number, y: number) => at(ground, x, y) === OPEN
/** Earth, stone and rock give a raider ant a face to climb; sand slides away under it and mud holds it fast. */
const climbable = (ground: Ground, x: number, y: number) => {
  const kind = at(ground, x, y)
  return kind === EARTH || kind === STONE || kind === ROCK
}

/** Whether this kind can be in this place. */
export function canBe(ground: Ground, kind: Walker, x: number, y: number): boolean {
  if (!open(ground, x, y)) return false
  if (kind === 'ant') {
    // A floor of any kind under it, or a face beside it that it can climb or that holds it fast.
    if (!open(ground, x, y + 1)) return true
    return climbable(ground, x - 1, y) || climbable(ground, x + 1, y) || at(ground, x - 1, y) === MUD || at(ground, x + 1, y) === MUD
  }
  if (kind === 'beetle') return y >= 1 && open(ground, x, y - 1) && !open(ground, x, y + 1)
  return y >= 2 && open(ground, x + 1, y) && open(ground, x, y - 1) && open(ground, x + 1, y - 1) && open(ground, x, y - 2) && open(ground, x + 1, y - 2)
}

/**
 * Whether a raider ant in this place is stuck fast: the mud is under its feet, or the mud is the only face it
 * has to cling to. `covered` holds the places where an ant is stuck already: the next walks over its back.
 */
export function sticks(ground: Ground, x: number, y: number, covered?: ReadonlySet<number>): boolean {
  if (covered?.has(y * ground.cols + x)) return false
  if (at(ground, x, y + 1) === MUD) return true
  if (!open(ground, x, y + 1)) return false
  if (climbable(ground, x - 1, y) || climbable(ground, x + 1, y)) return false
  return at(ground, x - 1, y) === MUD || at(ground, x + 1, y) === MUD
}

/**
 * The places this kind can go to next from a place, written into `out` as cell indices; gives how many.
 * An ant and a fly go to the four cells beside them where they can be. A beetle goes along the row: it walks
 * where the way is two cells high, drops to the first floor where the floor ends, however far, and gets up a
 * step of one cell and no more.
 */
export function nextPlaces(ground: Ground, kind: Walker, cell: number, out: number[]): number {
  const { cols, rows } = ground
  const x = cell % cols, y = Math.floor(cell / cols)
  let n = 0
  if (kind !== 'beetle') {
    if (x > 0 && canBe(ground, kind, x - 1, y)) out[n++] = cell - 1
    if (x < cols - 1 && canBe(ground, kind, x + 1, y)) out[n++] = cell + 1
    if (y > 0 && canBe(ground, kind, x, y - 1)) out[n++] = cell - cols
    if (y < rows - 1 && canBe(ground, kind, x, y + 1)) out[n++] = cell + cols
    if (kind === 'ant') {
      // An ant also goes round an outer corner: off the edge of a floor and down the face under it, and up a face
      // and onto the top of it. The corner is one lump or one cell of ground, and the cell it swings through is open.
      for (const side of [-1, 1]) {
        const nx = x + side
        if (nx < 0 || nx >= cols) continue
        if (y < rows - 1 && !open(ground, x, y + 1) && open(ground, nx, y) && canBe(ground, 'ant', nx, y + 1)) out[n++] = cell + cols + side
        if (y > 0 && !open(ground, nx, y) && open(ground, x, y - 1) && canBe(ground, 'ant', nx, y - 1)) out[n++] = cell - cols + side
      }
    }
    return n
  }
  for (const side of [-1, 1]) {
    const nx = x + side
    if (nx < 0 || nx >= cols) continue
    if (open(ground, nx, y) && open(ground, nx, y - 1)) {
      let ly = y
      while (ly + 1 < rows && open(ground, nx, ly + 1)) ly++
      out[n++] = ly * cols + nx
    } else if (!open(ground, nx, y) && y >= 2 && open(ground, nx, y - 1) && open(ground, nx, y - 2) && open(ground, x, y - 2)) {
      out[n++] = (y - 1) * cols + nx
    }
  }
  return n
}

/** Where this kind comes into the nest from the camp, which lies to the left of the mouth: null where it cannot come in at all. */
export function entry(ground: Ground, kind: Walker, mouth: readonly number[] = MOUTH): number | null {
  const { cols, rows } = ground
  const x = mouth[0]
  if (kind === 'ant') return canBe(ground, 'ant', x, 0) ? x : null
  if (kind === 'fly') return canBe(ground, 'fly', x, 2) ? 2 * cols + x : null
  // A beetle steps off the grass into the mouth and drops to the first floor.
  if (!open(ground, x, 0) || !open(ground, x, 1)) return null
  let y = 1
  while (y + 1 < rows && open(ground, x, y + 1)) y++
  return y * cols + x
}

/** The cells that count as inside for a kind standing in a place: the place itself, the cell over a beetle, a fly's whole block. */
export function bodyCells(ground: Ground, kind: Walker, cell: number, out: number[]): number {
  const cols = ground.cols
  out[0] = cell
  if (kind === 'ant') return 1
  out[1] = cell - cols
  if (kind === 'beetle') return 2
  out[2] = cell + 1
  out[3] = cell - cols + 1
  out[4] = cell - 2 * cols
  out[5] = cell - 2 * cols + 1
  return 6
}

/** Every cell of every chamber of the kingdom, 1 or 0 a cell. */
export function chamberCells(ground: Ground, mouth: readonly number[] = MOUTH): Uint8Array {
  const inside = new Uint8Array(ground.cells.length)
  for (const room of chambers(ground, mouth)) for (const cell of room.cells) inside[cell] = 1
  return inside
}

/** Whether a kind standing in a place is inside a chamber. */
export function isInside(ground: Ground, kind: Walker, cell: number, inside: Uint8Array): boolean {
  const body: number[] = []
  const n = bodyCells(ground, kind, cell, body)
  for (let i = 0; i < n; i++) if (body[i] >= 0 && inside[body[i]] === 1) return true
  return false
}

export type Reach = {
  /** For every place reached, the place it was reached from; the start points at itself; -1 is not reached. */
  from: Int32Array
  /** The places in the order they were reached, nearest first. */
  order: number[]
}

/** Every place a kind can get to from a start, by its own steps. Ties are broken the same way every time. */
export function reach(ground: Ground, kind: Walker, start: number): Reach {
  const from = new Int32Array(ground.cells.length).fill(-1)
  const order = [start]
  from[start] = start
  const next: number[] = []
  for (let head = 0; head < order.length; head++) {
    const n = nextPlaces(ground, kind, order[head], next)
    for (let i = 0; i < n; i++) {
      if (from[next[i]] < 0) {
        from[next[i]] = order[head]
        order.push(next[i])
      }
    }
  }
  return { from, order }
}

/** The way from the start of a reach to a place in it, start first. */
export function wayTo(found: Reach, goal: number): number[] {
  const way = [goal]
  while (found.from[way[way.length - 1]] !== way[way.length - 1]) way.push(found.from[way[way.length - 1]])
  return way.reverse()
}

/** The shortest way for a kind from a start to the nearest place that is inside a chamber, start first; null when there is none. */
export function wayIn(ground: Ground, kind: Walker, start: number, inside: Uint8Array): number[] | null {
  const found = reach(ground, kind, start)
  for (const cell of found.order) if (isInside(ground, kind, cell, inside)) return wayTo(found, cell)
  return null
}

/** How far every cell is from the nearest chamber cell, straight through whatever is in the way: where an invader that finds no way in would like to be. */
export function farFromChambers(ground: Ground, inside: Uint8Array): Int32Array {
  const { cols, rows } = ground
  const far = new Int32Array(inside.length).fill(-1)
  const queue: number[] = []
  for (let i = 0; i < inside.length; i++) if (inside[i] === 1) { far[i] = 0; queue.push(i) }
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head], x = i % cols, y = Math.floor(i / cols)
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
      const n = ny * cols + nx
      if (far[n] < 0) { far[n] = far[i] + 1; queue.push(n) }
    }
  }
  return far
}

/** Of the places reached, the one nearest a chamber; of two as near, the one reached first. */
export function nearestTo(found: Reach, far: Int32Array): number {
  let best = found.order[0]
  for (const cell of found.order) if (far[cell] >= 0 && (far[best] < 0 || far[cell] < far[best])) best = cell
  return best
}

/** A wall a beetle can lean on: the place it stands in to lean, the lump it leans on, and which way. */
export type Lean = { stand: number; x: number; y: number; dx: number }

/**
 * The wall a beetle that finds no way in leans on: of all the lumps that stand in its way beside a place it can
 * reach, at its feet or at its shoulder, the one nearest a chamber. Null where no lump stands in its way.
 */
export function wallToLeanOn(ground: Ground, found: Reach, far: Int32Array): Lean | null {
  const cols = ground.cols
  let best: Lean | null = null, bestFar = Infinity
  for (const stand of found.order) {
    const x = stand % cols, y = Math.floor(stand / cols)
    for (const dx of [-1, 1]) {
      // The lump at its feet stops it unless it is a single step it can get up; the lump at its shoulder always does.
      for (const ly of [y, y - 1]) {
        const kind = at(ground, x + dx, ly)
        if (kind === OPEN || kind === EARTH || kind === ROCK) continue
        const lump = ly * cols + x + dx
        if (far[lump] < 0 || far[lump] >= bestFar) continue
        bestFar = far[lump]
        best = { stand, x: x + dx, y: ly, dx }
      }
    }
  }
  // Leaning is for a wall that lies nearer a chamber than the beetle can get by walking.
  return best && bestFar < far[nearestTo(found, far)] ? best : null
}
