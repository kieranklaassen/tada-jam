// Sideways Rain Day. The child drags a leaf umbrella over damp creatures while
// the rain slants and gusts sway it in beats. Pure and Node-importable: no DOM,
// no Vite globals, no clocks.

import type { ProtoMeta } from '../../kit/sim.ts'

export const meta: ProtoMeta = {
  key: 'sideways-rain-day',
  name: 'Sideways Rain Day',
  verb: 'shelter',
  engine: 'variation',
  lens: 'other',
  ageBand: [3, 5],
  // rainbow: when every creature is relaxed at once the sun peeks out and the
  // rain thins for a few seconds. It changes the world (fewer drops), so the
  // panel can measure removing it.
  hooks: ['rainbow'],
  features: [
    // Average comfort of the creatures, 0 to 1: the smooth thing to push on.
    { name: 'comfort', objective: 'up' },
    // How many creatures are relaxed right now.
    { name: 'relaxed', objective: 'up' },
    // How many are damp (comfort under 0.3).
    { name: 'damp', objective: 'down' },
    // Rainbows so far this day (always 0 with the hook removed).
    { name: 'rainbows' },
  ],
  // 5 slant classes x 4 leaf postures (sheltered, overhead, near, away) x 3
  // yard moods (none, some, or all creatures relaxed). Nothing else feeds it.
  signatureBound: 5 * 4 * 3,
  hookAblation: { supported: true },
}
