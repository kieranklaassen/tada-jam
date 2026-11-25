import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { callNext, canJoin, deserialize, freshSave, join, nextParty, owed } from './save'

describe('the save', () => {
  it('a first visit starts by age, open at both ends', () => {
    for (const age of [null, 1, 4, 5]) expect(freshSave(age).on).toEqual(['croc'])
    for (const age of [6, 7, 12]) expect(freshSave(age).on).toEqual(['snail'])
    expect(freshSave(null).open).toEqual({ sausage: true, shoe: false, duck: false })
  })
  it('reads back what it wrote, and is small', () => {
    const s = { ...freshSave(null), row: Array.from({ length: 14 }, (_, i) => ({ k: 'duck' as const, x: i * 60 })), shown: ['touching' as const], out: { who: ['croc' as const], worn: [{ k: 'shoe' as const, x: 3 }] } }
    expect(deserialize(JSON.parse(JSON.stringify(s)))).toEqual(s)
    expect(JSON.stringify(s).length).toBeLessThan(4000)
  })
  it('repairs anything', () => {
    for (const raw of [null, 3, 'x', [], {}, { v: 9 }]) expect(deserialize(raw)).toEqual(freshSave(null))
    const s = deserialize({ v: 1, position: 'nope', on: ['cow'], row: [{ k: 'duck', x: NaN }, { k: 'hat', x: 1 }, { k: 'shoe', x: 99999 }, 4], wait: ['seal', 'python'], turn: -3, open: 7, out: { who: ['croc'], worn: 'x' }, shown: ['two', 'zzz'] })
    expect(s.on).toEqual(['croc'])
    expect(s.row).toEqual([{ k: 'shoe', x: 792 }])
    expect(s.wait).toEqual(['dog'])
    expect(s.out).toBeNull()
    expect(s.shown).toEqual(['two'])
  })
  it('the position moves with the one who leaves, and lays out the one after next', () => {
    let s = freshSave(null)
    expect(s.wait).toEqual(['dog'])
    s = callNext({ ...s, row: [{ k: 'duck', x: 0 }] }, 'well')
    expect([s.position, s.on, s.wait]).toEqual(['dog-shorter', ['dog'], ['snail']])
    expect(s.out).toEqual({ who: ['croc'], worn: [{ k: 'duck', x: 0 }] })
    s = callNext(s, 'badly')
    expect(s.position).toBe('croc-alone')
    expect(s.on).toEqual(['snail'])
    expect(s.wait).not.toEqual(s.on)
  })
  it('all the way up, through the full shop and round again, somebody new always waits', () => {
    let s = freshSave(null)
    for (let n = 0; n < 60; n++) {
      expect(s.wait.join()).not.toBe(s.on.join())
      const t = callNext(s, n < 30 ? 'well' : 'mixed')
      expect(t.on).toEqual(s.wait)
      expect(deserialize(JSON.parse(JSON.stringify(t)))).toEqual(t)
      s = t
    }
    expect(s.position).toBe(LADDER[LADDER.length - 1])
    for (const position of LADDER) expect(nextParty({ position, on: ['croc'], turn: 0 }).who.length).toBeGreaterThan(0)
  })
  it('two share where there is room', () => {
    const s = { ...freshSave(null), on: ['dog' as const], wait: ['snail' as const] }
    expect(canJoin(s)).toBe(true)
    expect(join(s).on).toEqual(['dog', 'snail'])
    expect(owed(join(s))).toBe('two')
    expect(canJoin({ ...s, on: ['croc'] })).toBe(false)
  })
})
