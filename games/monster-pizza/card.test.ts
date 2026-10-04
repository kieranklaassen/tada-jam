import { describe, expect, it } from 'vitest'
import { KIND_STEP, PICTURED_R, UNEVEN, layOut, type Wanted } from './card'
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
  it('shows one picture for every piece wanted on a scattered card, whatever the seed', () => {
    // A seed that once left a picture out.
    expect(layOut([{ kind: 'olive', count: 10 }], 'scattered', 1435).length).toBe(10)
    for (let seed = 0; seed < 6000; seed++) {
      const drawn = layOut([{ kind: 'olive', count: 6 }, { kind: 'sock', count: 4 }], 'scattered', seed)
      if (drawn.length !== 10) throw new Error(`seed ${seed}: ${drawn.length} pictures for ten pieces`)
    }
    for (let count = 1; count <= 10; count++) expect(layOut([{ kind: 'worm', count }], 'scattered', 7 + count).length).toBe(count)
    // The set the pictures fall back on holds any ten: more than ten spots, clear of each other and of the border.
    expect(UNEVEN.length).toBeGreaterThanOrEqual(10)
    for (let a = 0; a < UNEVEN.length; a++) {
      expect(UNEVEN[a][0] - PICTURED_R).toBeGreaterThanOrEqual(8)
      expect(UNEVEN[a][0] + PICTURED_R).toBeLessThanOrEqual(CARD.w - 8)
      expect(UNEVEN[a][1] - PICTURED_R).toBeGreaterThanOrEqual(8)
      expect(UNEVEN[a][1] + PICTURED_R).toBeLessThanOrEqual(CARD.h - 8)
      for (let b = a + 1; b < UNEVEN.length; b++) expect(Math.hypot(UNEVEN[a][0] - UNEVEN[b][0], UNEVEN[a][1] - UNEVEN[b][1])).toBeGreaterThanOrEqual(PICTURED_R * 2 + 5)
    }
  })
  it('sets the rows of every second kind a step to the side, and keeps the rows of one kind under each other', () => {
    const drawn = layOut([{ kind: 'pepper', count: 2 }, { kind: 'olive', count: 2 }], 'rows')
    // A third of the pitch: an olive stands neither under a pepper nor under the middle of the two.
    expect(drawn[2].x - drawn[0].x).toBe(KIND_STEP)
    expect(drawn[3].x - drawn[1].x).toBe(KIND_STEP)
    expect(KIND_STEP * 2).not.toBe(52)
    const face = layOut([{ kind: 'olive', count: 2 }, { kind: 'mushroom', count: 1 }], 'rows')
    expect(Math.abs(face[2].x - (face[0].x + face[1].x) / 2)).toBeGreaterThan(8)
    expect(Math.abs(face[2].x - face[0].x)).toBeGreaterThan(8)
    const full = layOut([{ kind: 'pepper', count: 5 }, { kind: 'olive', count: 5 }], 'rows')
    expect(full[5].x - full[0].x).toBe(KIND_STEP)
    const seven = layOut([{ kind: 'olive', count: 7 }], 'rows')
    expect(seven[5].x).toBe(seven[0].x)
    const three = layOut([{ kind: 'pepper', count: 2 }, { kind: 'olive', count: 2 }, { kind: 'worm', count: 2 }], 'rows')
    expect(three[4].x).toBe(three[0].x)
  })
})
