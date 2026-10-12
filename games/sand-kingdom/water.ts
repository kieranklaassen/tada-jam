import { BUILT, CELL, COLS, type Field, GROOVE, ROWS, X0, Z0, base } from './field'

// What the sand holds, read from the height field: the grooves and the order
// the water takes them in, which of them close a ring, where the evening
// water reaches, the walls and the towers. Nothing here changes the sand and
// nothing is stored: the water is where the sand and the sun put it.

export type Point = { x: number; z: number }

/** The level the sea stands at in the evening, and how far it draws back before the long wave. */
export const EVENING_SEA = 0.3
export const FAR_SEA = -0.22
/** Seconds between one groove beginning to fill and the next, and the seconds the water takes to pass one cell. */
export const GROOVE_GAP = 0.55
export const CELL_SECONDS = 0.03

export type Groove = {
  cells: number[]
  /** Its place in the order the grooves were dug, 0 first. */
  rank: number
  /** A line along it from one end to the other. */
  path: Point[]
  /** The line round it where it closes a ring round a piece of beach, or null. */
  ring: Point[] | null
  /** The seconds after the water starts at which it enters this groove; Infinity where it cannot reach. */
  arrives: number
  /** It already held water by day, where it is dug below the day sea. */
  dayWet: boolean
}

export type Water = {
  /** For each cell, the seconds after the water starts at which it stands there; Infinity where it never does. */
  arrival: Float32Array
  /** The latest arrival there is. */
  last: number
  grooves: Groove[]
}

export function centre(cell: number): Point {
  return { x: X0 + ((cell % COLS) + 0.5) * CELL, z: Z0 + (Math.floor(cell / COLS) + 0.5) * CELL }
}

const SIDES = [1, -1, COLS, -COLS] as const
function neighbours(cell: number, visit: (next: number) => void): void {
  const col = cell % COLS
  for (const step of SIDES) {
    const next = cell + step
    if (next < 0 || next >= COLS * ROWS) continue
    if ((step === 1 && col === COLS - 1) || (step === -1 && col === 0)) continue
    visit(next)
  }
}

/** Steps outward from `from` through the cells `inside` allows; returns each cell's distance and the cell before it. */
function spread(from: readonly number[], inside: (cell: number) => boolean): { distance: Int32Array; before: Int32Array; order: number[] } {
  const distance = new Int32Array(COLS * ROWS).fill(-1), before = new Int32Array(COLS * ROWS).fill(-1)
  const order: number[] = []
  for (const cell of from) {
    if (distance[cell] >= 0) continue
    distance[cell] = 0
    order.push(cell)
  }
  for (let i = 0; i < order.length; i++) {
    const cell = order[i]
    neighbours(cell, (next) => {
      if (distance[next] >= 0 || !inside(next)) return
      distance[next] = distance[cell] + 1
      before[next] = cell
      order.push(next)
    })
  }
  return { distance, before, order }
}

/** The grooves of the beach, in the order they were dug. `dug` holds the cells where grooves began, oldest first. */
export function grooves(field: Field, dug: readonly number[], daySea = 0): Groove[] {
  const d = field.d
  const isGroove = (cell: number) => d[cell] < GROOVE
  const label = new Int32Array(COLS * ROWS).fill(-1)
  const found: Groove[] = []
  for (let cell = 0; cell < d.length; cell++) {
    if (label[cell] >= 0 || !isGroove(cell)) continue
    const { order } = spread([cell], (next) => isGroove(next) && label[next] < 0)
    for (const member of order) label[member] = found.length
    found.push({ cells: order, rank: Infinity, path: [], ring: null, arrives: Infinity, dayWet: false })
  }
  // The order: a groove is as old as the oldest start that lies in it or right beside it.
  dug.forEach((start, index) => {
    let at = label[start]
    if (at < 0) neighbours(start, (next) => { if (at < 0 && label[next] >= 0) at = label[next] })
    if (at >= 0 && found[at].rank === Infinity) found[at].rank = index
  })
  // The cells no groove encloses: everything reached from the edge of the grid without crossing one.
  const rim: number[] = []
  for (let col = 0; col < COLS; col++) rim.push(col, (ROWS - 1) * COLS + col)
  for (let row = 0; row < ROWS; row++) rim.push(row * COLS, row * COLS + COLS - 1)
  const outside = spread(rim.filter((cell) => !isGroove(cell)), (cell) => !isGroove(cell)).distance
  for (const groove of found) {
    groove.dayWet = groove.cells.some((cell) => base(centre(cell).z) + d[cell] < daySea)
    groove.path = line(groove.cells, isGroove)
    groove.ring = ringOf(groove, field, outside)
  }
  // A groove whose start is no longer remembered counts as dug first of all.
  for (const groove of found) if (groove.rank === Infinity) groove.rank = -1
  found.sort((a, b) => a.rank - b.rank || a.cells[0] - b.cells[0])
  found.forEach((groove, index) => { groove.rank = index })
  return found
}

