// Direct-touch gestures. The tracker turns raw pointer events into intents;
// the controller decides what an intent does. At most three fingers act at
// once: a fourth means a resting hand, so every gesture is cancelled and
// nothing fires until the whole hand lifts (iPadOS keeps four- and
// five-finger gestures for itself).

export type ScreenPoint = { x: number; y: number }

export type Intent =
  | { type: 'press'; pointerId: number }
  | { type: 'tap'; pointerId: number }
  | { type: 'dragStart'; pointerId: number }
  | { type: 'dragEnd'; pointerId: number }
  | { type: 'cancelAll'; pointerIds: number[] }

export const MAX_FINGERS = 3
export const TAP_SLOP = 14
export const TAP_MAX_MS = 350

type Track = { startX: number; startY: number; startT: number; dragging: boolean }

export class GestureTracker {
  private readonly tracks = new Map<number, Track>()
  private resting = false

  get activeCount(): number {
    return this.tracks.size
  }

  down(pointerId: number, at: ScreenPoint, t: number): Intent[] {
    if (this.resting) {
      this.tracks.set(pointerId, { startX: at.x, startY: at.y, startT: t, dragging: false })
      return []
    }
    if (this.tracks.size >= MAX_FINGERS) {
      const pointerIds = [...this.tracks.keys()]
      this.resting = true
      this.tracks.set(pointerId, { startX: at.x, startY: at.y, startT: t, dragging: false })
      return [{ type: 'cancelAll', pointerIds }]
    }
    this.tracks.set(pointerId, { startX: at.x, startY: at.y, startT: t, dragging: false })
    return [{ type: 'press', pointerId }]
  }

  move(pointerId: number, at: ScreenPoint): Intent[] {
    const track = this.tracks.get(pointerId)
    if (!track || this.resting || track.dragging) return []
    if (Math.hypot(at.x - track.startX, at.y - track.startY) <= TAP_SLOP) return []
    track.dragging = true
    return [{ type: 'dragStart', pointerId }]
  }

  up(pointerId: number, t: number): Intent[] {
    const track = this.tracks.get(pointerId)
    this.tracks.delete(pointerId)
    if (this.resting) {
      if (this.tracks.size === 0) this.resting = false
      return []
    }
    if (!track) return []
    if (!track.dragging && t - track.startT <= TAP_MAX_MS) return [{ type: 'tap', pointerId }]
    return [{ type: 'dragEnd', pointerId }]
  }

  cancel(pointerId: number): Intent[] {
    const track = this.tracks.get(pointerId)
    this.tracks.delete(pointerId)
    if (this.resting) {
      if (this.tracks.size === 0) this.resting = false
      return []
    }
    return track ? [{ type: 'dragEnd', pointerId }] : []
  }

  /** Forget every finger, e.g. when the forest is put away mid-touch and the lift never arrives. */
  reset(): void {
    this.tracks.clear()
    this.resting = false
  }
}
