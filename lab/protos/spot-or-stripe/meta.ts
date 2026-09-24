// Spot or Stripe: dab dye on a blank animal and watch it settle into spots,
// stripes, or swirls depending on how the dabs sit. Pure and Node-importable.

import type { ProtoMeta } from '../../kit/sim.ts'

export const meta: ProtoMeta = {
  key: 'spot-or-stripe',
  name: 'Spot or Stripe',
  verb: 'dab',
  engine: 'emergence',
  lens: 'other',
  ageBand: [5, 8],
  // The loop is the whole thing: there is no score, level, timer, or unlock.
  hooks: [],
  features: [
    // The loop's own aim: a different coat on different parts of one animal
    // (a zebra tail and a leopard back). 0 to 3 distinct coats across the
    // body, tail, and legs.
    { name: 'coatVariety', objective: 'up' },
    { name: 'spots' },
    { name: 'stripes' },
    { name: 'coverage' },
    { name: 'dabs' },
  ],
  // Signature = the coat class of each of three regions (body, tail, legs),
  // each one of blank, spots, stripes, swirl: 4 x 4 x 4 = 64.
  signatureBound: 64,
  hookAblation: { supported: true },
}
