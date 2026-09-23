import type { Vec2 } from './pieces'

// Touch gestures, as intents. A press becomes a drag once the finger moves
// past a small slop, or a tap if it lifts quickly. At most three fingers act
// at once: a fourth means a resting hand, so every gesture is cancelled and
// nothing fires until the whole hand lifts (iPadOS keeps four- and
// five-finger gestures for itself).

export type Target =
  | { kind: 'piece'; id: number }
  | { kind: 'tray'; id: number }
  | { kind: 'doll' }
  | { kind: 'watcher'; index: number }
  | { kind: 'kite' }
  | { kind: 'none' }

export type Intent =
  | { type: 'press'; pointer: number; target: Target; at: Vec2 }
  | { type: 'tap'; pointer: number; target: Target; at: Vec2 }
  | { type: 'dragStart'; pointer: number; target: Target; at: Vec2 }
  | { type: 'dragMove'; pointer: number; target: Target; at: Vec2 }
  | { type: 'dragEnd'; pointer: number; target: Target; at: Vec2 }
  | { type: 'cancelAll'; pointers: number[] }

export const MAX_FINGERS = 3
export const SLOP_PX = 14
export const TAP_MS = 450

type Finger = { target: Target; start: Vec2; startT: number; last: Vec2; dragging: boolean }

export class Gestures {
  private readonly fingers = new Map<number, Finger>()
  private resting = false
  private readonly hit: (at: Vec2) => Target

  constructor(hit: (at: Vec2) => Target) {
    this.hit = hit
  }

  get count(): number {
    return this.fingers.size
  }

  down(pointer: number, at: Vec2, t: number): Intent[] {
    const none: Target = { kind: 'none' }
    if (this.resting) {
      this.fingers.set(pointer, { target: none, start: at, startT: t, last: at, dragging: false })
      return []
    }
    if (this.fingers.size >= MAX_FINGERS) {
      const pointers = [...this.fingers.keys()]
      this.resting = true
      this.fingers.set(pointer, { target: none, start: at, startT: t, last: at, dragging: false })
      return [{ type: 'cancelAll', pointers }]
    }
    const target = this.hit(at)
    this.fingers.set(pointer, { target, start: at, startT: t, last: at, dragging: false })
    return [{ type: 'press', pointer, target, at }]
  }

  move(pointer: number, at: Vec2): Intent[] {
    const finger = this.fingers.get(pointer)
    if (!finger || this.resting) return []
    finger.last = at
    if (!finger.dragging) {
      if (Math.hypot(at.x - finger.start.x, at.y - finger.start.y) <= SLOP_PX) return []
      finger.dragging = true
      return [
        { type: 'dragStart', pointer, target: finger.target, at: finger.start },
        { type: 'dragMove', pointer, target: finger.target, at },
      ]
    }
    return [{ type: 'dragMove', pointer, target: finger.target, at }]
  }

  up(pointer: number, at: Vec2, t: number): Intent[] {
    const finger = this.fingers.get(pointer)
    this.fingers.delete(pointer)
    if (this.resting) {
      if (this.fingers.size === 0) this.resting = false
      return []
    }
    if (!finger) return []
    if (finger.dragging) return [{ type: 'dragEnd', pointer, target: finger.target, at }]
    if (t - finger.startT <= TAP_MS) return [{ type: 'tap', pointer, target: finger.target, at }]
    return []
  }

  cancel(pointer: number): Intent[] {
    const finger = this.fingers.get(pointer)
    if (!finger) return []
    return this.up(pointer, finger.last, Infinity)
  }

  /** Forget every finger (put away mid-touch: the lift never arrives). */
  reset(): void {
    this.fingers.clear()
    this.resting = false
  }
}
