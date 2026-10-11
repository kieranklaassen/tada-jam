import { describe, expect, it } from 'vitest'
import { FEEDING, MAT, MAT_CENTER, MAT_KEYS, SCALE, TABLE } from './layout'
import {
  accountedTotal,
  cutPiece,
  defaultTable,
  deserialize,
  pullFromBag,
  returnToBag,
  serialize,
  swapMat,
  tipBag,
  type TableState,
} from './state'

const roundTrip = (state: TableState, age: number | null = 4) => deserialize(JSON.parse(JSON.stringify(serialize(state))), age)

describe('defaultTable', () => {
  it('fills the bag with ten stones at every age', () => {
    for (const age of [2, 3, 4, 5, 6, 7, 12, null]) expect(defaultTable(age).bag).toBe(40)
  })

  it('gives five stones at a tip and the other five at the next at 3, below the band and with no age', () => {
    for (const age of [2, 3, null]) {
      const state = defaultTable(age)
      expect(tipBag(state).map((p) => p.q)).toEqual([4, 4, 4, 4, 4])
      expect(state.bag).toBe(20)
      expect(tipBag(state).map((p) => p.q)).toEqual([4, 4, 4, 4, 4])
      expect(state.bag).toBe(0)
    }
  })

  it('gives all ten stones at one tip from 4 up, above the band too', () => {
    for (const age of [4, 5, 6, 7, 12]) {
      const state = defaultTable(age)
      expect(tipBag(state)).toHaveLength(10)
      expect(state.bag).toBe(0)
    }
  })

  it('Covers AE10. still lists every built mat on the shelf at age 3', () => {
    expect([...defaultTable(3).shelf].sort()).toEqual([...MAT_KEYS].sort())
  })

  it('opens on Fair Feeding up to 4 and with no age, on the scale from 5', () => {
    for (const age of [2, 3, 4, null]) expect(defaultTable(age).liveMat).toBe('feeding')
    for (const age of [5, 6, 7, 12]) expect(defaultTable(age).liveMat).toBe('scale')
  })

  it('seats two guests', () => {
    expect(defaultTable(4).seats.filter(Boolean)).toHaveLength(2)
  })
})

