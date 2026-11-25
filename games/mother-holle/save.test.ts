import { describe, expect, it } from 'vitest'
import { COLUMNS, FEATHERS, IDS } from './layout'
import { deserialize, freshState } from './save'
import { Hand } from './testing'

describe('the save', () => {
  it('opens on a run of snow under the tub, with one sled live', () => {
    const s = freshState(null)
    expect(IDS.filter((id) => s.bodies[id].out).sort()).toEqual(['hen', 'mayor', 'walrus'])
    expect(s.snow.some((d) => d > 0.1)).toBe(true)
  })
  it('takes an age as a hint at both ends', () => {
    for (const age of [null, 0, 2, 3, 5, 12, 99]) expect(() => new Hand(null, age)).not.toThrow()
    expect(freshState(99).bodies.granny.out).toBe(true)
  })
  it('reads any damaged thing without a crash, and never makes or loses a feather', () => {
    const good = JSON.parse(JSON.stringify(new Hand().v.toState()))
    const bad: unknown[] = [undefined, 3, 'x', [], {}, { v: 2 }, { v: 1 }, { ...good, snow: 'no' }, { ...good, snow: Array(COLUMNS).fill(1e9) }, { ...good, snow: Array(COLUMNS).fill(NaN) }, { ...good, quilt: Infinity }, { ...good, bodies: [] },
      { ...good, bodies: { walrus: { x: 'a', on: 'walrus', out: true, cap: -4 } } },
      { ...good, bodies: { ...good.bodies, walrus: { x: 0, on: 'hen', out: true }, hen: { x: 0, on: 'walrus', out: true } } },
      { ...good, bodies: { ...good.bodies, hen: { x: 0, on: 'cow', out: true } } },
      { ...good, bodies: { ...good.bodies, hen: { x: 1, on: 'walrus' }, mayor: { x: 2, on: 'walrus' } } },
      { ...good, bodies: Object.fromEntries(IDS.map((id, i) => [id, { x: 0, out: true, on: i ? IDS[i - 1] : null, cap: 1 }])) }]
    for (const raw of bad) {
      const h = new Hand(raw)
      expect(h.v.all, JSON.stringify(raw)?.slice(0, 80)).toBeCloseTo(FEATHERS, 6)
      for (const b of h.v.list) expect(Number.isFinite(b.x + b.y + b.z)).toBe(true)
      h.run(1)
      for (const id of IDS) expect(h.v.high(h.v.base(h.v.bodies[id]).id)).toBeLessThanOrEqual(4)
    }
  })
  it('stays small', () => {
    const h = new Hand()
    h.whiten()
    expect(JSON.stringify(h.v.toState()).length).toBeLessThan(32_000)
    expect(deserialize(JSON.parse(JSON.stringify(h.v.toState())))).toEqual(h.v.toState())
  })
})
