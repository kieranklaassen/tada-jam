import { BODY_PROFILE, BODY_R, HAIR, HEAD_R, HEAD_Y } from './doll'
import { movePoint } from './hero'
import { PLAY_MAX_X, PLAY_MIN_X, spanAt, type Placed, type Vec2 } from './pieces'

// Where the peg doll can go (KTD3). Runs only when the build settles. It
// samples standable spots on the rug and on every upward-facing edge that
// has head room, links them with the doll's moves (walk, climb up a ledge,
// hop a small gap, drop down), and searches for the best spot: the kite if
// the doll can reach it, otherwise the highest place near the kite. The doll
// always climbs as far as the build lets it, so every piece that helps shows.

export const DOLL_HEIGHT = 2
/** Room the doll stands in, from the view's own measurements: up past her hair, and out past her body and head either side. */
export const CLEARANCE = HEAD_Y + HEAD_R + HAIR + 0.03
const STAND_HALF = Math.max(BODY_R, HEAD_R + HAIR) + 0.01
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
/** How much a sideways step away from the kite is worth in height: enough that a tall build across the room never draws her away from her kite. */
const SIDEWAYS_COST = 0.8
const SHOULDER = 1.3
const HAND_WIDTH = 0.75
/** Outweighs the 0.25 a doll gives the spot she already stands on plus the sideways cost of stepping a hand's width back, so she steps back. */
const CRAMPED_COST = 1
const SPACING = 0.25
/** Far enough to walk from the rug, a body's width back from a low step's face, onto the step (spots lie on a 0.25 grid). */
const WALK_DX = 0.8
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

const STAND_COLUMNS = [0, -STAND_HALF / 2, STAND_HALF / 2, -STAND_HALF, STAND_HALF]

/** Her lathed outline, both sides, a few hundredths apart: offsets across and heights over her feet. */
const BODY_POINTS: readonly Vec2[] = BODY_PROFILE.slice(1).flatMap((b, i) => {
  const a = BODY_PROFILE[i]
  const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.04))
  return Array.from({ length: n + 1 }, (_, k) => {
    const x = a.x + ((b.x - a.x) * k) / n
    const y = a.y + ((b.y - a.y) * k) / n
    return [
      { x, y },
      { x: -x, y },
    ]
  }).flat()
})

/** Where her feet go standing over `part` at `x`: her flat hem on the highest of it under her, so on a ramp it rests on the high side instead of in it. */
function feetOn(part: readonly Vec2[], x: number): number {
  let feet = -Infinity
  for (const p of BODY_POINTS) {
    const span = spanAt(part, x + p.x)
    if (span) feet = Math.max(feet, span[1] - p.y)
  }
  return feet
}

/**
 * Room for the doll to stand with her feet at `y`: nothing anywhere in her
 * outline (columns closer than any block is wide). Standing on a ramp whose
 * surface is at `ground` under her middle and rises `slope` per unit across,
 * only the ramp itself may rise past her feet, out beyond her hem.
 */
export function roomy(placed: readonly Placed[], x: number, y: number, slope = 0, ground = y): boolean {
  for (const dx of STAND_COLUMNS) if (blocked(placed, x + dx, Math.max(y, ground + dx * slope) + 0.05, y + CLEARANCE)) return false
  return true
}

const HEAD_ROUND = HEAD_R + HAIR + 0.01
/** Upright slices through her head's round, as offsets across and half-heights. */
const HEAD_SLICES = [0, -0.5, 0.5, -0.9, 0.9].map((k) => ({ dx: k * HEAD_ROUND, dy: HEAD_ROUND * Math.sqrt(1 - k * k) }))
/** How far apart along a move her head is looked at: well under its round. */
const PATH_STEP = 0.08
const pathPoint: Vec2 = { x: 0, y: 0 }

function headBlocked(placed: readonly Placed[], x: number, y: number): boolean {
  const middle = y + HEAD_Y
  for (const s of HEAD_SLICES) if (blocked(placed, x + s.dx, middle - s.dy, middle + s.dy)) return true
  return false
}

