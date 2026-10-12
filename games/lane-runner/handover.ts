import { WANTS, type Receiver } from './lap'
import type { LapState } from './lapState'
import type { Got } from './receivers'
import { WALK } from './receivers'

// The hand-over: the one short scene, and the ending of a lap. This is its
// script and nothing else: who does what, and when, for the load as it
// arrived. Every step is named, lasts no time of its own and starts a
// motion on the frame it falls on, with the sound of that motion; the motions
// are in receivers.ts and the sounds in voices.ts. It is filled in from the
// state of play and from the fixed tastes of the one who wanted the load, and
// never from anything about the child.

export type Actor = Receiver | 'fox' | 'goose'

export type Step = { at: number; who: Actor; step: string; n?: number }

/** The five who wait, in the order they stand round the clearing from left to right. */
export const ROUND: readonly Receiver[] = ['owl', 'bear', 'hedgehog', 'frog', 'cat']

/** The shortest and the longest the scene may be, in seconds. */
export const SHORTEST = 6
export const LONGEST = 9

/** What the fox arrives with, as the one who wanted it will take it: null for empty hands, or for a load that lies somewhere on the trail. */
export function gotOf(state: Pick<LapState, 'load' | 'held' | 'lies' | 'left' | 'marks' | 'trail'>): Got | null {
  if (state.load === 'none') return null
  const fetched = state.load === 'owl' && !state.held && state.lies === 'branch'
  if (!state.held && !fetched) return null
  return { load: state.load, left: state.left, marks: { ...state.marks }, rode: state.load === 'ladder' && state.trail.gooseRides, fetched }
}

/** The steps of the scene for what arrived, in order of time, and the second at which it has settled. */
export function planFor(got: Got | null): { steps: Step[]; ends: number } {
  const steps: Step[] = []
  let t = 0.5
  const say = (who: Actor, step: string, lasts: number, n?: number): void => {
    steps.push(n === undefined ? { at: t, who, step } : { at: t, who, step, n })
    t += lasts
  }
  if (!got) {
    // Empty hands: each of the five looks at the fox in turn, with the sound it greets anyone with. Nobody
    // looks at its hands and the fox does not shrug: a lap run with nothing is a lap.
    for (const who of ROUND) say(who, 'greet', 0.5)
    return { steps, ends: Math.max(SHORTEST, t) }
  }
  const who = WANTS[got.load]
  if (got.fetched) {
    // The owl is still asleep on the branch: its mother looks at the fox's hands and fetches it herself.
    say('owl', 'look', 0.7)
    say('owl', 'flyoff', 1.6)
    say('owl', 'fetch', 0.5)
  } else {
    say(who, 'come', WALK + 0.1)
    say(who, 'take', 0.4)
    // With no tiers left there is nothing to carry: the bear licks the crumbs off the fox's hands where it stands.
    if (who === 'bear' && got.left === 0) say('bear', 'crumbs', 1)
    say(who, 'home', WALK + 0.1)
  }
  switch (who) {
    case 'bear': {
      let tiers = got.left
      if (got.marks.wet && tiers > 0) say('bear', 'wring', 0.9)
      if (got.marks.muddy && tiers > 0) {
        // A mud tier: one bite, a long stillness, and out it comes.
        say('bear', 'bite', 0.9)
        say('bear', 'spit', 0.6)
        tiers -= 1
      }
      // Tier by tier, rumbling higher each time.
      for (let i = 0; i < tiers; i++) say('bear', 'eat', 0.7, i)
      if (got.marks.berries && got.left > 0) say('bear', 'lick', 1)
      say('bear', 'sigh', 0.6)
      break
    }
    case 'cat':
      say('cat', 'prop', 0.7)
      if (got.rode) {
        // The goose is on the ladder: she hops down by the post and the kitten rides down on her.
        say('goose', 'perch', 0.8)
        say('cat', 'ridedown', 0.8)
      } else if (got.marks.muddy) {
        // A muddy ladder is a slide, and then a wash.
        say('cat', 'slide', 0.7)
        for (let i = 0; i < 3; i++) say('cat', 'wash', 0.6, i)
      } else {
        for (let i = 0; i < 5; i++) say('cat', 'rung', 0.4, i)
        say('cat', 'down', 0.5)
      }
      say('cat', 'purr', 0.6)
      break
    case 'hedgehog':
      say('hedgehog', 'hug', 0.7)
      if (got.left > 0) {
        // One always goes on its own spines.
        say('hedgehog', 'pop', 0.4)
        say('hedgehog', 'laugh', 1)
        if (got.left === 4) say('hedgehog', 'float', 0.8)
      } else for (let i = 0; i < 3; i++) say('hedgehog', 'skip', 0.6, i)
      break
    case 'owl':
      if (got.marks.wet) say('owl', 'dry', 0.9)
      if (got.marks.muddy) say('owl', 'shakeout', 0.9)
      // Each ruffle costs a preening, with a pluck.
      for (let i = 0; i < got.marks.ruffles; i++) say('owl', 'preen', 0.6, i)
      say('owl', 'tuck', 0.7)
      say('owl', 'snore', 0.6)
      break
    case 'frog':
      if (got.left === 0) say('frog', 'hat', 0.8)
      else {
        say('frog', 'pour', 0.7, got.left)
        say('frog', got.left === 3 ? 'dive' : got.left === 2 ? 'float' : 'sit', 1)
      }
      break
  }
  return { steps, ends: Math.max(SHORTEST, t) }
}
