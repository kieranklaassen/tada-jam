import type { Board, Point } from './board'
import { DIAL_RADIUS, LAMP_BODY, obstacles } from './ground'

// How a figure gets from one place in the camp to another without walking
// through a tent, a camper, the fire, a lantern or the kit: nothing passes
// through anything. A coarse grid is laid over the map of one board, the
// cells under an obstacle are closed, and the shortest open way is found and
// then pulled straight wherever the straight line is open too.
//
// Pure and deterministic. A way is worked out once for a board and a pair of
// places and kept.

/** The half-width of a walking figure, in design pixels. */
export const WALKER = 12
const CELL = 9

type Grid = { cols: number; rows: number; size: number; closed: Uint8Array; rounds: { x: number; y: number; r: number }[] }
const GRIDS = new WeakMap<Board, Grid>()
const WAYS = new WeakMap<Board, Map<string, Point[]>>()

/** Everything on a board that a walker keeps clear of, as rounds on the surface, already widened by the walker's own half-width. */
export function rounds(board: Board): { x: number; y: number; r: number }[] {
  const u = board.u, list = obstacles(board.site).filter((one) => one.name !== 'dog').map((one) => ({ x: board.fire.x + one.at.x * u, y: board.fire.y + one.at.y * u, r: (one.radius + WALKER) * u }))
  // The fire's own round is its dial; a lantern stands on every pin a walker might pass.
  list[0].r = (DIAL_RADIUS + 4 + WALKER) * u
  for (const pin of board.pins) list.push({ x: pin.x, y: pin.y, r: (LAMP_BODY - 4 + WALKER) * u })
  return list
}

function gridOf(board: Board): Grid {
  const known = GRIDS.get(board)
  if (known) return known
  const size = CELL * board.u, cols = Math.ceil(board.w / size), rows = Math.ceil(board.h / size), closed = new Uint8Array(cols * rows), all = rounds(board)
  const edge = board.inset + WALKER * board.u, right = board.flap.top - WALKER * board.u, bottom = board.walkway + 8 * board.u
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const x = (col + 0.5) * size, y = (row + 0.5) * size
    // Off the map, on the folded edge, or down among the rods: closed.
    if (x < edge || y < edge || x > right || y > bottom || all.some((one) => Math.hypot(x - one.x, y - one.y) < one.r)) closed[row * cols + col] = 1
  }
  // A pocket of open cells shut in between two tents and the fire leads nowhere: only what can be reached from the
  // walkway below the camp counts as open.
  const reached = new Uint8Array(cols * rows), queue = [Math.floor(board.walkway / size) * cols + Math.floor(board.dog.at.x / size)]
  if (!closed[queue[0]]) reached[queue[0]] = 1
  for (let head = 0; head < queue.length && reached[queue[0]]; head++) {
    const now = queue[head], col = now % cols, row = Math.floor(now / cols)
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = col + dc, r = row + dr, next = r * cols + c
      if (c < 0 || r < 0 || c >= cols || r >= rows || closed[next] || reached[next]) continue
      reached[next] = 1
      queue.push(next)
    }
  }
  if (reached[queue[0]]) for (let i = 0; i < closed.length; i++) if (!reached[i]) closed[i] = 1
  const grid = { cols, rows, size, closed, rounds: all }
  GRIDS.set(board, grid)
  return grid
}

/** Whether a point on a board is open to a walker. */
export function open(board: Board, p: Point): boolean {
  const grid = gridOf(board), col = Math.floor(p.x / grid.size), row = Math.floor(p.y / grid.size)
  return col >= 0 && row >= 0 && col < grid.cols && row < grid.rows && grid.closed[row * grid.cols + col] === 0
}

/** Whether the straight line between two points is open all the way. */
export function clearLine(board: Board, a: Point, b: Point): boolean {
  const grid = gridOf(board), steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (grid.size * 0.5)))
  for (let i = 0; i <= steps; i++) if (!open(board, { x: a.x + ((b.x - a.x) * i) / steps, y: a.y + ((b.y - a.y) * i) / steps })) return false
  return true
}

/** The open spot nearest a point: the point itself where it is open, or the middle of the nearest open cell. */
export function nearestOpen(board: Board, p: Point): Point {
  const grid = gridOf(board)
  if (open(board, p)) return p
  const col = Math.max(0, Math.min(grid.cols - 1, Math.floor(p.x / grid.size))), row = Math.max(0, Math.min(grid.rows - 1, Math.floor(p.y / grid.size)))
  let best: Point = p, least = Infinity
  for (let reach = 1; reach < Math.max(grid.cols, grid.rows) && least === Infinity; reach++) {
    for (let dr = -reach; dr <= reach; dr++) for (let dc = -reach; dc <= reach; dc++) {
      if (Math.max(Math.abs(dr), Math.abs(dc)) !== reach) continue
      const c = col + dc, r = row + dr
      if (c < 0 || r < 0 || c >= grid.cols || r >= grid.rows || grid.closed[r * grid.cols + c]) continue
      const at = { x: (c + 0.5) * grid.size, y: (r + 0.5) * grid.size }, away = Math.hypot(at.x - p.x, at.y - p.y)
      if (away < least) { least = away; best = at }
    }
  }
  return best
}

