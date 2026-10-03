import { describe, expect, it } from 'vitest'
import { Director, LION, PARTS, bitLength, type Bit } from './personality'
import { Puppet, TICK, ease } from './puppet'
import { makeRng } from './rng'

const allBits = (): Bit[] => [...LION.idle, ...Object.values(LION.reactions).flat()]

describe('the lion\'s personality', () => {
  it('has a different name for every bit, and no two bits that move the same parts the same way', () => {
    const bits = allBits()
    expect(new Set(bits.map((bit) => bit.id)).size).toBe(bits.length)
    const shape = (bit: Bit) => JSON.stringify(bit.moves.map((m) => [m.part, m.to, m.at, m.hold]))
    expect(new Set(bits.map(shape)).size).toBe(bits.length)
  })

  it('moves only parts a puppet has, for a time a child can follow', () => {
    for (const bit of allBits()) {
      expect(bit.moves.length).toBeGreaterThan(0)
      for (const m of bit.moves) {
        expect(PARTS).toContain(m.part)
        expect(m.to >= -1 && m.to <= 1).toBe(true)
        expect(m.at >= 0 && m.hold > 0).toBe(true)
      }
      expect(bitLength(bit)).toBeGreaterThanOrEqual(0.1)
      expect(bitLength(bit)).toBeLessThanOrEqual(2)
    }
  })

  it('is slow and heavy: the body rides a softer spring than the eyelids and ears', () => {
    expect(LION.stiffness).toBeLessThan(LION.quick / 3)
    expect(LION.breath).toBeGreaterThanOrEqual(3)
    expect(LION.idle.length).toBeGreaterThanOrEqual(8)
    expect(LION.gap[0]).toBeGreaterThanOrEqual(1)
  })

  it('giggles differently on the nose, an ear, the chin and a cheek', () => {
    const ids = ['noseTickled', 'earTickled', 'chinTickled', 'cheekTickled'].map((name) => LION.reactions[name][0].id)
    expect(new Set(ids).size).toBe(4)
  })
})

describe('the director', () => {
  it('never picks the same bit twice running', () => {
    const director = new Director(makeRng(4))
    let last = ''
    const seen = new Set<string>()
    for (let i = 0; i < 300; i++) {
      const bit = director.pick(LION.idle)
      expect(bit.id).not.toBe(last)
      last = bit.id
      seen.add(bit.id)
    }
    expect(seen.size).toBe(LION.idle.length)
  })

  it('keeps each list\'s last pick to itself, and gives a list of one its one bit', () => {
    const director = new Director(makeRng(1))
    const one = LION.reactions.rubbed
    expect(director.pick(one)).toBe(one[0])
    expect(director.pick(one)).toBe(one[0])
    const two = LION.reactions.snipped
    const picks = Array.from({ length: 6 }, () => director.pick(two).id)
    for (let i = 1; i < picks.length; i++) expect(picks[i]).not.toBe(picks[i - 1])
  })
})