describe('deserialize', () => {
  it('round-trips a played table', () => {
    const state = defaultTable(4)
    tipBag(state)
    state.pieces[0].x = 700
    state.pieces[0].y = 400
    swapMat(state, 'scale')
    const back = roundTrip(state)
    expect(back).toEqual(serialize(state))
  })

  it('Covers AE5. restores a piece exactly where it was left', () => {
    const state = defaultTable(4)
    const piece = pullFromBag(state, { x: 612, y: 433 })!
    const back = roundTrip(state)
    expect(back.pieces.find((p) => p.id === piece.id)).toMatchObject({ x: 612, y: 433 })
  })

  it('keeps a saved table over the age it is opened at', () => {
    expect(roundTrip(defaultTable(3), 7)).toEqual(defaultTable(3))
    expect(roundTrip(defaultTable(7), null)).toEqual(defaultTable(7))
  })

  it('tips everything out of an older save, which kept no stones back, and reads a kept amount it cannot use as none', () => {
    const { reserve: _reserve, stools: _stools, ...older } = { ...defaultTable(3), total: 20, bag: 20 }
    const state = deserialize(JSON.parse(JSON.stringify(older)), 3)
    expect(state.total).toBe(20)
    expect(state.stools).toBe(false)
    expect(tipBag(state)).toHaveLength(5)
    expect(state.bag).toBe(0)
    for (const reserve of [7, 40, -4, 'five']) expect(deserialize({ ...defaultTable(3), reserve }, 3).reserve).toBe(0)
  })

  for (const junk of [null, 'table', [1, 2], { v: 99 }, { v: 1, total: 7 }, { v: 1, total: -4 }]) {
    it(`falls back to the default table for ${JSON.stringify(junk)}`, () => {
      expect(deserialize(junk, 4)).toEqual(defaultTable(4))
    })
  }

  it('clamps bad coordinates into the table', () => {
    const raw = { ...defaultTable(4), bag: 36, pieces: [{ id: 1, q: 4, x: -500, y: Number.NaN }] }
    const [piece] = deserialize(raw, 4).pieces
    expect(piece.x).toBeGreaterThanOrEqual(TABLE.x)
    expect(piece.y).toBe(MAT_CENTER.y)
  })

  it('drops duplicate ids and unknown sizes and repairs the total', () => {
    const raw = {
      ...defaultTable(4),
      bag: 0,
      pieces: [
        { id: 1, q: 4, x: 500, y: 500 },
        { id: 1, q: 4, x: 600, y: 500 },
        { id: 2, q: 3, x: 600, y: 500 },
        { id: 3, q: 2, x: 700, y: 500 },
      ],
    }
    const state = deserialize(raw, 4)
    expect(state.pieces.map((p) => p.id)).toEqual([1, 3])
    expect(accountedTotal(state)).toBe(40)
    expect(state.bag).toBe(34)
  })

  it('never creates stones: extra pieces beyond the total are dropped', () => {
    const pieces = Array.from({ length: 14 }, (_, i) => ({ id: i + 1, q: 4, x: 500 + i * 10, y: 500 }))
    const state = deserialize({ ...defaultTable(4), pieces }, 4)
    expect(state.pieces).toHaveLength(10)
    expect(state.bag).toBe(0)
  })

  it('keeps the next id above every existing id', () => {
    const raw = { ...defaultTable(4), nextId: 1, pieces: [{ id: 9, q: 4, x: 500, y: 500 }] }
    expect(deserialize(raw, 4).nextId).toBe(10)
  })

  it('sanitizes a corrupt next id', () => {
    const pieces = [{ id: 3, q: 4, x: 500, y: 500 }]
    expect(deserialize({ ...defaultTable(4), pieces, nextId: 1.5 }, 4).nextId).toBe(4)
    expect(deserialize({ ...defaultTable(4), pieces, nextId: 1e308 }, 4).nextId).toBe(4)
    expect(deserialize({ ...defaultTable(4), pieces, nextId: 12.7 }, 4).nextId).toBe(12)
  })

  it('stays small: ten stones on the table serialize under 2 KB', () => {
    const state = defaultTable(4)
    tipBag(state)
    expect(JSON.stringify(serialize(state)).length).toBeLessThan(2048)
  })
})

describe('bag', () => {
  it('tipping a bag of ten gives ten whole stones and an empty bag', () => {
    const state = defaultTable(4)
    const spilled = tipBag(state)
    expect(spilled).toHaveLength(10)
    expect(spilled.every((p) => p.q === 4)).toBe(true)
    expect(state.bag).toBe(0)
  })

  it('tipping an empty bag does nothing', () => {
    const state = defaultTable(4)
    tipBag(state)
    expect(tipBag(state)).toEqual([])
  })

  it('two returned halves come back out as one whole stone', () => {
    const state = defaultTable(3)
    tipBag(state)
    const halves = cutPiece(state, state.pieces[0].id)
    for (const p of state.pieces.slice()) if (p.q === 4) returnToBag(state, p.id)
    for (const half of halves) returnToBag(state, half.id)
    expect(state.bag).toBe(40)
    const again = tipBag(state)
    expect(again.map((p) => p.q)).toEqual([4, 4, 4, 4, 4])
  })

  it('pulls a whole stone before a half', () => {
    const state = defaultTable(4)
    state.bag = 6
    state.total = 6 + 0
    expect(pullFromBag(state, { x: 500, y: 500 })?.q).toBe(4)
    expect(pullFromBag(state, { x: 500, y: 500 })?.q).toBe(2)
    expect(pullFromBag(state, { x: 500, y: 500 })).toBeNull()
  })

  it('conserves the total across tip, pull, cut, return, and swap', () => {
    const state = defaultTable(4)
    tipBag(state)
    cutPiece(state, state.pieces[2].id)
    returnToBag(state, state.pieces[0].id)
    pullFromBag(state, { x: MAT.x + 50, y: MAT.y + 50 })
    swapMat(state, 'scale')
    cutPiece(state, state.pieces[0].id)
    swapMat(state, 'feeding')
    expect(accountedTotal(state)).toBe(40)
  })
})

