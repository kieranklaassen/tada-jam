// Dip, Shrink, Sift: a marble run where the ORDER of the pieces is the puzzle.
// meta.ts stays pure: no DOM, no Vite globals, no clocks, no Math.random.

import type { ProtoMeta } from '../../kit/sim.ts'

export const meta: ProtoMeta = {
  key: 'dip-shrink-sift',
  name: 'Dip, Shrink, Sift',
  verb: 'divert',
  engine: 'combination',
  lens: 'physical-toy',
  toy: 'marble-run',
  ageBand: [6, 9],
  // One hook: `orders`. When every bin that wants something is content at the
  // same moment the order is done and a harder one arrives (three levels; the
  // last one repeats with fresh wants). Removing it leaves the first order in
  // place for good: the bins still light up, nothing ever asks for more.
  hooks: ['orders'],
  features: [
    // Share of the last twelve arrivals that landed in a bin that wanted them:
    // smooth progress toward the bins' wants, and the aim a self-setting child
    // or greedy self-play pushes on (the first objective is the primary one).
    { name: 'purity', objective: 'up' },
    // Bins that are content right now (their last three marbles were what
    // they asked for): the milestone.
    { name: 'content', objective: 'up' },
    { name: 'pieces' },
    // Order effects alive in the machine right now (0 to 2): a dip that
    // changes where a fork sends a marble, a shrinker that changes what a
    // sieve lets through.
    { name: 'chains' },
    { name: 'order' },
  ],
  // 4 chain classes (none, painted, shrunk, both) times 3 spreads (the marbles
  // reach 1, 2, or 3 or more bins) times 3 content counts (0, 1, or 2 or more
  // bins content) is 36. Nothing else feeds the signature.
  signatureBound: 36,
  // Each hook can be removed alone (the sim checks config.hooks).
  hookAblation: { supported: true },
}
