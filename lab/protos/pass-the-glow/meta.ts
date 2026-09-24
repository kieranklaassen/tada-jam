// Pass the Glow: tag where you are the glowing It, and tagging a runner moves
// the glow and your control into that runner's body. Every body chases, flees,
// and feels different, so the real choice is whose body to be next.

import type { ProtoMeta } from '../../kit/sim.ts'

export const meta: ProtoMeta = {
  key: 'pass-the-glow',
  name: 'Pass the Glow',
  verb: 'chase',
  engine: 'other-minds',
  lens: 'physical-toy',
  toy: 'tag',
  ageBand: [5, 8],
  // `sweep`: once every body has had a turn as the glow, the glow turns golden
  // for a spell (faster, longer reach, quieter) and the turns start over. It
  // changes the world, so the panel can measure it. Removing it leaves plain
  // tag: no golden spell, no turn tracker.
  hooks: ['sweep'],
  features: [
    // More passes, and more different bodies worn, are the loop's own aims.
    { name: 'tags', objective: 'up' },
    { name: 'bodies', objective: 'up' },
    // 0 to 1: how close the nearest visible runner is (edge to edge).
    { name: 'near' },
    // Runners currently spooked by the glow.
    { name: 'alert' },
    // Spooked runners with their back against a wall.
    { name: 'pinned' },
    { name: 'sweeps' },
  ],
  // 4 bodies worn x 9 situations (pass, shell, double, home, burrow, pinned,
  // bolt, chase, calm). Nothing else feeds the signature.
  signatureBound: 36,
  hookAblation: { supported: true },
}
