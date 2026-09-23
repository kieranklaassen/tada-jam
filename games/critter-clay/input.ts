// Direct touch. The tracker turns raw pointer events into intents (press,
// tap, drag); the controller decides what an intent does. At most three
// fingers act at once: a fourth means a resting hand, so every gesture is
// cancelled and nothing fires until the whole hand lifts (iPadOS keeps
// four- and five-finger gestures for itself).

export type Screen = { x: number; y: number }

export type Intent<T> =
  | { type: 'press'; pointerId: number; target: T }
  | { type: 'tap'; pointerId: number; target: T }
  | { type: 'dragStart'; pointerId: number; target: T }
  | { type: 'dragMove'; pointerId: number; target: T; at: Screen }
  | { type: 'dragEnd'; pointerId: number; target: T; at: Screen; velocity: Screen }
  | { type: 'cancelAll'; pointerIds: number[] }

export const MAX_FINGERS = 3
/** Pixels a finger may wander before a press becomes a drag. */
export const TAP_SLOP = 12
export const TAP_MAX_MS = 500
/** Time constant of the smoothed finger velocity: long enough to ignore jitter, short enough that a flick reads as a flick. */
const VELOCITY_TAU_MS = 45

type Track<T> = { target: T; startX: number; startY: number; startT: number; dragging: boolean; lastX: number; lastY: number; lastT: number; vx: number; vy: number }

function sample<T>(track: Track<T>, at: Screen, t: number): void {
  const dt = t - track.lastT
  if (dt > 0) {
    const k = 1 - Math.exp(-dt / VELOCITY_TAU_MS)
    track.vx += (((at.x - track.lastX) / dt) * 1000 - track.vx) * k
    track.vy += (((at.y - track.lastY) / dt) * 1000 - track.vy) * k
  }
  track.lastX = at.x
  track.lastY = at.y
  track.lastT = t
}

export class GestureTracker<T> {
  private readonly tracks = new Map<number, Track<T>>()
  private readonly restingIds = new Set<number>()
  private resting = false

  constructor(
    private readonly hitTest: (at: Screen) => T,
    private readonly dragsAtOnce: (target: T) => boolean = () => false,
  ) {}

  get activeCount(): number {
    return this.tracks.size
  }

  get handResting(): boolean {
    return this.resting
  }

  down(pointerId: number, at: Screen, t: number): Intent<T>[] {
    if (this.resting) {
      this.restingIds.add(pointerId)
      return []
    }
    if (this.tracks.size >= MAX_FINGERS) {
      const pointerIds = [...this.tracks.keys()]
      this.tracks.clear()
      this.resting = true
      this.restingIds.clear()
      for (const id of pointerIds) this.restingIds.add(id)
      this.restingIds.add(pointerId)
      return [{ type: 'cancelAll', pointerIds }]
    }
    const target = this.hitTest(at)
    const dragging = this.dragsAtOnce(target)
    this.tracks.set(pointerId, { target, startX: at.x, startY: at.y, startT: t, dragging, lastX: at.x, lastY: at.y, lastT: t, vx: 0, vy: 0 })
    const intents: Intent<T>[] = [{ type: 'press', pointerId, target }]
    if (dragging) intents.push({ type: 'dragStart', pointerId, target })
    return intents
  }

  move(pointerId: number, at: Screen, t: number): Intent<T>[] {
    const track = this.tracks.get(pointerId)
    if (!track || this.resting) return []
    sample(track, at, t)
    const intents: Intent<T>[] = []
    if (!track.dragging && Math.hypot(at.x - track.startX, at.y - track.startY) > TAP_SLOP) {
      track.dragging = true
      intents.push({ type: 'dragStart', pointerId, target: track.target })
    }
    if (track.dragging) intents.push({ type: 'dragMove', pointerId, target: track.target, at })
    return intents
  }

  up(pointerId: number, at: Screen, t: number): Intent<T>[] {
    const track = this.release(pointerId)
    if (!track) return []
    sample(track, at, t)
    if (track.dragging) return [{ type: 'dragEnd', pointerId, target: track.target, at, velocity: { x: track.vx, y: track.vy } }]
    if (t - track.startT <= TAP_MAX_MS) return [{ type: 'tap', pointerId, target: track.target }]
    return []
  }

  cancel(pointerId: number): Intent<T>[] {
    const track = this.release(pointerId)
    if (track?.dragging) return [{ type: 'dragEnd', pointerId, target: track.target, at: { x: track.lastX, y: track.lastY }, velocity: { x: 0, y: 0 } }]
    return []
  }

  /** Forget a lifted finger and return its track; while a hand rests there is none, and the rest ends with its last finger. */
  private release(pointerId: number): Track<T> | undefined {
    if (this.resting) {
      this.restingIds.delete(pointerId)
      if (this.restingIds.size === 0) this.resting = false
      return undefined
    }
    const track = this.tracks.get(pointerId)
    this.tracks.delete(pointerId)
    return track
  }

  /** Forget every finger, e.g. when the game is put away mid-touch and the lift never arrives. */
  reset(): void {
    this.tracks.clear()
    this.restingIds.clear()
    this.resting = false
  }
}
