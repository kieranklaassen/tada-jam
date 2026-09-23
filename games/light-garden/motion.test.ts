import { describe, expect, it } from 'vitest'
import { makeCreature, WAKING_SECONDS, type Phase } from './creatures'
import { CREATURES } from './layout'
import { makePose, poseCreature, type Pose } from './motion'

const PHASES: Phase[] = ['asleep', 'waking', 'awake', 'drowsy', 'wandering']
const FIELDS: (keyof Pose)[] = ['dx', 'dy', 'alt', 'heading', 'roll', 'pitch', 'squash', 'stretch', 'eyes', 'glow', 'a', 'b', 'c']

function creatureIn(index: number, phase: Phase, phaseT: number, now: number) {
  const spec = CREATURES[index]
  const c = makeCreature(index, spec.kind, spec.wants, spec.radius, { x: 0, y: 0 })
  c.phase = phase
  c.phaseT = phaseT
  if (phase !== 'asleep') c.wokeAt = now - phaseT - (phase === 'waking' ? 0 : WAKING_SECONDS[spec.kind])
  c.to = { x: 20, y: 5 }
  return c
}

describe('poseCreature', () => {
  it('every pose field stays finite in every phase, carried or not, before any stir or nudge', () => {
    const out = makePose()
    for (let index = 0; index < CREATURES.length; index++) {
      for (const phase of PHASES) {
        for (const held of [false, true]) {
          for (let step = 0; step < 40; step++) {
            const now = 3 + step * 0.37
            poseCreature(creatureIn(index, phase, step * 0.11, now), now, { held, heldFor: step * 0.05 }, out)
            for (const field of FIELDS) expect(Number.isFinite(out[field]), `${CREATURES[index].kind} ${phase} ${field}`).toBe(true)
          }
        }
      }
    }
  })

  it('asleep, eyes are shut and the glow is dim; awake, eyes open and the glow is full', () => {
    const out = makePose()
    for (let index = 0; index < CREATURES.length; index++) {
      poseCreature(creatureIn(index, 'asleep', 5, 10), 10, { held: false, heldFor: 0 }, out)
      expect(out.eyes).toBeLessThan(0.1)
      expect(out.glow).toBeLessThan(0.45)
      poseCreature(creatureIn(index, 'awake', 5, 10), 10, { held: false, heldFor: 0 }, out)
      expect(out.eyes).toBeGreaterThan(0.6)
      expect(out.glow).toBeGreaterThan(0.6)
    }
  })

  it('no two creatures move alike: their awake paths differ', () => {
    const paths = CREATURES.map((_, index) => {
      const out = makePose()
      const samples: number[] = []
      for (let step = 0; step < 30; step++) {
        const now = 20 + step * 0.2
        poseCreature(creatureIn(index, 'awake', 10 + step * 0.2, now), now, { held: false, heldFor: 0 }, out)
        samples.push(out.dx, out.dy, out.alt)
      }
      return samples
    })
    for (let i = 0; i < paths.length; i++) {
      for (let j = i + 1; j < paths.length; j++) {
        const difference = paths[i].reduce((sum, value, k) => sum + Math.abs(value - paths[j][k]), 0)
        expect(difference).toBeGreaterThan(5)
      }
    }
  })
})
