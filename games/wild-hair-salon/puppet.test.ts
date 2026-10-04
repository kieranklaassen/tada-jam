import { describe, expect, it } from 'vitest'
import { Director, PARTS, PERSONALITIES, REACTIONS, bitLength, type Bit } from './personality'
import { Puppet, TICK, ease } from './puppet'
import { makeRng } from './rng'
import { CUSTOMERS, TASTES } from './tastes'

const LION = PERSONALITIES.lion
const bitsOf = (who: (typeof CUSTOMERS)[number]): Bit[] => [...PERSONALITIES[who].idle, ...Object.values(PERSONALITIES[who].reactions).flat()]
const shape = (bit: Bit) => JSON.stringify(bit.moves.map((m) => [m.part, m.to, m.at, m.hold]))

describe('the four personalities', () => {
  it('give every bit a name of its own and a shape of its own: no two customers share an animation', () => {
    const all = CUSTOMERS.flatMap(bitsOf)
    expect(new Set(all.map((bit) => bit.id)).size).toBe(all.length)
    expect(new Set(all.map(shape)).size).toBe(all.length)
  })

  it('share no near-copy either: no bit of one is a bit of another with only its timing moved', () => {
    const loose = (bit: Bit) => JSON.stringify(bit.moves.map((m) => [m.part, Math.sign(m.to)]).sort())
    for (let a = 0; a < CUSTOMERS.length; a++) for (let b = a + 1; b < CUSTOMERS.length; b++) {
      const theirs = new Set(bitsOf(CUSTOMERS[b]).map(loose))
      const copies = bitsOf(CUSTOMERS[a]).filter((bit) => bit.moves.length >= 3 && theirs.has(loose(bit)))
      expect(copies.map((bit) => bit.id), `${CUSTOMERS[a]} and ${CUSTOMERS[b]}`).toEqual([])
    }
  })

  it.each(CUSTOMERS)('the %s has a reaction of its own to everything that can happen to it', (who) => {
    const p = PERSONALITIES[who]
    expect(Object.keys(p.reactions).sort()).toEqual([...REACTIONS].sort())
    for (const name of REACTIONS) expect(p.reactions[name].length, name).toBeGreaterThanOrEqual(1)
    expect(p.idle.length).toBeGreaterThanOrEqual(8)
    for (const bit of bitsOf(who)) {
      expect(bit.id.startsWith(`${who}-`), bit.id).toBe(true)
      expect(bit.moves.length).toBeGreaterThan(0)
      for (const move of bit.moves) {
        expect(PARTS).toContain(move.part)
        expect(move.to >= -1 && move.to <= 1).toBe(true)
        expect(move.at >= 0 && move.hold > 0).toBe(true)
      }
      expect(bitLength(bit)).toBeGreaterThanOrEqual(0.1)
      expect(bitLength(bit)).toBeLessThanOrEqual(2.2)
    }
  })

  it('give each its own tempo, weight and gait, as its tastes say', () => {
    const tempo = (who: (typeof CUSTOMERS)[number]) => { const p = PERSONALITIES[who]; return `${p.breath}/${p.stiffness}/${p.damping}/${p.gait.hop}/${p.gait.steps}` }
    expect(new Set(CUSTOMERS.map(tempo)).size).toBe(4)
    for (const who of CUSTOMERS) {
      const p = PERSONALITIES[who], slow = TASTES[who].tempo === 'slow'
      // The slow ones breathe slowly, ride softer springs and take fewer steps; the quick ones the other way.
      expect(p.breath > 3).toBe(slow)
      expect(p.stiffness < 60).toBe(slow)
      expect(p.gait.steps < 2).toBe(slow)
      expect(p.gap[0]).toBeGreaterThan(0.5)
    }
  })

  it('give a different giggle on the nose, an ear, the chin and a cheek', () => {
    for (const who of CUSTOMERS) {
      const ids = (['noseTickled', 'earTickled', 'chinTickled', 'cheekTickled'] as const).map((name) => PERSONALITIES[who].reactions[name][0].id)
      expect(new Set(ids).size).toBe(4)
    }
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
    const one = LION.reactions.rubLoved
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

  it.each(CUSTOMERS)('the %s does a thing of its own every few seconds when nobody is touching, never the same twice running, and nothing while it is touched', (who) => {
    const idle = new Puppet(PERSONALITIES[who], makeRng(3))
    for (let i = 0; i < 60 * 40; i++) idle.step(1 / 60, true)
    expect(idle.started.length).toBeGreaterThanOrEqual(6)
    expect(idle.started.length).toBeLessThanOrEqual(40)
    for (let i = 1; i < idle.started.length; i++) expect(idle.started[i]).not.toBe(idle.started[i - 1])
    const touched = new Puppet(PERSONALITIES[who], makeRng(3))
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

  it('gives every customer eyes that go from its own lock to the other and back', () => {
    for (const who of CUSTOMERS) {
      const looks = PERSONALITIES[who].reactions.wantsItSo[0].moves.filter((m) => m.part === 'lookX').sort((a, b) => a.at - b.at)
      expect(looks.length, who).toBe(3)
      expect(looks[1].to, who).toBeGreaterThan(looks[0].to)
      expect(looks[2].to, who).toBe(looks[0].to)
    }
  })

  it('looks from one thing to another the way round it is asked: as written, the other way, or only its second look the other way', () => {
    const looks = (turned: boolean | 'second'): { first: number; second: number; back: number } => {
      const puppet = new Puppet(LION, makeRng(5)), seen: number[] = []
      puppet.react('wantsItSo', turned)
      for (let i = 0; i < 90; i++) { puppet.step(1 / 60, false); seen.push(puppet.at('lookX')) }
      return { first: seen[22], second: seen[55], back: seen[82] }
    }
    // Both things on its right: its own lock, and the friend's beyond it.
    expect(looks(false).first).toBeGreaterThan(0.2)
    expect(looks(false).second).toBeGreaterThan(0.5)
    // Both on its left.
    expect(looks(true).first).toBeLessThan(-0.2)
    expect(looks(true).second).toBeLessThan(-0.5)
    // Its own lock on its right and the friend's across the room on its left.
    expect(looks('second').first).toBeGreaterThan(0.2)
    expect(looks('second').second).toBeLessThan(-0.5)
    // And back to its own, on its right again.
    expect(looks('second').back).toBeGreaterThan(0.2)
    expect(looks(false).back).toBeGreaterThan(0.2)
    expect(looks(true).back).toBeLessThan(-0.2)
  })

  it('reacts with one of its own reactions, knows how long it lasts, and can be put to rest at once', () => {
    const puppet = new Puppet(LION, makeRng(6))
    puppet.react('rubLoved')
    expect(puppet.started).toEqual(['lion-purrs-and-melts'])
    expect(puppet.lasts('rubLoved')).toBeCloseTo(0.9)
    for (let i = 0; i < 40; i++) puppet.step(1 / 60, false)
    expect(puppet.at('sink')).toBeGreaterThan(0.2)
    puppet.rest()
    expect(puppet.busy).toBe(false)
    expect(puppet.at('sink')).toBe(0)
    expect(puppet.at('smile')).toBe(0.25)
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

  it('squashes at a bump, springs back taller than it was, and comes to rest', () => {
    const puppet = new Puppet(LION, makeRng(3))
    puppet.bump()
    let flattest = 0, tallest = 0
    for (let i = 0; i < 240; i++) { puppet.step(1 / 120, false); flattest = Math.max(flattest, puppet.squash.x); tallest = Math.min(tallest, puppet.squash.x) }
    expect(flattest).toBeGreaterThan(0.3)
    expect(tallest).toBeLessThan(-0.05)
    expect(Math.abs(puppet.squash.x)).toBeLessThan(0.02)
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
