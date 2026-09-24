// Stones That Breathe: a frog crosses a river of stones that rise and sink, each
// on its own slow period. meta.ts stays pure: no DOM, no Vite globals, no
// Math.random, Date.now, or performance.now.

import type { ProtoMeta } from '../../kit/sim.ts'

export const meta: ProtoMeta = {
  key: 'stones-that-breathe',
  name: 'Stones That Breathe',
  verb: 'leap',
  engine: 'variation',
  lens: 'other',
  ageBand: [7, 10],
  // Two hooks, each removable alone. `bloom` marks a clean crossing with a
  // flower (a win state; it changes no affordance and no signature, so the
  // panel will likely read it as inconclusive). `widen` is an unlock: a clean
  // crossing adds a fifth column of stones (it changes the world and shows in
  // the signature, so the panel can measure it).
  hooks: ['bloom', 'widen'],
  features: [
    // Every count only ever goes up, so each says so: an aim to push it down
    // could never be reached. Stones landed on is the small aim a child sets
    // first; a clean crossing (no splash since the last one) is the loop's own.
    { name: 'landings', objective: 'up' },
    { name: 'crossings', objective: 'up' },
    { name: 'clean', objective: 'up' },
    { name: 'progress' },
  ],
  // 4 day patterns x 4 places (bank, near, mid, far into the river) x 4 last
  // results (none, dunked, clean, messy) is 64. Nothing else feeds the
  // signature; the river's width shows in the affordances, not the signature.
  signatureBound: 64,
  hookAblation: { supported: true },
}
