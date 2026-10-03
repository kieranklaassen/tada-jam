import { describe, expect, it } from 'vitest'
import { FIRST_VISIT, LADDER } from './config'
import { PLACES, ROW_MAX, newIn, placeOf } from './places'

describe('the designed order', () => {
  it('has a place for every id of the ladder and no other', () => {
    expect(Object.keys(PLACES).sort()).toEqual([...LADDER].sort())
    expect(new Set(LADDER).size).toBe(LADDER.length)
  })

  it('names places in the game own order, never a grade, a groep or a level', () => {
    for (const id of LADDER) {
      expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/)
      expect(id).not.toMatch(/grade|groep|level|fase|year|age|class|stage|kinder|peuter|easy|hard/)
    }
  })

  it('starts with two eggs of two families and a grown one asking', () => {
    expect(PLACES[LADDER[0]]).toEqual({ form: 'seek', row: 2, voices: 'far', leaves: false })
  })

  it('adds one new thing at a time, or combines two that are known', () => {
    const seen = new Set<string>()
    for (const id of LADDER) {
      const added = newIn(id)
      expect(added.length, id).toBeLessThanOrEqual(1)
      // A place that adds nothing new is a combination, and one that has not been laid out before.
      const whole = JSON.stringify(PLACES[id])
      expect(seen.has(whole), id).toBe(false)
      seen.add(whole)
    }
    expect(LADDER.map((id) => newIn(id)[0] ?? 'combination')).toEqual(['the game', 'row:3', 'voices:near', 'leaves:true', 'combination', 'form:who', 'form:alike'])
  })

  it('never hides more than four, and leaves room for one more egg wherever it starts with fewer', () => {
    for (const id of LADDER) {
      expect(PLACES[id].row).toBeLessThanOrEqual(ROW_MAX)
      expect(PLACES[id].row).toBeGreaterThanOrEqual(2)
    }
    expect(PLACES['two-alike'].row).toBe(4)
  })

  it('gives the first place for an id it does not know', () => {
    expect(placeOf('no-such-place')).toBe(PLACES[LADDER[0]])
    expect(placeOf('near-voice')).toBe(PLACES['near-voice'])
  })

  it('starts a first visit at one of the first two places', () => {
    for (const row of FIRST_VISIT) expect(LADDER.indexOf(row.position)).toBeLessThan(2)
  })
})
