import { describe, expect, it } from 'vitest'
import {
  carriedPose,
  createPose,
  gaitPose,
  idleFor,
  idlePose,
  LAND_TIMING,
  landPose,
  profileFor,
  reactPose,
  SLEEP_BREATH,
  sleepPose,
  snoreBubble,
  temperamentFor,
  WAKE_HOP_LATEST,
  WAKE_TIMING,
  wakePose,
  WIND_UP_SECONDS,
  windUpPose,
  type GaitProfile,
  type Pose,
  type Temperament,
} from './gait'
import type { Part, PartKind } from './parts'

const parts = (...kinds: PartKind[]): Part[] => kinds.map((kind) => ({ kind, hue: 0 }))

/** Average share of speed applied over one cycle: every routine should travel about one stride per cycle. */
function meanAdvance(profile: GaitProfile): number {
  const pose = createPose()
  let total = 0
  const steps = 400
  for (let i = 0; i < steps; i++) total += gaitPose(profile, i / steps, 1, pose).advance
  return total / steps
}

function trace(profile: GaitProfile, read: (pose: Pose) => number): number[] {
  const pose = createPose()
  const out: number[] = []
  for (let i = 0; i < 40; i++) out.push(read(gaitPose(profile, i / 40, 1, pose)))
  return out
}

const range = (values: number[]) => Math.max(...values) - Math.min(...values)

/** Every pair of signatures differs by more than `gap` in at least one sample: no two share a routine. */
function expectDistinct(names: readonly string[], signatures: number[][], gap: number): void {
  for (let a = 0; a < signatures.length; a++) {
    for (let b = a + 1; b < signatures.length; b++) {
      const most = Math.max(...signatures[a].map((v, i) => Math.abs(v - signatures[b][i])))
      expect(most, `${names[a]} vs ${names[b]}`).toBeGreaterThan(gap)
    }
  }
}

describe('profileFor', () => {
  it('picks a gait routine from the number of legs', () => {
    expect(profileFor(parts(), 1).routine).toBe('inch')
    expect(profileFor(parts('legStub'), 1).routine).toBe('pogo')
    expect(profileFor(parts('legStub', 'legStub'), 1).routine).toBe('waddle')
    expect(profileFor(parts('legStub', 'legStub', 'legStub'), 1).routine).toBe('lope')
    expect(profileFor(parts('legStub', 'legStub', 'legStub', 'legStub'), 1).routine).toBe('trot')
    expect(profileFor(parts('legStub', 'legStub', 'legStub', 'legStub', 'legStub', 'legStub'), 1).routine).toBe('scuttle')
  })

  it('makes long legs stride slower and cover more ground than stubby ones', () => {
    const stubby = profileFor(parts('legStub', 'legStub'), 1)
    const long = profileFor(parts('legLong', 'legLong'), 1)
    expect(long.cadence).toBeLessThan(stubby.cadence)
    expect(long.speed).toBeGreaterThan(stubby.speed)
    expect(long.limp).toBe(0)
    expect(profileFor(parts('legLong', 'legStub'), 1).limp).toBe(1)
  })

  it('a big head is top-heavy and low-voiced, a tail steadies', () => {
    const head = profileFor(parts('legStub', 'legStub', 'head'), 1)
    expect(head.topHeavy).toBe(true)
    expect(head.voice).toBeLessThan(profileFor(parts('legStub', 'legStub'), 1).voice)
    expect(profileFor(parts('legStub', 'legStub', 'tailLong'), 1).steady).toBe(1)
  })

  it('every routine travels about one stride per cycle', () => {
    for (const legs of [0, 1, 2, 3, 4, 6]) {
      const profile = profileFor(parts(...Array<PartKind>(legs).fill('legStub')), 1)
      expect(meanAdvance(profile)).toBeGreaterThan(0.8)
      expect(meanAdvance(profile)).toBeLessThan(1.25)
    }
  })

  it('an inchworm only travels while it stretches and a pogo only in the air', () => {
    const inch = profileFor(parts(), 1)
    const pose = createPose()
    expect(gaitPose(inch, 0.25, 1, pose).advance).toBe(0)
    expect(gaitPose(inch, 0.75, 1, pose).advance).toBeGreaterThan(1)
    const pogo = profileFor(parts('legStub'), 1)
    expect(gaitPose(pogo, 0.1, 1, pose).advance).toBe(0)
    expect(gaitPose(pogo, 0.5, 1, pose).lift).toBeGreaterThan(3)
  })

  it('routines differ in shape, not only in size', () => {
    const waddle = profileFor(parts('legStub', 'legStub'), 1)
    const trot = profileFor(parts('legStub', 'legStub', 'legStub', 'legStub'), 1)
    const scuttle = profileFor(parts('legStub', 'legStub', 'legStub', 'legStub', 'legStub', 'legStub'), 1)
    expect(range(trace(waddle, (p) => p.roll))).toBeGreaterThan(0.3)
    expect(range(trace(trot, (p) => p.roll))).toBe(0)
    expect(range(trace(scuttle, (p) => p.lift))).toBeLessThan(0.4)
    expect(range(trace(profileFor(parts(), 1), (p) => p.sz))).toBeGreaterThan(0.25)
  })

  it('a tail swishes against the roll and damps it', () => {
    const plain = profileFor(parts('legStub', 'legStub'), 1)
    const tailed = profileFor(parts('legStub', 'legStub', 'tailCurl'), 1)
    expect(range(trace(tailed, (p) => p.roll))).toBeLessThan(range(trace(plain, (p) => p.roll)))
    expect(range(trace(tailed, (p) => p.tail))).toBeGreaterThan(0.5)
  })

  it('blends to a still standing pose', () => {
    const profile = profileFor(parts('legLong', 'legLong', 'legLong'), 3)
    const pose = gaitPose(profile, 0.3, 0, createPose())
    expect(pose.lift).toBe(0)
    expect(pose.sy).toBe(1)
    expect(pose.advance).toBe(0)
    expect(Array.from(pose.legSwing).every((v) => v === 0)).toBe(true)
  })
})

