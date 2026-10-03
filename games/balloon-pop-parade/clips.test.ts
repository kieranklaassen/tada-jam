import { describe, expect, it } from 'vitest'
import { BODIES, type KindName } from './bodies'
import { blinkAt, clip, PERSONALITIES, rest, stride, walk, type ClipId } from './clips'
import { restPose, type Pose } from './pose'

const KINDS: KindName[] = ['duck', 'frog', 'hippo', 'crab']
const CLIPS: ClipId[] = ['catch', 'refuse', 'liftOff', 'popped', 'poke', 'pokeB', 'wave', 'proud', 'march']

/** A friend standing at the origin at this moment of a clip, or of its resting life when `id` is null. */
function sample(kind: KindName, id: ClipId | null, t: number, holds = false, time = 10): Pose {
  const pose = restPose(), plan = BODIES[kind]
  rest(kind, holds, plan.reach, time, 0, pose)
  if (id) clip(kind, id, t, plan.height, plan.reach, pose)
  return pose
}

/** A motion as a row of numbers: every channel a child could see, at 30 moments spread over its whole length. */
function track(kind: KindName, id: ClipId): number[] {
  const lasts = PERSONALITIES[kind].lasts[id], row: number[] = []
  for (let i = 0; i <= 30; i++) {
    const still = sample(kind, null, 0), moving = sample(kind, id, (i / 30) * lasts)
    row.push(
      (moving.y - still.y) / BODIES[kind].height, moving.x - still.x, moving.squash - still.squash, Math.sin(moving.turn / 2), moving.bow, moving.lean - still.lean,
      moving.nod - still.nod, moving.headTurn, moving.tilt - still.tilt, moving.armL - still.armL, moving.armR - still.armR, moving.armLForward, moving.wag - still.wag, moving.flick, moving.puff - still.puff,
    )
  }
  return row
}

/** How far two motions are apart: the difference summed over every channel, averaged over the moments sampled. A hop of a tenth of a height, alone, scores about 0.06. */
const CHANNELS = 15
const apart = (a: number[], b: number[]) => a.reduce((sum, v, i) => sum + Math.abs(v - b[i]), 0) / (a.length / CHANNELS)

describe('the clips', () => {
  it('give no two kinds the same motion for anything', () => {
    for (const id of CLIPS) for (const a of KINDS) for (const b of KINDS) {
      if (a < b) expect(apart(track(a, id), track(b, id)), `${id}: ${a} and ${b}`).toBeGreaterThan(0.3)
    }
  })

  it('give every kind nine motions that differ from each other', () => {
    for (const kind of KINDS) for (const a of CLIPS) for (const b of CLIPS) {
      if (a < b) expect(apart(track(kind, a), track(kind, b)), `${kind}: ${a} and ${b}`).toBeGreaterThan(0.3)
    }
  })

  it('give each kind its own length for every motion, and its own breath and blink', () => {
    for (const id of CLIPS) expect(new Set(KINDS.map((kind) => PERSONALITIES[kind].lasts[id])).size, id).toBe(4)
    expect(new Set(KINDS.map((kind) => PERSONALITIES[kind].breath)).size).toBe(4)
    expect(new Set(KINDS.map((kind) => PERSONALITIES[kind].blinkEvery)).size).toBe(4)
  })

  it('make the hippo the slowest and the crab the quickest to do anything', () => {
    for (const id of CLIPS) {
      const lasts = KINDS.map((kind) => PERSONALITIES[kind].lasts[id])
      expect(PERSONALITIES.hippo.lasts[id], id).toBe(Math.max(...lasts))
      expect(PERSONALITIES.crab.lasts[id], id).toBe(Math.min(...lasts))
    }
  })

  it('bring a friend back to where it stood when a motion is over', () => {
    for (const kind of KINDS) for (const id of CLIPS) {
      const still = sample(kind, null, 0), after = sample(kind, id, PERSONALITIES[kind].lasts[id])
      expect(after.y - still.y, `${kind} ${id} height`).toBeCloseTo(0, 1)
      expect(after.x - still.x, `${kind} ${id} place`).toBeCloseTo(0, 1)
      expect(Math.abs(Math.sin(after.turn / 2)), `${kind} ${id} turn`).toBeLessThan(0.05)
      expect(Math.abs(after.squash - still.squash), `${kind} ${id} squash`).toBeLessThan(0.06)
      expect(Math.abs(after.bow), `${kind} ${id} bow`).toBeLessThan(0.06)
    }
  })

  it('keep every pose a toy could take: never under the ground, never folded flat, arms within their swing', () => {
    for (const kind of KINDS) for (const id of CLIPS) for (const holds of [false, true]) {
      const lasts = PERSONALITIES[kind].lasts[id]
      for (let i = 0; i <= 120; i++) {
        const pose = sample(kind, id, (i / 120) * lasts, holds, 3 + i * 0.01)
        expect(pose.y, `${kind} ${id}`).toBeGreaterThanOrEqual(-1e-9)
        expect(pose.squash, `${kind} ${id}`).toBeGreaterThan(0.55)
        expect(pose.squash, `${kind} ${id}`).toBeLessThan(1.6)
        for (const arm of [pose.armL, pose.armR]) {
          expect(arm, `${kind} ${id} arm`).toBeGreaterThan(-0.3)
          expect(arm, `${kind} ${id} arm`).toBeLessThan(3.4)
        }
        expect(pose.puff, `${kind} ${id} puff`).toBeGreaterThan(0.15)
        expect(pose.puff, `${kind} ${id} puff`).toBeLessThan(3)
      }
    }
  })

  it('move without a jump from one sixtieth of a second to the next', () => {
    for (const kind of KINDS) for (const id of CLIPS) {
      const lasts = PERSONALITIES[kind].lasts[id]
      let before = sample(kind, id, 0)
      for (let t = 1 / 60; t <= lasts; t += 1 / 60) {
        const now = sample(kind, id, t)
        expect(Math.abs(now.y - before.y), `${kind} ${id} at ${t.toFixed(2)}`).toBeLessThan(0.2)
        expect(Math.abs(now.squash - before.squash), `${kind} ${id} at ${t.toFixed(2)}`).toBeLessThan(0.12)
        expect(Math.abs(now.puff - before.puff), `${kind} ${id} at ${t.toFixed(2)}`).toBeLessThan(0.4)
        before = now
      }
    }
  })
})

