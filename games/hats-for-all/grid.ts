import { dropHat, tapCreature, tapHat, type Drop, type Outcome, type World } from './rules'

// The object-by-action grid (ART.md, "The object-by-action grid"): six
// objects by five actions, thirty cells, and every one gives a result that
// looks and sounds different. No renderer and no DOM. A cell names what is
// seen and the voices heard, in order (the names are those of voices.ts), and
// says whether the world changes. Nothing is refused: every cell has a result.

export const OBJECTS = ['hat-in-tile', 'hat-on-head', 'loose-hat', 'tower-top', 'bare-creature', 'hatted-creature'] as const
export type ObjectKind = (typeof OBJECTS)[number]

/** A tap is the essential action; each drag is an extra, named by where the finger lets go. */
export const ACTIONS = ['tap', 'to-bare-head', 'to-hatted-head', 'to-tile', 'elsewhere'] as const
export type Action = (typeof ACTIONS)[number]

export type Cell = {
  /** What is seen, by name: one act for the view to play. */
  seen: string
  /** The voices heard, in order. */
  heard: readonly string[]
  /** Whether a hat changes place. A cell that changes nothing still answers the touch. */
  moves: boolean
}

export const GRID: Record<ObjectKind, Record<Action, Cell>> = {
  'hat-in-tile': {
    tap: { seen: 'pops-out-and-lands-on-the-nearest-bare-head', heard: ['creak', 'pok', 'bap', 'babble'], moves: true },
    'to-bare-head': { seen: 'stretches-after-the-finger-and-lands-where-let-go', heard: ['creak', 'pok', 'squeak', 'bap', 'babble'], moves: true },
    'to-hatted-head': { seen: 'lands-on-the-hat-there-and-the-tower-slips-over-the-eyes', heard: ['creak', 'pok', 'squeak', 'bap', 'bap', 'babble-grump'], moves: true },
    'to-tile': { seen: 'dips-back-into-its-own-hole', heard: ['creak', 'pok', 'fwump'], moves: false },
    elsewhere: { seen: 'skids-to-the-nearest-round-spot-and-scuttles-in-a-small-circle', heard: ['creak', 'pok', 'plop', 'scuttle'], moves: true },
  },
  'hat-on-head': {
    tap: { seen: 'pops-off-and-is-pressed-home-and-the-creature-pats-its-bare-head', heard: ['creak', 'pip', 'babble-ask', 'fwump'], moves: true },
    'to-bare-head': { seen: 'hops-from-one-head-to-the-other', heard: ['creak', 'pip', 'babble-ask', 'bap', 'babble'], moves: true },
    'to-hatted-head': { seen: 'makes-a-tower-there-and-leaves-its-own-head-bare', heard: ['creak', 'pip', 'babble-ask', 'bap', 'bap', 'babble-grump'], moves: true },
    'to-tile': { seen: 'is-carried-home-and-pushed-in-under-the-finger-and-its-creature-waves', heard: ['creak', 'pip', 'squeak', 'babble', 'fwump'], moves: true },
    elsewhere: { seen: 'slides-off-loose-and-its-creature-watches-it-go', heard: ['creak', 'pip', 'babble-ask', 'plop', 'scuttle'], moves: true },
  },
  'loose-hat': {
    tap: { seen: 'hops-onto-the-nearest-bare-head-or-home-with-a-double-bounce', heard: ['creak', 'plop', 'bap', 'babble-grump'], moves: true },
    'to-bare-head': { seen: 'is-picked-up-and-the-bare-creature-ducks-under-it', heard: ['creak', 'squeak', 'bap', 'babble'], moves: true },
    'to-hatted-head': { seen: 'lands-sideways-the-tower-leans-and-the-hat-rights-itself', heard: ['creak', 'squeak', 'bap', 'creak', 'babble-grump'], moves: true },
    'to-tile': { seen: 'is-pressed-home-with-a-long-creak', heard: ['creak', 'squeak', 'creak', 'fwump'], moves: true },
    elsewhere: { seen: 'skids-spins-like-a-coin-and-scuttles-beside-the-nearest-round-spot', heard: ['creak', 'squeak', 'plop', 'scuttle'], moves: true },
  },
  'tower-top': {
    tap: { seen: 'leaves-the-tower-and-goes-home-and-the-tower-shrinks', heard: ['creak', 'pip', 'babble', 'fwump'], moves: true },
    'to-bare-head': { seen: 'moves-over-and-mends-the-tower-and-the-bare-head-at-once', heard: ['creak', 'pip', 'babble', 'bap', 'babble-grump'], moves: true },
    // Onto a head with one hat the tower changes heads; onto a head that already has two it makes three, which topple.
    'to-hatted-head': { seen: 'changes-heads-or-makes-a-tower-of-three-that-sways-salutes-and-topples', heard: ['creak', 'pip', 'babble', 'bap', 'bap', 'babble-grump'], moves: true },
    'to-tile': { seen: 'goes-home-while-the-hat-under-it-spins-once', heard: ['creak', 'pip', 'squeak', 'babble', 'fwump', 'squeak'], moves: true },
    elsewhere: { seen: 'tips-the-tower-and-rolls-off-loose', heard: ['creak', 'pip', 'babble', 'plop', 'plop', 'scuttle'], moves: true },
  },
  'bare-creature': {
    tap: { seen: 'calls-the-nearest-hat-out-of-the-tile-or-pats-its-head-and-looks-into-the-holes', heard: ['creak', 'babble-ask', 'pok', 'bap', 'babble'], moves: true },
    'to-bare-head': { seen: 'bumps-bellies-and-boings-apart-and-both-pat-their-heads', heard: ['creak', 'squeak', 'plop', 'babble-ask', 'babble-ask'], moves: false },
    'to-hatted-head': { seen: 'peeks-up-under-the-other-hat-which-lifts-like-a-lid', heard: ['creak', 'squeak', 'pip', 'babble-ask', 'babble'], moves: false },
    'to-tile': { seen: 'leans-over-a-hole-and-babbles-into-it', heard: ['creak', 'squeak', 'babble-ask', 'hoot'], moves: false },
    elsewhere: { seen: 'stretches-like-pulled-foam-and-twangs-back-to-its-spot', heard: ['creak', 'squeak', 'hoot'], moves: false },
  },
  'hatted-creature': {
    tap: { seen: 'does-its-own-trick-with-exactly-this-hat', heard: ['creak', 'babble'], moves: false },
    'to-bare-head': { seen: 'bows-and-tips-its-hat-and-the-bare-one-claps', heard: ['creak', 'squeak', 'babble', 'plop', 'plop'], moves: false },
    'to-hatted-head': { seen: 'knocks-hats-together-and-both-wobble', heard: ['creak', 'squeak', 'bap', 'babble', 'babble'], moves: false },
    'to-tile': { seen: 'tips-its-hat-over-the-tile-and-shakes-it-and-shrugs', heard: ['creak', 'squeak', 'scuttle', 'babble-ask'], moves: false },
    elsewhere: { seen: 'stretches-and-twangs-back-holding-its-hat-on', heard: ['creak', 'squeak', 'hoot', 'babble'], moves: false },
  },
}

/** The names a cell may use for what is heard: the voices of voices.ts, with the babble's tune where it matters. */
export const HEARD = ['creak', 'pok', 'pip', 'bap', 'fwump', 'plop', 'squeak', 'scuttle', 'hoot', 'babble', 'babble-ask', 'babble-grump'] as const

/**
 * What a cell does to the world, by the rules. The hat rows move a hat; a
 * dragged creature changes nothing and goes back to its spot. `hat` is the
 * hat acted on in the hat rows, `spot` the creature in the creature rows, and
 * `to` where the finger lets go.
 */
export function act(world: World, object: ObjectKind, action: Action, at: { hat?: number; spot?: number; to?: Drop }): Outcome {
  if (object === 'bare-creature' || object === 'hatted-creature') return action === 'tap' ? tapCreature(world, at.spot ?? -1) : { world, happened: [] }
  if (action === 'tap') return tapHat(world, at.hat ?? -1)
  return dropHat(world, at.hat ?? -1, at.to ?? { on: 'tile' })
}
