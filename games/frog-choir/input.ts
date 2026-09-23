// Direct touch on the pond. A finger that lifts close to where it landed,
// quickly, is a tap; one that travels is a drag. At most three fingers act:
// a fourth means a resting hand, so every gesture is cancelled and nothing
// more fires until the whole hand lifts (iPadOS keeps four and five for
// itself).

export const MAX_FINGERS = 3
export const TAP_SLOP_PX = 14
export const TAP_MAX_MS = 500

export type Gestures<T> = {
  press(pointerId: number, target: T): void
  tap(pointerId: number, target: T): void
  dragStart(pointerId: number, target: T, x: number, y: number): void
  dragMove(pointerId: number, target: T, x: number, y: number): void
  dragEnd(pointerId: number, target: T, x: number, y: number): void
  /** A resting hand, a put-away, or a cancelled pointer: end this gesture with no effect. */
  cancel(pointerId: number, target: T): void
}

type Finger<T> = { target: T; x0: number; y0: number; t0: number; dragging: boolean }

export class GestureTracker<T> {
  private readonly fingers = new Map<number, Finger<T>>()
  /** Every pointer currently down, acting or not; a resting hand ends when this empties. */
  private readonly down_ = new Set<number>()
  private resting = false
  private readonly hitTest: (x: number, y: number) => T
  private readonly out: Gestures<T>

  constructor(hitTest: (x: number, y: number) => T, out: Gestures<T>) {
    this.hitTest = hitTest
    this.out = out
  }

  get activeCount(): number {
    return this.fingers.size
  }

  down(pointerId: number, x: number, y: number, timeMs: number): void {
    this.down_.add(pointerId)
    if (this.resting) return
    if (this.fingers.size >= MAX_FINGERS) {
      this.resting = true
      this.cancelAll()
      return
    }
    const target = this.hitTest(x, y)
    this.fingers.set(pointerId, { target, x0: x, y0: y, t0: timeMs, dragging: false })
    this.out.press(pointerId, target)
  }

  move(pointerId: number, x: number, y: number): void {
    const finger = this.fingers.get(pointerId)
    if (!finger) return
    if (!finger.dragging && Math.hypot(x - finger.x0, y - finger.y0) > TAP_SLOP_PX) {
      finger.dragging = true
      this.out.dragStart(pointerId, finger.target, finger.x0, finger.y0)
    }
    if (finger.dragging) this.out.dragMove(pointerId, finger.target, x, y)
  }

  up(pointerId: number, x: number, y: number, timeMs: number): void {
    const finger = this.fingers.get(pointerId)
    this.lift(pointerId)
    if (!finger) return
    if (finger.dragging) this.out.dragEnd(pointerId, finger.target, x, y)
    else if (timeMs - finger.t0 <= TAP_MAX_MS) this.out.tap(pointerId, finger.target)
    else this.out.cancel(pointerId, finger.target)
  }

  pointerCancel(pointerId: number): void {
    const finger = this.fingers.get(pointerId)
    this.lift(pointerId)
    if (finger) this.out.cancel(pointerId, finger.target)
  }

  /** Forget every finger, e.g. when the pond is put away mid-touch and the lift never arrives. */
  reset(): void {
    this.cancelAll()
    this.down_.clear()
    this.resting = false
  }

  private lift(pointerId: number): void {
    this.fingers.delete(pointerId)
    this.down_.delete(pointerId)
    if (this.down_.size === 0) this.resting = false
  }

  private cancelAll(): void {
    for (const [pointerId, finger] of this.fingers) this.out.cancel(pointerId, finger.target)
    this.fingers.clear()
  }
}
