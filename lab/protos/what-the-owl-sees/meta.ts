// What the Owl Sees: three chicks, one owl, sight rules nobody shows.
// meta.ts and sim.ts stay pure: no DOM, no Vite globals, no Math.random,
// Date.now, or performance.now.

import type { ProtoMeta } from '../../kit/sim.ts'

export const meta: ProtoMeta = {
  key: 'what-the-owl-sees',
  name: 'What the Owl Sees',
  verb: 'tuck',
  engine: 'mystery',
  lens: 'physical-toy',
  toy: 'hide-and-seek',
  ageBand: [4, 7],
  // `dawn` is the win state: when all three chicks sit unseen through a whole
  // stare, the owl gives up, the sun comes up, and the meadow is dealt again
  // (new perch, new reeds, new patches). Removed, the meadow never changes.
  hooks: ['dawn'],
  features: [
    // More chicks tucked where a stare would miss them is the loop's own aim.
    { name: 'safe', objective: 'up' },
    { name: 'tucked' },
    { name: 'caught' },
    { name: 'dawns' },
  ],
  // 4 owl phases (rest, glance, stare, dawn) times 6 scenes of the meadow
  // (empty, moving, exposed, camo, shade, mixed) times 2 verdicts (clear,
  // caught). Nothing else feeds the signature.
  signatureBound: 48,
  hookAblation: { supported: true },
}
