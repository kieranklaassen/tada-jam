// Dawdle Parade: drag a mother duck and three ducklings trail her, each by its
// own habit. Pure and Node-importable: no DOM, no Vite globals, no clocks.

import type { ProtoMeta } from '../../kit/sim.ts'

export const meta: ProtoMeta = {
  key: 'dawdle-parade',
  name: 'Dawdle Parade',
  verb: 'lead',
  engine: 'other-minds',
  lens: 'other',
  ageBand: [2, 5],
  // `pond` is the goal, not the loop: a pond to lead the parade to, a splash
  // when all three ducklings are on its shore, and a fresh meadow with one more
  // flower patch afterwards. Without it the meadow is endless free walking with
  // the same habits.
  hooks: ['pond'],
  features: [
    // Metres of walking with the whole line close behind and nobody dawdling.
    { name: 'together', objective: 'up' },
    // How far the last duckling trails the mother, in hundreds of pixels.
    { name: 'spread' },
    // 1 while the dawdler is stopped at a flower.
    { name: 'dawdling', objective: 'down' },
    // Where the corner-cutter stands in the line: 0 is the front.
    { name: 'cutter_place', objective: 'down' },
    // Ducklings on the pond's shore right now (always 0 without the pond).
    { name: 'home', objective: 'up' },
    { name: 'hops' },
    { name: 'stalls' },
  ],
  // 6 line orders x 4 shapes (tight, loose, strung, snarl) x dawdling or not,
  // plus the one `home` signature. Nothing else feeds the signature.
  signatureBound: 6 * 4 * 2 + 1,
  hookAblation: { supported: true },
}
