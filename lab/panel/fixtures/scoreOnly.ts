// Fixture: the constant sim plus a score hook. A touch ticks a score up, but no
// affordance and no signature ever changes. The score is a hook event and part
// of the snapshot, not a declared feature: the persona model has no reward
// response, so removing the hook changes nothing the persona can register.

import type { CreateSim, ProtoMeta, SimEvent } from '../../kit/sim.ts'

export const meta: ProtoMeta = {
  key: 'score-only',
  name: 'Score only',
  verb: 'poke',
  engine: 'rule-play',
  lens: 'other',
  ageBand: [5, 8],
  hooks: ['score'],
  features: [{ name: 'level', objective: 'up' }],
  signatureBound: 2,
  hookAblation: { supported: true },
}

const BUTTON = { x: 490, y: 310, w: 200, h: 200 }

export const createSim: CreateSim = (config) => {
  const scoring = config.hooks.includes('score')
  let score = 0
  let events: SimEvent[] = []
  return {
    step() {},
    pointer(input) {
      if (input.phase !== 'down') return
      const inside = input.x >= BUTTON.x && input.x <= BUTTON.x + BUTTON.w && input.y >= BUTTON.y && input.y <= BUTTON.y + BUTTON.h
      if (inside && scoring) {
        score += 10
        events.push({ kind: 'hook', name: 'score' })
      }
    },
    affordances: () => [{ ...BUTTON, kind: 'tap', salience: 0.9 }],
    observe() {
      const out = events
      events = []
      return { signature: 'still', features: { level: 0 }, events: out }
    },
    snapshot: () => ({ score }),
  }
}
