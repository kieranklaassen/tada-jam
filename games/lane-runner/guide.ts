import { DEMO_SECONDS, handPose, type Guidance, type HandPose } from './guidance'
import type { LoadName } from './loads'

// What the idle ladder shows. There is always one thing a child would want
// next, and it depends on where the lap is:
//
// - at the shelf with empty hands, the loads: each beckons in a pool of
//   light, and the ghost hand taps one of them;
// - anywhere else on the trail, the fox: a pool of light on the board round
//   its feet, and the hand comes down beside it and stays down, at which the
//   fox jogs on the spot, so the press is seen to be what makes it go. The
//   showings on the trail take turns at the four things a finger does there:
//   it only stays down, it slides to one side (a lane), it flicks up (a
//   jump), it flicks down (a roll). A slide and a flick are quick moves, and
//   the hand makes them as quickly as a finger must: its own path, read as
//   a finger's, is a slide of one lane, a jump or a roll. The fox hops or
//   ducks on the spot when the flick is made. The turn goes on from one idle stretch to the next, so a
//   child who stops and looks is not shown the same move each time;
// - after the hand-over, the fox again: the hand taps beside it, which is
//   what begins the next lap.
//
// It shows a move and never a way through anything.

export type Wants = 'load' | 'run' | 'next'

export type Hint = {
  wants: Wants
  /** 0 to 1: how bright the light is. */
  glow: number
  /** The ghost hand, or null when it is not showing. */
  hand: HandPose | null
  /** 0 to 1: how hard the hand presses on the trail, which is how hard the fox jogs on the spot. */
  mime: number
  /** Pegs the hand has slid to the right of where it came down. */
  slide: number
  /** -1 to 1: how far through a flick the hand is, up when positive and down when negative. It stays where the flick left it. */
  flick: number
  /** 0 to 1: how far through its answer to the flick the fox is, a hop for up and a duck for down, which begins when the flick is made. */
  answer: number
  /** The load the hand taps at the shelf. */
  load: LoadName
}

/** Pegs a showing of the slide carries the hand: half a lane, quickly, which a finger's own slide of that length reads as one lane and no more. */
export const SLIDE = 10
/** When in a showing the hand makes its move, as a share of the showing, and the seconds a slide, a flick and the fox's answer to a flick take. */
export const MOVE_AT = 0.4
export const SLIDE_SHOWN = 0.15
export const FLICK_SHOWN = 0.07
export const ANSWER_SHOWN = 0.6
/** The four things a finger does on the trail, in the order the showings take them. */
export const MOVES = ['hold', 'slide', 'up', 'down'] as const
export type Move = (typeof MOVES)[number]

/**
 * The load the ghost hand reaches for at the shelf. It is the one default the child's age sets, read from the
 * age each time and never saved: the balloons, which forgive the most, for 7 and younger and for no age; the
 * cake, which forgives the least, from 8 up. Every load can be taken at every age.
 */
export function loadShown(childAge: number | null): LoadName {
  return childAge !== null && childAge >= 8 ? 'cake' : 'balloons'
}

const pose: HandPose = { travel: 0, press: 0, opacity: 0 }

/**
 * The hint for this frame. `resting` is whether the fox stands still with no finger down and no scene playing:
 * nothing is shown over a fox that is busy. `turn` counts the showings there have been on the trail since the
 * game was opened, and picks which move this one shows; `first`, when given, is shown in its place (the roll,
 * while the fox's load lies somewhere only a roll goes).
 */
export function hintFor(guidance: Guidance | null, resting: boolean, wants: Wants, childAge: number | null, out: Hint, turn = 0, first: Move | null = null): Hint {
  out.wants = wants
  out.glow = 0
  out.hand = null
  out.mime = 0
  out.slide = 0
  out.flick = 0
  out.answer = 0
  out.load = loadShown(childAge)
  if (!guidance || !resting) return out
  out.glow = guidance.glow
  if (guidance.demo === null) return out
  // On the trail the press stays down, shown as the hand's carrying pose. A load, and the next lap, take a tap.
  // One tap, never two: a second tap copied at the shelf would run the fox out from under the loads.
  handPose(guidance.demo, wants === 'run', pose, 1)
  out.hand = pose
  if (wants === 'run') {
    out.mime = pose.press
    const move = first ?? MOVES[turn % MOVES.length]
    // The move is made with the hand down, in the time a finger makes it in, and the hand stays where it ended.
    const since = (guidance.demo - MOVE_AT) * DEMO_SECONDS
    const made = (seconds: number): number => Math.min(1, Math.max(0, since / seconds))
    out.slide = move === 'slide' ? made(SLIDE_SHOWN) * SLIDE : 0
    out.flick = move === 'up' ? made(FLICK_SHOWN) : move === 'down' ? -made(FLICK_SHOWN) : 0
    out.answer = out.flick === 0 ? 0 : Math.min(1, Math.max(0, (since - FLICK_SHOWN) / ANSWER_SHOWN))
  }
  return out
}

export function emptyHint(): Hint {
  return { wants: 'run', glow: 0, hand: null, mime: 0, slide: 0, flick: 0, answer: 0, load: 'balloons' }
}
