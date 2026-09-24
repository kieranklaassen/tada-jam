// Quarter-Turn Table: a floaty pinball table with a 3 by 3 lattice of arrow
// bumpers. The bumper's arrow is where it slings the ball, and hitting a
// bumper's nose turns it a quarter-turn, so the table remembers its hits.
// Pure: no DOM, no Vite globals, no clocks, no Math.random.

import type { ProtoMeta } from '../../kit/sim.ts'

export const meta: ProtoMeta = {
  key: 'quarter-turn-table',
  name: 'Quarter-Turn Table',
  verb: 'flip',
  engine: 'emergence',
  lens: 'physical-toy',
  toy: 'pinball',
  ageBand: [7, 10],
  // The loop is the arrows and the ball; there is no score, level, or timer
  // to remove. A trapped ball is a state of the world, not a reward hook.
  hooks: [],
  features: [
    // Longest run of bumper slings without a nose hit, wall, or flipper in
    // between (this session). A closed loop of arrows makes it grow for as
    // long as the ball rides it, so self-set aims and greedy play push on it.
    { name: 'bestChain', objective: 'up' },
    { name: 'chain' },
    // Bumpers whose arrow points at another bumper (0 to 9).
    { name: 'links' },
    // Length of the longest closed loop of arrows (0, 4, 6, or 8).
    { name: 'orbit' },
    { name: 'turns' },
    { name: 'balls' },
    { name: 'drains' },
  ],
  // 7 table shapes (scatter, trail, long, square, ring6, ring8, multi) times 4
  // ball states (free, riding, trapped, twin). Nothing else feeds the signature.
  signatureBound: 28,
  hookAblation: { supported: true },
}
