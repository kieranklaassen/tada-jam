import { describe, expect, it } from 'vitest'
import { ROSTER } from './cycle'
import { TruckMotion, type Personality } from './motion'
import type { VehicleDef } from './roster'

const FRAME = 1 / 60
const make = (def: VehicleDef, seed = 5): TruckMotion => new TruckMotion(def.moves, def.wheels.map((wheel) => wheel.x), seed, def.partSwing * 1.1)

/** The body's height over a second after the same knock. */
function ring(def: VehicleDef): number[] {
  const m = make(def)
  m.kick(-1, 1)
  const out: number[] = []
  for (let i = 0; i < 60; i++) out.push(m.step(FRAME).lift)
  return out
}

const rms = (a: number[], b: number[]): number => Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0) / a.length)

describe('every vehicle moves like itself', () => {
  it('no two share their springs, their breath, their blink or the way their part is thrown', () => {
    const keys: (keyof Personality)[] = ['stiffness', 'damping', 'breath', 'breathDepth', 'idleRate', 'partStiffness', 'partThrow', 'glance']
    for (let i = 0; i < ROSTER.length; i++) for (let j = i + 1; j < ROSTER.length; j++) {
      const a = ROSTER[i].moves, b = ROSTER[j].moves
      const same = keys.filter((key) => a[key] === b[key])
      expect(same, `${ROSTER[i].id} and ${ROSTER[j].id}`).toEqual([])
      expect(a.blink).not.toEqual(b.blink)
    }
  })

  it('the same knock rings differently through each body', () => {
    const rings = ROSTER.map(ring)
    const size = Math.max(...rings.map((r) => Math.max(...r.map(Math.abs))))
    for (let i = 0; i < ROSTER.length; i++) for (let j = i + 1; j < ROSTER.length; j++) {
      // Not a near copy: the two traces are apart by a good share of the motion itself.
      expect(rms(rings[i], rings[j]) / size, `${ROSTER[i].id} and ${ROSTER[j].id}`).toBeGreaterThan(0.12)
    }
  })

  it('each has its own horn', () => {
    const horns = ROSTER.map((def) => `${def.horn.low}/${def.horn.high}/${def.horn.hold}`)
    expect(new Set(horns).size).toBe(ROSTER.length)
  })
})

describe('a body on springs', () => {
  it.each(ROSTER.map((def) => [def.id, def] as const))('%s dips under a press, flattens the tyres at that end, and comes back', (_id, def) => {
    const m = make(def)
    m.hold({ x: def.wheels[0].x, y: 1, force: 1 })
    for (let i = 0; i < 60; i++) m.step(FRAME)
    expect(m.pose.lift).toBeLessThan(-0.02)
    // The front axle carries the press on the nose.
    expect(m.pose.squash[0]).toBeGreaterThan(m.pose.squash[def.wheels.length - 1])
    m.hold(null)
    for (let i = 0; i < 400; i++) m.step(FRAME)
    expect(Math.abs(m.pose.lift)).toBeLessThan(0.03)
    expect(Math.abs(m.pose.pitch)).toBeLessThan(0.01)
  })

  it.each(ROSTER.map((def) => [def.id, def] as const))('%s never blows up, however hard it is knocked or however long the frame', (_id, def) => {
    const m = make(def)
    for (let i = 0; i < 300; i++) {
      if (i % 7 === 0) { m.kick(i % 2 ? 2 : -2, 2); m.jolt(3); m.fling(30); m.spinWheels(40) }
      const pose = m.step(i % 5 === 0 ? 0.1 : FRAME)
      for (const value of [pose.lift, pose.pitch, pose.lean, pose.part, pose.x, pose.wheelSpin, ...pose.squash]) expect(Number.isFinite(value)).toBe(true)
      expect(Math.abs(pose.lift)).toBeLessThan(1)
      for (const squash of pose.squash) {
        expect(squash).toBeGreaterThanOrEqual(0)
        expect(squash).toBeLessThanOrEqual(0.3)
      }
    }
  })

  it('a hinged part stays between shut and its stop, and a drum turns freely and coasts', () => {
    for (const def of ROSTER) {
      const m = make(def)
      let most = 0, least = 0
      for (let i = 0; i < 240; i++) {
        if (i === 0 || i === 20) m.fling(40)
        const part = m.step(FRAME).part
        most = Math.max(most, part)
        least = Math.min(least, part)
      }
      if (def.partSpins) {
        // More than a full turn from two shoves, and it has not sprung back.
        expect(most).toBeGreaterThan(Math.PI * 2)
        expect(m.pose.part).toBeGreaterThan(Math.PI * 2)
      } else {
        expect(most).toBeLessThanOrEqual(def.partSwing * 1.1 + 1e-9)
        expect(least).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('wheels turn with the ground they cover, forward for a move toward the nose', () => {
    const m = make(ROSTER[0])
    m.step(FRAME)
    const before = m.pose.wheelSpin
    m.homeX -= 1
    m.step(FRAME)
    expect(m.pose.wheelSpin - before).toBeCloseTo(2)
  })
})

describe('eyes', () => {
  it('blink on their own clock, look where they are asked, and glance at what the vehicle likes', () => {
    const m = make(ROSTER[0], 9)
    let blinks = 0, shut = false
    for (let i = 0; i < 60 * 30; i++) {
      const lid = m.step(FRAME).lid
      if (lid > 0.5 && !shut) blinks += 1
      shut = lid > 0.5
    }
    // Between the shortest and the longest wait, thirty seconds hold this many blinks.
    expect(blinks).toBeGreaterThanOrEqual(Math.floor(30 / ROSTER[0].moves.blink[1]) - 1)
    expect(blinks).toBeLessThanOrEqual(Math.ceil(30 / ROSTER[0].moves.blink[0]) + 1)

    m.lookAt = { side: 1.4, up: 0.4 }
    for (let i = 0; i < 90; i++) m.step(FRAME)
    expect(m.pose.gazeSide).toBeCloseTo(1.4, 1)
    expect(m.pose.gazeUp).toBeCloseTo(0.4, 1)

    m.lookAt = null
    m.want = { side: 0.2, up: 0.6 }
    let atWant = 0
    for (let i = 0; i < 60 * 40; i++) {
      const pose = m.step(FRAME)
      if (Math.abs(pose.gazeSide - 0.2) < 0.05 && Math.abs(pose.gazeUp - 0.6) < 0.05) atWant += 1
    }
    // A good share of its time, and not all of it: it looks about as well.
    expect(atWant).toBeGreaterThan(60 * 40 * 0.15)
    expect(atWant).toBeLessThan(60 * 40 * 0.85)
  })

  it('a squeeze and a cross ease away by themselves', () => {
    const m = make(ROSTER[1])
    m.squint = 1.5
    m.cross = 1
    expect(m.step(FRAME).lid).toBe(1)
    for (let i = 0; i < 60 * 3; i++) m.step(FRAME)
    expect(m.pose.cross).toBe(0)
    expect(m.squint).toBe(0)
  })
})
