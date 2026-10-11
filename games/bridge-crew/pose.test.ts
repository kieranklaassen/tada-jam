import { describe, expect, it } from 'vitest'
import { part } from './bridges.fixture'
import { settle, solve } from './frame'
import { key, length, type Part, type Point } from './kit'
import { DRAWN_DIP, GAIT, WATER, atRest, ends, follow, nearest, rests, spring, unrest } from './pose'

const footings = (...points: Point[]) => { const set = new Set(points.map(key)); return (p: Point) => set.has(key(p)) }
const flat = () => 0
const restsOf = (parts: Part[], isFooting: (p: Point) => boolean, ground: (x: number) => number = flat) => {
  const frame = settle(parts, isFooting)
  return { frame, rest: rests(parts, frame, solve(frame), isFooting, ground) }
}

describe('where a part comes to rest', () => {
  it('a firm part lies where the model puts it, its dip drawn larger by the one factor', () => {
    const plank = [part('plank', 0, 6, 4, 6)], ends = footings([0, 6], [4, 6])
    const { frame, rest } = restsOf(plank, ends)
    expect(rest[0]).toMatchObject({ how: 'firm', pivot: 0, slack: false, a: [0, 6], b: [4, 6] })
    // Its middle sags under its own weight; the ends, on their footings, do not move.
    const middle = solve(frame).moved(frame.at.get('2,6')!)[1]
    expect(middle).toBeLessThan(0)
    expect(DRAWN_DIP).toBe(6)
  })

  it('a part pinned at one end hangs straight down from it, and the longer side of a plank goes down', () => {
    const { rest } = restsOf([part('stick', 3, 6, 6, 6)], footings([3, 6]))
    expect(rest[0].how).toBe('hangs')
    expect(rest[0].a).toEqual([3, 6])
    expect(rest[0].b[0]).toBeCloseTo(3)
    expect(rest[0].b[1]).toBeCloseTo(3)
    // A plank pinned a cell from one end: the three cells go down and the one cell stands up.
    const plank = restsOf([part('plank', 0, 6, 4, 6)], footings([1, 6])).rest[0]
    expect(plank.pivot).toBeCloseTo(0.25)
    expect(plank.a[1]).toBeCloseTo(7)
    expect(plank.b[1]).toBeCloseTo(3)
  })

  it('two planks hinged over the gap with nothing under the hinge each hang from their own bank', () => {
    const { rest } = restsOf([part('plank', 0, 6, 3, 6), part('plank', 3, 6, 6, 6)], footings([0, 6], [6, 6]))
    expect(rest.map((r) => r.how)).toEqual(['hangs', 'hangs'])
    expect(rest[0].b).toEqual([0, 3])
    expect(rest[1].a[0]).toBeCloseTo(6)
    expect(rest[1].a[1]).toBeCloseTo(3)
  })

  it('what hangs from a hanging part hangs from its end in turn, like a chain', () => {
    const chain = [part('stick', 3, 6, 5, 6), part('stick', 5, 6, 7, 6), part('thread', 7, 6, 8, 6)]
    const { rest } = restsOf(chain, footings([3, 6]))
    expect(rest[1].a[0]).toBeCloseTo(3); expect(rest[1].a[1]).toBeCloseTo(4)
    expect(rest[1].b[1]).toBeCloseTo(2)
    expect(rest[2].b[1]).toBeCloseTo(1)
    // Every part keeps the length it was cut to.
    rest.forEach((r, i) => expect(Math.hypot(r.b[0] - r.a[0], r.b[1] - r.a[1])).toBeCloseTo(length(chain[i])))
  })

  it('a part with a loose end hangs from its other pin, and a part nothing holds lies level on the ground or the water', () => {
    const loose = restsOf([part('plank', 0, 6, 4, 6, true), { ...part('stick', 2, 6, 2, 8), loose: 'a' }], footings([0, 6], [4, 6])).rest
    expect(loose[1].how).toBe('lies')
    const held = restsOf([part('plank', 0, 6, 4, 6, true), { ...part('stick', 2, 6, 4, 8), loose: 'b' }], footings([0, 6], [4, 6])).rest
    expect(held[1].how).toBe('hangs')
    expect(held[1].b[1]).toBeLessThan(held[1].a[1])
    const adrift = restsOf([part('stick', 3, 5, 5, 6)], footings()).rest[0]
    expect(adrift).toMatchObject({ how: 'lies', pivot: 0.5 })
    expect(adrift.a[1]).toBeCloseTo(WATER + 0.08)
    expect(adrift.a[1]).toBe(adrift.b[1])
    const onBank = restsOf([part('stick', 3, 8, 5, 8)], footings(), () => 6).rest[0]
    expect(onBank.a[1]).toBeCloseTo(6.08)
  })

  it('a hanging part longer than the drop under it leans with its end on the ground, and never goes through it', () => {
    // A four-cell plank from a pin three cells above the ground.
    const { rest } = restsOf([part('plank', 6, 3, 10, 3)], footings([6, 3]))
    expect(rest[0].how).toBe('hangs')
    expect(rest[0].b[1]).toBeCloseTo(0)
    expect(Math.hypot(rest[0].b[0] - 6, rest[0].b[1] - 3)).toBeCloseTo(4)
    // It leans to the side where the ground falls away: here a bank stands on its left.
    const banked = restsOf([part('plank', 6, 3, 10, 3)], footings([6, 3]), (x) => (x < 6 ? 6 : 0)).rest[0]
    expect(banked.b[0]).toBeGreaterThan(6)
  })

  it('a thread nothing pulls on is marked slack', () => {
    const { rest } = restsOf([part('thread', 0, 6, 3, 6)], footings([0, 6], [3, 6]))
    expect(rest[0]).toMatchObject({ how: 'firm', slack: true })
  })
})

