// Fixture: nothing ever changes. One button, one signature, a feature that
// never moves. A persona should be bored by it and not come back.

import type { CreateSim, ProtoMeta } from '../../kit/sim.ts'

export const meta: ProtoMeta = {
  key: 'constant',
  name: 'Constant',
  verb: 'poke',
  engine: 'mystery',
  lens: 'other',
  ageBand: [5, 8],
  hooks: [],
  features: [{ name: 'level', objective: 'up' }],
  signatureBound: 2,
  hookAblation: { supported: false, reason: 'the fixture declares no hooks' },
}

export const createSim: CreateSim = () => ({
  step() {},
  pointer() {},
  affordances: () => [{ x: 490, y: 310, w: 200, h: 200, kind: 'tap', salience: 0.9 }],
  observe: () => ({ signature: 'still', features: { level: 0 }, events: [] }),
  snapshot: () => ({}),
})
