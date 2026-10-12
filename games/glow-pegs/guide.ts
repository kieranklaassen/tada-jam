import type { Guidance } from './guidance'
import { knobAt } from './layout'
import { centreOf } from './board'

// What the idle ladder shows, chosen from the state (CONCEPTS.md, "Guidance
// ladder"): a glow on what can be touched next, then a ghost hand that shows
// one move. There are two moves to show. The first is the toy's own: a drag
// along the next empty holes. The second is the lever, shown only while it
// is up and the board has something for a beam to play. They take turns, the
// pegs first. The tray handle is never shown: it empties the board.

export type Guide =
  | { kind: 'pegs'; from: { x: number; y: number }; to: { x: number; y: number }; holes: number[] }
  | { kind: 'lever'; from: { x: number; y: number }; to: { x: number; y: number } }

/** What the game says about itself, for the choice. */
export type GuideState = { nextHoles: number[]; leverDown: boolean; anyPeg: boolean }

export function guideFor(state: GuideState, turn: number): Guide | null {
  const lever: Guide | null = !state.leverDown && state.anyPeg ? { kind: 'lever', from: knobAt(0), to: knobAt(1) } : null
  const holes = state.nextHoles
  const pegs: Guide | null = holes.length >= 2 ? { kind: 'pegs', from: centreOf(holes[0]), to: centreOf(holes[holes.length - 1]), holes } : null
  return turn % 2 === 1 ? lever ?? pegs : pegs ?? lever
}

/** Which turn the ladder is on: the demonstration that is playing, or the one that comes next. A touch takes it back to the first. */
export class GuideTurn {
  private last = -1

  of(guidance: Guidance | null): number {
    if (!guidance || guidance.glow <= 0) {
      this.last = -1
      return 0
    }
    if (guidance.demo !== null) {
      this.last = guidance.demoIndex
      return guidance.demoIndex
    }
    return this.last + 1
  }
}
