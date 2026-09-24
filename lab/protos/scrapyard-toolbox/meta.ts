// Scrapyard Toolbox. Each "day" deals three of five scrap tools and puts a
// sleepy cat on a far shelf. The child rigs the tools, then lets a ball roll
// from the chute. The day is built backwards from a rig that works, so every
// deal is solvable and needs all three tools. meta.ts stays pure: no DOM, no
// Vite globals, no Math.random, Date.now, or performance.now.

import type { ProtoMeta } from '../../kit/sim.ts'

export const meta: ProtoMeta = {
  key: 'scrapyard-toolbox',
  name: 'Scrapyard Toolbox',
  verb: 'rig',
  engine: 'variation',
  lens: 'other',
  ageBand: [6, 9],
  // The loop is the dealt puzzle itself. No score, level, timer, or unlock.
  hooks: [],
  features: [
    // Best nearness of the ball to the cat today, 0 to 1 (1 is the cat woken).
    // More is better for the loop's own aim and gives self-play a gradient.
    { name: 'closeness', objective: 'up' },
    { name: 'placed' },
    { name: 'attempts' },
    { name: 'woken' },
    { name: 'touched' },
  ],
  // rig-<deal> is 10 (three of five tools), rolling is 1, and each of reached
  // and missed carries the set of tool kinds the ball touched (none, or up to
  // three of five: 1 + 5 + 10 + 10 = 26). 10 + 1 + 26 + 26 = 63.
  signatureBound: 63,
  // No hooks exist, so there is nothing to remove.
  hookAblation: { supported: true },
}