describe('cutPiece', () => {
  it('cuts a whole into two halves at the same spot', () => {
    const state = defaultTable(4)
    const piece = pullFromBag(state, { x: 600, y: 500 })!
    const halves = cutPiece(state, piece.id)
    expect(halves.map((p) => p.q)).toEqual([2, 2])
    expect((halves[0].x + halves[1].x) / 2).toBe(600)
  })

  it('cuts a half into quarters and refuses to cut a quarter', () => {
    const state = defaultTable(4)
    const piece = pullFromBag(state, { x: 600, y: 500 })!
    const [half] = cutPiece(state, piece.id)
    const [quarter] = cutPiece(state, half.id)
    expect(quarter.q).toBe(1)
    expect(cutPiece(state, quarter.id)).toEqual([])
  })
})

describe('swapMat', () => {
  const pan = SCALE.pans[0]
  const plate = FEEDING.seats[1].plate

  it('parks the arrangement on the pans and brings it back exactly', () => {
    const state = defaultTable(6)
    const onPan = pullFromBag(state, { x: pan.x + 10, y: pan.y - 20 })!
    swapMat(state, 'feeding')
    expect(state.pieces.find((p) => p.id === onPan.id)).toBeUndefined()
    swapMat(state, 'scale')
    expect(state.pieces.find((p) => p.id === onPan.id)).toMatchObject({ x: pan.x + 10, y: pan.y - 20 })
  })

  it('parks plates and bowl with Fair Feeding', () => {
    const state = defaultTable(4)
    const onPlate = pullFromBag(state, plate)!
    const inBowl = pullFromBag(state, FEEDING.bowl)!
    swapMat(state, 'scale')
    expect(state.parked.feeding.map((p) => p.id).sort()).toEqual([onPlate.id, inBowl.id].sort())
  })

  it('leaves loose stones on the table, even over the mat', () => {
    const state = defaultTable(6)
    const loose = pullFromBag(state, { x: MAT.x + 60, y: MAT.y + 60 })!
    const offMat = pullFromBag(state, { x: MAT.x - 60, y: MAT.y + 120 })!
    swapMat(state, 'feeding')
    expect(state.pieces.map((p) => p.id).sort()).toEqual([loose.id, offMat.id].sort())
  })

  it('is a no-op for the live mat', () => {
    const state = defaultTable(6)
    pullFromBag(state, { x: pan.x, y: pan.y })
    const before = serialize(state)
    swapMat(state, 'scale')
    expect(serialize(state)).toEqual(before)
  })
})

describe('loose parts in saved state', () => {
  it('keeps known parts on the scale, drops unknown kinds and extras, and assigns fresh ids', () => {
    const raw = { ...serialize({ ...defaultTable(6), liveMat: 'scale' }), parts: [{ kind: 'boulder', x: 500, y: 500 }, { kind: 'boulder', x: 600, y: 500 }, { kind: 'dragon', x: 1, y: 1 }, { kind: 'acorn', x: 99999, y: 500 }] }
    const state = deserialize(JSON.parse(JSON.stringify(raw)), 6)
    expect(state.parts.map((p) => p.kind)).toEqual(['boulder', 'acorn'])
    expect(new Set(state.parts.map((p) => p.id)).size).toBe(2)
    expect(state.parts[1].x).toBeLessThan(1500)
  })
  it('keeps no parts out when the scale is not the live mat', () => {
    const raw = { ...serialize(defaultTable(4)), parts: [{ kind: 'shell', x: 500, y: 500 }] }
    expect(deserialize(JSON.parse(JSON.stringify(raw)), 4).parts).toEqual([])
  })
})