describe('the cues', () => {
  it('fall inside their clips and in order', () => {
    for (const kind of KINDS) {
      const { lasts, cue } = PERSONALITIES[kind]
      expect(cue.hit).toBeLessThan(lasts.refuse)
      expect(cue.grab).toBeLessThan(lasts.catch)
      expect(cue.letGo).toBeLessThan(cue.land)
      expect(cue.land).toBeLessThan(lasts.liftOff)
    }
  })

  it('carry a friend off the ground until it lets go and have it down again when it lands', () => {
    for (const kind of KINDS) {
      const { cue, carried } = PERSONALITIES[kind], height = BODIES[kind].height
      const still = sample(kind, null, 0).y
      expect(sample(kind, 'liftOff', cue.letGo).y - still, kind).toBeCloseTo(carried * height, 1)
      expect(sample(kind, 'liftOff', cue.land).y - still, kind).toBeLessThan(0.3)
    }
    // The hippo is too heavy: only its toes leave the ground.
    expect(PERSONALITIES.hippo.carried).toBeLessThan(0.15)
    for (const kind of ['duck', 'frog', 'crab'] as const) expect(PERSONALITIES[kind].carried).toBeGreaterThan(0.5)
  })

  it('answer a tap at once: every motion a touch starts is under way within a tenth of a second', () => {
    for (const kind of KINDS) for (const id of ['poke', 'pokeB', 'liftOff', 'wave'] as const) {
      const still = track(kind, id).slice(0, 15)
      const early = sample(kind, id, 0.1), rested = sample(kind, null, 0)
      const moved = Math.abs(early.y - rested.y) + Math.abs(early.squash - rested.squash) + Math.abs(early.armL - rested.armL) + Math.abs(early.armR - rested.armR) + Math.abs(early.wag - rested.wag) + Math.abs(early.puff - rested.puff) + Math.abs(early.x - rested.x)
      expect(still).toHaveLength(15)
      expect(moved, `${kind} ${id}`).toBeGreaterThan(0.02)
    }
    // The one exception is the hippo startled by a pop: not noticing for a beat is its joke.
    expect(PERSONALITIES.hippo.lasts.popped).toBeGreaterThan(1)
  })
})

