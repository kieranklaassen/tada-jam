// Stubborn Balloon (mastery-01). A slow balloon sinks; the child pats it. WHERE
// the pat lands is the skill: under the middle sends it straight up, off to one
// side spins it so it curls that way, a finger held beneath cradles it, and a
// bear across the field bats it back when it floats over.

import type { ProtoMeta } from '../../kit/sim.ts'

export const meta: ProtoMeta = {
  key: 'stubborn-balloon',
  name: 'Stubborn Balloon',
  verb: 'pat',
  engine: 'mastery',
  lens: 'physical-toy',
  toy: 'balloon-keepy-uppy',
  ageBand: [2, 5],
  // The loop is the skill, not a reward on top of it: no score, level, timer,
  // or unlock. Bats and landings are only observed, never shown as a hook.
  hooks: [],
  features: [
    // The bear's bats are the loop's own aim: getting the balloon across.
    { name: 'bats', objective: 'up' },
    // Keep-it-up: a balloon on the floor is the miss.
    { name: 'landings', objective: 'down' },
    { name: 'pats' },
    // Off-centre pats: the hidden control, how often the child uses it.
    { name: 'curlPats' },
    { name: 'rally' },
    { name: 'nearBear' },
    { name: 'height' },
  ],
  // place (floor, cradle, high, low) x curl (straight, left, right; only in the
  // air) x bear (waiting, reaching, batted):
  // floor 1x3 + cradle 1x3 + air 2x3x3 = 24. Nothing else feeds the signature.
  signatureBound: 24,
  // There are no hooks to take away.
  hookAblation: { supported: true },
}
