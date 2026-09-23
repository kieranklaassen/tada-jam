import { describe, expect, it } from 'vitest'
import { Creature, MOTION } from '../brain'
import { ANIMAL_KEYS, type AnimalKey } from '../layout'
import { BEAR, BIRD, FISH, FOX, OWL, RABBIT } from './animals'
import type { Vec3Tuple } from './geometry'
import { Joints, POSE } from './rigs'

const PARTS: Record<AnimalKey, number> = { owl: OWL.parts, fox: FOX.parts, rabbit: RABBIT.parts, bear: BEAR.parts, fish: FISH.parts, songbird: BIRD.parts }
const SAMPLES = 41

type Action = 'walk' | 'idle' | 'yawn' | 'trick' | 'second trick' | 'held'
const ACTIONS: readonly Action[] = ['walk', 'idle', 'yawn', 'trick', 'second trick', 'held']

/** Joints that also keep each part's local pose (angles, stretch, offset), so a test can read the motion itself. */
class RecordingJoints extends Joints {
  readonly local: Float32Array

  constructor(count: number) {
    super(count)
    this.local = new Float32Array(count * 9)
  }

  override set(i: number, parent: number, pivot: Vec3Tuple, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx, tx = 0, ty = 0, tz = 0): void {
    this.local.set([rx, ry, rz, sx - 1, sy - 1, sz - 1, tx, ty, tz], i * 9)
    super.set(i, parent, pivot, rx, ry, rz, sx, sy, sz, tx, ty, tz)
  }
}

/** How long one play of an action lasts for this animal (walk: one gait cycle). */
function length(key: AnimalKey, action: Action): number {
  switch (action) {
    case 'walk':
      return 1
    case 'idle':
      // Long enough to catch each animal's idle moment (the rabbit sitting up, the bear's scratch).
      return 12
    case 'yawn':
      return MOTION[key].yawn
    case 'trick':
    case 'second trick':
      return MOTION[key].trick
    case 'held':
      return 2
    default: {
      const unreachable: never = action
      return unreachable
    }
  }
}

/**
 * An action's motion signature across one play: the body's and the next part's (head, or the fish's tail) local
 * angles, stretch, and size-relative offsets, plus how busy the rest of its limbs are, with the rest pose
 * subtracted so only the motion counts. Skeletons differ, so the limbs are compared by their mean activity.
 */
function signature(key: AnimalKey, action: Action): number[] {
  const c = new Creature(key, ANIMAL_KEYS.indexOf(key), 0)
  const J = new RecordingJoints(PARTS[key])
  const rest = sample(c, J, 'idle', 0)
  const out: number[] = []
  const span = length(key, action)
  for (let i = 0; i < SAMPLES; i++) {
    const values = sample(c, J, action, (span * i) / (SAMPLES - 1))
    for (let v = 0; v < values.length; v++) out.push(values[v] - rest[v])
  }
  return out
}

function sample(c: Creature, J: RecordingJoints, action: Action, t: number): number[] {
  c.mode = action === 'second trick' ? 'trick' : action
  c.trickVariant = action === 'second trick' ? 1 : 0
  c.modeT = t
  c.clock = t
  c.gait = action === 'walk' ? t : 0
  c.speed = action === 'walk' ? c.spec.walkSpeed : 0
  POSE[c.key](c, J)
  const size = c.spec.size
  const values: number[] = []
  for (const part of [0, 1]) {
    const l = J.local.subarray(part * 9, part * 9 + 9)
    values.push(l[0], l[1], l[2], l[3], l[4], l[5], l[6] / size, l[7] / size, l[8] / size)
  }
  const parts = J.local.length / 9
  let limbs = 0
  for (let part = 2; part < parts; part++) {
    for (let v = 0; v < 6; v++) limbs += Math.abs(J.local[part * 9 + v])
  }
  values.push(limbs / (parts - 2))
  return values
}

function distance(a: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2
  return Math.sqrt(sum / SAMPLES)
}

/** Below this, two animals' versions of an action read as one animation reused. */
const NEAR_COPY = 0.25

describe('motion personalities', () => {
  for (const action of ACTIONS) {
    it(`no two animals share a ${action}: every pair moves differently`, () => {
      const signatures = ANIMAL_KEYS.map((key) => signature(key, action))
      for (let i = 0; i < ANIMAL_KEYS.length; i++) {
        for (let j = i + 1; j < ANIMAL_KEYS.length; j++) {
          const d = distance(signatures[i], signatures[j])
          expect(d, `${action}: ${ANIMAL_KEYS[i]} and ${ANIMAL_KEYS[j]}`).toBeGreaterThan(NEAR_COPY)
        }
      }
    })
  }

  it('every trick in the forest is its own: each animal has two, and no trick is a copy of any other', () => {
    const tricks = ANIMAL_KEYS.flatMap((key) => (['trick', 'second trick'] as const).map((action) => ({ name: `${key} ${action}`, signature: signature(key, action) })))
    for (let i = 0; i < tricks.length; i++) {
      for (let j = i + 1; j < tricks.length; j++) {
        expect(distance(tricks[i].signature, tricks[j].signature), `${tricks[i].name} and ${tricks[j].name}`).toBeGreaterThan(NEAR_COPY)
      }
    }
  })

  it('tempo follows nature: the bear is the slowest to breathe, turn, and play, the songbird the quickest', () => {
    const slowest = (field: 'breath' | 'turn' | 'trick' | 'yawn', slow: 'max' | 'min') => {
      const values = ANIMAL_KEYS.map((key) => MOTION[key][field])
      return ANIMAL_KEYS[values.indexOf(slow === 'max' ? Math.max(...values) : Math.min(...values))]
    }
    expect(slowest('breath', 'max')).toBe('bear')
    expect(slowest('breath', 'min')).toBe('songbird')
    expect(slowest('turn', 'min')).toBe('bear')
    expect(slowest('turn', 'max')).toBe('songbird')
    expect(slowest('trick', 'max')).toBe('bear')
    expect(slowest('yawn', 'max')).toBe('bear')
  })

  it('landings spring differently for every animal', () => {
    const springs = ANIMAL_KEYS.map((key) => `${MOTION[key].stiffness}/${MOTION[key].damping}`)
    expect(new Set(springs).size).toBe(ANIMAL_KEYS.length)
  })
})
