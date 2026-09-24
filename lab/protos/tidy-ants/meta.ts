// Tidy Ants: the child pours mixed-colour beads onto a sand cross-section and
// the ants sort them into heaps that nobody planned. Pure and Node-importable.

import type { ProtoMeta } from '../../kit/sim.ts'

export const meta: ProtoMeta = {
  key: 'tidy-ants',
  name: 'Tidy Ants',
  verb: 'scatter',
  engine: 'emergence',
  lens: 'physical-toy',
  toy: 'ant-farm',
  ageBand: [3, 6],
  // `tidy` is a cheer when every colour has one heap; `pink` is a fifth colour
  // that appears the first time the sand has been tidied. Each is removable
  // alone (the sim checks config.hooks for each).
  hooks: ['tidy', 'pink'],
  features: [
    // How much of each colour sits in its one biggest heap, averaged over the
    // colours on the sand (0 to 1): what the ants do by themselves.
    { name: 'tidy', objective: 'up' },
    // Colours whose biggest heap sits in a corner of the sand: what the child
    // steers by planting seed beads.
    { name: 'cornered', objective: 'up' },
    { name: 'heaps' },
    { name: 'beads' },
    { name: 'seeds' },
  ],
  // Signature: the stage (bare, mixed) is 2 classes; heaping and tidy each
  // come with 3 corner classes (0, 1, 2 or more heaps in a corner) times 3
  // seed classes (no, some, all heaps grew round a seed): 2 + 9 + 9 = 20.
  // Nothing else feeds the signature.
  signatureBound: 20,
  hookAblation: { supported: true },
}
