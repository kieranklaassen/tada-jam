// Clanking Chasers: a one-square-at-a-time lure game. Every robot takes one
// straight step toward the child, and robots that bump into each other tangle
// into a scrap heap that stops the rest. Pure: no DOM, no Vite globals.

import type { ProtoMeta } from '../../kit/sim.ts'

export const meta: ProtoMeta = {
  key: 'clanking-chasers',
  name: 'Clanking Chasers',
  verb: 'lure',
  engine: 'rule-play',
  lens: 'other',
  ageBand: [7, 10],
  // level: each cleared round adds a robot to the next one (four, then five,
  //   then six), so it changes the world. stars: a cleared round earns one star,
  //   one more for par turns, one more for the whole squad in a single heap; the
  //   grade is part of the outcome signature.
  hooks: ['level', 'stars'],
  features: [
    // Robots still chasing: fewer is better.
    { name: 'robots', objective: 'down' },
    // Robots in the biggest scrap heap: the whole squad in one heap is the aim.
    { name: 'pile', objective: 'up' },
    { name: 'piles' },
    { name: 'turns' },
    { name: 'cleared' },
    { name: 'caught' },
  ],
  // 5 formations times (3 states while playing: fresh, one-pile, many-piles;
  // 2 cleared kinds: herded, scattered, times 3 star grades; 1 caught) is
  // 5 * (3 + 6 + 1) = 50. Without the stars hook it is 5 * 6 = 30.
  signatureBound: 50,
  // Each hook can be removed alone (the sim checks config.hooks for each).
  hookAblation: { supported: true },
}
