// template: cartridge/input.ts v3

// Touch for a small hand (pack: game-design, ages-2-to-4.md). The tracker
// turns pointer events into gestures and leaves their meaning to the game.
// - One finger works at a time. Other fingers, or a palm resting on the
//   glass, are ignored: they never cancel the finger that is working, and
//   they do nothing of their own, so a second finger on a thing gets no
//   answer. For a whole small hand on the glass that is the safer rule.
// - A drag survives a briefly lifted finger. The thing in hand waits where it
//   was let go, and a finger coming back near it soon enough carries on with
//   the same drag.
// - A drag counts when partly done: `countsAsDone` says whether it got far
//   enough toward where it was going for the game to finish it. It and
//   `progressToward` are for a drag that has a target. A rub has none: it
//   counts stroke by stroke as `dragMove` arrives, and uses neither.
// - A lifted drag gives two gestures: `dragLift` at the moment of the lift,
//   and `dragEnd` when the drag is given up. A finger that comes back in
//   between arrives as a `dragMove` with no `press` before it. A game whose
//   lift is the act, or whose targets stand nearer than `REGRAB_RADIUS`,
//   takes the lift for the end with `letGo`, and every touch-down is then a
//   touch of its own.
// - A drag that is taken away is not a drop. When the surface is parked
//   under a finger that is still down, or the browser takes that finger, the
//   drag ends as `dragCancel`: the child did not let go, so the game puts
//   the thing back where it came from and makes no move. A press taken away
//   the same way ends as `pressEnd`, which is not a tap. Every drag has one
//   ending, `dragEnd` or `dragCancel`.
// - Every `press` is followed by exactly one of `tap`, `dragStart` or
//   `pressEnd`, so whatever the game squashes or lights on a press always has
//   a gesture on which to let it go.
// - A `press` is not followed by a `dragMove` until the finger has gone
//   further than `TAP_SLOP` from where it landed. Whatever starts on `press`
//   (the answer to the touch, the first stroke of a rub) starts there and
//   then, and never waits for a move.
// Points are in whatever space the Mount passes in; times are in ms.

export type Point = { x: number; y: number }

export type Gesture =
  | { type: 'press'; at: Point }
  | { type: 'tap'; at: Point }
  /** The press is over and was not a tap: the browser took the finger away, or the surface was parked under it. */
  | { type: 'pressEnd'; at: Point }
  | { type: 'dragStart'; from: Point }
  | { type: 'dragMove'; from: Point; at: Point }
  /** The finger let go mid-drag. The drag is not over: show the thing waiting. */
  | { type: 'dragLift'; from: Point; at: Point }
  /** The drag is over where the finger let go: the drop is the child's. */
  | { type: 'dragEnd'; from: Point; at: Point }
  /** The drag was taken away with the finger still down. The child made no drop: put the thing back. */
  | { type: 'dragCancel'; from: Point; at: Point }

/** A finger that stays within this of where it went down is tapping, not dragging. */
export const TAP_SLOP = 14
/** How long a lifted finger may stay away before its drag ends. */
export const LIFT_GRACE_MS = 300
/** How near the lift a finger must come back to carry on the same drag. */
export const REGRAB_RADIUS = 140
/** The share of the way to its target from which a drag counts as done. */
export const COUNTS_FROM = 0.5

type Working = {
  /** The pointer that is working, or null while it is lifted mid-drag. */
  id: number | null
  from: Point
  at: Point
  dragging: boolean
  liftedAt: number
}

export class ForgivingTouch {
  private working: Working | null = null

  /** A finger is working, or a drag is waiting out a lift. */
  get active(): boolean {
    return this.working !== null
  }

  /** Whether that pointer is the finger that is working. An extra finger or a palm is not, and neither is a finger that has lifted mid-drag. */
  holds(id: number): boolean {
    return this.working !== null && this.working.id === id
  }

