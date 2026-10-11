import { ENTRY, STREET } from './places'

// The way a thing takes from the gate to its spot when a street comes in:
// round whatever already stands there, never through it. Pure numbers.

type Spot = { x: number; z: number }

/** Something in the way: a thing that stands, or the hole. */
export type Block = { x: number; z: number; wide: number }

/** The way from where the things come in to `spot`: its corners, its length, and `over` when the street leaves no way round and the thing must hop over. */
export type Route = { points: Spot[]; long: number; over: boolean }

const CELL = 0.25
const COLS = Math.round((STREET.x1 - STREET.x0) / CELL) + 1
const ROWS = Math.round((STREET.z1 - STREET.z0) / CELL) + 1
/** Room kept between a walking thing and one that stands. */
export const ELBOW = 0.06

function clearAt(x: number, z: number, width: number, standing: readonly Block[], room: number): boolean {
  for (const other of standing) if (Math.hypot(other.x - x, other.z - z) < (other.wide + width) / 2 + room) return false
  return true
}

export function clearAlong(a: Spot, b: Spot, width: number, standing: readonly Block[], room = ELBOW): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.12))
  for (let step = 0; step <= steps; step++) {
    const t = step / steps
    if (!clearAt(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, width, standing, room)) return false
  }
  return true
}

function lengthOf(points: readonly Spot[]): number {
  let long = 0
  for (let i = 1; i < points.length; i++) long += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z)
  return long
}

const cellOf = (at: Spot): number => Math.max(0, Math.min(ROWS - 1, Math.round((at.z - STREET.z0) / CELL))) * COLS + Math.max(0, Math.min(COLS - 1, Math.round((at.x - STREET.x0) / CELL)))
const placeOf = (cell: number): Spot => ({ x: STREET.x0 + (cell % COLS) * CELL, z: STREET.z0 + Math.floor(cell / COLS) * CELL })

/** Whether a thing this wide can be at this cell on its way: between the kerbs and beside what stands, with a little more room than the straightened way asks. */
function walkable(cell: number, width: number, standing: readonly Block[]): boolean {
  const at = placeOf(cell)
  if (at.x < STREET.x0 + width / 2 - CELL || at.x > STREET.x1 - width / 2 + CELL || at.z < STREET.z0 + 0.75 || at.z > STREET.z1 - width / 4 + CELL) return false
  return clearAt(at.x, at.z, width, standing, ELBOW + 0.1)
}

/** The way a thing this wide takes from where the things come in to `to`, past what stands: straight where it can, round where it must. */
export function routeIn(to: Spot, width: number, standing: readonly Block[]): Route {
  const from: Spot = { ...ENTRY }, spot: Spot = { x: to.x, z: to.z }
  if (clearAlong(from, spot, width, standing)) return { points: [from, spot], long: lengthOf([from, spot]), over: false }
  const start = cellOf(from), goal = cellOf(spot)
  const open = (cell: number): boolean => cell === start || cell === goal || walkable(cell, width, standing)
  const cost = new Float32Array(COLS * ROWS).fill(Infinity), cameFrom = new Int32Array(COLS * ROWS).fill(-1), done = new Uint8Array(COLS * ROWS)
  cost[start] = 0
  const frontier: number[] = [start]
  let found = false
  while (frontier.length > 0) {
    // The nearest cell yet to be looked at. The grid is small enough for a plain search.
    let best = 0
    for (let i = 1; i < frontier.length; i++) if (cost[frontier[i]] < cost[frontier[best]]) best = i
    const cell = frontier.splice(best, 1)[0]
    if (done[cell]) continue
    done[cell] = 1
    if (cell === goal) { found = true; break }
    const col = cell % COLS, row = Math.floor(cell / COLS)
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dz === 0) continue
        const nc = col + dx, nr = row + dz
        if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue
        const next = nr * COLS + nc
        if (done[next] || !open(next)) continue
        // No cutting a corner between two blocked cells.
        if (dx !== 0 && dz !== 0 && (!open(row * COLS + nc) || !open(nr * COLS + col))) continue
        const through = cost[cell] + (dx !== 0 && dz !== 0 ? 1.4142 : 1)
        if (through < cost[next]) { cost[next] = through; cameFrom[next] = cell; frontier.push(next) }
      }
    }
  }
  if (!found) return { points: [from, spot], long: lengthOf([from, spot]), over: true }
  const cells: Spot[] = []
  for (let cell = goal; cell !== -1; cell = cameFrom[cell]) cells.unshift(placeOf(cell))
  cells[0] = from
  cells[cells.length - 1] = spot
  // Straighten it: from each corner, on to the furthest later corner the thing can walk straight to.
  const points: Spot[] = [cells[0]]
  let at = 0
  while (at < cells.length - 1) {
    let next = at + 1
    for (let ahead = cells.length - 1; ahead > at + 1; ahead--) {
      if (clearAlong(cells[at], cells[ahead], width, standing)) { next = ahead; break }
    }
    points.push(cells[next])
    at = next
  }
  // A leg that would have the thing touch something means the way is too tight to walk.
  for (let i = 1; i < points.length; i++) if (!clearAlong(points[i - 1], points[i], width, standing, 0)) return { points: [from, spot], long: lengthOf([from, spot]), over: true }
  return { points, long: lengthOf(points), over: false }
}

/** Where a walker is after `far` of its way. */
export function along(points: readonly Spot[], far: number, out: Spot & { dirX: number; dirZ: number }): void {
  let left = far
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], leg = Math.hypot(b.x - a.x, b.z - a.z)
    if (leg > 1e-6) { out.dirX = (b.x - a.x) / leg; out.dirZ = (b.z - a.z) / leg }
    if (left <= leg || i === points.length - 1) {
      const t = leg > 1e-6 ? Math.min(1, left / leg) : 1
      out.x = a.x + (b.x - a.x) * t
      out.z = a.z + (b.z - a.z) * t
      return
    }
    left -= leg
  }
  out.x = points[0].x
  out.z = points[0].z
}
