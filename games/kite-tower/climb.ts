import { PLAY_MAX_X, PLAY_MIN_X, spanAt, type Placed } from './pieces'

// Where the peg doll can go (KTD3). Runs only when the build settles. It
// samples standable spots on the rug and on every upward-facing edge that
// has head room, links them with the doll's moves (walk, climb up a ledge,
// hop a small gap, drop down), and searches for the best spot: the kite if
// the doll can reach it, otherwise the highest place near the kite. The doll
// always climbs as far as the build lets it, so every piece that helps shows.

export const DOLL_HEIGHT = 2
export const CLEARANCE = 1.7
export const MAX_SLOPE = (38 * Math.PI) / 180
/** Up to this rise the doll just walks. */
export const STEP_UP = 0.42
/** A ledge up to this high the doll pulls itself onto. */
export const HOIST = 1.65
export const HOIST_REACH = 0.85
export const HOP_GAP = 1.15
export const DROP = 3.2
/** Feet to fingertips, stretching on tiptoe. */
export const REACH = 3
export const GRAB_DX = 0.95
/** How much a sideways step away from the kite is worth in height. */
const SIDEWAYS_COST = 0.45
const SPACING = 0.25
const WALK_DX = 0.42
const FLOOR_MIN = PLAY_MIN_X + 0.35
const FLOOR_MAX = PLAY_MAX_X - 0.35

export type Spot = { x: number; y: number; on: number | null }
export type MoveKind = 'walk' | 'climb' | 'hop' | 'drop'
export type Move = { kind: MoveKind; to: Spot }
export type KiteTarget = { x: number; grabY: number }
export type Plan = { moves: Move[]; goal: Spot; reachesKite: boolean }

function blocked(placed: readonly Placed[], x: number, from: number, to: number): boolean {
  for (const piece of placed) {
    for (const part of piece.parts) {
      const span = spanAt(part, x)
      if (span && span[1] > from && span[0] < to) return true
    }
  }
  return false
}

/** Room for the doll to stand: nothing in its body column, a little wider than its base. */
function roomy(placed: readonly Placed[], x: number, y: number): boolean {
  if (blocked(placed, x, y + 0.05, y + CLEARANCE)) return false
  if (blocked(placed, x - 0.22, y + 0.3, y + CLEARANCE)) return false
  return !blocked(placed, x + 0.22, y + 0.3, y + CLEARANCE)
}

export function standableSpots(placed: readonly Placed[]): Spot[] {
  const spots: Spot[] = []
  for (let x = FLOOR_MIN; x <= FLOOR_MAX + 1e-9; x += SPACING) {
    if (roomy(placed, x, 0)) spots.push({ x, y: 0, on: null })
  }
  const minUp = Math.cos(MAX_SLOPE)
  for (const piece of placed) {
    for (const part of piece.parts) {
      for (let i = 0; i < part.length; i++) {
        const a = part[i]
        const b = part[(i + 1) % part.length]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const length = Math.hypot(dx, dy)
        if (length < 1e-6 || -dx / length < minUp) continue
        const count = Math.max(1, Math.ceil(length / SPACING))
        for (let k = 0; k < count; k++) {
          const t = (k + 0.5) / count
          const x = a.x + dx * t
          const y = a.y + dy * t
          if (x < FLOOR_MIN || x > FLOOR_MAX || y < 0.05) continue
          if (roomy(placed, x, y)) spots.push({ x, y, on: piece.id })
        }
      }
    }
  }
  spots.sort((p, q) => p.x - q.x)
  return spots
}

type Link = { to: number; kind: MoveKind; cost: number }

