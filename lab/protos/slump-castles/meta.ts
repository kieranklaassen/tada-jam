// Slump Castles: a sandpit. Drag to plough and heap sand, sprinkle water from a
// bucket. Damp sand holds steep walls; as it dries it slumps to a gentle slope,
// so towers settle into ridges and rings by themselves. Pure and Node-importable.

import type { ProtoMeta } from '../../kit/sim.ts'

export const meta: ProtoMeta = {
  key: 'slump-castles',
  name: 'Slump Castles',
  verb: 'heap',
  engine: 'expression',
  lens: 'physical-toy',
  toy: 'sandpit',
  ageBand: [5, 8],
  // The loop is the material, not a reward: no score, level, timer, or unlock.
  hooks: [],
  features: [
    // Tallest sand above the flat, in height bands. More is a taller castle.
    { name: 'peak', objective: 'up' },
    // Cells fenced in by a closed rim: a crater, a moat, a ring wall.
    { name: 'enclosed', objective: 'up' },
    // Share of the sand that is damp.
    { name: 'damp' },
    // Cells holding a face steeper than dry sand could.
    { name: 'standing' },
  ],
  // 7 landforms (flat, pit, mound, ridge, saddle, scatter, ring) times 4 states
  // (settled, standing, slumping, soupy) is 28. Nothing else feeds the signature.
  signatureBound: 28,
  // There are no hooks to remove.
  hookAblation: { supported: true },
}
