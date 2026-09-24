// Toes in Clouds: a swing. Hold to stretch the legs out while the seat goes
// forward, let go of the hold while it comes back, and the arc grows only when
// the pumping is in step. Tap to let go of the rope at some point of the arc
// and the rider flies; where in the arc decides where the rider lands.

import type { ProtoMeta } from '../../kit/sim.ts'

export const meta: ProtoMeta = {
  key: 'toes-in-clouds',
  name: 'Toes in Clouds',
  verb: 'pump',
  engine: 'mastery',
  lens: 'physical-toy',
  toy: 'swing',
  ageBand: [5, 8],
  // Both hooks are things the loop can carry but does not need: `flag` is a
  // win marker (a flag planted on the hill, a tally that only counts up),
  // `island` is an unlock (a cloud island opens once the rider has landed on
  // the far hill, and it asks for a higher, finer release).
  hooks: ['flag', 'island'],
  features: [
    // How wide the swing is, 0 to 1 of the widest arc pumping can make.
    { name: 'arc', objective: 'up' },
    // How far the last flight carried the rider, 0 to 1 of the field ahead.
    { name: 'reach', objective: 'up' },
    // Share of recent leg-stretching that was done while the seat went forward.
    { name: 'sync' },
    { name: 'height' },
    { name: 'flights' },
  ],
  // ride (4 arc sizes x 6 last landings) + fly (6) + landed (5 places) = 35.
  signatureBound: 35,
  hookAblation: { supported: true },
}
