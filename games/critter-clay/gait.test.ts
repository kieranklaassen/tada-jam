import { describe, expect, it } from 'vitest'
import {
  carriedPose,
  createPose,
  gaitPose,
  idleFor,
  idlePose,
  profileFor,
  reactPose,
  sleepPose,
  snoreBubble,
  temperamentFor,
  WAKE_HOP_AT,
  WAKE_SECONDS,
  wakePose,
  type GaitProfile,
  type Pose,
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

describe('sleep, wake, carry', () => {
  it('sleeps with eyes shut, legs folded, and a snore bubble that comes and goes', () => {
    const pose = sleepPose(1, createPose())
    expect(pose.lids).toBe(0)
    expect(pose.legSplay).toBe(1)
    const bubbles = Array.from({ length: 34 }, (_, i) => snoreBubble(i * 0.1))
    expect(Math.max(...bubbles)).toBeGreaterThan(0.9)
    expect(Math.min(...bubbles)).toBe(0)
  })

  it('wakes by opening its eyes, then hops off with a squash landing', () => {
    expect(wakePose(0.1, createPose()).lids).toBe(0)
    expect(wakePose(0.95, createPose()).lids).toBeGreaterThan(0.9)
    expect(wakePose(WAKE_HOP_AT + 0.2, createPose()).lift).toBeGreaterThan(4)
    expect(wakePose(WAKE_SECONDS - 0.04, createPose()).sy).toBeLessThan(1)
  })

  it('paddles its legs while carried', () => {
    const a = carriedPose(0, createPose()).legSwing[0]
    const b = carriedPose(0.1, createPose()).legSwing[0]
    expect(Math.abs(a - b)).toBeGreaterThan(0.2)
  })
})