describe('the springs that carry a part to rest', () => {
  it('a spring overshoots when lightly damped, settles on its target, and is steady at any frame time', () => {
    for (const dt of [1 / 120, 1 / 60, 1 / 20, 0.1]) {
      const s = { at: 0, speed: 0 }
      let peak = 0
      for (let t = 0; t < 3; t += dt) { spring(s, 1, dt, 6.5, 0.42); peak = Math.max(peak, s.at) }
      expect(peak).toBeGreaterThan(1.05)
      expect(peak).toBeLessThan(1.6)
      expect(s.at).toBeCloseTo(1, 2)
    }
    const calm = { at: 0, speed: 0 }
    let most = 0
    for (let t = 0; t < 3; t += 1 / 60) { spring(calm, 1, 1 / 60, 3, 1); most = Math.max(most, calm.at) }
    expect(most).toBeLessThan(1.01)
  })

  it('a part found at rest does not move', () => {
    const { rest } = restsOf([part('stick', 3, 6, 6, 6)], footings([3, 6]))
    const moving = atRest(rest[0])
    follow(moving, rest[0], 3, 1 / 60)
    expect(unrest(moving, rest[0], 3)).toBeLessThan(1e-9)
    expect(ends(moving, 3).b[1]).toBeCloseTo(3)
  })

  it('a part that loses its hold swings on from where it is, the short way round, and keeps its length', () => {
    const built = { a: [3, 6], b: [6, 6], how: 'firm', pivot: 0, slack: false } as const
    const hanging = restsOf([part('stick', 3, 6, 6, 6)], footings([6, 6])).rest[0]
    expect(hanging.pivot).toBe(1)
    const moving = atRest(built)
    let lowest = Infinity, swungPast = false
    for (let i = 0; i < 600; i++) {
      follow(moving, hanging, 3, 1 / 60)
      const now = ends(moving, 3)
      expect(Math.hypot(now.b[0] - now.a[0], now.b[1] - now.a[1])).toBeCloseTo(3, 6)
      // The end on the pin stays on the pin from the first frame.
      expect(Math.hypot(now.b[0] - 6, now.b[1] - 6)).toBeLessThan(0.02)
      lowest = Math.min(lowest, now.a[1])
      if (now.a[0] > 6.05) swungPast = true
    }
    // It swings like a pendulum: down, past the bottom, and back, before it hangs still.
    expect(swungPast).toBe(true)
    expect(lowest).toBeCloseTo(3, 1)
    expect(unrest(moving, hanging, 3)).toBeLessThan(0.05)
    expect(GAIT.hangs.swingDamp).toBeLessThan(GAIT.firm.swingDamp)
    expect(nearest(0.1, 2 * Math.PI)).toBeCloseTo(2 * Math.PI + 0.1)
  })
})
