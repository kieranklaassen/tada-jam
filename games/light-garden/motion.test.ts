import { describe, expect, it } from 'vitest'
import { makeCreature, WAKING_SECONDS, type Creature, type Phase } from './creatures'
import { CREATURES } from './layout'
import { makePose, poke, POKES, poseCreature, type Carry, type Pose } from './motion'

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
            poseCreature(creatureIn(index, phase, step * 0.11, now), now, { held, heldFor: step * 0.05, want: step % 3 === 0 ? 0 : 0.6 }, out)
            for (const field of FIELDS) expect(Number.isFinite(out[field]), `${CREATURES[index].kind} ${phase} ${field}`).toBe(true)
          }
        }
      }
    }
  })

  it('asleep, eyes are shut and the glow is dim; awake, eyes open and the glow is full', () => {
    const out = makePose()
    for (let index = 0; index < CREATURES.length; index++) {
      poseCreature(creatureIn(index, 'asleep', 5, 10), 10, { held: false, heldFor: 0, want: 0 }, out)
      expect(out.eyes).toBeLessThan(0.1)
      expect(out.glow).toBeLessThan(0.45)
      poseCreature(creatureIn(index, 'awake', 5, 10), 10, { held: false, heldFor: 0, want: 0 }, out)
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
        poseCreature(creatureIn(index, 'awake', 10 + step * 0.2, now), now, { held: false, heldFor: 0, want: 0 }, out)
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

  it('the want turns toward the child and dreams in a gesture of its own, still asleep', () => {
    const CHANNELS: (keyof Pose)[] = ['alt', 'roll', 'a', 'b', 'c']
    const gestures = CREATURES.map((_, index) => {
      const calm = makePose()
      const wanting = makePose()
      const trace: number[] = []
      for (let step = 0; step < 50; step++) {
        const now = 40 + step * 0.1
        const creature = creatureIn(index, 'asleep', 5, now)
        creature.stirAt = -Infinity
        poseCreature(creature, now, { held: false, heldFor: 0, want: 0 }, calm)
        poseCreature(creature, now, { held: false, heldFor: 0, want: 1 }, wanting)
        expect(wanting.eyes).toBeLessThan(0.1)
        expect(Math.abs(Math.sin(wanting.heading) - 1)).toBeLessThan(0.45)
        for (const channel of CHANNELS) trace.push(wanting[channel] - calm[channel])
      }
      return trace
    })
    for (const trace of gestures) expect(Math.max(...trace.map(Math.abs))).toBeGreaterThan(0.2)
    for (let i = 0; i < gestures.length; i++) {
      for (let j = i + 1; j < gestures.length; j++) {
        const distance = Math.hypot(...gestures[i].map((value, k) => value - gestures[j][k]))
        expect(distance, `${CREATURES[i].kind} vs ${CREATURES[j].kind}`).toBeGreaterThan(0.5)
      }
    }
  })
})

describe('a poke', () => {
  const CALM: Carry = { held: false, heldFor: 0, want: 0 }
  const SAMPLES = 21
  const wrap = (angle: number) => angle - Math.PI * 2 * Math.round(angle / (Math.PI * 2))

  /** How the pose moves away from the calm pose over `seconds` after `mark` sets an event time. */
  function trace(index: number, phase: Phase, seconds: number, mark: (creature: Creature, at: number) => void): number[] {
    const calm = makePose()
    const moved = makePose()
    const out: number[] = []
    const at = 30
    for (let step = 0; step < SAMPLES; step++) {
      const now = at + (step / (SAMPLES - 1)) * seconds
      const creature = creatureIn(index, phase, 8 + now - at, now)
      poseCreature(creature, now, CALM, calm)
      mark(creature, at)
      poseCreature(creature, now, CALM, moved)
      for (const field of FIELDS) out.push(field === 'heading' ? wrap(moved.heading - calm.heading) : moved[field] - calm[field])
    }
    return out
  }
  const distance = (a: number[], b: number[]) => Math.hypot(...a.map((value, k) => value - b[k]))
  const pokedAs = (variant: number) => (creature: Creature, at: number) => {
    creature.pokeAt = at
    creature.pokeVariant = variant
  }

  it('each creature has two answers of its own, named once in the game', () => {
    const names = CREATURES.flatMap((spec) => POKES[spec.kind].map((answer) => answer.name))
    for (const spec of CREATURES) expect(POKES[spec.kind].length).toBe(2)
    expect(new Set(names).size).toBe(names.length)
  })

  it('never gives the same answer twice running, and uses them all', () => {
    for (const [index, spec] of CREATURES.entries()) {
      const creature = creatureIn(index, 'asleep', 1, 0)
      const answers = Array.from({ length: 6 }, (_, k) => poke(creature, k))
      for (let k = 1; k < answers.length; k++) expect(answers[k]).not.toBe(answers[k - 1])
      expect(new Set(answers).size).toBe(POKES[spec.kind].length)
    }
  })

  it('every answer is plain to see asleep and awake, and no two are near-copies', () => {
    for (const phase of ['asleep', 'awake'] as Phase[]) {
      const answers = CREATURES.flatMap((spec, index) =>
        POKES[spec.kind].map((answer, variant) => ({ label: `${spec.kind} ${answer.name} ${phase}`, trace: trace(index, phase, 1.8, pokedAs(variant)) })),
      )
      for (const { label, trace } of answers) expect(Math.max(...trace.map(Math.abs)), label).toBeGreaterThan(0.3)
      for (let i = 0; i < answers.length; i++) {
        for (let j = i + 1; j < answers.length; j++) {
          expect(distance(answers[i].trace, answers[j].trace), `${answers[i].label} vs ${answers[j].label}`).toBeGreaterThan(0.5)
        }
      }
    }
  })

  it('is not the stir that light gives a sleeper, nor the nudge between friends', () => {
    for (const [index, spec] of CREATURES.entries()) {
      const stir = trace(index, 'asleep', 1.8, (creature, at) => (creature.stirAt = at))
      const nudge = trace(index, 'awake', 1.8, (creature, at) => (creature.nudgeAt = at))
      for (const [variant, answer] of POKES[spec.kind].entries()) {
        expect(distance(trace(index, 'asleep', 1.8, pokedAs(variant)), stir), `${spec.kind} ${answer.name} vs stir`).toBeGreaterThan(0.5)
        expect(distance(trace(index, 'awake', 1.8, pokedAs(variant)), nudge), `${spec.kind} ${answer.name} vs nudge`).toBeGreaterThan(0.5)
      }
    }
  })
})
