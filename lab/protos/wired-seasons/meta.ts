// Wired Seasons: shape a small tree over seasons with three rules the child
// learns by playing. A cut forks the growth, a wire sets a limb's heading, and
// a limb starved of light drops away. Pure metadata: no DOM, no Vite globals.

import type { ProtoMeta } from '../../kit/sim.ts'

export const meta: ProtoMeta = {
  key: 'wired-seasons',
  name: 'Wired Seasons',
  verb: 'prune',
  engine: 'expression',
  lens: 'other',
  ageBand: [10, 12],
  // `picture` is the only hook: it shows a target silhouette and fires when a
  // season leaves the tree filling it, then offers the next silhouette. It
  // changes nothing about how the tree grows (so it can be removed alone), only
  // what the child is shown and the signature's "has matched" suffix.
  hooks: ['picture'],
  features: [
    // Wider is the windswept, spreading tree the play-5 child aims for; a
    // persona pushes on it by cutting the leader early and wiring limbs out.
    { name: 'spread', objective: 'up' },
    { name: 'height' },
    { name: 'limbs' },
    // Limbs dropped for want of light, all told.
    { name: 'lost' },
    // Share of tips standing in the light.
    { name: 'lit' },
    { name: 'season' },
    // How well the tree fills the current picture; 0 when the hook is off.
    { name: 'fit' },
  ],
  // 3 heights x 3 widths x 3 leans = 27 grown-tree classes, times 2 for "has
  // matched a picture" (only with the hook), plus the year-zero sapling: 55.
  signatureBound: 56,
  hookAblation: { supported: true },
}
