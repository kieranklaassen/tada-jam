import { describe, expect, it } from 'vitest'
import { GUEST_IDS, type GuestId } from './guests'
import type { InkBody } from './inkScene'
import { Dangle, MotionDirector, PERSONALITY, both, breathing, pressed, settles } from './motion'

const flat = (b: InkBody) => [b.sx, b.sy, b.rot * 20, b.dx / 3, b.dy / 3]
/** A motion sampled through one round, as one long row of numbers. */
const sampled = (of: (t: number) => InkBody) => Array.from({ length: 24 }, (_, i) => flat(of(i / 23))).flat()
const distance = (a: number[], b: number[]) => Math.sqrt(a.reduce((sum, value, i) => sum + (value - b[i]) ** 2, 0))
const pairs = <T,>(items: T[]) => items.flatMap((a, i) => items.slice(i + 1).map((b) => [a, b] as const))

describe('every guest moves like itself', () => {
  it('no two guests share a tempo, a weight, a depth of breath or a way of taking a finger', () => {
    for (const key of ['tempo', 'weight', 'breath', 'squash', 'spring', 'damping'] as const) {
      const values = GUEST_IDS.map((id) => PERSONALITY[id][key])
      expect(new Set(values).size, key).toBe(GUEST_IDS.length)
    }
  })

  it('each has at least three fidgets, every one named for its own guest and lasting a different time', () => {
    const names = new Set<string>()
    for (const id of GUEST_IDS) {
      const fidgets = PERSONALITY[id].fidgets
      expect(fidgets.length, id).toBeGreaterThanOrEqual(3)
      expect(new Set(fidgets.map((fidget) => fidget.lasts)).size, id).toBe(fidgets.length)
      for (const fidget of fidgets) {
        expect(fidget.name.startsWith(`${id}-`), fidget.name).toBe(true)
        names.add(fidget.name)
      }
    }
    expect(names.size).toBe(GUEST_IDS.reduce((sum, id) => sum + PERSONALITY[id].fidgets.length, 0))
  })

  it('no fidget is a copy or a near copy of another, in one guest or across guests', () => {
    const all = GUEST_IDS.flatMap((id) => PERSONALITY[id].fidgets.map((fidget) => ({ name: fidget.name, row: sampled((t) => fidget.body(t)) })))
    for (const [a, b] of pairs(all)) expect(distance(a.row, b.row), `${a.name} and ${b.name}`).toBeGreaterThan(0.08)
  })

  it('every fidget starts and ends at rest, moves in between, and stays small', () => {
    for (const id of GUEST_IDS) {
      for (const fidget of PERSONALITY[id].fidgets) {
        for (const end of [0, 1]) {
          const at = fidget.body(end)
          expect(Math.abs(at.sx - 1) + Math.abs(at.sy - 1) + Math.abs(at.rot), `${fidget.name} at ${end}`).toBeLessThan(0.02)
          expect(Math.abs(at.dx) + Math.abs(at.dy), `${fidget.name} at ${end}`).toBeLessThan(0.5)
        }
        const row = sampled((t) => fidget.body(t))
        expect(distance(row, sampled(() => ({ sx: 1, sy: 1, rot: 0, dx: 0, dy: 0 }))), fidget.name).toBeGreaterThan(0.05)
        for (let i = 0; i <= 40; i++) {
          const at = fidget.body(i / 40)
          expect(at.sx).toBeGreaterThan(0.85); expect(at.sx).toBeLessThan(1.15)
          expect(at.sy).toBeGreaterThan(0.85); expect(at.sy).toBeLessThan(1.15)
          expect(Math.abs(at.rot)).toBeLessThan(0.15)
          expect(Math.abs(at.dx)).toBeLessThan(6); expect(Math.abs(at.dy)).toBeLessThan(6)
        }
      }
    }
  })

  it('no two guests breathe in step: sampled over a minute the breaths differ', () => {
    const rows = GUEST_IDS.map((id) => ({ id, row: Array.from({ length: 120 }, (_, i) => breathing(id, i * 0.5, true).sy) }))
    for (const [a, b] of pairs(rows)) expect(distance(a.row, b.row), `${a.id} and ${b.id}`).toBeGreaterThan(0.05)
  })

  it('a sleeper breathes deeper than the same guest awake, and a body keeps its bulk as it breathes', () => {
    for (const id of GUEST_IDS) {
      const awake = Math.max(...Array.from({ length: 200 }, (_, i) => breathing(id, i * 0.05, true).sy))
      const asleep = Math.max(...Array.from({ length: 200 }, (_, i) => breathing(id, i * 0.05, false).sy))
      expect(asleep).toBeGreaterThan(awake)
      const at = breathing(id, 1.3, false)
      expect((at.sx - 1) * (at.sy - 1)).toBeLessThanOrEqual(0)
    }
  })
})

