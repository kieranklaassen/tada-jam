// Singing Plate: pour sand on a square plate, slide a finger along a pitch bar,
// and at seven hidden tones the plate shivers and the sand hops off its shaking
// places and settles onto that tone's quiet lines. Sand keeps its place between
// tones, so the ORDER of tones decides the picture. Pure and Node-importable.

import type { ProtoMeta } from '../../kit/sim.ts'

export const meta: ProtoMeta = {
  key: 'singing-plate',
  name: 'Singing Plate',
  verb: 'tune',
  engine: 'expression',
  lens: 'other',
  ageBand: [8, 11],
  // No hook fits: the loop is the sand and the tones. Nothing scores, levels,
  // times, wins, or unlocks. Discovering a tone only marks it on the bar.
  hooks: [],
  features: [
    // The loop's own aim: walk one pile through more different tones (a
    // mandala is a pile that three or more tones have each shaped).
    { name: 'woven', objective: 'up' },
    { name: 'found' },
    { name: 'settled' },
    { name: 'grains' },
    { name: 'ringing' },
  ],
  // 4 plain states (bare, bare-ring, heap, dancing) + 7 pile shapes + 7 x 6
  // ordered pairs "shape<previous shape" = 53. Nothing else feeds the signature.
  signatureBound: 53,
  hookAblation: { supported: true },
}
