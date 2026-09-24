// Two-Stone Pond: hold the water to keep it rippling; two steady ripples cross
// and add, and where a crest meets a trough the water goes dead still. Corks
// on the pond rest on those still lines. meta.ts stays pure: no DOM, no Vite
// globals, no Math.random, Date.now, or performance.now.

import type { ProtoMeta } from '../../kit/sim.ts'

export const meta: ProtoMeta = {
  key: 'two-stone-pond',
  name: 'Two-Stone Pond',
  verb: 'pulse',
  engine: 'emergence',
  lens: 'other',
  ageBand: [8, 11],
  // No score, level, timer, win state, or unlock: seeing the water go still
  // under a cork is the whole reward, so there is no hook to remove.
  hooks: [],
  features: [
    // Corks resting in dead-still water while the water around them is alive.
    { name: 'parked', objective: 'up' },
    // Dead-still lines between two steady ripples: more is a harder pattern.
    { name: 'lines', objective: 'up' },
    // Steady ripples ringing right now.
    { name: 'sources' },
    // How much the pond is moving, scaled to about 0 to 1.
    { name: 'energy' },
    // Distance between the two steady ripples in ripple widths; 0 without a pair.
    { name: 'spacing' },
  ],
  // Heads: still, rings, one, crowd, and pair in five patterns (settling, flat,
  // l2, l4, l6) is 9; times 4 for how many of the 3 corks are resting (0 to 3)
  // is 36.
  signatureBound: 36,
  // There are no hooks; the sim honours an empty or unknown list the same way.
  hookAblation: { supported: true },
}