describe('a finger landing on a guest', () => {
  it('is answered in the same frame: the squash is there at once, wider as it is shorter', () => {
    for (const id of GUEST_IDS) {
      const at = pressed(id, 0, null)
      expect(at.sy, id).toBeLessThan(1 - PERSONALITY[id].squash * 0.6)
      expect(at.sx, id).toBeGreaterThan(1)
    }
  })

  it('springs back past its own height when the finger lifts, and settles', () => {
    for (const id of GUEST_IDS) {
      const rows = Array.from({ length: 400 }, (_, i) => pressed(id, 0.2, i * 0.01).sy)
      expect(Math.max(...rows), id).toBeGreaterThan(1)
      expect(Math.abs(pressed(id, 0.2, settles(id) + 0.01).sy - 1), id).toBeLessThan(0.011)
      expect(settles(id), id).toBeLessThan(3)
    }
  })

  it('a light guest squashes more and rings faster than a heavy one', () => {
    expect(PERSONALITY.bat.squash).toBeGreaterThan(PERSONALITY.troll.squash)
    expect(PERSONALITY.fly.spring).toBeGreaterThan(PERSONALITY.yeti.spring)
    const rows = (id: GuestId) => Array.from({ length: 60 }, (_, i) => flat(pressed(id, 0.1, i * 0.02))).flat()
    for (const [a, b] of pairs([...GUEST_IDS])) expect(distance(rows(a), rows(b)), `${a} and ${b}`).toBeGreaterThan(0.05)
  })
})

describe('a carried guest', () => {
  it('swings behind the finger, comes to rest, and a heavy one swings less than a light one', () => {
    const widest = (id: GuestId) => {
      const dangle = new Dangle(id)
      let most = 0
      for (let i = 0; i < 60; i++) { dangle.step(1 / 60, 900); most = Math.max(most, Math.abs(dangle.angle)) }
      for (let i = 0; i < 600; i++) dangle.step(1 / 60, 0)
      expect(Math.abs(dangle.angle), id).toBeLessThan(0.01)
      return most
    }
    expect(widest('bat')).toBeGreaterThan(widest('troll') * 1.5)
    expect(widest('bat')).toBeLessThanOrEqual(0.75)
    expect(widest('yeti')).toBeGreaterThan(0)
  })

  it('never blows up on a long frame', () => {
    const dangle = new Dangle('fly')
    for (let i = 0; i < 50; i++) dangle.step(0.1, i % 2 ? 4000 : -4000)
    expect(Number.isFinite(dangle.angle)).toBe(true)
    expect(Math.abs(dangle.angle)).toBeLessThanOrEqual(0.75)
  })
})

describe('the director', () => {
  it('gives the same motion for the same seed, and a different one for another', () => {
    const run = (seed: number) => {
      const director = new MotionDirector(seed)
      return Array.from({ length: 600 }, (_, i) => flat(director.body('bat', i / 20, true, true))).flat()
    }
    expect(run(7)).toEqual(run(7))
    expect(run(7)).not.toEqual(run(8))
  })

  it('never plays one fidget twice running, and plays every one in the long run', () => {
    for (const id of GUEST_IDS) {
      const director = new MotionDirector(3)
      const played: string[] = []
      let before: string | null = null
      for (let i = 0; i < 20 * 600; i++) {
        director.body(id, i / 20, true, true)
        const now = director.doing(id)
        if (now && now !== before) played.push(now)
        before = now
      }
      expect(played.length, id).toBeGreaterThan(10)
      for (let i = 1; i < played.length; i++) expect(played[i], id).not.toBe(played[i - 1])
      expect(new Set(played).size, id).toBe(PERSONALITY[id].fidgets.length)
    }
  })

  it('a sleeper, or a guest in the hand, only breathes', () => {
    const director = new MotionDirector(5)
    for (let i = 0; i < 400; i++) {
      expect(director.body('troll', i / 10, false, true)).toEqual(breathing('troll', i / 10, false))
      expect(director.body('bat', i / 10, true, false)).toEqual(breathing('bat', i / 10, true))
    }
    expect(director.doing('troll')).toBe(null)
  })

  it('two bodies at once multiply their shares and add their leans and shifts', () => {
    expect(both({ sx: 1.1, sy: 0.9, rot: 0.1, dx: 1, dy: 2 }, { sx: 2, sy: 2, rot: 0.2, dx: 3, dy: 4 })).toEqual({ sx: 2.2, sy: 1.8, rot: expect.closeTo(0.3), dx: 4, dy: 6 })
  })
})
