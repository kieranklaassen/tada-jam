// Direct touch. The tracker turns pointer events into intents and leaves
// meaning to the controller. At most three fingers act at once: a fourth is
// a resting hand, so every gesture is cancelled and nothing fires until the
// whole hand lifts (iPadOS keeps four- and five-finger gestures for itself).

export type Point = { x: number; y: number }

export type Intent<T> =
  | { type: 'press'; id: number; target: T; at: Point }
  | { type: 'tap'; id: number; target: T; at: Point }
  | { type: 'dragStart'; id: number; target: T; at: Point }
  | { type: 'dragMove'; id: number; target: T; at: Point; speed: number }
  | { type: 'dragEnd'; id: number; target: T; at: Point }
  | { type: 'cancelAll'; ids: number[] }

export const MAX_FINGERS = 3
export const TAP_SLOP = 14
export const TAP_MAX_MS = 450
const SPEED_WINDOW_MS = 90

type Sample = { x: number; y: number; t: number }
type Track<T> = { target: T; start: Sample; samples: Sample[]; dragging: boolean }

export class GestureTracker<T> {
  private tracks = new Map<number, Track<T>>()
  private resting = false
  private readonly hitTest: (at: Point) => T
  private readonly dragsAt: (target: T) => boolean

  /** `dragsAt` says whether a target starts dragging on contact (no tap slop), like the needles. */
  constructor(hitTest: (at: Point) => T, dragsAt: (target: T) => boolean = () => false) {
    this.hitTest = hitTest
    this.dragsAt = dragsAt
  }

  get active(): number {
    return this.tracks.size
  }

  down(id: number, at: Point, t: number): Intent<T>[] {
    if (this.resting) {
      this.tracks.set(id, { target: null as T, start: { ...at, t }, samples: [], dragging: false })
      return []
    }
    if (this.tracks.size >= MAX_FINGERS) {
      const ids = [...this.tracks.keys()]
      this.resting = true
      this.tracks.set(id, { target: null as T, start: { ...at, t }, samples: [], dragging: false })
      return [{ type: 'cancelAll', ids }]
    }
    const target = this.hitTest(at)
    const sample = { ...at, t }
    const dragging = this.dragsAt(target)
    this.tracks.set(id, { target, start: sample, samples: [sample], dragging })
    const intents: Intent<T>[] = [{ type: 'press', id, target, at }]
    if (dragging) intents.push({ type: 'dragStart', id, target, at })
    return intents
  }

  move(id: number, at: Point, t: number): Intent<T>[] {
    const track = this.tracks.get(id)
    if (!track || this.resting) return []
    track.samples.push({ ...at, t })
    while (track.samples.length > 2 && t - track.samples[0].t > SPEED_WINDOW_MS) track.samples.shift()
    const intents: Intent<T>[] = []
    if (!track.dragging && Math.hypot(at.x - track.start.x, at.y - track.start.y) > TAP_SLOP) {
      track.dragging = true
      intents.push({ type: 'dragStart', id, target: track.target, at: { x: track.start.x, y: track.start.y } })
    }
    if (track.dragging) intents.push({ type: 'dragMove', id, target: track.target, at, speed: speedOf(track.samples) })
    return intents
  }

  up(id: number, at: Point, t: number): Intent<T>[] {
    const track = this.tracks.get(id)
    this.tracks.delete(id)
    if (this.resting) {
      if (this.tracks.size === 0) this.resting = false
      return []
    }
    if (!track) return []
    if (track.dragging) return [{ type: 'dragEnd', id, target: track.target, at }]
    if (t - track.start.t <= TAP_MAX_MS) return [{ type: 'tap', id, target: track.target, at }]
    return []
  }

  cancel(id: number): Intent<T>[] {
    const track = this.tracks.get(id)
    this.tracks.delete(id)
    if (this.resting) {
      if (this.tracks.size === 0) this.resting = false
      return []
    }
    if (track?.dragging) {
      const last = track.samples[track.samples.length - 1] ?? track.start
      return [{ type: 'dragEnd', id, target: track.target, at: { x: last.x, y: last.y } }]
    }
    return []
  }

  /** Forget every finger (the game was put away mid-touch and the lift never arrives). */
  reset(): void {
    this.tracks.clear()
    this.resting = false
  }
}

/** Pixels per second over the recent samples. */
function speedOf(samples: readonly Sample[]): number {
  if (samples.length < 2) return 0
  const first = samples[0]
  const last = samples[samples.length - 1]
  const dt = (last.t - first.t) / 1000
  return dt > 0 ? Math.hypot(last.x - first.x, last.y - first.y) / dt : 0
}