describe('idle and temperament', () => {
  it('the most distinctive part picks the idle', () => {
    expect(idleFor(parts('horn', 'tailLong'))).toBe('paw')
    expect(idleFor(parts('tailLong', 'head'))).toBe('chase')
    expect(idleFor(parts('head', 'earFlop'))).toBe('nod')
    expect(idleFor(parts('earFlop'))).toBe('shake')
    expect(idleFor(parts('eye', 'eye', 'eye'))).toBe('lookAround')
    expect(idleFor(parts('tailCurl'))).toBe('wiggle')
    expect(idleFor(parts('legStub'))).toBe('jelly')
  })

  it('horns are bold, everyone else takes a temperament from their seed', () => {
    expect(temperamentFor(parts('horn'), 0)).toBe('bold')
    expect(new Set([0, 1, 2].map((seed) => temperamentFor(parts(), seed)))).toEqual(new Set(['shy', 'curious', 'bouncy']))
  })

  it('idle and reaction routines move the body without allocating new poses', () => {
    const pose = createPose()
    const legSwing = pose.legSwing
    expect(idlePose('chase', 1.3, pose).yaw).toBeGreaterThan(1)
    expect(pose.legSwing).toBe(legSwing)
    for (const temperament of ['shy', 'curious', 'bouncy', 'bold'] as const) {
      const moved = [0.1, 0.3, 0.5, 0.9].some((t) => {
        const p = reactPose(temperament, t, createPose())
        return Math.abs(p.lift) + Math.abs(p.pitch) + Math.abs(p.sy - 1) + Math.abs(p.yaw) > 0.05
      })
      expect(moved).toBe(true)
    }
  })

  it('a shy critter hops back, a bold one pushes forward', () => {
    expect(reactPose('shy', 0.33, createPose()).advance).toBeLessThan(0)
    expect(reactPose('bold', 0.45, createPose()).advance).toBeGreaterThan(0)
  })
})

describe('wind-up', () => {
  const legged = (n: number) => profileFor(parts(...Array.from({ length: n }, (): PartKind => 'legStub')), 1)
  const profiles = [0, 1, 2, 3, 4, 6].map(legged)

  /** What the wind-up does over time, channel by channel, so two routines can be told apart. */
  function signature(profile: GaitProfile): number[] {
    const out: number[] = []
    for (let i = 1; i < 10; i++) {
      const pose = windUpPose(profile, (i / 10) * WIND_UP_SECONDS[profile.routine], createPose())
      out.push(pose.sy - 1, pose.sz - 1, pose.pitch, pose.roll, pose.lift / 4, pose.legSwing[0], pose.legBend[0], pose.tail, pose.headNod)
    }
    return out
  }

  it('every gait gathers itself its own way, without travelling', () => {
    expectDistinct(profiles.map((p) => p.routine), profiles.map(signature), 0.08)
    for (const profile of profiles) expect(windUpPose(profile, WIND_UP_SECONDS[profile.routine] * 0.5, createPose()).advance).toBe(0)
  })

  it('ends back at rest, where the walk takes over', () => {
    for (const profile of profiles) {
      const pose = windUpPose(profile, WIND_UP_SECONDS[profile.routine], createPose())
      expect(Math.abs(pose.sy - 1) + Math.abs(pose.pitch) + Math.abs(pose.lift) + Math.abs(pose.legSwing[0])).toBeLessThan(0.02)
    }
  })
})