  down(id: number, at: Point, t: number): Gesture[] {
    const working = this.working
    // An extra finger or a palm: the working finger carries on.
    if (working && working.id !== null) return []
    const gestures: Gesture[] = []
    if (working) {
      if (t - working.liftedAt <= LIFT_GRACE_MS && Math.hypot(at.x - working.at.x, at.y - working.at.y) <= REGRAB_RADIUS) {
        working.id = id
        working.at = at
        return [{ type: 'dragMove', from: working.from, at }]
      }
      gestures.push({ type: 'dragEnd', from: working.from, at: working.at })
    }
    this.working = { id, from: at, at, dragging: false, liftedAt: 0 }
    gestures.push({ type: 'press', at })
    return gestures
  }

  move(id: number, at: Point): Gesture[] {
    const working = this.working
    if (!working || working.id !== id) return []
    working.at = at
    const gestures: Gesture[] = []
    if (!working.dragging && Math.hypot(at.x - working.from.x, at.y - working.from.y) > TAP_SLOP) {
      working.dragging = true
      gestures.push({ type: 'dragStart', from: working.from })
    }
    if (working.dragging) gestures.push({ type: 'dragMove', from: working.from, at })
    return gestures
  }

  up(id: number, at: Point, t: number): Gesture[] {
    const working = this.working
    if (!working || working.id !== id) return []
    if (!working.dragging) {
      this.working = null
      return [{ type: 'tap', at }]
    }
    working.at = at
    return this.lift(working, t)
  }

  /** The browser took the pointer away, which is not the child letting go. A drag is cancelled; a press ends without a tap. */
  cancel(id: number): Gesture[] {
    const working = this.working
    if (!working || working.id !== id) return []
    this.working = null
    return [working.dragging ? { type: 'dragCancel', from: working.from, at: working.at } : { type: 'pressEnd', at: working.at }]
  }

  /** Call every frame: a lift that has outlasted the grace ends its drag where it was let go. */
  advance(t: number): Gesture[] {
    const working = this.working
    if (!working || working.id !== null || t - working.liftedAt <= LIFT_GRACE_MS) return []
    this.working = null
    return [{ type: 'dragEnd', from: working.from, at: working.at }]
  }

  /**
   * The game takes the lift for the end of the drag: a drag that is waiting out a lift ends now, where it was let
   * go. Call it straight after `up`, in the same handler, and the drop and its sound fall inside the touch.
   */
  letGo(): Gesture[] {
    return this.advance(Infinity)
  }

  /**
   * The surface was parked or hidden mid-touch, and the lifts will never arrive. A drag whose finger is still
   * down is cancelled, since the child did not let go; a drag that was waiting out a lift ends where it was let
   * go, since that drop is the child's; a press ends without a tap; nothing else is left.
   */
  clear(): Gesture[] {
    const working = this.working
    this.working = null
    if (!working) return []
    if (!working.dragging) return [{ type: 'pressEnd', at: working.at }]
    return [{ type: working.id === null ? 'dragEnd' : 'dragCancel', from: working.from, at: working.at }]
  }

  private lift(working: Working, t: number): Gesture[] {
    working.id = null
    working.liftedAt = t
    return [{ type: 'dragLift', from: working.from, at: working.at }]
  }
}

/** How far a drag got from where it began toward its target, 0 to 1, measured along the straight line between them. */
export function progressToward(from: Point, at: Point, target: Point): number {
  const dx = target.x - from.x, dy = target.y - from.y
  const length = dx * dx + dy * dy
  if (length === 0) return 1
  return Math.max(0, Math.min(1, ((at.x - from.x) * dx + (at.y - from.y) * dy) / length))
}

/** A drag let go partway counts as done once it has come far enough: the game finishes the move for the child. */
export function countsAsDone(from: Point, at: Point, target: Point): boolean {
  return progressToward(from, at, target) >= COUNTS_FROM
}
