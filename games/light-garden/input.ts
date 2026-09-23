import type { PieceId, Point } from './layout'

// Direct touch. The tracker turns raw pointers into intents (press, tap,
// drag); the controller decides what they do. At most three fingers act at
// once: a fourth means a hand resting on the glass, so every gesture is
// cancelled and nothing fires until the whole hand lifts.

export type Target = { kind: 'body'; piece: PieceId } | { kind: 'knob'; piece: PieceId } | { kind: 'creature'; index: number } | { kind: 'panel' } | { kind: 'none' }

export type Intent =
  | { type: 'press'; pointerId: number; target: Target; at: Point }
  | { type: 'tap'; pointerId: number; target: Target; at: Point }
  | { type: 'dragStart'; pointerId: number; target: Target; at: Point }
  | { type: 'dragMove'; pointerId: number; target: Target; at: Point }
  | { type: 'dragEnd'; pointerId: number; target: Target; at: Point }
  | { type: 'cancelAll'; pointerIds: number[] }

export const MAX_FINGERS = 3
/** Screen pixels a finger may wander before a press becomes a drag. */
export const TAP_SLOP_PX = 12
export const TAP_MAX_MS = 450

type Track = { target: Target; startScreen: Point; last: Point; startMs: number; dragging: boolean }

export class GestureTracker {
  private readonly tracks = new Map<number, Track>()
  private resting = false
  private readonly hitTest: (screen: Point) => Target

  constructor(hitTest: (screen: Point) => Target) {
    this.hitTest = hitTest
  }

  get activeCount(): number {
    return this.tracks.size
  }

  target(pointerId: number): Target | null {
    return this.tracks.get(pointerId)?.target ?? null
  }

  down(pointerId: number, screen: Point, at: Point, ms: number): Intent[] {
    if (this.resting) {
      this.tracks.set(pointerId, { target: { kind: 'none' }, startScreen: screen, last: at, startMs: ms, dragging: false })
      return []
    }
    if (this.tracks.size >= MAX_FINGERS) {
      const pointerIds = [...this.tracks.keys()]
      this.resting = true
      this.tracks.set(pointerId, { target: { kind: 'none' }, startScreen: screen, last: at, startMs: ms, dragging: false })
      return [{ type: 'cancelAll', pointerIds }]
    }
    const target = this.hitTest(screen)
    this.tracks.set(pointerId, { target, startScreen: screen, last: at, startMs: ms, dragging: false })
    return [{ type: 'press', pointerId, target, at }]
  }

  move(pointerId: number, screen: Point, at: Point): Intent[] {
    const track = this.tracks.get(pointerId)
    if (!track || this.resting) return []
    track.last = at
    if (!track.dragging) {
      if (Math.hypot(screen.x - track.startScreen.x, screen.y - track.startScreen.y) <= TAP_SLOP_PX) return []
      track.dragging = true
      return [
        { type: 'dragStart', pointerId, target: track.target, at },
        { type: 'dragMove', pointerId, target: track.target, at },
      ]
    }
    return [{ type: 'dragMove', pointerId, target: track.target, at }]
  }

  up(pointerId: number, at: Point, ms: number): Intent[] {
    const track = this.tracks.get(pointerId)
    this.tracks.delete(pointerId)
    if (this.resting) {
      if (this.tracks.size === 0) this.resting = false
      return []
    }
    if (!track) return []
    if (track.dragging) return [{ type: 'dragEnd', pointerId, target: track.target, at }]
    if (ms - track.startMs <= TAP_MAX_MS) return [{ type: 'tap', pointerId, target: track.target, at }]
    return [{ type: 'dragEnd', pointerId, target: track.target, at }]
  }

  cancel(pointerId: number): Intent[] {
    const track = this.tracks.get(pointerId)
    this.tracks.delete(pointerId)
    if (this.resting) {
      if (this.tracks.size === 0) this.resting = false
      return []
    }
    return track ? [{ type: 'dragEnd', pointerId, target: track.target, at: track.last }] : []
  }

  /** Forget every finger, e.g. when the table is put away mid-touch and the lift never arrives. */
  reset(): void {
    this.tracks.clear()
    this.resting = false
  }
}
