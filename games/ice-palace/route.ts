import { BLOCK_H, awayFromHole, type Bar, type Hole, type Point } from './ground'
import { STAGE } from './stage'

// How a frost child gets from one place to another on its feet: round open
// water and round everything that lies below the bank, never across them.
// The ground below the bank is a grid of cells; a cell is free when feet
// standing in it are clear of every hole and lying thing. The way is the
// shortest one over free cells, then pulled straight wherever a straight
// stretch is itself clear. No chance and no clock: the same clearing gives
// the same way every time.

/** The side of a cell, in stage units. */
export const CELL = 20
/** Feet keep this far from open water and from anything that lies. */
export const FEET = 20
/** The ground a child can skate on: from the foot of the bank's face to the foot of the stage. */
const X0 = 20, Y0 = 540
const COLS = Math.floor((STAGE.width - 2 * X0) / CELL) + 1, ROWS = Math.floor((STAGE.height - 4 - Y0) / CELL) + 1

/** What is in the way: open water, and the things that lie on the ice and the front snow. */
export type InTheWay = { holes: readonly Hole[]; bars: readonly Bar[] }

/** How far a point is from the nearest hole or lying thing: 0 inside one. */
export function clearance(at: Point, way: InTheWay): number {
  let least = Infinity
  for (const hole of way.holes) least = Math.min(least, awayFromHole(hole, at.x, at.y))
  for (const bar of way.bars) least = Math.min(least, Math.hypot(Math.max(0, Math.abs(at.x - bar.x) - bar.len / 2), Math.max(0, Math.abs(at.y - bar.y) - BLOCK_H / 2)))
  return least
}

const cellOf = (at: Point): number => {
  const cx = Math.max(0, Math.min(COLS - 1, Math.round((at.x - X0) / CELL))), cy = Math.max(0, Math.min(ROWS - 1, Math.round((at.y - Y0) / CELL)))
  return cy * COLS + cx
}
const middle = (cell: number): Point => ({ x: X0 + (cell % COLS) * CELL, y: Y0 + Math.floor(cell / COLS) * CELL })

/** Whether the straight stretch between two points keeps feet clear all the way. */
export function straightIsClear(a: Point, b: Point, way: InTheWay, keep = FEET): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 5))
  for (let i = 0; i <= steps; i++) if (clearance({ x: a.x + ((b.x - a.x) * i) / steps, y: a.y + ((b.y - a.y) * i) / steps }, way) < keep) return false
  return true
}

/** Every cell that can be reached from `from` over free cells, with the cell each was reached from. */
function spread(from: number, way: InTheWay): Int32Array {
  const came = new Int32Array(COLS * ROWS).fill(-1)
  const free = (cell: number): boolean => clearance(middle(cell), way) >= FEET + 2
  came[from] = from
  const queue = [from]
  for (let head = 0; head < queue.length; head++) {
    const cell = queue[head], cx = cell % COLS, cy = Math.floor(cell / COLS)
    // Straight neighbours before slanted ones, so a way over open ground has few corners.
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]] as const) {
      const nx = cx + dx, ny = cy + dy
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue
      const next = ny * COLS + nx
      if (came[next] >= 0 || !free(next)) continue
      // A slanted step does not cut the corner of something in the way.
      if (dx !== 0 && dy !== 0 && (!free(cy * COLS + nx) || !free(ny * COLS + cx))) continue
      came[next] = cell
      queue.push(next)
    }
  }
  return came
}

/** The way back from a reached cell to where the spread started, as cells from the start on. */
function trail(came: Int32Array, to: number): number[] {
  const cells = [to]
  while (came[cells[0]] !== cells[0]) cells.unshift(came[cells[0]])
  return cells
}

/**
 * A way on foot from `from` towards `to`: it ends at `to` when `to` can be reached, and otherwise at the place
 * nearest to it that can. Every stretch of it keeps feet clear of open water and of everything that lies; only
 * its two ends are taken as given, since each is a place the game keeps free.
 */
export function wayTo(from: Point, to: Point, way: InTheWay): Point[] {
  const start = cellOf(from), came = spread(start, way)
  let goal = cellOf(to)
  const whole = came[goal] >= 0
  if (!whole) {
    let best = Infinity
    for (let cell = 0; cell < came.length; cell++) {
      if (came[cell] < 0) continue
      const at = middle(cell), away = Math.hypot(at.x - to.x, at.y - to.y)
      if (away < best) (best = away), (goal = cell)
    }
  }
  const points = [from, ...trail(came, goal).slice(1).map(middle)]
  if (whole) points.push(to)
  // Pulled straight: from each point, on to the furthest later one a clear straight stretch reaches.
  const pulled = [points[0]]
  for (let i = 0; i < points.length - 1;) {
    let next = i + 1
    for (let j = points.length - 1; j > i + 1; j--) if (straightIsClear(points[i], points[j], way)) { next = j; break }
    pulled.push(points[next])
    i = next
  }
  return pulled
}

/** How long a way is. */
export function lengthOf(path: readonly Point[]): number {
  let sum = 0
  for (let i = 1; i < path.length; i++) sum += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y)
  return sum
}

/** The point `share` of the way along a path, from 0 at its start to 1 at its end. */
export function along(path: readonly Point[], share: number): Point {
  if (path.length === 0) return { x: 0, y: 0 }
  let left = Math.max(0, Math.min(1, share)) * lengthOf(path)
  for (let i = 1; i < path.length; i++) {
    const leg = Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y)
    if (left <= leg && leg > 0) return { x: path[i - 1].x + ((path[i].x - path[i - 1].x) * left) / leg, y: path[i - 1].y + ((path[i].y - path[i - 1].y) * left) / leg }
    left -= leg
  }
  return path[path.length - 1]
}
