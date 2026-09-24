// The Sulking Lamp: arrange coloured shapes on a stage; a lamp glows warm when
// the arrangement obeys a rule nobody states and sulks dim when it does not.
// Pure and Node-importable: no DOM, no Vite globals, no wall clock.

import type { ProtoMeta } from '../../kit/sim.ts'

export const meta: ProtoMeta = {
  key: 'the-sulking-lamp',
  name: 'The Sulking Lamp',
  verb: 'arrange',
  engine: 'mystery',
  lens: 'other',
  ageBand: [10, 12],
  // `warmer` is the graded glow: with it the lamp shows a half-lit "getting
  // closer" state between dim and warm; without it the lamp is only dim or
  // warm. It changes the lamp, the signature classes, and nothing else. Naming
  // the rule is the loop itself, so it is not a hook.
  hooks: ['warmer'],
  features: [
    // Rules named right so far: the loop's aim is to work the hidden rule out.
    { name: 'solved', objective: 'up' },
    // 1 warm, 0.5 glowing (only with the warmer hook), 0 dim or waiting.
    { name: 'warmth', objective: 'up' },
    { name: 'onStage' },
    { name: 'guessesLeft' },
  ],
  // 12 rule families times 5 outcome states (dim, glow, warm, solved, shown).
  // Nothing else feeds the signature.
  signatureBound: 60,
  hookAblation: { supported: true },
}
