// Fixture: pure noise. State and signature come from a bounded random source
// that never looks at what the child does. A persona should find it
// unpredictable, learn nothing from it, run out of new signatures, and leave.

import { createRng, int } from '../../kit/rng.ts'
import type { Affordance, CreateSim, ProtoMeta } from '../../kit/sim.ts'

const SIGNATURES = 12

export const meta: ProtoMeta = {
  key: 'noise',
  name: 'Noise',
  verb: 'poke',
  engine: 'emergence',
  lens: 'other',
  ageBand: [5, 8],
  hooks: [],
  features: [{ name: 'a', objective: 'up' }, { name: 'b' }],
  signatureBound: SIGNATURES,
  hookAblation: { supported: false, reason: 'the fixture declares no hooks' },
}

export const createSim: CreateSim = (config) => {
  const rng = createRng(config.seed)
  let signature = 'n0'
  let a = rng()
  let b = rng()
  let buttons: Affordance[] = []
  const place = () => {
    buttons = [0, 1, 2].map((i) => ({
      x: int(rng, 60, 1000),
      y: int(rng, 60, 660),
      w: 120,
      h: 120,
      kind: 'tap' as const,
      salience: 0.9 - i * 0.2,
    }))
  }
  place()
  let ticks = 0
  return {
    step() {
      ticks++
      // Everything below draws from the private stream and never from input.
      a = rng()
      b = rng()
      if (rng() < 0.1) {
        signature = `n${int(rng, 0, SIGNATURES - 1)}`
      }
      if (ticks % 60 === 0) place()
    },
    pointer() {},
    affordances: () => buttons,
    // Nothing here was caused by the child, so it reports no state events.
    observe: () => ({ signature, features: { a, b }, events: [] }),
    snapshot: () => ({ signature, a, b }),
  }
}
