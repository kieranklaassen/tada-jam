import type { Kind } from './ground'
import { handPose, type Guidance, type HandPose } from './guidance'
import type { Point } from './input'

// What the idle ladder shows in the glade: first a glow on one place, then a
// ghost hand that makes one move there. Which move is the one next act the
// village as it stands has room for: press and hold on free moss (with the
// faint shape of a mushroom swelling under the hand for as long as it stays
// down), a door carried from the cart to a mushroom, pebbles drawn from a
// gnome who waits to a door, or a tap on the sun. It shows the move, on a
// ground the child may not have tried, and nothing about what to build.

/** Free places the hand may show, a few for each ground, in the order they are tried. */
export const PLACES: Readonly<Record<Kind, readonly Point[]>> = {
  red: [{ x: 1010, y: 500 }, { x: 1100, y: 530 }, { x: 900, y: 540 }, { x: 520, y: 470 }],
  bell: [{ x: 640, y: 400 }, { x: 780, y: 548 }, { x: 760, y: 440 }],
  puff: [{ x: 290, y: 450 }, { x: 190, y: 400 }, { x: 380, y: 490 }],
}

const ORDER: readonly Kind[] = ['red', 'bell', 'puff']

/** How big the ghost mushroom gets under the hand: enough to see that holding is growing, and short of full. */
export const GHOST_TO = 7

/** The one act the hand may show now. `grow` needs no places: the hand finds a free one. */
export type Act =
  | { act: 'grow' }
  | { act: 'door'; from: Point; to: Point }
  | { act: 'path'; from: Point; to: Point }
  | { act: 'sun'; at: Point }

export type Hint = {
  act: Act['act']
  /** Where the glow is, and where the hand comes down. */
  at: Point
  /** Where a hand that carries or draws goes, or null for a hand that stays. */
  to: Point | null
  kind: Kind
  /** 0 to 1: the glow on the place. */
  glow: number
  /** The hand, or null before it comes: where its fingertip is, how far it is pressed (0 up, 1 down) and how solid it is. */
  hand: { x: number; y: number; press: number; opacity: number } | null
  /** The size of the ghost mushroom under the hand, 0 when there is none. */
  ghost: number
}

const span = (t: number, a: number, b: number): number => Math.min(1, Math.max(0, (t - a) / (b - a)))

/** The hand over one showing of a hold: it comes, presses, stays down, lifts and goes. */
export function holdPose(progress: number): { press: number; opacity: number; held: number } {
  return {
    opacity: Math.min(span(progress, 0, 0.1), 1 - span(progress, 0.9, 1)),
    press: Math.min(span(progress, 0.14, 0.2), 1 - span(progress, 0.76, 0.82)),
    /** 0 to 1 through the time the hand is down. */
    held: span(progress, 0.2, 0.76),
  }
}

export class Hints {
  /** Which ground the next showing uses: each showing moves on to the next. */
  private turn = 0
  private showing = false
  private readonly pose: HandPose = { travel: 0, press: 0, opacity: 0 }

  /** What to show now, or null when the ladder is at the bottom or the glade has no free place. */
  update(guidance: Guidance | null, hasRoom: (x: number, y: number) => boolean, want: Act = { act: 'grow' }): Hint | null {
    if (!guidance || (guidance.glow <= 0 && guidance.demo === null)) {
      if (!guidance || guidance.glow <= 0) { this.turn = 0; this.showing = false }
      return null
    }
    // A showing that has ended hands the glow on to the next ground.
    if (guidance.demo === null && this.showing) { this.turn += 1; this.showing = false }
    if (guidance.demo !== null) this.showing = true
    if (want.act !== 'grow') {
      const at = want.act === 'sun' ? want.at : want.from, to = want.act === 'sun' ? null : want.to
      if (guidance.demo === null) return { act: want.act, at, to, kind: 'red', glow: guidance.glow, hand: null, ghost: 0 }
      const pose = handPose(guidance.demo, to !== null, this.pose)
      return { act: want.act, at, to, kind: 'red', glow: guidance.glow, hand: { x: at.x + ((to?.x ?? at.x) - at.x) * pose.travel, y: at.y + ((to?.y ?? at.y) - at.y) * pose.travel, press: pose.press, opacity: pose.opacity }, ghost: 0 }
    }
    for (let i = 0; i < ORDER.length; i++) {
      const kind = ORDER[(this.turn + i) % ORDER.length]
      const at = PLACES[kind].find((place) => hasRoom(place.x, place.y))
      if (!at) continue
      if (guidance.demo === null) return { act: 'grow', at, to: null, kind, glow: guidance.glow, hand: null, ghost: 0 }
      const pose = holdPose(guidance.demo)
      return { act: 'grow', at, to: null, kind, glow: guidance.glow, hand: { x: at.x, y: at.y, press: pose.press, opacity: pose.opacity }, ghost: pose.press > 0.5 ? 1 + pose.held * (GHOST_TO - 1) : 0 }
    }
    return null
  }
}
