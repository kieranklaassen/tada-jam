// Last Place Seen: the child shifts a treasure between hollow logs while two
// guards look away. Each guard walks to where it LAST SAW the treasure (not
// where it is) and rechecks by its own fixed habit. Pure: no DOM, no clocks.

import type { ProtoMeta } from '../../kit/sim.ts'

export const meta: ProtoMeta = {
  key: 'last-place-seen',
  name: 'Last Place Seen',
  verb: 'filch',
  engine: 'other-minds',
  lens: 'other',
  ageBand: [8, 11],
  // The haul itself is the loop's aim, and the loop needs no score, level,
  // timer, or unlock to work, so nothing is declared.
  hooks: [],
  features: [
    // Treasures pocketed at the flagged log without a guard looking.
    { name: 'hauls', objective: 'up' },
    // Pocket attempts made under a guard's eye: the treasure is taken back.
    { name: 'caught', objective: 'down' },
    // Shifts a guard watched (it then goes straight to the new log).
    { name: 'spotted', objective: 'down' },
    { name: 'shifts' },
    // How many guards (0 to 2) believe the treasure is somewhere it is not.
    { name: 'fooled' },
  ],
  // 3 places for the treasure (in hand, away, at the flag) times 3 goose
  // states (right, wrong, searching) times 2 hound states (right, wrong)
  // times 2 (has hauled once or not) is 36.
  signatureBound: 36,
  hookAblation: { supported: true },
}
