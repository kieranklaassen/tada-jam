import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { layHouse } from './houses'
import { deserialize, freshSave, move, serialize, type Saved } from './save'

const through = (raw: unknown): Saved => deserialize(JSON.parse(JSON.stringify(raw)), 4, 9)

describe('the save', () => {
  it('comes back as it went in, at every position', () => {
    for (const position of LADDER) for (let seed = 1; seed < 40; seed++) {
      const house = layHouse(position, seed), s: Saved = { ...freshSave(4, seed), position, openings: house.openings, loads: move(house), seed: house.seed, x: 1.5, wideLeft: false, bumps: 4, shown: true, shownEnds: true }
      expect(through(serialize(s))).toEqual(serialize(s))
    }
  })

  it('keeps that nothing has been shown yet', () => {
    const s = freshSave(2, 3)
    expect(through(serialize(s)).shown).toBe(false)
    expect(through(serialize(s)).shownEnds).toBe(false)
  })

  it('replaces a house that does not hold together and keeps the position', () => {
    const good = serialize({ ...freshSave(2, 3), position: 'three-openings' })
    const bad: unknown[] = [null, 7, 'x', [], {}, { v: 2 }, { ...good, openings: [] }, { ...good, openings: [{ x: 9, cells: [[0, 0]] }] }, { ...good, loads: 'no' }, { ...good, loads: good.loads.map((l) => ({ ...l, at: 'hands' })) },
      { ...good, loads: good.loads.map((l) => ({ ...l, at: 'in', slot: 1 })) }, { ...good, loads: good.loads.map((l) => ({ ...l, kind: 'bath' })) }, { ...good, loads: [1, 2, 3] }, { ...good, openings: [null] }, { ...good, x: NaN, bumps: -4, seed: 'a' }]
    for (const raw of bad) {
      const s = through(raw)
      expect(s.loads).toHaveLength(3)
      expect(s.openings.length).toBeGreaterThan(0)
      expect(s.loads.filter((l) => l.at === 'hands').length).toBeLessThanOrEqual(1)
      if (raw && typeof raw === 'object' && 'position' in raw) expect(s.position).toBe('three-openings')
      expect(Number.isFinite(s.x)).toBe(true)
    }
  })

  it('gives an ended house a next one even if that was lost, and stays small', () => {
    const s = freshSave(4, 3), ended = { ...serialize(s), finished: false, loads: s.loads.map((l, slot) => ({ ...l, at: 'in', slot })) }
    const back = through(ended)
    expect(back.finished).toBe(true)
    expect(back.next).not.toBeNull()
    expect(JSON.stringify(serialize(back)).length).toBeLessThan(4000)
  })
})