describe('the resting life', () => {
  it('is different for every kind, and different with a balloon and without', () => {
    const life = (kind: KindName, holds: boolean) => {
      const row: number[] = []
      for (let i = 0; i < 40; i++) {
        const pose = sample(kind, null, 0, holds, i * 0.11)
        row.push(pose.y, pose.x, pose.lean, pose.wag, pose.puff - 1, pose.squash - 1)
      }
      return row
    }
    for (const a of KINDS) for (const b of KINDS) if (a < b) expect(apart(life(a, false), life(b, false)) * (CHANNELS / 6), `${a} and ${b}`).toBeGreaterThan(0.04)
    for (const kind of KINDS) {
      expect(sample(kind, null, 0, false).armL).toBeGreaterThan(2)
      // With a balloon the free arm comes down, except the crab's, whose claws stay up whatever it does.
      if (kind === 'crab') expect(sample(kind, null, 0, true).armL).toBeGreaterThan(2)
      else expect(sample(kind, null, 0, true).armL).toBeLessThan(0.5)
      expect(sample(kind, null, 0, true).nod).toBeGreaterThan(sample(kind, null, 0, false).nod)
      expect(sample(kind, null, 0, true).armR).toBeGreaterThan(2)
    }
  })

  it('blinks each kind at its own rhythm, briefly', () => {
    for (const kind of KINDS) {
      let shut = 0
      for (let i = 0; i < 6000; i++) if (blinkAt(kind, i / 60, 0) > 0.5) shut++
      expect(shut / 6000, kind).toBeGreaterThan(0.005)
      expect(shut / 6000, kind).toBeLessThan(0.08)
    }
  })
})

describe('the walk', () => {
  /** A walk as a row of numbers, sampled along its whole length. */
  const gait = (kind: KindName, direction: number) => {
    const row: number[] = []
    for (let i = 1; i < 40; i++) {
      const pose = restPose()
      rest(kind, false, BODIES[kind].reach, 5, 0, pose)
      const still = { ...pose }
      walk(kind, i / 40, direction, pose)
      row.push(pose.y - still.y, pose.lean - still.lean, pose.turn, pose.squash - still.squash, pose.wag - still.wag, pose.puff - still.puff, stride(kind, i / 40) - i / 40)
    }
    return row
  }
  const far = (a: number[], b: number[]) => a.reduce((sum, v, i) => sum + Math.abs(v - b[i]), 0) / 39

  it('is a different gait for every kind', () => {
    for (const a of KINDS) for (const b of KINDS) if (a < b) expect(far(gait(a, 1), gait(b, 1)), `${a} and ${b}`).toBeGreaterThan(0.15)
  })

  it('never turns the crab away from the child, and turns the others the way they go', () => {
    for (let i = 1; i < 20; i++) {
      const pose = restPose()
      walk('crab', i / 20, 1, pose)
      expect(pose.turn).toBe(0)
    }
    for (const kind of ['duck', 'frog', 'hippo'] as const) {
      const right = restPose(), left = restPose()
      walk(kind, 0.5, 1, right)
      walk(kind, 0.5, -1, left)
      expect(right.turn, kind).toBeGreaterThan(0.2)
      expect(left.turn, kind).toBeLessThan(-0.2)
    }
  })

  it('starts where it stood, ends where it is going, and never goes backwards', () => {
    for (const kind of KINDS) {
      expect(stride(kind, 0)).toBe(0)
      expect(stride(kind, 1)).toBeCloseTo(1, 6)
      let before = 0
      for (let i = 1; i <= 200; i++) {
        const now = stride(kind, i / 200)
        expect(now, kind).toBeGreaterThanOrEqual(before - 1e-9)
        before = now
      }
      const rested = restPose(), ended = restPose()
      walk(kind, 0, 1, rested)
      walk(kind, 1, 1, ended)
      expect(rested).toEqual(restPose())
      expect(ended).toEqual(restPose())
    }
  })

  it('makes the hippo the slowest to arrive and the crab the quickest', () => {
    const walks = KINDS.map((kind) => PERSONALITIES[kind].walk)
    expect(PERSONALITIES.hippo.walk).toBe(Math.max(...walks))
    expect(PERSONALITIES.crab.walk).toBe(Math.min(...walks))
    expect(new Set(walks).size).toBe(4)
  })
})