/** A line along a groove: from the cell furthest from anywhere to the cell furthest from that. */
function line(cells: readonly number[], inside: (cell: number) => boolean): Point[] {
  const first = spread([cells[0]], inside).order
  const walk = spread([first[first.length - 1]], inside)
  const points: Point[] = []
  for (let cell = walk.order[walk.order.length - 1], i = 0; cell >= 0; cell = walk.before[cell], i++) if (i % 2 === 0 || walk.before[cell] < 0) points.push(centre(cell))
  return points
}

/** The widest a ring's own groove is taken to be, measured out from the island. */
const RING_WIDTH = 1.0

/** Where a groove closes a ring: the line round the piece of beach it cuts off, far enough out to walk round what stands there. */
function ringOf(groove: Groove, field: Field, outside: Int32Array): Point[] | null {
  const d = field.d
  // The island: beach cells beside this groove that the edge of the grid cannot reach.
  const seeds = new Set<number>()
  for (const cell of groove.cells) neighbours(cell, (next) => { if (d[next] >= GROOVE && outside[next] < 0) seeds.add(next) })
  if (seeds.size === 0) return null
  const island = spread([...seeds], (cell) => d[cell] >= GROOVE && outside[cell] < 0).order
  if (island.length < 6) return null
  let x = 0, z = 0
  for (const cell of island) {
    const at = centre(cell)
    x += at.x
    z += at.z
  }
  x /= island.length
  z /= island.length
  const points: Point[] = []
  for (let i = 0; i < 20; i++) {
    const turn = (i / 20) * Math.PI * 2
    let enter = -1, leave = -1, built = 0
    for (let r = 0; r < 9; r += 0.1) {
      const col = Math.floor((x + Math.cos(turn) * r - X0) / CELL), row = Math.floor((z + Math.sin(turn) * r - Z0) / CELL)
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) break
      const here = d[row * COLS + col]
      if (here > BUILT && enter < 0) built = r
      if (here < GROOVE) {
        if (enter < 0) enter = r
        // A channel that leaves the ring this way is not the ring: only the ring's own width counts.
        if (r - enter > RING_WIDTH) break
        leave = r
      } else if (enter >= 0) break
    }
    if (enter < 0) return null
    const r = Math.max((enter + leave) / 2, built + 0.9)
    points.push({ x: x + Math.cos(turn) * r, z: z + Math.sin(turn) * r })
  }
  return points
}

/**
 * Where the water stands when the sea is at `level`, and when it gets there.
 * The sea covers what lies below its level; from there the water runs along
 * every groove it meets, groove by groove in the order they were dug. A
 * groove the sea does not meet stays dry.
 */
export function flood(field: Field, level: number, dug: readonly number[], daySea = 0): Water {
  const d = field.d
  const sea: number[] = []
  // Whatever lies below the sea's level holds water, joined to the open sea or not: the water seeps through
  // the sand, and that is also how the level sea is drawn.
  for (let cell = 0; cell < d.length; cell++) if (base(centre(cell).z) + d[cell] < level) sea.push(cell)
  const reach = spread(sea, (cell) => d[cell] < GROOVE).distance
  const found = grooves(field, dug, daySea)
  const arrival = new Float32Array(COLS * ROWS).fill(Infinity)
  for (const cell of sea) arrival[cell] = 0
  let turn = 0, last = 0
  for (const groove of found) {
    let nearest = Infinity
    for (const cell of groove.cells) if (reach[cell] >= 0 && reach[cell] < nearest) nearest = reach[cell]
    if (nearest === Infinity) continue
    groove.arrives = turn * GROOVE_GAP
    turn += 1
    for (const cell of groove.cells) {
      arrival[cell] = Math.min(arrival[cell], groove.arrives + (reach[cell] - nearest) * CELL_SECONDS)
      if (arrival[cell] > last) last = arrival[cell]
    }
  }
  return { arrival, last, grooves: found }
}

