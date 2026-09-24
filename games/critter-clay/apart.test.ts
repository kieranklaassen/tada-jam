import { describe, expect, it, vi } from 'vitest'
import { WorkshopController, type Projector } from './controller'
import { clampWalk, insideWalk } from './layout'
import type { Part, PartKind } from './parts'
import { deserialize } from './state'
import { apartDistance, clearSpot, FOOTPRINT_GAP, meeting, MEET_RADIUS, random, SEPARATE_SPEED, separate, type Mover } from './wander'

// Critters never stand in each other: each keeps its footprint (body and
// the parts that stick out) clear of every friend's, whether walking,
// greeting, landing from a finger, or waking beside a crowd.

const mover = (x: number, z: number, reach: number): Mover => ({ x, z, heading: 0, reach })

describe('separate', () => {
  it('pushes two overlapping friends apart, never faster than SEPARATE_SPEED', () => {
    const a = mover(-30, 16, 12)
    const b = mover(-24, 17, 10)
    const dt = 1 / 30
    for (let i = 0; i < 30; i++) {
      const before = [a.x, a.z, b.x, b.z]
      separate([a, b], [false, false], 2, dt)
      expect(Math.hypot(a.x - before[0], a.z - before[1])).toBeLessThanOrEqual(SEPARATE_SPEED * dt * 0.5 + 1e-9)
      expect(Math.hypot(b.x - before[2], b.z - before[3])).toBeLessThanOrEqual(SEPARATE_SPEED * dt * 0.5 + 1e-9)
    }
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThanOrEqual(apartDistance(a, b) - 1e-6)
  })

  it('a pinned critter keeps its path and the other gives way', () => {
    const landing = mover(-20, 5, 11)
    const walker = mover(-16, 5, 11)
    for (let i = 0; i < 60; i++) separate([landing, walker], [true, false], 2, 1 / 60)
    expect(landing).toMatchObject({ x: -20, z: 5 })
    expect(Math.hypot(landing.x - walker.x, landing.z - walker.z)).toBeGreaterThanOrEqual(apartDistance(landing, walker) - 1e-6)
  })

  it('four crowded critters of every size spread out inside the bench', () => {
    const rand = { s: 11 }
    for (let trial = 0; trial < 40; trial++) {
      const crowd = Array.from({ length: 4 }, () => {
        const at = clampWalk({ x: -40 + random(rand) * 50, z: -18 + random(rand) * 40 }, 1)
        return mover(at.x, at.z, 8 + random(rand) * 5)
      })
      for (let i = 0; i < 90; i++) separate(crowd, [false, false, false, false], 4, 1 / 30)
      for (const m of crowd) expect(insideWalk(m, 0.9)).toBe(true)
      for (let i = 0; i < 4; i++)
        for (let j = i + 1; j < 4; j++) expect(Math.hypot(crowd[i].x - crowd[j].x, crowd[i].z - crowd[j].z)).toBeGreaterThanOrEqual(apartDistance(crowd[i], crowd[j]) - 0.05)
    }
  })

  it('a critter dropped onto friends lands beside them', () => {
    const friends = [mover(-24, 6, 12), mover(-6, 8, 13)]
    const at = clearSpot({ x: -15, z: 7 }, 11, friends, 2, { x: 0, z: 0 })
    for (const f of friends) expect(Math.hypot(at.x - f.x, at.z - f.z)).toBeGreaterThanOrEqual(11 + f.reach + FOOTPRINT_GAP)
    expect(insideWalk(at, 1.9)).toBe(true)
  })

  it('big friends still meet to greet, since they may stand no closer than their footprints', () => {
    const a = mover(0, 0, 13)
    const b = mover(apartDistance(mover(0, 0, 13), mover(0, 0, 14)) + 0.5, 0, 14)
    expect(apartDistance(a, b)).toBeGreaterThan(MEET_RADIUS)
    expect(meeting(a, b)).toBe(true)
  })
})

