// Under the Cloth: sweep a hand magnet over a blank cloth, flip its pole, read
// how the beads clump or ring, and work out what is hidden underneath.

import type { ProtoMeta } from '../../kit/sim.ts'

export const meta: ProtoMeta = {
  key: 'under-the-cloth',
  name: 'Under the Cloth',
  verb: 'dowse',
  engine: 'mystery',
  lens: 'physical-toy',
  toy: 'magnets',
  ageBand: [6, 9],
  // `score` only counts right guesses after a lift (inert for the panel).
  // `level` changes the world: a clean cloth makes the next one bigger and
  // guarantees a hidden opposite-pole pair that half cancels.
  hooks: ['score', 'level'],
  features: [
    // Right guesses across the session: what a dowser is trying to raise.
    { name: 'correct', objective: 'up' },
    // Share of the cloth the hand magnet has passed over (0 to 1).
    { name: 'swept' },
    // Share of hidden things probed with BOTH poles on this cloth (0 to 1).
    { name: 'tested' },
    { name: 'marks' },
    { name: 'lifts' },
  ],
  // dowse: 2 poles x 5 readings (none, clump, ring, mixed, snap) x 2 layouts
  // (plain, twin) x 2 (marked or bare) = 40; lifted: 4 verdicts (none, clean,
  // partial, wrong) x 2 layouts = 8. Total 48.
  signatureBound: 48,
  hookAblation: { supported: true },
}
