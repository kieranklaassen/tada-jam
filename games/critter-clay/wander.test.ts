import { describe, expect, it } from 'vitest'
import { blocksTurntable, insideWalk, TURNTABLE } from './layout'
import { advance, arrived, BODY_CLEARANCE, headingTo, meeting, pickTarget, random, steer, type Mover } from './wander'

describe('pickTarget', () => {
  it('always picks a spot inside the walkable area and a walk away', () => {
    const rand = { s: 7 }
    const out = { x: 0, z: 0 }
    for (let i = 0; i < 200; i++) {
      const from = { x: -40 + (i % 9) * 8, z: -20 + (i % 5) * 10 }
      pickTarget(from, rand, out)
      expect(insideWalk(out, 4)).toBe(true)
      expect(blocksTurntable(out)).toBe(false)
    }
  })

  it('is deterministic for a seed', () => {
    const a = pickTarget({ x: 0, z: 0 }, { s: 3 }, { x: 0, z: 0 })
    const b = pickTarget({ x: 0, z: 0 }, { s: 3 }, { x: 0, z: 0 })
    expect(a).toEqual(b)
    expect(random({ s: 1 })).not.toBe(random({ s: 2 }))
  })
})

describe('steer and advance', () => {
  it('turns toward the target at a limited rate', () => {
    const mover: Mover = { x: 10, z: 15, heading: 0, reach: BODY_CLEARANCE }
    const target = { x: 25, z: 15 }
    const heading = steer(mover, target, [], 0, 2, 0.1)
    expect(heading).toBeCloseTo(0.2, 5)
    mover.heading = headingTo(mover, target)
    expect(steer(mover, target, [], 0, 2, 0.1)).toBeCloseTo(Math.PI / 2, 1)
  })

  it('veers away from a friend in the way', () => {
    const mover: Mover = { x: 0, z: 20, heading: Math.PI / 2, reach: BODY_CLEARANCE }
    const friend: Mover = { x: 8, z: 21.5, heading: 0, reach: BODY_CLEARANCE }
    const heading = steer(mover, { x: 20, z: 20 }, [mover, friend], 2, 10, 1)
    expect(Math.abs(heading - Math.PI / 2)).toBeGreaterThan(0.1)
    expect(BODY_CLEARANCE).toBeGreaterThan(0)
  })

  it('never walks onto the turntable or off the bench', () => {
    const mover: Mover = { x: TURNTABLE.x, z: TURNTABLE.z + 30, heading: Math.PI, reach: BODY_CLEARANCE }
    for (let i = 0; i < 200; i++) {
      advance(mover, 1)
      expect(insideWalk(mover, 0.9)).toBe(true)
    }
    const edge: Mover = { x: 20, z: 0, heading: Math.PI / 2, reach: BODY_CLEARANCE }
    for (let i = 0; i < 50; i++) advance(edge, 1)
    expect(insideWalk(edge, 0.9)).toBe(true)
  })

  it('knows when it has arrived and when friends meet', () => {
    expect(arrived({ x: 0, z: 20, heading: 0, reach: BODY_CLEARANCE }, { x: 1, z: 21 })).toBe(true)
    expect(arrived({ x: 0, z: 20, heading: 0, reach: BODY_CLEARANCE }, { x: 10, z: 20 })).toBe(false)
    expect(meeting({ x: 0, z: 20, heading: 0, reach: BODY_CLEARANCE }, { x: 15, z: 20, heading: 0, reach: BODY_CLEARANCE })).toBe(true)
    expect(meeting({ x: -40, z: 20, heading: 0, reach: BODY_CLEARANCE }, { x: 15, z: 20, heading: 0, reach: BODY_CLEARANCE })).toBe(false)
  })
})