// The real loop on a crowded bench: the rig measures each footprint as it draws it.
const topDown: Projector = {
  toScreen(x, _y, z, out) {
    out.x = x * 10 + 600
    out.y = z * 10 + 400
    return true
  },
  toPlane(screen, _height, out) {
    out.x = (screen.x - 600) / 10
    out.z = (screen.y - 400) / 10
    return true
  },
  scaleAt: () => 10,
}

const parts = (...kinds: PartKind[]): Part[] => kinds.map((kind) => ({ kind, hue: 1 }))

function crowdedBench(): WorkshopController {
  const state = deserialize({
    v: 1,
    sleeper: { id: 9, hue: 1, parts: parts('eye', 'legStub', 'earRound', 'tailLong'), x: 0, z: 0, heading: 0, seed: 91 },
    awake: [
      { id: 1, hue: 0, parts: parts('legStub', 'legStub', 'legStub', 'legStub', 'legStub', 'legStub', 'eye', 'eye', 'earPoint'), x: -24, z: 12, heading: 0.6, seed: 17 },
      { id: 2, hue: 2, parts: parts('legLong', 'legLong', 'tailCurl', 'earFlop', 'earFlop', 'eye'), x: -18, z: 16, heading: -1.2, seed: 29 },
      { id: 3, hue: 1, parts: parts('legLong', 'legLong', 'legLong', 'legLong', 'head', 'horn', 'horn', 'tailLong', 'eye', 'eye'), x: -28, z: 18, heading: 2.2, seed: 43 },
    ],
    tray: {},
    nextHue: 2,
    nextId: 10,
  })
  const workshop = new WorkshopController(state, { save: vi.fn() })
  workshop.setProjector(topDown)
  return workshop
}

function worstOverlap(workshop: WorkshopController): number {
  let worst = -Infinity
  const standing = workshop.critters.filter((c) => !c.gone && c.mode !== 'carried')
  for (let i = 0; i < standing.length; i++)
    for (let j = i + 1; j < standing.length; j++) {
      const a = standing[i].mover
      const b = standing[j].mover
      worst = Math.max(worst, a.reach + b.reach - Math.hypot(a.x - b.x, a.z - b.z))
    }
  return worst
}

describe('a crowded bench', () => {
  it('critters started in a heap spread out and then never stand in each other', () => {
    const workshop = crowdedBench()
    for (let t = 0; t < 1.5; t += 1 / 60) workshop.step(1 / 60)
    let worst = -Infinity
    for (let t = 0; t < 40; t += 1 / 60) {
      workshop.step(1 / 60)
      worst = Math.max(worst, worstOverlap(workshop))
    }
    expect(worst).toBeLessThan(0.3)
  })

  it('a critter carried over a friend and let go lands beside it', () => {
    const workshop = crowdedBench()
    for (let t = 0; t < 2; t += 1 / 60) workshop.step(1 / 60)
    const [carried, friend] = workshop.critters.filter((c) => c.awake)
    const from = { x: carried.world.body[0] * 10 + 600, y: carried.world.body[2] * 10 + 400 }
    workshop.pointerDown(1, from, 0)
    for (let t = 0; t < 0.3; t += 1 / 60) workshop.step(1 / 60)
    const over = { x: friend.mover.x * 10 + 600, y: friend.mover.z * 10 + 400 }
    for (let i = 1; i <= 20; i++) {
      workshop.pointerMove(1, { x: from.x + ((over.x - from.x) * i) / 20, y: from.y + ((over.y - from.y) * i) / 20 }, 300 + i * 16)
      workshop.step(1 / 60)
    }
    for (let t = 0; t < 0.4; t += 1 / 60) workshop.step(1 / 60)
    expect(carried.mode).toBe('carried')
    workshop.pointerUp(1, over, 1000)
    for (let t = 0; t < 0.8; t += 1 / 60) workshop.step(1 / 60)
    let worst = -Infinity
    for (let t = 0; t < 3; t += 1 / 60) {
      workshop.step(1 / 60)
      worst = Math.max(worst, worstOverlap(workshop))
    }
    expect(worst).toBeLessThan(0.3)
  })
})
