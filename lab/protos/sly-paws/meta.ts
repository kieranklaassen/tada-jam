// Sly Paws: hide a pebble in one paw, guess the creature's paw, and learn how
// each creature hides and guesses by its own habit while it reads yours.
// Pure: no DOM, no Vite globals, no clocks, no Math.random.

import type { ProtoMeta } from '../../kit/sim.ts'

export const meta: ProtoMeta = {
  key: 'sly-paws',
  name: 'Sly Paws',
  verb: 'bluff',
  engine: 'other-minds',
  lens: 'other',
  ageBand: [8, 11],
  // match: first to 5 points wins the visit (a dodge of a creature's read is
  //   worth a point); without it every visit is a fixed ten rounds.
  // crow: two dodges in one visit unlock the Crow, a creature that models
  //   the child's own stay-or-switch habit; without it the roster stays at three.
  hooks: ['match', 'crow'],
  features: [
    // Finds minus catches over the last ten rounds, scaled to -1..1.
    { name: 'edge', objective: 'up' },
    // How often the child's hiding paw changed over the last eight hides.
    { name: 'switchRate' },
    // 0 to 2: found its pebble three in the last four rounds, and not caught in them.
    { name: 'grip' },
    // Times the child slipped a creature's read, this session.
    { name: 'dodges' },
    { name: 'rounds' },
  ],
  // A session meets at most four creatures (three of the five habits, plus the
  // Crow once unlocked). Each is `fresh` or one of four outcomes of the last
  // round (won, lost, wash, sly) with a grip of 0, 1, or 2: 1 + 4 x 3 = 13.
  // 4 x 13 = 52. Nothing else feeds the signature.
  signatureBound: 52,
  hookAblation: { supported: true },
}