export function cellOf(x: number, z: number): number {
  const col = Math.min(COLS - 1, Math.max(0, Math.floor((x - X0) / CELL))), row = Math.min(ROWS - 1, Math.max(0, Math.floor((z - Z0) / CELL)))
  return row * COLS + col
}

/** The way the water carries something that floats at `from`: on along the groove, later cell by later cell, to where the groove ends. */
export function drift(water: Water, field: Field, from: Point): Point[] {
  const path: Point[] = []
  let cell = cellOf(from.x, from.z)
  if (water.arrival[cell] === Infinity) return path
  const seen = new Set<number>([cell])
  for (let i = 0; i < 400; i++) {
    let best = -1
    neighbours(cell, (next) => {
      if (seen.has(next) || water.arrival[next] === Infinity || field.d[next] >= GROOVE) return
      if (water.arrival[next] >= water.arrival[cell] && (best < 0 || water.arrival[next] > water.arrival[best])) best = next
    })
    if (best < 0) break
    seen.add(best)
    cell = best
    if (i % 2 === 1) path.push(centre(cell))
  }
  if (path.length > 0) path[path.length - 1] = centre(cell)
  return path
}

/** How much of the sand round a point is groove, 0 to 1: a pool is nearly all, a groove crossing it about half. */
export function dugShare(field: Field, x: number, z: number, reach = 0.7): number {
  let dugCells = 0, all = 0
  for (let dz = -reach; dz <= reach; dz += CELL) for (let dx = -reach; dx <= reach; dx += CELL) {
    if (Math.hypot(dx, dz) > reach) continue
    all += 1
    if (field.d[cellOf(x + dx, z + dz)] < GROOVE) dugCells += 1
  }
  return dugCells / all
}

/** Which way the groove under a point runs, as an angle about the upright, or null where no groove is. */
export function grooveTurn(field: Field, x: number, z: number): number | null {
  let n = 0, mx = 0, mz = 0
  const cells: Point[] = []
  for (let dz = -1; dz <= 1; dz += CELL) for (let dx = -1; dx <= 1; dx += CELL) {
    if (field.d[cellOf(x + dx, z + dz)] >= GROOVE) continue
    cells.push({ x: dx, z: dz })
    mx += dx
    mz += dz
    n += 1
  }
  if (n < 3) return null
  return axis(cells, mx / n, mz / n)
}

/** The direction a cloud of points is longest in. */
function axis(points: readonly Point[], mx: number, mz: number): number {
  let xx = 0, zz = 0, xz = 0
  for (const point of points) {
    xx += (point.x - mx) ** 2
    zz += (point.z - mz) ** 2
    xz += (point.x - mx) * (point.z - mz)
  }
  return 0.5 * Math.atan2(2 * xz, xx - zz)
}

export type Wall = {
  /** Three places in a row along its top. */
  perches: Point[]
  /** Its top is flat enough to stand on at every perch. */
  flat: boolean
}

/** Sand standing this high is part of a wall. */
export const WALL = 0.1
/**
 * How far apart the gulls stand, and how long a wall must be for three: shoulder to shoulder with room for an
 * elbow between, as on their log.
 */
export const PERCH_GAP = 1.0
/** The places of a row from left to right. */
function inOrder(cells: readonly number[]): Point[] {
  return cells.map(centre).sort((a, b) => a.x - b.x || a.z - b.z)
}
/** The ways a row may run: across the frame, or a little up or down it. Three birds one behind another do not stand in a row. */
const ROW_TURNS = [0, Math.PI / 8, -Math.PI / 8] as const