describe('sleep, wake, carry', () => {
  const temperaments: Temperament[] = ['shy', 'curious', 'bouncy', 'bold']

  it('sleeps with eyes shut, legs folded, and a snore bubble that comes and goes with each breath', () => {
    for (const temperament of temperaments) {
      const pose = sleepPose(temperament, 1, createPose())
      expect(pose.lids, temperament).toBe(0)
      expect(pose.legSplay, temperament).toBe(1)
      const { seconds, bubble } = SLEEP_BREATH[temperament]
      const bubbles = Array.from({ length: 40 }, (_, i) => snoreBubble(temperament, (i / 40) * seconds))
      expect(Math.max(...bubbles), temperament).toBeGreaterThan(bubble * 0.95)
      expect(Math.min(...bubbles), temperament).toBe(0)
    }
  })

  it('no two temperaments sleep alike', () => {
    const signature = (temperament: Temperament) => {
      const out: number[] = []
      for (let i = 0; i < 40; i++) {
        const pose = sleepPose(temperament, i * 0.25, createPose())
        out.push(pose.sy - 1, pose.sx - 1, pose.roll, pose.pitch, pose.headNod, pose.headTilt, pose.mouth, pose.ear / 2, pose.legSwing[0], pose.tailLift)
      }
      return out
    }
    expectDistinct(temperaments, temperaments.map(signature), 0.3)
  })

  it('every temperament wakes its own way: eyes open before the hop, off it goes, and it lands in a squash', () => {
    for (const temperament of temperaments) {
      const { hopAt, seconds } = WAKE_TIMING[temperament]
      expect(wakePose(temperament, 0.02, createPose()).lids, temperament).toBeLessThan(0.5)
      expect(wakePose(temperament, hopAt - 0.05, createPose()).lids, temperament).toBeGreaterThan(0.9)
      expect(wakePose(temperament, hopAt + (seconds - hopAt) * 0.4, createPose()).lift, temperament).toBeGreaterThan(3)
      expect(wakePose(temperament, seconds - 0.04, createPose()).sy, temperament).toBeLessThan(1)
      expect(hopAt, temperament).toBeLessThanOrEqual(WAKE_HOP_LATEST)
    }
  })

  it('no two temperaments share a wake', () => {
    const signature = (temperament: Temperament) => {
      const out: number[] = []
      for (let i = 1; i < 16; i++) {
        const pose = wakePose(temperament, i * 0.1, createPose())
        out.push(pose.sy - 1, pose.pitch, pose.roll, pose.yaw, pose.lift / 4, pose.mouth, pose.lids, pose.headNod, pose.headTilt, pose.ear / 2)
      }
      return out
    }
    expectDistinct(temperaments, temperaments.map(signature), 0.3)
  })

  it('no two temperaments are carried alike; a shy one curls up tight', () => {
    const signature = (temperament: Temperament) => {
      const out: number[] = []
      for (let k = 1; k < 12; k++) {
        const pose = carriedPose(temperament, k * 0.13, createPose())
        out.push(pose.legSwing[0], pose.legSwing[1], pose.legBend[0], pose.roll, pose.pitch, pose.lids, pose.mouth, pose.ear / 2, pose.lookY, pose.sy - 1)
      }
      return out
    }
    expectDistinct(temperaments, temperaments.map(signature), 0.3)
    const shy = carriedPose('shy', 0.4, createPose())
    expect(shy.legBend[0]).toBe(1)
    expect(shy.lids).toBeLessThan(0.2)
  })

  it('no two temperaments land alike; each squashes as it meets the bench, and bouncy rebounds', () => {
    const signature = (temperament: Temperament) => {
      const out: number[] = []
      for (let i = 1; i < 14; i++) {
        const pose = landPose(temperament, i * 0.1, createPose())
        out.push(pose.sy - 1, pose.pitch, pose.roll, pose.yaw, pose.lift / 4, pose.legSwing[0], pose.legBend[0], pose.lids, pose.headNod, pose.lookY, pose.ear / 2)
      }
      return out
    }
    expectDistinct(temperaments, temperaments.map(signature), 0.3)
    for (const temperament of temperaments) {
      const { touches, seconds } = LAND_TIMING[temperament]
      const squash = Math.min(...[0, 0.04, 0.08, 0.12, 0.16].map((after) => landPose(temperament, touches[0] + after, createPose()).sy))
      expect(squash, temperament).toBeLessThan(0.9)
      expect(touches[touches.length - 1], temperament).toBeLessThan(seconds)
    }
    const { touches } = LAND_TIMING.bouncy
    expect(landPose('bouncy', (touches[0] + touches[1]) / 2, createPose()).lift).toBeGreaterThan(3)
  })

})