/**
 * Her head clear of the wood all along a move, not just where it starts and
 * ends: a climb rises close past whatever overhangs the spot she climbs from,
 * and a long step passes under what hangs between two spots.
 */
export function headClearAlong(placed: readonly Placed[], kind: MoveKind, a: Spot, b: Spot): boolean {
  const n = Math.max(2, Math.ceil((Math.abs(b.x - a.x) + Math.abs(b.y - a.y) + (kind === 'walk' ? 0 : 1)) / PATH_STEP))
  for (let i = 1; i < n; i++) {
    movePoint(kind, a, b, i / n, pathPoint)
    if (headBlocked(placed, pathPoint.x, pathPoint.y)) return false
  }
  return true
}

/** How much higher than standing at (x, y) she can bob before her hair touches wood over her. */
export function headroom(placed: readonly Placed[], x: number, y: number): number {
  let ceiling = Infinity
  for (const dx of STAND_COLUMNS) {
    for (const piece of placed) {
      for (const part of piece.parts) {
        const span = spanAt(part, x + dx)
        if (span && span[1] > y + 0.05) ceiling = Math.min(ceiling, span[0])
      }
    }
  }
  return Math.max(0, ceiling - y - CLEARANCE)
}

/** Where the doll could stand; never on piece `avoid`, which still stands in her way. */
export function standableSpots(placed: readonly Placed[], avoid: number | null = null): Spot[] {
  const spots: Spot[] = []
  for (let x = FLOOR_MIN; x <= FLOOR_MAX + 1e-9; x += SPACING) {
    if (roomy(placed, x, 0)) spots.push({ x, y: 0, on: null })
  }
  const minUp = Math.cos(MAX_SLOPE)
  for (const piece of placed) {
    if (piece.id === avoid) continue
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
          const feet = feetOn(part, x)
          if (roomy(placed, x, feet, dy / dx, y)) spots.push({ x, y: feet, on: piece.id })
        }
      }
    }
  }
  spots.sort((p, q) => p.x - q.x)
  return spots
}

type Link = { to: number; kind: MoveKind; cost: number }

function linkFor(placed: readonly Placed[], a: Spot, b: Spot): Link | null {
  const link = moveFor(placed, a, b)
  return link && headClearAlong(placed, link.kind, a, b) ? link : null
}

function moveFor(placed: readonly Placed[], a: Spot, b: Spot): Link | null {
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

/** Wood above her shoulder within a hand's width on the kite side, where her reaching arm would go into it. */
function crampedReach(placed: readonly Placed[], spot: Spot, kite: KiteTarget): boolean {
  const toward = Math.sign(kite.x - spot.x)
  return toward !== 0 && blocked(placed, spot.x + toward * HAND_WIDTH, spot.y + SHOULDER, spot.y + DOLL_HEIGHT + 0.6)
}

/** Where to wait when the kite is out of reach: as good a spot as the build gives, but never pressed against a block she reaches into. */
function waitValue(placed: readonly Placed[], spot: Spot, kite: KiteTarget): number {
  return spotValue(spot, kite) - (crampedReach(placed, spot, kite) ? CRAMPED_COST : 0)
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
 * under its feet (its support moved away) and must tumble to the rug. She
 * never stands on piece `avoid`.
 */
export function planClimb(placed: readonly Placed[], doll: { x: number; y: number; on: number | null }, kite: KiteTarget, avoid: number | null = null): Plan | null {
  const spots = standableSpots(placed, avoid)
  const start = nearestSpot(spots, doll, doll.on)
  if (start < 0) return null
  const at: Spot = { x: doll.x, y: doll.y, on: doll.on }

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
      // Her route begins where she really stands, which a block set down by her can leave a little off
      // the nearest spot: a climb, hop or drop from there has to keep her head clear from there too.
      if (current === start && link.kind !== 'walk' && !headClearAlong(placed, link.kind, at, spots[j])) return
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
    let bestValue = waitValue(placed, spots[start], kite) + 0.25
    for (let i = 0; i < n; i++) {
      if (cost[i] === Infinity) continue
      const value = waitValue(placed, spots[i], kite)
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
