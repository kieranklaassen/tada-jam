import { describe, expect, it } from 'vitest'
import { PLOTS } from './layout'
import { defaultGarden, deserialize, serialize, STATE_VERSION } from './state'

describe('garden state', () => {
  it('the youngest (and unknown ages) start with one bend turned away from the stream; older children start empty', () => {
    expect(defaultGarden(null).pieces).toHaveLength(1)
    expect(defaultGarden(6).pieces[0]).toMatchObject({ kind: 'bend', c: 3, r: 1 })
    expect(defaultGarden(8).pieces).toHaveLength(0)
    expect(defaultGarden(10).growth).toEqual(PLOTS.map(() => 0))
  })

  it('numbers each plot by its place in the list (growth, wetness and the views index by plot id)', () => {
    PLOTS.forEach((plot, index) => expect(plot.id).toBe(index))
  })

  it('round-trips through serialize and deserialize', () => {
    const garden = defaultGarden(6)
    garden.pieces.push({ kind: 'sluice', c: 2, r: 0, turn: 1, open: false }, { kind: 'wheel', c: 3, r: 3, turn: 0, open: true })
    garden.growth[1] = 0.5
    expect(deserialize(JSON.parse(JSON.stringify(serialize(garden))), 6)).toEqual(garden)
  })

  it('reads corrupt or foreign saves without crashing', () => {
    for (const junk of [null, undefined, 3, 'x', [], {}, { v: 99 }, { v: STATE_VERSION, pieces: 'no' }, { v: STATE_VERSION, growth: { a: 1 } }]) {
      const garden = deserialize(junk, 8)
      expect(garden.v).toBe(STATE_VERSION)
      expect(garden.growth).toHaveLength(PLOTS.length)
    }
  })

  it('drops pieces that are unknown, off the hill, on a plot, or doubled up, and clamps growth', () => {
    const garden = deserialize(
      {
        v: STATE_VERSION,
        pieces: [
          { kind: 'bend', c: 3, r: 0, turn: 7 },
          { kind: 'bend', c: 3, r: 0, turn: 1 },
          { kind: 'rocket', c: 1, r: 1 },
          { kind: 'straight', c: 9, r: 0 },
          { kind: 'straight', c: 4, r: 2 },
          { kind: 'split', c: 1.5, r: 1 },
          { kind: 'straight', c: 0, r: 0, turn: 3 },
        ],
        growth: [2, -1, 'x', 0.25],
      },
      8,
    )
    expect(garden.pieces).toEqual([
      { kind: 'bend', c: 3, r: 0, turn: 3, open: true },
      { kind: 'straight', c: 0, r: 0, turn: 1, open: true },
    ])
    expect(garden.growth).toEqual([1, 0, 0, 0.25])
  })
})