function linkFor(placed: readonly Placed[], a: Spot, b: Spot): Link | null {
  const dx = Math.abs(b.x - a.x)
  const rise = b.y - a.y
  if (dx <= WALK_DX && Math.abs(rise) <= STEP_UP) return { to: -1, kind: 'walk', cost: dx + Math.abs(rise) }
  if (rise > STEP_UP && rise <= HOIST && dx <= HOIST_REACH) {
    if (blocked(placed, a.x, a.y + 0.05, b.y + 1.1)) return null
    return { to: -1, kind: 'climb', cost: 1.2 + rise + dx }
  }
  if (dx > WALK_DX && dx <= HOP_GAP && Math.abs(rise) <= 0.5) {
    const top = Math.max(a.y, b.y)
    if (blocked(placed, (a.x + b.x) / 2, top + 0.15, top + 1.1)) return null
    return { to: -1, kind: 'hop', cost: 1 + dx }
  }
  if (rise < -STEP_UP && rise >= -DROP && dx >= 0.2 && dx <= 1.1) {
    if (blocked(placed, b.x, b.y + 0.05, a.y + 1)) return null
    return { to: -1, kind: 'drop', cost: 0.8 + dx - rise * 0.3 }
  }
  return null
}

export function canGrab(spot: Spot, kite: KiteTarget): boolean {
  return Math.abs(spot.x - kite.x) <= GRAB_DX && spot.y + REACH >= kite.grabY
}

/** How good a place is to stand: high, and near the kite. */
export function spotValue(spot: Spot, kite: KiteTarget): number {
  return spot.y - SIDEWAYS_COST * Math.max(0, Math.abs(spot.x - kite.x) - GRAB_DX)
}

function nearestSpot(spots: readonly Spot[], at: { x: number; y: number }, on: number | null): number {
  let best = -1
  let bestDistance = 0.7
  spots.forEach((spot, index) => {
    const distance = Math.hypot(spot.x - at.x, (spot.y - at.y) * 1.5) + (spot.on === on ? 0 : 0.2)
    if (distance < bestDistance) {
      best = index
      bestDistance = distance
    }
  })
  return best
}

/**
 * The doll's next route from where it stands, or null when it has nothing
 * under its feet (its support moved away) and must tumble to the rug.
 */
export function planClimb(placed: readonly Placed[], doll: { x: number; y: number; on: number | null }, kite: KiteTarget): Plan | null {
  const spots = standableSpots(placed)
  const start = nearestSpot(spots, doll, doll.on)
  if (start < 0) return null

  const n = spots.length
  const cost = new Float64Array(n).fill(Infinity)
  const via = new Int32Array(n).fill(-1)
  const kind: MoveKind[] = new Array(n)
  const done = new Uint8Array(n)
  cost[start] = 0
  const window = Math.max(HOP_GAP, HOIST_REACH, 1.1) + 1e-6
  for (;;) {
    let current = -1
    for (let i = 0; i < n; i++) if (!done[i] && cost[i] < Infinity && (current < 0 || cost[i] < cost[current])) current = i
    if (current < 0) break
    done[current] = 1
    const from = spots[current]
    for (let j = current - 1; j >= 0 && from.x - spots[j].x <= window; j--) relax(j)
    for (let j = current + 1; j < n && spots[j].x - from.x <= window; j++) relax(j)
    function relax(j: number): void {
      if (done[j]) return
      const link = linkFor(placed, from, spots[j])
      if (!link) return
      const next = cost[current] + link.cost
      if (next < cost[j]) {
        cost[j] = next
        via[j] = current
        kind[j] = link.kind
      }
    }
  }

  let goal = -1
  let reachesKite = false
  for (let i = 0; i < n; i++) {
    if (cost[i] === Infinity || !canGrab(spots[i], kite)) continue
    if (goal < 0 || cost[i] < cost[goal]) goal = i
  }
  if (goal >= 0) reachesKite = true
  else {
    goal = start
    let bestValue = spotValue(spots[start], kite) + 0.25
    for (let i = 0; i < n; i++) {
      if (cost[i] === Infinity) continue
      const value = spotValue(spots[i], kite)
      if (value > bestValue + 1e-6 || (Math.abs(value - bestValue) < 1e-6 && goal !== start && cost[i] < cost[goal])) {
        goal = i
        bestValue = value
      }
    }
  }

  const moves: Move[] = []
  for (let at = goal; at !== start && at >= 0; at = via[at]) moves.push({ kind: kind[at], to: spots[at] })
  moves.reverse()
  return { moves, goal: spots[goal], reachesKite }
}
