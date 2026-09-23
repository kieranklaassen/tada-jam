// Touch in, intents out. A finger that lifts without travelling is a tap;
// one that travels is a drag. At most three fingers act at once: a fourth
// means a resting hand, so every gesture is cancelled and nothing fires
// until the whole hand has lifted (iPadOS keeps four- and five-finger
// gestures for itself).

export type Point = { x: number; y: number }

export type Intent =
  | { type: 'press'; id: number; at: Point }
  | { type: 'tap'; id: number; at: Point }
  | { type: 'dragStart'; id: number; from: Point; at: Point }
  | { type: 'dragMove'; id: number; at: Point }
  | { type: 'dragEnd'; id: number; at: Point }
  | { type: 'cancel'; ids: number[] }

export const MAX_FINGERS = 3
export const TAP_SLOP = 14
export const TAP_MAX_MS = 500

type Track = { start: Point; startT: number; last: Point; dragging: boolean }

export class Gestures {
  private readonly tracks = new Map<number, Track>()
  private readonly restingIds = new Set<number>()
  private resting = false

  get count(): number {
    return this.tracks.size
  }

  down(id: number, at: Point, t: number): Intent[] {
    if (this.resting) {
      this.restingIds.add(id)
      return []
    }
    if (this.tracks.size >= MAX_FINGERS) {
      const ids = [...this.tracks.keys()]
      this.tracks.clear()
      this.resting = true
      this.restingIds.add(id)
      for (const other of ids) this.restingIds.add(other)
      return [{ type: 'cancel', ids }]
    }
    this.tracks.set(id, { start: { ...at }, startT: t, last: { ...at }, dragging: false })
    return [{ type: 'press', id, at }]
  }

  move(id: number, at: Point): Intent[] {
    const track = this.tracks.get(id)
    if (!track) return []
    track.last.x = at.x
    track.last.y = at.y
    if (!track.dragging) {
      if (Math.hypot(at.x - track.start.x, at.y - track.start.y) <= TAP_SLOP) return []
      track.dragging = true
      return [{ type: 'dragStart', id, from: { ...track.start }, at }]
    }
    return [{ type: 'dragMove', id, at }]
  }

  up(id: number, at: Point, t: number): Intent[] {
    if (this.lift(id)) return []
    const track = this.tracks.get(id)
    if (!track) return []
    this.tracks.delete(id)
    if (track.dragging) return [{ type: 'dragEnd', id, at }]
    if (t - track.startT <= TAP_MAX_MS) return [{ type: 'tap', id, at }]
    return []
  }

  cancel(id: number): Intent[] {
    if (this.lift(id)) return []
    const track = this.tracks.get(id)
    if (!track) return []
    this.tracks.delete(id)
    return track.dragging ? [{ type: 'dragEnd', id, at: { ...track.last } }] : []
  }

  /** Forget every finger (the garden was put away mid-touch). */
  reset(): void {
    this.tracks.clear()
    this.restingIds.clear()
    this.resting = false
  }

  /** While a resting hand lifts, swallow its fingers; returns true if this lift belonged to it. */
  private lift(id: number): boolean {
    if (!this.resting) return false
    this.restingIds.delete(id)
    if (this.restingIds.size === 0) this.resting = false
    return true
  }
}
