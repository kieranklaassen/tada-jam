// Broom on a Fingertip: an inverted pendulum the child balances by sliding a
// fingertip point under the lean. Pure and Node-importable: no DOM, no Vite
// globals, no clocks.

import type { ProtoMeta } from '../../kit/sim.ts'

export const meta: ProtoMeta = {
  key: 'broom-on-a-fingertip',
  name: 'Broom on a Fingertip',
  verb: 'balance',
  engine: 'mastery',
  lens: 'other',
  ageBand: [10, 12],
  // Two hooks, each removable alone through SimConfig.hooks.
  // `flags`: destination flags to walk the balanced broom to and plant it at
  // (a win state; it changes the world, so the panel can measure it).
  // `best`: a live upright-run timer and a personal best (a number to beat; it
  // changes no affordance and no signature, so the panel reads it as
  // inconclusive).
  hooks: ['flags', 'best'],
  features: [
    // Seconds spent upright with a finger on the fingertip point. More is
    // better: self-set aims and greedy self-play push on it.
    { name: 'uprightTime', objective: 'up' },
    // Longest unbroken upright run this session, in seconds.
    { name: 'bestRun' },
    // Smoothed lean while held (radians): lower means the child moves under
    // the broom before the lean shows.
    { name: 'wobble' },
    { name: 'tilt' },
    // Swing energy: 0 is a hanging rest, 2 is just enough to reach the top.
    { name: 'energy' },
    { name: 'planted' },
    { name: 'falls' },
    { name: 'saves' },
    { name: 'swingUps' },
    { name: 'walked' },
    { name: 'broom' },
    { name: 'held' },
  ],
  // 3 brooms (long, mid, short) x 4 poses (up, lean, low, hang) x 2 flag
  // states (open, at-flag) x 2 (swing-up trick found or not) is 48. Nothing
  // else feeds the signature.
  signatureBound: 48,
  hookAblation: { supported: true },
}
