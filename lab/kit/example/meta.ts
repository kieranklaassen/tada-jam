// The reference prototype and the template builders copy. To start a new
// prototype: copy this folder to lab/protos/<key>/, change every '../' import
// to '../../kit/', and rewrite the toy. meta.ts and sim.ts stay pure: no DOM,
// no Vite globals, no Math.random, Date.now, or performance.now.

import type { ProtoMeta } from '../sim.ts'

export const meta: ProtoMeta = {
  // Kebab-case, equal to the folder name. The example's folder is `example`.
  key: 'example',
  name: 'Balloon Basket',
  // One lowercase word: what the child mostly does.
  verb: 'juggle',
  engine: 'mastery',
  // A physical-toy prototype names the toy it starts from (an id in
  // lab/ideas/toys.ts).
  lens: 'physical-toy',
  toy: 'balloon-keepy-uppy',
  // Whole years, at most four years wide, 2 to 12.
  ageBand: [4, 6],
  // Two hooks, each removable alone through SimConfig.hooks. `score` only
  // adds a counter (removing it changes no affordance and no signature, which
  // the panel reports as inconclusive); `unlock` adds a fourth balloon (it
  // changes the world, so the panel can measure it).
  hooks: ['score', 'unlock'],
  features: [
    // The one feature with an objective: more balloons in the basket is
    // better. Self-set aims and greedy self-play push on it.
    { name: 'stowed', objective: 'up' },
    { name: 'height' },
    { name: 'held' },
  ],
  // Honest upper bound on distinct signatures: 3 modes (drift, carry, pump)
  // times 3 basket states (empty, some, all) times 2 (fourth balloon there or
  // not) is 18. Nothing else feeds the signature.
  signatureBound: 18,
  // Each hook can be removed alone (the sim checks config.hooks for each).
  hookAblation: { supported: true },
}
