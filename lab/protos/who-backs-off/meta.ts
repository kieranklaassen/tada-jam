// Who Backs Off: a one-lane bridge, three animals, and a scare rule that runs
// in a circle. Pure: no DOM, no Vite globals, no clocks, no Math.random.

import type { ProtoMeta } from '../../kit/sim.ts'

export const meta: ProtoMeta = {
  key: 'who-backs-off',
  name: 'Who Backs Off',
  verb: 'usher',
  engine: 'rule-play',
  lens: 'other',
  ageBand: [5, 8],
  // Two hooks, each removable alone through SimConfig.hooks. `stars` only
  // rates a finished round (removing it changes no affordance and no
  // signature, so the panel reads it as inconclusive). `levels` makes each
  // round harder (a follower behind the blocker, more traffic, sometimes no
  // ready helper), so it changes the world and the panel can measure it.
  hooks: ['stars', 'levels'],
  features: [
    // Rounds won: the marked animal got across.
    { name: 'crossed', objective: 'up' },
    // Animals of the marked animal's bank turned back by a scarier one (a
    // convoy counts each animal). The blocker being sent home does not count.
    { name: 'setbacks', objective: 'down' },
    { name: 'rounds' },
    { name: 'onBridge' },
  ],
  // marked animal (waiting, crossing) x traffic on the bridge (empty, flow,
  // jam, two-way, flee) x the last scare (none, cat-mouse, mouse-elephant,
  // elephant-cat, kin) is 50, plus 5 for a finished round (one per last
  // scare). Nothing else feeds the signature.
  signatureBound: 55,
  hookAblation: { supported: true },
}
