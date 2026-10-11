// The blocks and how they rest. Pure: no renderer, no clock, no chance.
//
// The rug has a hidden grid of places, seven across and three deep. A block
// covers one, two or three places in a row and lands on whatever is highest
// under it. Nothing topples: a block stays where it lands, whatever hangs in
// the air. Heights are whole half levels, so stacks meet face to face.
//
// The blocks on the rug are a list in the order they were set down, and each
// block's level is worked out from that list alone (`settle`). A saved list
// therefore cannot hold a block in the air or inside another.

export const COLS = 7
export const ROWS = 3

export const KINDS = ['long', 'arch', 'round', 'thin', 'cube', 'slope'] as const
export type Kind = (typeof KINDS)[number]

/** How many of each kind the basket holds. */
export const PER_KIND = 3

export type Shape = {
  /** Places it covers, in a row. */
  wide: number
  /** Height in half levels. */
  high: number
  /** Whether another block can rest on it. The tip of a thin one and the face of a slope hold nothing. */
  seat: boolean
}

export const SHAPE: Record<Kind, Shape> = {
  long: { wide: 3, high: 1, seat: true },
  arch: { wide: 2, high: 3, seat: true },
  round: { wide: 1, high: 3, seat: true },
  thin: { wide: 1, high: 4, seat: false },
  cube: { wide: 1, high: 2, seat: true },
  slope: { wide: 2, high: 2, seat: false },
}

/** Nothing rests with its top higher than this, in half levels: a pile that tall holds no more, and a block set on it glances off as from a tip. It keeps every block in the frame and in reach. */
export const MAX_TOP = 9

/** A block on the rug: its kind, the leftmost place it covers, and its row. */
export type Placed = { kind: Kind; col: number; row: number }
/** The same with the level it rests at, in half levels above the rug, and its tier: how many blocks stand under it, one on another. */
export type Standing = Placed & { level: number; tier: number }

export function isKind(value: unknown): value is Kind {
  return typeof value === 'string' && (KINDS as readonly string[]).includes(value)
}

/** The leftmost place a block of this kind can cover so that all of it is on the rug. */
export function clampCol(kind: Kind, col: number): number {
  return Math.max(0, Math.min(COLS - SHAPE[kind].wide, Math.round(col)))
}

export function clampRow(row: number): number {
  return Math.max(0, Math.min(ROWS - 1, Math.round(row)))
}

/** A slope runs down toward the nearer side of the rug. Its heel is at the other end. */
export function slopeFaces(col: number): 'left' | 'right' {
  return col + 1 <= (COLS - 1) / 2 ? 'left' : 'right'
}

/** What tops one place: how high, and the block that is highest there (its index in the list), or -1 for bare rug. */
type Top = { level: number; by: number }

function tops(standing: readonly Standing[]): Top[] {
  const grid: Top[] = Array.from({ length: COLS * ROWS }, () => ({ level: 0, by: -1 }))
  standing.forEach((block, index) => {
    const top = block.level + SHAPE[block.kind].high
    for (let i = 0; i < SHAPE[block.kind].wide; i++) {
      const cell = grid[block.row * COLS + block.col + i]
      if (top >= cell.level) {
        cell.level = top
        cell.by = index
      }
    }
  })
  return grid
}

/** The place a slope's heel is over, and the one its toe is over: it runs down toward the nearer side of the rug. */
export function slopeEnds(col: number): { heel: number; toe: number } {
  return slopeFaces(col) === 'left' ? { heel: col + 1, toe: col } : { heel: col, toe: col + 1 }
}

function restOn(standing: readonly Standing[], kind: Kind, col: number, row: number): { level: number; held: boolean; tier: number; hangs: boolean } {
  const grid = tops(standing)
  let level = 0
  for (let i = 0; i < SHAPE[kind].wide; i++) level = Math.max(level, grid[row * COLS + col + i].level)
  if (level === 0) return { level, held: true, tier: 0, hangs: false }
  // A slope sits with its heel on the highest place under it. Where only its toe would be held up, its heel
  // would hang in the air: it cannot stay there.
  const ends = kind === 'slope' ? slopeEnds(col) : null
  const hangs = ends !== null && grid[row * COLS + ends.toe].level > grid[row * COLS + ends.heel].level
  // It is held when at least one of the things it rests on is a seat, and it stands one tier above the highest of them.
  let held = false
  let tier = 0
  for (let i = 0; i < SHAPE[kind].wide; i++) {
    const cell = grid[row * COLS + col + i]
    if (cell.level !== level || cell.by < 0) continue
    tier = Math.max(tier, standing[cell.by].tier + 1)
    if (SHAPE[standing[cell.by].kind].seat) held = true
  }
  if (level + SHAPE[kind].high > MAX_TOP || hangs) held = false
  return { level, held, tier, hangs }
}

