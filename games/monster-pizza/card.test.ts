import { describe, expect, it } from 'vitest'
import { PICTURED_R, layOut, type Wanted } from './card'
import { CARD } from './layout'

const ORDERS: Wanted[][] = [
  [{ kind: 'pepper', count: 1 }],
  [{ kind: 'cheese', count: 5 }],
  [{ kind: 'olive', count: 10 }],
  [{ kind: 'sock', count: 3 }, { kind: 'worm', count: 2 }],
  [{ kind: 'pepper', count: 6 }, { kind: 'cheese', count: 2 }, { kind: 'mushroom', count: 2 }],
  [{ kind: 'worm', count: 4 }, { kind: 'olive', count: 3 }, { kind: 'cheese', count: 3 }],
]

describe('the card', () => {
  it('draws one piece for every piece wanted, of the right kind', () => {
    for (const wanted of ORDERS) {
      for (const picture of ['rows', 'scattered'] as const) {
        const drawn = layOut(wanted, picture, 5)
        for (const w of wanted) expect(drawn.filter((p) => p.kind === w.kind).length).toBe(w.count)
        expect(drawn.length).toBe(wanted.reduce((n, w) => n + w.count, 0))
      }
    }
  })

  it('keeps every pictured piece on the card and clear of the others', () => {
    for (const wanted of ORDERS) {
      for (const picture of ['rows', 'scattered'] as const) {
        const drawn = layOut(wanted, picture, 9)
        for (const p of drawn) {
          expect(p.x).toBeGreaterThanOrEqual(PICTURED_R + 8)
          expect(p.x).toBeLessThanOrEqual(CARD.w - PICTURED_R - 8)
          expect(p.y).toBeGreaterThanOrEqual(PICTURED_R + 8)
          expect(p.y).toBeLessThanOrEqual(CARD.h - PICTURED_R - 8)
        }
        for (let i = 0; i < drawn.length; i++) for (let j = i + 1; j < drawn.length; j++) expect(Math.hypot(drawn[i].x - drawn[j].x, drawn[i].y - drawn[j].y)).toBeGreaterThan(PICTURED_R * 2)
      }
    }
  })

  it('stands a kind five to a row, so seven reads as five and two', () => {
    const drawn = layOut([{ kind: 'olive', count: 7 }], 'rows')
    const ys = [...new Set(drawn.map((p) => p.y))]
    expect(ys.length).toBe(2)
    expect(drawn.filter((p) => p.y === ys[0]).length).toBe(5)
    expect(drawn.filter((p) => p.y === ys[1]).length).toBe(2)
    // The second row stands under the first, from the same left edge.
    expect(drawn[5].x).toBe(drawn[0].x)
    expect(drawn[6].x).toBe(drawn[1].x)
  })

  it('gives each kind rows of its own', () => {
    const drawn = layOut([{ kind: 'sock', count: 3 }, { kind: 'worm', count: 2 }], 'rows')
    const sockY = new Set(drawn.filter((p) => p.kind === 'sock').map((p) => p.y))
    const wormY = new Set(drawn.filter((p) => p.kind === 'worm').map((p) => p.y))
    expect(sockY.size).toBe(1)
    expect(wormY.size).toBe(1)
    expect([...sockY][0]).not.toBe([...wormY][0])
  })

  it('scatters the same way from the same seed', () => {
    const wanted = ORDERS[5]
    expect(layOut(wanted, 'scattered', 3)).toEqual(layOut(wanted, 'scattered', 3))
    expect(layOut(wanted, 'scattered', 3)).not.toEqual(layOut(wanted, 'scattered', 4))
  })
})
