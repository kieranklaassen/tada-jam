import { describe, expect, it } from 'vitest'
import { CROSSINGS, part } from './bridges.fixture'
import { consequence, showsStrain, strainLook, type What } from './consequence'
import type { Part } from './kit'
import { run } from './run'
import { site } from './sites'
import { VEHICLES, trainOf } from './vehicles'

const van = trainOf(VEHICLES['post-van']), piano = trainOf(VEHICLES['piano-mover'])
const gap = site('plank-gap', 0)
const after = (at: ReturnType<typeof site>, parts: readonly Part[], train = van) => consequence(run(at, parts, train), parts, 2)

describe('the error as a consequence', () => {
  it('each way of going wrong is a different thing in the world, at the place it happens', () => {
    const cases: [What, ReturnType<typeof after>][] = [
      ['cracks-where-it-bends-most', after(gap, [part('plank', 10, 6, 14, 6)])],
      ['snaps-under-the-wheel', after(gap, [part('stick', 10, 6, 14, 6)])],
      ['rolls-off-the-end-of-the-road', after(gap, [part('plank', 8, 6, 12, 6, true)])],
      ['rolls-off-the-bank-past-what-folded', after(site('rock-prop', 0), CROSSINGS['rock-prop'].slice(0, 2))],
      ['log-rolls-off-the-tube', after(gap, [part('plank', 10, 6, 12, 6, true), part('tube', 12, 6, 14, 6), part('stick', 12, 6, 10, 4)])],
      ['dips-into-the-water-on-the-thread', after(gap, [part('thread', 10, 6, 12, 5), part('thread', 12, 5, 14, 6)])],
      // A long thin prop under the piano bows in the middle.
      ['bows-and-snaps-in-the-middle', after(site('thin-kit', 0), [part('plank', 8, 6, 11, 6, true), part('plank', 11, 6, 13, 6, true), part('plank', 13, 6, 16, 6, true), part('stick', 8, 4, 10, 6), part('stick', 16, 4, 14, 6)], piano)],
    ]
    for (const [what, result] of cases) {
      expect(result.what).toBe(what)
      expect(result.splashes).toBe(true)
      expect(result.where[0]).toBeGreaterThanOrEqual(gap.left[0] - 2)
    }
    expect(new Set(cases.map(([what]) => what)).size).toBe(cases.length)
    // Where: the crack is on the plank between the banks; the road's end is where the plank stops; the folded parts are named.
    expect(cases[0][1].where[0]).toBeGreaterThan(10)
    expect(cases[2][1].where).toEqual([12, 6])
    expect(cases[3][1].folded).toEqual([0, 1])
    expect(cases[6][1].where).toEqual([9, 5])
  })

  it('a part that gave is ringed at its spot; a wrong road and a road that ends leave no ring', () => {
    const crack = after(gap, [part('plank', 10, 6, 14, 6)])
    expect(crack.ring).toEqual({ part: 0, spot: crack.where })
    expect(after(gap, [part('plank', 8, 6, 12, 6, true)]).ring).toBeNull()
    expect(after(gap, [part('thread', 10, 6, 12, 5), part('thread', 12, 5, 14, 6)]).ring).toBeNull()
  })

  it('success is a consequence too, with no ring and no splash', () => {
    const crossing = after(gap, CROSSINGS['plank-gap'])
    expect(crossing).toMatchObject({ what: 'crosses', ring: null, splashes: false, part: null })
  })

  it('a failed run is heard, and a heavier vehicle makes the larger splash', () => {
    const parts = [part('plank', 10, 6, 14, 6)], result = run(gap, parts, van)
    const light = consequence(result, parts, 2), heavy = consequence(result, parts, 5)
    expect(light.voice.length).toBeGreaterThan(2)
    const loudest = (c: typeof light) => Math.max(...c.voice.filter((s) => (s.after ?? 0) >= 0.35).map((s) => s.peak))
    expect(loudest(heavy)).toBeGreaterThan(loudest(light))
  })

  it('strain shows before a part gives, and thins once the sheet has been crossed', () => {
    expect(strainLook('pull', 0.5)).toEqual({ thin: 0.5, bulge: 0 })
    expect(strainLook('bow', 2)).toEqual({ thin: 0, bulge: 1 })
    expect(strainLook('rest', 0.5)).toEqual({ thin: 0, bulge: 0 })
    expect(showsStrain(0.3, false)).toBe(true)
    expect(showsStrain(0.3, true)).toBe(false)
    expect(showsStrain(0.85, true)).toBe(true)
  })
})