/** The first slope of the list whose heel hangs in the air, held up by its toe alone: its index, or -1. */
export function hangingSlope(placed: readonly Placed[]): number {
  const standing: Standing[] = []
  for (let i = 0; i < placed.length; i++) {
    const block = placed[i]
    const rest = restOn(standing, block.kind, block.col, block.row)
    if (rest.hangs) return i
    standing.push({ kind: block.kind, col: block.col, row: block.row, level: rest.level, tier: rest.tier })
  }
  return -1
}

/**
 * The list with every slope seated: one whose heel hangs (in a rug saved by
 * an older version, or one a hand wrote) is taken out and set down again
 * where it can stay, last in the list.
 */
export function seated(placed: readonly Placed[]): Placed[] {
  let list = placed.map((block) => ({ ...block }))
  for (let tries = 0; tries < placed.length; tries++) {
    const index = hangingSlope(list)
    if (index < 0) break
    const slope = list[index]
    const rest = list.filter((_, i) => i !== index)
    const at = landing(rest, 'slope', slope.col, slope.row)
    list = [...rest, { kind: 'slope', col: at.col, row: at.row }]
  }
  return list
}

/** Every block at the level it rests at, worked out from the list in its order. */
export function settle(placed: readonly Placed[]): Standing[] {
  const standing: Standing[] = []
  for (const block of placed) {
    const rest = restOn(standing, block.kind, block.col, block.row)
    standing.push({ kind: block.kind, col: block.col, row: block.row, level: rest.level, tier: rest.tier })
  }
  return standing
}

/** The height of each place, in half levels, row by row. */
export function heights(placed: readonly Placed[]): number[] {
  return tops(settle(placed)).map((top) => top.level)
}

export type Landing = {
  col: number
  row: number
  level: number
  /** How many blocks stand under it, one on another: the step of the scale its knock plays. */
  tier: number
  /** Why it did not stay where it was set: it slid down a slope, or glanced off the tip of a thin one. Null when it stayed. */
  shed: 'slope' | 'tip' | null
  /** Where it was set, when it did not stay there. */
  over: { col: number; row: number; level: number } | null
}

/**
 * Where a block set over a place comes to rest. It lands on whatever is
 * highest under it. If only a slope or the tip of a thin one would hold it,
 * it cannot stay: it comes to rest on the nearest place that holds it, the
 * foot of the slope first.
 */
export function landing(placed: readonly Placed[], kind: Kind, col: number, row: number): Landing {
  const standing = settle(placed)
  const c = clampCol(kind, col), r = clampRow(row)
  const first = restOn(standing, kind, c, r)
  if (first.held) return { col: c, row: r, level: first.level, tier: first.tier, shed: null, over: null }
  // What refused it: the highest thing under it.
  const grid = tops(standing)
  let refuser: Standing | null = null
  for (let i = 0; i < SHAPE[kind].wide; i++) {
    const cell = grid[r * COLS + c + i]
    if (cell.level === first.level && cell.by >= 0) refuser = standing[cell.by]
  }
  const shed = refuser && refuser.kind === 'slope' && first.level + SHAPE[kind].high <= MAX_TOP ? 'slope' : 'tip'
  // Downhill first for a slope; otherwise toward the middle of the rug.
  const downhill = refuser && refuser.kind === 'slope' ? (slopeFaces(refuser.col) === 'left' ? -1 : 1) : c + SHAPE[kind].wide / 2 <= COLS / 2 ? 1 : -1
  const steps: number[] = []
  // Off a slope it goes all the way down before it would ever go up; off a tip it takes the nearer side.
  if (shed === 'slope') for (const side of [downhill, -downhill]) for (let d = 1; d < COLS; d++) steps.push(side * d)
  else for (let d = 1; d < COLS; d++) steps.push(downhill * d, -downhill * d)
  const rows = [r, ...[1, 2].flatMap((d) => [r + d, r - d]).filter((other) => other >= 0 && other < ROWS)]
  for (const tryRow of rows) {
    for (const step of tryRow === r ? steps : [0, ...steps]) {
      const tryCol = c + step
      if (tryCol < 0 || tryCol > COLS - SHAPE[kind].wide) continue
      const rest = restOn(standing, kind, tryCol, tryRow)
      if (rest.held) return { col: tryCol, row: tryRow, level: rest.level, tier: rest.tier, shed, over: { col: c, row: r, level: first.level } }
    }
  }
  // A rug with no place left that holds it: it stays where it was set after all.
  return { col: c, row: r, level: first.level, tier: first.tier, shed: null, over: null }
}

