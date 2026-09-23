// Skipped a Generation: cross two meadow creatures and a hatchling appears,
// blended by hidden rules (hues mix, ears follow the longer, spots skip a
// generation). Pure and Node-importable: no DOM, no Vite globals.

import type { ProtoMeta } from '../../kit/sim.ts'

export const meta: ProtoMeta = {
  key: 'skipped-a-generation',
  name: 'Skipped a Generation',
  verb: 'cross',
  engine: 'combination',
  lens: 'other',
  ageBand: [10, 12],
  // One hook: a visitor who wants a particular body. Fulfilling it brings a
  // gift creature (so removing it changes the world, not only a counter).
  hooks: ['wish'],
  features: [
    // Distinct (spots, ears, hue family) bodies alive in the meadow.
    { name: 'bodies', objective: 'up' },
    // Spotted creatures in the meadow: the payoff of understanding the
    // recessive spot rule.
    { name: 'spotted', objective: 'up' },
    { name: 'generation' },
    { name: 'longEared' },
    { name: 'roster' },
    { name: 'hatched' },
    { name: 'wishes' },
  ],
  // spots (2) x ears (3) x hue families (3) x lineage depth (3) = 54.
  signatureBound: 54,
  hookAblation: { supported: true },
}
