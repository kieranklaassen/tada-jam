// Direct-touch gestures. Raw pointer events become intents; the controller
// decides what an intent does. Up to three fingers act at once. A fourth
// means a resting hand: every gesture is cancelled and nothing fires until
// the whole hand has lifted.

export type Point = { x: number; y: number }

export type Intent<T> =
  | { type: 'press'; pointerId: number; target: T; at: Point }
  | { type: 'tap'; pointerId: number; target: T; at: Point }
  | { type: 'dragStart'; pointerId: number; target: T; at: Point }
  | { type: 'dragMove'; pointerId: number; target: T; at: Point; velocity: Point }
  | { type: 'dragEnd'; pointerId: number; target: T; at: Point; velocity: Point }
  | { type: 'cancel'; pointerId: number; target: T }

export const MAX_FINGERS = 3
export const TAP_SLOP = 14
export const TAP_MAX_MS = 500
const VELOCITY_WINDOW_MS = 90

type Sample = { x: number; y: number; t: number }
type Track<T> = { target: T | null; start: Sample; samples: Sample[]; dragging: boolean }

export class GestureTracker<T> {
  private readonly tracks = new Map<number, Track<T>>()
  private resting = false
  private readonly hitTest: (at: Point) => T

  constructor(hitTest: (at: Point) => T) {
    this.hitTest = hitTest
  }

  get fingers(): number {
    return this.tracks.size
  }

  down(pointerId: number, at: Point, t: number): Intent<T>[] {
    const start = { x: at.x, y: at.y, t }
    if (this.resting) {
      this.tracks.set(pointerId, { target: null, start, samples: [], dragging: false })
      return []
    }
    if (this.tracks.size >= MAX_FINGERS) {
      this.resting = true
      const intents: Intent<T>[] = []
      for (const [id, track] of this.tracks) if (track.target !== null) intents.push({ type: 'cancel', pointerId: id, target: track.target })
      for (const track of this.tracks.values()) track.target = null
      this.tracks.set(pointerId, { target: null, start, samples: [], dragging: false })
      return intents
    }
    const target = this.hitTest(at)
    this.tracks.set(pointerId, { target, start, samples: [start], dragging: false })
    return [{ type: 'press', pointerId, target, at }]
  }

  move(pointerId: number, at: Point, t: number): Intent<T>[] {
    const track = this.tracks.get(pointerId)
    if (!track || track.target === null) return []
    track.samples.push({ x: at.x, y: at.y, t })
    while (track.samples.length > 2 && t - track.samples[0].t > VELOCITY_WINDOW_MS * 2) track.samples.shift()
    const intents: Intent<T>[] = []
    if (!track.dragging && Math.hypot(at.x - track.start.x, at.y - track.start.y) > TAP_SLOP) {
      track.dragging = true
      intents.push({ type: 'dragStart', pointerId, target: track.target, at: { x: track.start.x, y: track.start.y } })
    }
    if (track.dragging) intents.push({ type: 'dragMove', pointerId, target: track.target, at, velocity: velocity(track.samples, t) })
    return intents
  }

  up(pointerId: number, at: Point, t: number): Intent<T>[] {
    const track = this.tracks.get(pointerId)
    this.tracks.delete(pointerId)
    if (this.tracks.size === 0) this.resting = false
    if (!track || track.target === null) return []
    track.samples.push({ x: at.x, y: at.y, t })
    if (track.dragging) return [{ type: 'dragEnd', pointerId, target: track.target, at, velocity: velocity(track.samples, t) }]
    if (t - track.start.t <= TAP_MAX_MS) return [{ type: 'tap', pointerId, target: track.target, at }]
    return [{ type: 'cancel', pointerId, target: track.target }]
  }

  /** The browser took the pointer away (scroll, system gesture, put-away). */
  lost(pointerId: number): Intent<T>[] {
    const track = this.tracks.get(pointerId)
    this.tracks.delete(pointerId)
    if (this.tracks.size === 0) this.resting = false
    if (!track || track.target === null) return []
    return [{ type: 'cancel', pointerId, target: track.target }]
  }

  /** Forget every finger at once (put-away mid-touch, when no lift will arrive). */
  reset(): Intent<T>[] {
    const intents: Intent<T>[] = []
    for (const [id, track] of this.tracks) if (track.target !== null) intents.push({ type: 'cancel', pointerId: id, target: track.target })
    this.tracks.clear()
    this.resting = false
    return intents
  }
}

function velocity(samples: readonly Sample[], now: number): Point {
  let first: Sample | null = null
  for (const sample of samples) {
    if (now - sample.t <= VELOCITY_WINDOW_MS) {
      first = sample
      break
    }
  }
  const last = samples[samples.length - 1]
  if (!first || !last || last.t <= first.t) return { x: 0, y: 0 }
  const dt = (last.t - first.t) / 1000
  return { x: (last.x - first.x) / dt, y: (last.y - first.y) / dt }
}
