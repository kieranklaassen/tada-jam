// Pendulum Pen (expression-12). Two hanging rods with a sliding weight each; the
// pen's table swings with both. Pure: no DOM, no Vite globals, no clocks.

import type { ProtoMeta } from '../../kit/sim.ts'

export const meta: ProtoMeta = {
  key: 'pendulum-pen',
  name: 'Pendulum Pen',
  verb: 'pluck',
  engine: 'expression',
  lens: 'other',
  ageBand: [10, 12],
  // Two hooks, each removable alone through SimConfig.hooks.
  // `guess` is the petal-count strip: say how many petals before the second rod
  // goes, and the sim tells you if the weights agree. `target` is the ghost
  // figure to draw. Each adds affordances, so the panel can measure them.
  hooks: ['guess', 'target'],
  features: [
    // Distinct figures started (ordered reduced ratios, of 19). Drawing a new
    // kind of knot is the loop's own aim, so more is better.
    { name: 'kinds', objective: 'up' },
    { name: 'figures' },
    { name: 'petals' },
    { name: 'open' },
    { name: 'hits' },
    { name: 'matches' },
    { name: 'amp' },
  ],
  // 4 stages. `set` (nothing pulled) and `pulled` (a rod held back) name only the
  // petal count the weights make: 8 classes each. `swing` and `done` name a
  // line (one rod alone) or a knot: 8 petal counts times thin or wide, 17 each.
  // 2 * 8 + 2 * 17 = 50.
  signatureBound: 50,
  // Each hook can be removed alone; the sim checks config.hooks for each.
  hookAblation: { supported: true },
}
