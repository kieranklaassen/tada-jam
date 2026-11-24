// Loads and openings are sets of square cells on one grid, and fitting is one
// set inside another (ART.md, "The representation"). x runs to the right and y
// up; every set is kept with its lowest x and y at 0.

export type Cell = readonly [number, number]

/** How a thing is held: quarter turns clockwise as seen, after its mirror if the bears have changed ends. */
export type Way = { turn: number; back: boolean }

export function normalised(cells: readonly Cell[]): Cell[] {
  const left = Math.min(...cells.map((c) => c[0])), low = Math.min(...cells.map((c) => c[1]))
  return cells.map((c) => [c[0] - left, c[1] - low] as Cell).sort((a, b) => a[1] - b[1] || a[0] - b[0])
}

export function size(cells: readonly Cell[]): { w: number; h: number } {
  return { w: Math.max(...cells.map((c) => c[0])) + 1, h: Math.max(...cells.map((c) => c[1])) + 1 }
}

/** A quarter clockwise. */
export function turned(cells: readonly Cell[]): Cell[] {
  return normalised(cells.map(([x, y]) => [y, -x] as Cell))
}

export function mirrored(cells: readonly Cell[]): Cell[] {
  return normalised(cells.map(([x, y]) => [-x, y] as Cell))
}

export function held(base: readonly Cell[], way: Way): Cell[] {
  let cells = way.back ? mirrored(base) : normalised(base)
  for (let i = 0; i < way.turn; i++) cells = turned(cells)
  return cells
}

/** The bears change ends: what is seen is mirrored, so the turn runs the other way round. */
export function swapped(way: Way): Way {
  return { turn: (4 - way.turn) % 4, back: !way.back }
}

export const sameCells = (a: readonly Cell[], b: readonly Cell[]): boolean => a.length === b.length && normalised(a).join(' ') === normalised(b).join(' ')

export type Placing = {
  fits: boolean
  /** Where the load's lowest left cell goes, in the opening's cells. */
  dx: number
  dy: number
  /** The wall cells in the way, in the opening's cells. */
  blocked: Cell[]
}

/**
 * Where the bears put a load to an opening. Any placing that lies wholly inside is taken. Otherwise it stands on
 * the sill where the fewest cells are in the way, as near the opening's middle as it can.
 */
export function place(load: readonly Cell[], opening: readonly Cell[]): Placing {
  const open = new Set(opening.map((c) => c.join())), l = size(load), o = size(opening)
  const middle = (o.w - l.w) / 2
  let best: Placing | null = null, bestCost = Infinity
  for (let dy = 0; dy <= Math.max(0, o.h - l.h); dy++) for (let dx = Math.min(0, o.w - l.w); dx <= Math.max(0, o.w - l.w); dx++) {
    const blocked = load.map(([x, y]) => [x + dx, y + dy] as Cell).filter((c) => !open.has(c.join()))
    if (blocked.length > 0 && dy > 0) continue
    const cost = blocked.length * 100 + dy * 10 + Math.abs(dx - middle) + (dx > middle ? 0.01 : 0)
    if (cost < bestCost) { bestCost = cost; best = { fits: blocked.length === 0, dx, dy, blocked } }
  }
  return best!
}

/** Which side of the opening caught: the mean of the blocked cells against the load's own middle. */
export function caughtSide(load: readonly Cell[], placing: Placing): -1 | 0 | 1 {
  if (placing.blocked.length === 0) return 0
  const mean = placing.blocked.reduce((sum, c) => sum + c[0], 0) / placing.blocked.length - placing.dx - (size(load).w - 1) / 2
  return Math.abs(mean) < 0.2 ? 0 : mean < 0 ? -1 : 1
}
