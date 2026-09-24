import type { ProtoMeta } from '../../kit/sim.ts'

export const meta: ProtoMeta = {
  key: 'sway-and-settle',
  name: 'Sway and Settle',
  verb: 'hang',
  engine: 'combination',
  lens: 'other',
  ageBand: [4, 7],
  // The loop's own answer (a level bar turns slowly on its hook) is not a hook.
  // One layer is: next-mobile takes a finished, turning mobile down after a
  // spell and deals a fresh, slightly bigger set. Without it a session is one
  // puzzle at a time, so the panel can tell whether the law alone brings the
  // child back.
  hooks: ['next-mobile'],
  features: [
    // Bars that are loaded on both sides and sit level. More is better; an empty
    // bar never counts, so hanging nothing cannot score.
    { name: 'balanced', objective: 'up' },
    { name: 'hung' },
    { name: 'tilt' },
    { name: 'turning' },
    { name: 'held' },
    { name: 'round' },
  ],
  // 4 bar counts (1 to 4) x 6 states (bare, lopsided, tipped, partly, level,
  // counter) x 2 (every piece hung or not) is 48. Nothing else feeds it.
  signatureBound: 48,
  hookAblation: { supported: true },
}
