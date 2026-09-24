import type { Move } from './climb'
import type { Vec2 } from './pieces'

// The peg doll's route (R4): planner moves become timed segments the view
// can pose. Runs of small walking steps merge into one bouncy two-footed
// hop-along; a ledge is a crouch, a pull, and a step over; a gap is a hop;
// a drop is a little jump off the edge and a fall. Times are the hero's own
// (eager and quick), not shared with the other dolls.

export type SegmentKind = 'walk' | 'climb' | 'hop' | 'drop'

export type Segment = {
  kind: SegmentKind
  from: Vec2
  to: Vec2
  /** Waypoints for a walk (from, ..., to); two points for the rest. */
  path: Vec2[]
  length: number
  duration: number
  /** The piece the doll stands on at the end, or null for the rug. */
  on: number | null
}

export const WALK_SPEED = 1.9
export const HOP_STRIDE = 0.36
const CLIMB_SECONDS = 0.9
const DROP_SECONDS = 0.55

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

export function buildRoute(start: Vec2, moves: readonly Move[]): Segment[] {
  const segments: Segment[] = []
  let at: Vec2 = { x: start.x, y: start.y }
  for (const move of moves) {
    const to = { x: move.to.x, y: move.to.y }
    const last = segments[segments.length - 1]
    if (move.kind === 'walk' && last && last.kind === 'walk') {
      last.path.push(to)
      last.length += distance(last.to, to)
      last.to = to
      last.on = move.to.on
      last.duration = Math.max(0.3, last.length / WALK_SPEED)
    } else {
      const length = distance(at, to)
      const duration =
        move.kind === 'walk'
          ? Math.max(0.3, length / WALK_SPEED)
          : move.kind === 'climb'
            ? CLIMB_SECONDS
            : move.kind === 'hop'
              ? 0.5 + Math.abs(to.x - at.x) * 0.12
              : DROP_SECONDS
      segments.push({ kind: move.kind, from: at, to, path: [at, to], length, duration, on: move.to.on })
    }
    at = to
  }
  return segments
}

export function routeDuration(segments: readonly Segment[]): number {
  let total = 0
  for (const s of segments) total += s.duration
  return total
}

export type RoutePose = {
  x: number
  y: number
  facing: number
  kind: SegmentKind | null
  /** 0..1 through the current segment. */
  phase: number
  /** For a walk: how many hops it takes, so the view can bounce in step. */
  hops: number
  index: number
  done: boolean
}

function easeInOut(t: number): number {
  return t * t * (3 - 2 * t)
}

function alongPath(path: readonly Vec2[], length: number, t: number, out: RoutePose): void {
  let remaining = length * t
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]
    const b = path[i]
    const d = distance(a, b)
    if (remaining <= d || i === path.length - 1) {
      const k = d > 1e-9 ? Math.min(1, remaining / d) : 1
      out.x = a.x + (b.x - a.x) * k
      out.y = a.y + (b.y - a.y) * k
      return
    }
    remaining -= d
  }
  out.x = path[0].x
  out.y = path[0].y
}

/** Where the doll is `p` (0..1) through one move from `from` to `to`: the path her route follows, and the one the planner keeps her head clear along. */
export function movePoint(kind: SegmentKind, from: Vec2, to: Vec2, p: number, out: Vec2): Vec2 {
  const dx = to.x - from.x
  switch (kind) {
    case 'walk':
      out.x = from.x + dx * p
      out.y = from.y + (to.y - from.y) * p
      break
    case 'climb': {
      const rise = Math.min(1, Math.max(0, (p - 0.22) / 0.46))
      const over = Math.min(1, Math.max(0, (p - 0.62) / 0.3))
      const lift = 1 - (1 - rise) * (1 - rise) * (1 - rise)
      out.y = from.y + (to.y - from.y) * lift + Math.sin(over * Math.PI) * 0.12
      out.x = from.x + dx * (0.18 * rise + 0.82 * easeInOut(over))
      break
    }
    case 'hop': {
      const k = easeInOut(p)
      out.x = from.x + dx * k
      out.y = from.y + (to.y - from.y) * k + (0.5 + Math.max(0, to.y - from.y)) * 4 * p * (1 - p)
      break
    }
    case 'drop': {
      const leave = Math.min(1, p / 0.25)
      const fall = Math.max(0, (p - 0.25) / 0.75)
      out.x = from.x + dx * (0.45 * leave + 0.55 * fall)
      out.y = p < 0.25 ? from.y + Math.sin(leave * Math.PI * 0.5) * 0.18 : from.y + 0.18 - (from.y + 0.18 - to.y) * fall * fall
      break
    }
    default: {
      const never: never = kind
      throw new Error(`unknown segment ${String(never)}`)
    }
  }
  return out
}

/** Where the doll is `elapsed` seconds into its route, written into `out`. */
export function routePose(segments: readonly Segment[], elapsed: number, out: RoutePose): RoutePose {
  let t = Math.max(0, elapsed)
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i]
    if (t > s.duration && i < segments.length - 1) {
      t -= s.duration
      continue
    }
    const p = Math.min(1, t / s.duration)
    const dx = s.to.x - s.from.x
    if (Math.abs(dx) > 1e-3) out.facing = Math.sign(dx)
    out.kind = s.kind
    out.phase = p
    out.index = i
    out.hops = s.kind === 'walk' ? Math.max(1, Math.round(s.length / HOP_STRIDE)) : 1
    out.done = i === segments.length - 1 && t >= s.duration
    if (s.kind === 'walk') alongPath(s.path, s.length, p, out)
    else movePoint(s.kind, s.from, s.to, p, out)
    return out
  }
  out.done = true
  out.kind = null
  out.phase = 1
  return out
}
