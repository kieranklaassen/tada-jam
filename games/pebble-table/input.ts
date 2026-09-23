import type { MatKey, Point } from './layout'

// Direct-touch gestures (R4, R38, KTD8). The tracker turns raw pointer
// events into intents; the scene decides what an intent does. At most three
// fingers act at once: a fourth means a resting hand, so every gesture is
// cancelled and nothing fires until the whole hand lifts.

export type Target =
  | { kind: 'piece'; id: number }
  | { kind: 'bag' }
  | { kind: 'knife' }
  | { kind: 'shelf'; mat: MatKey }
  | { kind: 'chair'; seat: number }
  | { kind: 'guest'; seat: number }
  | { kind: 'bowl' }
  | { kind: 'door' }
  | { kind: 'visitor'; index: number }
  | { kind: 'broom' }

export type Intent =
  | { type: 'press'; pointerId: number; target: Target; at: Point }
  | { type: 'tap'; pointerId: number; target: Target; at: Point }
  | { type: 'dragStart'; pointerId: number; target: Target; at: Point }
  | { type: 'dragMove'; pointerId: number; target: Target; at: Point; velocity: Point }
  | { type: 'dragEnd'; pointerId: number; target: Target; at: Point; velocity: Point }
  | { type: 'cancelAll'; pointerIds: number[] }

export const MAX_FINGERS = 3
export const TAP_SLOP = 16
export const TAP_MAX_MS = 450
export const FLICK_WINDOW_MS = 80
export const MAX_FLICK = 2600

type Sample = { x: number; y: number; t: number }
type Track = { target: Target; start: Sample; samples: Sample[]; dragging: boolean }

export class GestureTracker {
  private tracks = new Map<number, Track>()
  private resting = false
  private readonly hitTest: (at: Point) => Target

  constructor(hitTest: (at: Point) => Target) {
    this.hitTest = hitTest
  }

  get activeCount(): number {
    return this.tracks.size
  }

  down(pointerId: number, at: Point, t: number): Intent[] {
    if (this.resting) {
      this.tracks.set(pointerId, { target: { kind: 'broom' }, start: { ...at, t }, samples: [], dragging: false })
      return []
    }
    if (this.tracks.size >= MAX_FINGERS) {
      const pointerIds = [...this.tracks.keys()]
      this.resting = true
      for (const track of this.tracks.values()) track.dragging = false
      this.tracks.set(pointerId, { target: { kind: 'broom' }, start: { ...at, t }, samples: [], dragging: false })
      return [{ type: 'cancelAll', pointerIds }]
    }
    const target = this.hitTest(at)
    const sample = { ...at, t }
    const track: Track = { target, start: sample, samples: [sample], dragging: target.kind === 'broom' }
    this.tracks.set(pointerId, track)
    const intents: Intent[] = [{ type: 'press', pointerId, target, at }]
    if (track.dragging) intents.push({ type: 'dragStart', pointerId, target, at })
    return intents
  }

  move(pointerId: number, at: Point, t: number): Intent[] {
    const track = this.tracks.get(pointerId)
    if (!track || this.resting) return []
    track.samples.push({ ...at, t })
    track.samples = track.samples.filter((s) => t - s.t <= FLICK_WINDOW_MS * 2)
    const intents: Intent[] = []
    if (!track.dragging && Math.hypot(at.x - track.start.x, at.y - track.start.y) > TAP_SLOP) {
      track.dragging = true
      intents.push({ type: 'dragStart', pointerId, target: track.target, at: { x: track.start.x, y: track.start.y } })
    }
    if (track.dragging) intents.push({ type: 'dragMove', pointerId, target: track.target, at, velocity: this.velocity(track, t) })
    return intents
  }

  up(pointerId: number, at: Point, t: number): Intent[] {
    const track = this.tracks.get(pointerId)
    this.tracks.delete(pointerId)
    if (this.resting) {
      if (this.tracks.size === 0) this.resting = false
      return []
    }
    if (!track) return []
    track.samples.push({ ...at, t })
    if (track.dragging) return [{ type: 'dragEnd', pointerId, target: track.target, at, velocity: this.velocity(track, t) }]
    if (t - track.start.t <= TAP_MAX_MS) return [{ type: 'tap', pointerId, target: track.target, at }]
    return []
  }

  /** Forget every finger, e.g. when the table is put away mid-touch and the lift never arrives. */
  reset(): void {
    this.tracks.clear()
    this.resting = false
  }

  cancel(pointerId: number): Intent[] {
    const track = this.tracks.get(pointerId)
    this.tracks.delete(pointerId)
    if (this.resting) {
      if (this.tracks.size === 0) this.resting = false
      return []
    }
    if (track?.dragging) {
      const last = track.samples[track.samples.length - 1] ?? track.start
      return [{ type: 'dragEnd', pointerId, target: track.target, at: { x: last.x, y: last.y }, velocity: { x: 0, y: 0 } }]
    }
    return []
  }

  private velocity(track: Track, now: number): Point {
    const recent = track.samples.filter((s) => now - s.t <= FLICK_WINDOW_MS)
    if (recent.length < 2) return { x: 0, y: 0 }
    const first = recent[0]
    const last = recent[recent.length - 1]
    const dt = (last.t - first.t) / 1000
    if (dt <= 0) return { x: 0, y: 0 }
    let vx = (last.x - first.x) / dt
    let vy = (last.y - first.y) / dt
    const magnitude = Math.hypot(vx, vy)
    if (magnitude > MAX_FLICK) {
      vx = (vx / magnitude) * MAX_FLICK
      vy = (vy / magnitude) * MAX_FLICK
    }
    return { x: vx, y: vy }
  }
}

/** Topmost piece under a point, with finger slop. `pieces` is in draw order (last is on top). */
export function pickPiece<T extends { id: number; x: number; y: number; r: number }>(pieces: readonly T[], at: Point, slop: number): T | null {
  let best: T | null = null
  let bestIndex = -1
  let bestDistance = Infinity
  pieces.forEach((piece, index) => {
    const distance = Math.hypot(piece.x - at.x, piece.y - at.y)
    if (distance > piece.r + slop) return
    const inside = distance <= piece.r
    const bestInside = best !== null && bestDistance <= best.r
    if (best === null || (inside && !bestInside) || (inside === bestInside && (inside ? index > bestIndex : distance < bestDistance))) {
      best = piece
      bestIndex = index
      bestDistance = distance
    }
  })
  return best
}