/**
 * The leftmost place of a slope the finger points at a place with. Its heel
 * goes under the finger where it can stay so: on a lone block the slope then
 * sits with its heel on the block and its toe out over the air, whichever
 * way it faces. Where it cannot (the way a slope faces follows from its
 * column, and at either end of the rug its heel is the inner place), its toe
 * is under the finger.
 */
export function slopeAt(placed: readonly Placed[], col: number, row: number): number {
  const standing = settle(placed)
  const r = clampRow(row), aimed = Math.max(0, Math.min(COLS - 1, Math.round(col)))
  const options = [aimed, aimed - 1].filter((c) => c >= 0 && c <= COLS - SHAPE.slope.wide)
  const heeled = options.filter((c) => slopeEnds(c).heel === aimed)
  for (const c of [...heeled, ...options]) if (restOn(standing, 'slope', c, r).held) return c
  return heeled[0] ?? options[0]
}

/** The middle of what a block covers, in places. */
function middle(kind: Kind, col: number): number {
  return col + (SHAPE[kind].wide - 1) / 2
}

/**
 * Where a block tapped in the basket goes by itself: the free place on the
 * rug nearest the last block set down, or the middle of a bare rug. With no
 * free place left it goes on the lowest thing that holds it.
 */
export function tapPlace(placed: readonly Placed[], kind: Kind): Landing {
  const last = placed[placed.length - 1]
  const nearX = last ? middle(last.kind, last.col) : (COLS - 1) / 2
  const nearRow = last ? last.row : (ROWS - 1) / 2
  const standing = settle(placed)
  let best: Landing | null = null
  let bestCost = Infinity
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col <= COLS - SHAPE[kind].wide; col++) {
      const rest = restOn(standing, kind, col, row)
      if (!rest.held) continue
      // A level costs more than the whole rug is wide, so the rug itself is always taken first.
      const cost = rest.level * 100 + Math.abs(middle(kind, col) - nearX) + Math.abs(row - nearRow) * 1.01 + (row === 0 ? 0.001 : 0)
      if (cost < bestCost) {
        bestCost = cost
        best = { col, row, level: rest.level, tier: rest.tier, shed: null, over: null }
      }
    }
  }
  return best ?? landing(placed, kind, Math.round(nearX), Math.round(nearRow))
}

/**
 * The list with one block taken out, and what that does to the others: each
 * block that was resting on it, directly or through another, drops straight
 * down. `dropped` holds, for each block of the new list, how many half levels
 * it came down.
 */
export function pull(placed: readonly Placed[], index: number): { placed: Placed[]; dropped: number[] } {
  const before = settle(placed)
  const rest = placed.filter((_, i) => i !== index)
  const after = settle(rest)
  const dropped = after.map((block, i) => before[i < index ? i : i + 1].level - block.level)
  return { placed: rest, dropped }
}

/** How many of a kind are on the rug. */
export function countOf(placed: readonly Placed[], kind: Kind): number {
  return placed.reduce((n, block) => n + (block.kind === kind ? 1 : 0), 0)
}

/** The highest top on the rug, of any kind, or null on a bare rug: the first one set down wins a tie. */
export function highestTop(placed: readonly Placed[]): Standing | null {
  let best: Standing | null = null
  for (const block of settle(placed)) if (!best || block.level + SHAPE[block.kind].high > best.level + SHAPE[best.kind].high) best = block
  return best
}

/** The lowest block of a kind on the rug, or null: the first one set down wins a tie. */
export function lowestOf(placed: readonly Placed[], kind: Kind): Standing | null {
  let best: Standing | null = null
  for (const block of settle(placed)) if (block.kind === kind && (!best || block.level < best.level)) best = block
  return best
}