/**
 * Three places in a row on raised sand, or null where no raised sand is long
 * enough. A row whose three places are all flat is taken before any other,
 * and then the row with the most level sand under it. `clear` says of a row
 * whether the gulls can stand there: the best row that is clear is taken,
 * so a thing lying on the best of them sends the gulls to the next best,
 * and there is no wall for them only when no row of any wall is clear.
 */
export function wall(field: Field, clear: (perches: Point[]) => boolean = () => true): Wall | null {
  const d = field.d
  // For every cell of raised sand, how much sand round it stands level with it.
  const level = new Uint8Array(COLS * ROWS)
  const cells: number[] = []
  for (let cell = 0; cell < d.length; cell++) {
    if (d[cell] <= WALL) continue
    cells.push(cell)
    const col = cell % COLS, row = Math.floor(cell / COLS)
    let count = 0
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const c = col + dc, r = row + dr
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS) continue
      const other = d[r * COLS + c]
      if (other > WALL && Math.abs(other - d[cell]) < 0.025) count += 1
    }
    level[cell] = count
  }
  /** The most level raised cell close to a point that keeps shoulder room from the place before it, or -1. */
  const perchAt = (x: number, z: number, before: Point): number => {
    let best = -1
    const col = Math.floor((x - X0) / CELL), row = Math.floor((z - Z0) / CELL)
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const c = col + dc, r = row + dr
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS) continue
      const cell = r * COLS + c
      if (d[cell] <= WALL) continue
      const at = centre(cell)
      if (Math.hypot(at.x - before.x, at.z - before.z) < PERCH_GAP - 0.06) continue
      if (best < 0 || level[cell] > level[best]) best = cell
    }
    return best
  }
  let best: { score: number; cells: number[] } | null = null
  for (const cell of cells) {
    const from = centre(cell)
    for (const turn of ROW_TURNS) {
      const second = perchAt(from.x + Math.cos(turn) * PERCH_GAP, from.z + Math.sin(turn) * PERCH_GAP, from)
      const third = second < 0 ? -1 : perchAt(from.x + Math.cos(turn) * PERCH_GAP * 2, from.z + Math.sin(turn) * PERCH_GAP * 2, centre(second))
      if (third < 0) continue
      // Room for three: a single tower is too short, however the places are squeezed onto it, and no two stand
      // nearer than shoulder to shoulder.
      const mid = centre(second), end = centre(third)
      if (Math.hypot(end.x - from.x, end.z - from.z) < PERCH_GAP * 2 - 0.2) continue
      if (Math.hypot(mid.x - from.x, mid.z - from.z) < PERCH_GAP - 0.06 || Math.hypot(end.x - mid.x, end.z - mid.z) < PERCH_GAP - 0.06) continue
      const row = [cell, second, third]
      const flat = row.filter((one) => level[one] >= FLAT).length
      const score = flat * 100 + level[cell] + level[second] + level[third]
      // Only a better row than the best so far is asked about: rows are tried from the best down.
      if ((!best || score > best.score) && clear(inOrder(row))) best = { score, cells: row }
    }
  }
  if (!best) return null
  return { perches: inOrder(best.cells), flat: best.cells.every((one) => level[one] >= FLAT) }
}
/** A place is flat when this many of the nine cells there, itself among them, stand level: a patch two cells wide. */
const FLAT = 5

/** The tallest thing built of sand: where its top is and how high it stands from the smooth beach. Null with nothing built. */
export function tallest(field: Field): (Point & { height: number }) | null {
  let top = -1
  for (let cell = 0; cell < field.d.length; cell++) if (field.d[cell] >= BUILT && (top < 0 || field.d[cell] > field.d[top] + 1e-4)) top = cell
  if (top < 0) return null
  // The middle of the flat top it belongs to, not its first cell.
  const peak = field.d[top]
  const flat = spread([top], (cell) => field.d[cell] > peak - 0.03).order
  let x = 0, z = 0
  for (const cell of flat) {
    const at = centre(cell)
    x += at.x
    z += at.z
  }
  return { x: x / flat.length, z: z / flat.length, height: peak }
}
