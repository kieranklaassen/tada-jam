// Pushable Rules: a Baba-style room where the rules are picture tiles the child
// pushes around. meta.ts stays pure: no DOM, no Vite globals, no clocks.

import type { ProtoMeta } from '../../kit/sim.ts'

export const meta: ProtoMeta = {
  key: 'pushable-rules',
  name: 'Pushable Rules',
  verb: 'rewrite',
  engine: 'rule-play',
  lens: 'other',
  ageBand: [10, 12],
  // `stars` is one star for a room and a second for solving it by rewriting a
  // rule. It adds only a counter (no affordance and no signature changes), so
  // the panel will likely read its removal as inconclusive.
  hooks: ['stars'],
  features: [
    // Rooms solved this session: the loop's own aim.
    { name: 'solved', objective: 'up' },
    // Steps between the nearest YOU and the nearest WIN thing (20 when none).
    // Greedy self-play pushes this down and meets the wall.
    { name: 'padGap', objective: 'down' },
    { name: 'rules' },
    // Rules broken or made since the room began.
    { name: 'rewrites' },
  ],
  // In play: 3 room kinds (wall, gate, swap) x 2 barrier states (shut, open) x
  // 4 WIN states (none, pad, rock, other) x 2 YOU states (frog or something
  // else is YOU, or nothing is) = 48. During the short celebration: 3 room
  // kinds x 2 ways to win (around, rewrote) = 6.
  signatureBound: 54,
  hookAblation: { supported: true },
}