/**
 * The way from one place to another on a board, as the corners to walk
 * through. It starts at `from` and ends at `to`. Where either lies inside an
 * obstacle (a camper sets out from its own bag, and may end in someone
 * else's), the way leaves and arrives by the nearest open spot; everything in
 * between is open.
 */
export function wayBetween(board: Board, from: Point, to: Point): Point[] {
  const key = `${Math.round(from.x)},${Math.round(from.y)}>${Math.round(to.x)},${Math.round(to.y)}`
  let ways = WAYS.get(board)
  if (!ways) { ways = new Map(); WAYS.set(board, ways) }
  const known = ways.get(key)
  if (known) return known
  const grid = gridOf(board), start = nearestOpen(board, from), goal = nearestOpen(board, to)
  const cell = (p: Point) => Math.floor(p.y / grid.size) * grid.cols + Math.floor(p.x / grid.size)
  const s = cell(start), g = cell(goal), count = grid.cols * grid.rows
  const cost = new Float32Array(count).fill(Infinity), came = new Int32Array(count).fill(-1), shut = new Uint8Array(count)
  const mid = (index: number): Point => ({ x: ((index % grid.cols) + 0.5) * grid.size, y: (Math.floor(index / grid.cols) + 0.5) * grid.size })
  const guess = (index: number) => { const p = mid(index); return Math.hypot(p.x - goal.x, p.y - goal.y) }
  // A small open list, searched for its least: the grid is a few thousand cells and a way is asked for seldom.
  const waiting: number[] = [s]
  cost[s] = 0
  while (waiting.length > 0) {
    let pick = 0
    for (let i = 1; i < waiting.length; i++) if (cost[waiting[i]] + guess(waiting[i]) < cost[waiting[pick]] + guess(waiting[pick])) pick = i
    const now = waiting.splice(pick, 1)[0]
    if (now === g) break
    if (shut[now]) continue
    shut[now] = 1
    const col = now % grid.cols, row = Math.floor(now / grid.cols)
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const c = col + dc, r = row + dr
      if (c < 0 || r < 0 || c >= grid.cols || r >= grid.rows) continue
      const next = r * grid.cols + c
      // No cutting a corner between two closed cells.
      if (grid.closed[next] || shut[next] || (dr !== 0 && dc !== 0 && (grid.closed[row * grid.cols + c] || grid.closed[r * grid.cols + col]))) continue
      const step = cost[now] + (dr !== 0 && dc !== 0 ? Math.SQRT2 : 1) * grid.size
      if (step < cost[next]) { cost[next] = step; came[next] = now; waiting.push(next) }
    }
  }
  const cells: Point[] = []
  if (came[g] !== -1 || g === s) for (let at = g; at !== -1; at = came[at]) cells.unshift(mid(at))
  // Pull the way straight: from each corner, go on to the furthest later corner the straight line reaches.
  const corners: Point[] = [start]
  for (let i = 0; i < cells.length - 1; ) {
    let far = i + 1
    for (let j = cells.length - 1; j > i + 1; j--) if (clearLine(board, i === 0 ? start : cells[i], cells[j])) { far = j; break }
    corners.push(cells[far])
    i = far
  }
  // The last corner is the middle of the goal's cell: where the goal itself is open, the way ends on it exactly.
  if (goal === to && corners.length > 1) corners[corners.length - 1] = to
  const way = [from, ...(start === from ? [] : [start]), ...corners.slice(1), ...(goal === to ? [] : [to])]
  if (way.length === 1) way.push(to)
  ways.set(key, way)
  return way
}

/** How long a way is. */
export function wayLength(way: readonly Point[]): number {
  let sum = 0
  for (let i = 1; i < way.length; i++) sum += Math.hypot(way[i].x - way[i - 1].x, way[i].y - way[i - 1].y)
  return sum
}

/** The point so far along a way, and the heading there. */
export function alongWay(way: readonly Point[], far: number): { at: Point; heading: number } {
  let left = Math.max(0, far)
  for (let i = 1; i < way.length; i++) {
    const dx = way[i].x - way[i - 1].x, dy = way[i].y - way[i - 1].y, leg = Math.hypot(dx, dy)
    if (left <= leg || i === way.length - 1) {
      const t = leg > 0 ? Math.min(1, left / leg) : 1
      return { at: { x: way[i - 1].x + dx * t, y: way[i - 1].y + dy * t }, heading: Math.atan2(dy, dx) }
    }
    left -= leg
  }
  return { at: way[0], heading: 0 }
}
