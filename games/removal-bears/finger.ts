import type { Game, Target } from './game'
import type { ForgivingTouch, Gesture, Point } from './input'
import { inCorner } from './overlay'
import { pick } from './pick'

/** A finger that has slid less than this is still tapping, in pixels: at two a tap is often a small smear. */
export const SMEAR = 30

/** Turns gestures into what the game does. The Mount and the tests both play through here. */
export class Finger {
  private held: Target | null = null
  private from: Point = { x: 0, y: 0 }
  private dragging = false

  constructor(private readonly touch: ForgivingTouch) {}

  act(game: Game, gestures: readonly Gesture[], at: (x: number, y: number) => { u: number; v: number }, width: number): void {
    for (const gesture of gestures) {
      const { u, v } = at(gesture.type === 'dragStart' ? gesture.from.x : gesture.at.x, gesture.type === 'dragStart' ? gesture.from.y : gesture.at.y)
      switch (gesture.type) {
        case 'press':
          // A scene that is only watched ends first, so the finger lands on the picture as the scene leaves it.
          game.landScene()
          // The grown-up's corner is answered as the bare kitchen is.
          this.held = inCorner(gesture.at.x, gesture.at.y, width) ? { type: 'kitchen', u, v } : pick(game, u, v)
          this.from = gesture.at
          this.dragging = false
          if (this.held.type === 'wall' || this.held.type === 'cloth' || this.held.type === 'kitchen') this.touch.landedOnNothing()
          game.press_(this.held, u, v)
          break
        case 'extra':
          game.extra(u, v)
          break
        case 'tap':
          if (this.held) game.tap(this.held)
          this.held = null
          break
        case 'pressEnd':
          game.pressEnd()
          this.held = null
          break
        case 'dragStart':
          break
        case 'dragMove':
        case 'dragLift':
          if (!this.held) break
          if (!this.dragging && Math.hypot(gesture.at.x - this.from.x, gesture.at.y - this.from.y) < SMEAR) {
            // A smeared tap is a tap, and is answered at the lift.
            if (gesture.type === 'dragLift') { this.touch.clear(); game.tap(this.held); this.held = null }
            break
          }
          if (!this.dragging) { this.dragging = true; game.dragStart(this.held) }
          game.dragTo(u, v)
          break
        case 'dragEnd':
          if (this.held) { if (this.dragging) game.letGo(u, v); else game.tap(this.held) }
          this.held = null
          break
        // The drag was taken away and the child made no drop: the bears go back to where they were.
        case 'dragCancel':
          game.cancel()
          this.held = null
          break
        default:
          // No gesture is left once each has its case. One the game forgets arrives here and stops the typecheck.
          gesture satisfies never
      }
    }
  }
}
