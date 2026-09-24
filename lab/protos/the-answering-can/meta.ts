import type { ProtoMeta } from '../../kit/sim.ts'

export const meta: ProtoMeta = {
  key: 'the-answering-can',
  name: 'The Answering Can',
  verb: 'knock',
  engine: 'mystery',
  lens: 'physical-toy',
  toy: 'tin-can-telephone',
  ageBand: [7, 10],
  // One hook: the friend who stacks two rules sleeps until the child has
  // worked out one of the others. Removing it wakes all three friends at once.
  hooks: ['stack-wakes'],
  features: [
    // Friends whose rule the child named correctly (0 to 3).
    { name: 'solved', objective: 'up' },
    // Distinct (friend, rhythm shape) pairs the child has sent down a live
    // string, out of 21: how systematically they are testing. Only these two
    // are declared: a counter of answers or live strings has no better
    // direction, so a self-set aim on it would only be noise.
    { name: 'probes', objective: 'up' },
  ],
  // 3 poses (slack, taut, guess) times 6 things last heard (nothing, dead
  // line, same, twice, changed, twice-changed) times 3 solved states (none,
  // some, all).
  signatureBound: 54,
  // The one hook is removable alone (the sim checks config.hooks).
  hookAblation: { supported: true },
}
