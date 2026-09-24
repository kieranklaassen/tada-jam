// Chant Rope. Two turners swing a rope through a fixed chant (slow, slow, quick,
// quick). The child holds the jumper and lets go to leap; the hold decides how
// long the jumper hangs. Pure and Node-importable: no DOM, no Vite globals.

import type { ProtoMeta } from '../../kit/sim.ts'

export const meta: ProtoMeta = {
  key: 'chant-rope',
  name: 'Chant Rope',
  verb: 'skip',
  engine: 'mastery',
  lens: 'physical-toy',
  toy: 'jump-rope',
  ageBand: [4, 7],
  // `streak` only adds a counter and a milestone chime (it changes no
  // affordance and no signature, so the panel will read it as inconclusive).
  // `tempo` changes the world: every eighth clean swing in a row the turners
  // speed up, and a trip puts them back.
  hooks: ['streak', 'tempo'],
  features: [
    // Swings cleared in a row: the plain aim.
    { name: 'streak', objective: 'up' },
    // A running average of swings cleared per leap: the chunking aim. Higher
    // means fewer, longer hangs over more of the chant.
    { name: 'reach', objective: 'up' },
    // How far the current hold has charged, 0 to 1.
    { name: 'charge' },
  ],
  // 5 jumper modes (still, stand, coil, air, tangled) times 9 kinds of last
  // outcome (none, whiff, hop-slow, hop-quick, pair-slow, pair-quick,
  // pair-mixed, long, trip) is 45. Nothing else feeds the signature.
  signatureBound: 45,
  // Each hook can be removed alone (the sim checks config.hooks for each).
  hookAblation: { supported: true },
}