describe('the puppet', () => {
  it('rests where its personality rests, and breathes all the time', () => {
    const puppet = new Puppet(LION, makeRng(2))
    expect(puppet.at('smile')).toBe(0.25)
    expect(puppet.at('blink')).toBe(0)
    const before = puppet.breath
    puppet.step(1, false)
    expect(puppet.breath).not.toBe(before)
    expect(puppet.breath >= 0 && puppet.breath < 1).toBe(true)
  })

  it('does a thing of its own every few seconds when nobody is touching, never the same twice running, and nothing while it is touched', () => {
    const idle = new Puppet(LION, makeRng(3))
    for (let i = 0; i < 60 * 40; i++) idle.step(1 / 60, true)
    expect(idle.started.length).toBeGreaterThanOrEqual(8)
    expect(idle.started.length).toBeLessThanOrEqual(26)
    for (let i = 1; i < idle.started.length; i++) expect(idle.started[i]).not.toBe(idle.started[i - 1])
    const touched = new Puppet(LION, makeRng(3))
    for (let i = 0; i < 60 * 40; i++) touched.step(1 / 60, false)
    expect(touched.started).toEqual([])
  })

  it('drives a part while a move holds it and lets it come back to rest afterwards', () => {
    const puppet = new Puppet(LION, makeRng(5))
    puppet.play(LION.idle[0])
    for (let i = 0; i < 18; i++) puppet.step(1 / 60, false)
    expect(puppet.at('blink')).toBeGreaterThan(0.7)
    expect(puppet.busy).toBe(true)
    for (let i = 0; i < 120; i++) puppet.step(1 / 60, false)
    expect(puppet.busy).toBe(false)
    expect(Math.abs(puppet.at('blink'))).toBeLessThan(0.02)
  })

  it('reacts with one of its own reactions, and does nothing about a thing it has no reaction to', () => {
    const puppet = new Puppet(LION, makeRng(6))
    puppet.react('rubbed')
    expect(puppet.started).toEqual(['purrs-and-melts'])
    puppet.react('no-such-thing')
    expect(puppet.started).toHaveLength(1)
    for (let i = 0; i < 40; i++) puppet.step(1 / 60, false)
    expect(puppet.at('sink')).toBeGreaterThan(0.2)
  })

  it('leans after hair that is pulled, within limits, and comes back with one soft overshoot', () => {
    const puppet = new Puppet(LION, makeRng(7))
    puppet.pulledTowards({ x: 4000, y: 4000 })
    for (let i = 0; i < 180; i++) puppet.step(1 / 60, false)
    expect(puppet.lean.x.x).toBeCloseTo(26, 0)
    expect(puppet.lean.y.x).toBeCloseTo(22, 0)
    puppet.pulledTowards(null)
    let lowest = Infinity
    for (let i = 0; i < 240; i++) { puppet.step(1 / 60, false); lowest = Math.min(lowest, puppet.lean.x.x) }
    expect(lowest).toBeLessThan(0)
    expect(lowest).toBeGreaterThan(-8)
    expect(Math.abs(puppet.lean.x.x)).toBeLessThan(0.5)
  })

  it('gives a cheek like dough: less the further it is pulled, and back to nothing when let go', () => {
    const puppet = new Puppet(LION, makeRng(8))
    const reach = (pull: number) => { const p = new Puppet(LION, makeRng(8)); p.cheekHeld({ x: pull, y: 0 }); for (let i = 0; i < 60; i++) p.step(1 / 60, false); return p.cheek.x.x }
    expect(reach(40)).toBeGreaterThan(20)
    expect(reach(400)).toBeLessThan(72)
    expect(reach(400) - reach(200)).toBeLessThan(reach(80) - reach(40))
    puppet.cheekHeld({ x: 90, y: 0 })
    for (let i = 0; i < 60; i++) puppet.step(1 / 60, false)
    puppet.cheekHeld(null)
    for (let i = 0; i < 240; i++) puppet.step(1 / 60, false)
    expect(Math.abs(puppet.cheek.x.x)).toBeLessThan(0.5)
  })

  it('plays the same at any frame rate, since it steps in fixed ticks', () => {
    const run = (hz: number) => { const p = new Puppet(LION, makeRng(9)); p.react('snipped'); for (let i = 0; i < hz; i++) p.step(1 / hz, false); return [p.at('bob'), p.at('blink'), p.breath] }
    const a = run(60), b = run(120), c = run(30)
    for (let i = 0; i < 3; i++) { expect(a[i]).toBeCloseTo(b[i], 2); expect(a[i]).toBeCloseTo(c[i], 2) }
    expect(TICK).toBeLessThanOrEqual(1 / 100)
  })

  it('eases a spring to its target and leaves it there', () => {
    const s = { x: 0, v: 0 }
    for (let i = 0; i < 600; i++) ease(s, 1, 100, 14, 1 / 120)
    expect(s.x).toBeCloseTo(1, 3)
    expect(Math.abs(s.v)).toBeLessThan(0.001)
  })
})
