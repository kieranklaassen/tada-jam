// Direct-touch gestures in screen pixels. The tracker turns pointer events
// into press / tap / drag calls on a handler; the controller decides what
// they mean. At most three fingers act at once: a fourth means a resting
// hand, so every gesture is cancelled and nothing fires until all lift.

export type Target =
  | { kind: 'pouchSeed'; slot: number }
  | { kind: 'pouch' }
  | { kind: 'seed'; id: number }
  | { kind: 'flower'; plot: number }
  | { kind: 'molehill'; plot: number }
  | { kind: 'bee' }
  | { kind: 'snail' }
  | { kind: 'mouse' }
  | { kind: 'grass' }

export type GestureHandler = {
  press(pointerId: number, target: Target): void
  tap(pointerId: number, target: Target): void
  dragStart(pointerId: number, target: Target): void
  dragEnd(pointerId: number, target: Target): void
  cancel(pointerId: number, target: Target): void
}

export const MAX_FINGERS = 3
export const TAP_SLOP_PX = 14
export const TAP_MAX_MS = 450

type Track = { target: Target; x0: number; y0: number; t0: number; dragging: boolean }

export class GestureTracker {
  private readonly tracks = new Map<number, Track>()
  private resting = false
  private readonly handler: GestureHandler
  private readonly hitTest: (x: number, y: number) => Target

  constructor(handler: GestureHandler, hitTest: (x: number, y: number) => Target) {
    this.handler = handler
    this.hitTest = hitTest
  }

  get active(): number {
    return this.tracks.size
  }

  down(pointerId: number, x: number, y: number, t: number): void {
    if (this.resting) {
      this.tracks.set(pointerId, { target: { kind: 'grass' }, x0: x, y0: y, t0: t, dragging: false })
      return
    }
    if (this.tracks.size >= MAX_FINGERS) {
      this.resting = true
      for (const [id, track] of this.tracks) this.handler.cancel(id, track.target)
      this.tracks.set(pointerId, { target: { kind: 'grass' }, x0: x, y0: y, t0: t, dragging: false })
      return
    }
    const target = this.hitTest(x, y)
    this.tracks.set(pointerId, { target, x0: x, y0: y, t0: t, dragging: false })
    this.handler.press(pointerId, target)
  }

  move(pointerId: number, x: number, y: number): void {
    const track = this.tracks.get(pointerId)
    if (!track || this.resting || track.dragging) return
    if (Math.hypot(x - track.x0, y - track.y0) > TAP_SLOP_PX) {
      track.dragging = true
      this.handler.dragStart(pointerId, track.target)
    }
  }

  up(pointerId: number, t: number): void {
    const track = this.tracks.get(pointerId)
    this.tracks.delete(pointerId)
    if (this.resting) {
      if (this.tracks.size === 0) this.resting = false
      return
    }
    if (!track) return
    if (track.dragging) this.handler.dragEnd(pointerId, track.target)
    else if (t - track.t0 <= TAP_MAX_MS) this.handler.tap(pointerId, track.target)
    else this.handler.dragEnd(pointerId, track.target)
  }

  cancelPointer(pointerId: number): void {
    const track = this.tracks.get(pointerId)
    this.tracks.delete(pointerId)
    if (this.resting) {
      if (this.tracks.size === 0) this.resting = false
      return
    }
    if (track) this.handler.cancel(pointerId, track.target)
  }

  /** Forget every finger (the meadow was put away mid-touch and the lifts never arrive). */
  reset(): void {
    for (const [id, track] of this.tracks) if (!this.resting) this.handler.cancel(id, track.target)
    this.tracks.clear()
    this.resting = false
  }
}
