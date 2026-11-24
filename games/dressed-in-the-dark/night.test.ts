import { describe, expect, it } from 'vitest'
import { Night, freshNight } from './night'
import { below, makeRng } from './rng'
import { deserialize, freshSave, serialize } from './save'
import { GARMENTS, LOVES, MISSES, PARTS, SETS, SLEEPERS, SLOT, verdictOf } from './things'

const dark = () => { const night = new Night(freshNight(true)); night.pull(); return night }

describe('the night', () => {
  it('puts a garment on whoever lies in the bed, over what that one wears', () => {
    const night = dark()
    night.give('pan', 2)
    night.give('boots', 2)
    expect(night.worn.hen).toEqual(['pan', 'boots'])
    expect(night.last('hen')).toBe('boots')
  })
  it('moves a garment from one sleeper to another', () => {
    const night = dark()
    night.give('gown', 0)
    expect(night.give('gown', 4)!.off).toBe('goat')
    expect(night.worn.goat).toEqual([])
    expect(night.worn.pig).toEqual(['gown'])
  })
  it('walks a sleeper in slippers one bed toward the wardrobe, and the other goes back', () => {
    const night = dark()
    expect(night.give('slippers', 3)!.walk).toEqual({ walker: 'croc', by: 'slippers', from: 3, to: 2, other: 'hen' })
    expect(night.beds).toEqual(['goat', 'hippo', 'croc', 'hen', 'pig'])
  })
  it('walks again when the slippers come off and go on again', () => {
    const night = dark()
    night.give('slippers', 3)
    night.give('slippers', 2)
    expect(night.beds).toEqual(['goat', 'croc', 'hippo', 'hen', 'pig'])
  })
  it('rolls a sleeper on skates to the last bed', () => {
    const night = dark()
    night.give('skates', 0)
    expect(night.beds).toEqual(['pig', 'hippo', 'hen', 'croc', 'goat'])
  })
  it('turns back at the wardrobe and at the lamp', () => {
    const night = dark()
    expect(night.give('slippers', 0)!.walk).toEqual({ walker: 'goat', by: 'slippers', from: 0, to: 0, other: null })
    expect(night.give('skates', 4)!.walk!.other).toBeNull()
    expect(night.beds).toEqual([...SLEEPERS])
  })
  it('walks nobody who is awake', () => {
    const night = new Night(freshNight(true))
    expect(night.give('slippers', 3)!.walk).toBeNull()
  })
  it('dresses whoever comes to lie in a bed while the walk is still being heard', () => {
    const night = dark()
    night.give('slippers', 3)
    expect(night.give('bell', 2)!.sleeper).toBe('croc')
  })
  it('takes every garment on one sleeper', () => {
    const night = dark()
    for (const garment of GARMENTS) night.give(garment, night.bedOf('goat'))
    expect(night.worn.goat).toHaveLength(9)
  })
  it('throws off what is not loved when the lamp goes out, and keeps what is', () => {
    const night = dark()
    night.give('gown', 0)
    night.give('pan', 0)
    night.pull()
    expect(night.pull()).toEqual({ lit: false, thrown: [{ sleeper: 'goat', garment: 'gown' }] })
    expect(night.worn.goat).toEqual(['pan'])
    expect(night.onLine('gown')).toBe(true)
  })
  it('keeps the last four behind the door until it is opened', () => {
    const night = new Night(freshNight(false))
    night.pull()
    expect(night.give('skates', 0)).toBeNull()
    night.open = true
    expect(night.give('skates', 0)).not.toBeNull()
  })
  it('can lay any sleeper in any bed', () => {
    const seen = new Set<string>(), todo = [[...SLEEPERS]]
    while (todo.length > 0) {
      const beds = todo.pop()!
      if (seen.has(beds.join())) continue
      seen.add(beds.join())
      for (let bed = 0; bed < 5; bed++) {
        const night = new Night({ ...freshNight(true), beds, lit: false })
        night.give('slippers', bed)
        todo.push(night.beds)
      }
    }
    expect(seen.size).toBe(120)
  })
  it('never loses a garment or a sleeper in a thousand acts at random', () => {
    const rng = makeRng(7), night = new Night(freshNight(false))
    for (let i = 0; i < 1000; i++) {
      const act = below(rng, 8), garment = GARMENTS[below(rng, 9)]
      if (act < 5) night.give(garment, below(rng, 5))
      else if (act === 5) night.home(garment)
      else if (act === 6) night.pull()
      else night.open = true
      expect([...night.beds].sort()).toEqual([...SLEEPERS].sort())
      const all = SLEEPERS.flatMap((sleeper) => night.worn[sleeper])
      expect(new Set(all).size).toBe(all.length)
      expect(deserialize(JSON.parse(JSON.stringify(serialize({ ...freshSave(null), night: night.record() })))).night).toEqual(night.record())
    }
  })
})

describe('the tastes', () => {
  it('gives each sleeper one love and one it misses, no two alike', () => {
    expect(new Set(Object.values(LOVES)).size).toBe(5)
    expect(new Set(Object.values(MISSES)).size).toBe(5)
    for (const sleeper of SLEEPERS) expect(LOVES[sleeper]).not.toBe(MISSES[sleeper])
  })
  it('has three sets of a hat, a body and feet that use every garment once', () => {
    expect(PARTS.flatMap((part) => SETS[part]).sort()).toEqual([...GARMENTS].sort())
    for (const part of PARTS) expect(SETS[part].map((garment) => SLOT[garment]).sort()).toEqual(['body', 'feet', 'head'])
  })
  it('judges what is worn', () => {
    expect(verdictOf('goat', [])).toEqual({ kind: 'bare' })
    expect(verdictOf('goat', ['pan'])).toEqual({ kind: 'love', at: 'pan', and: false })
    expect(verdictOf('goat', ['tutu', 'pan'])).toEqual({ kind: 'love', at: 'pan', and: true })
    expect(verdictOf('goat', ['boots', 'tutu'])).toEqual({ kind: 'late', at: 'boots' })
    expect(verdictOf('goat', ['bell', 'tutu'])).toEqual({ kind: 'appalled', at: 'tutu' })
    expect(verdictOf('goat', ['boots'])).toEqual({ kind: 'late', at: 'boots' })
    expect(verdictOf('goat', ['pan', 'armour', 'boots', 'bell'])).toEqual({ kind: 'part', part: 'knight', at: 'bell' })
    expect(verdictOf('pig', ['pan', 'bell', 'armour', 'boots', 'tutu', 'skates'])).toEqual({ kind: 'part', part: 'rider', at: 'skates' })
  })
})

describe('the save', () => {
  it('starts shut for the young and for no age, and open from five', () => {
    expect(freshSave(null).night.open).toBe(false)
    expect(freshSave(3).night.open).toBe(false)
    expect(freshSave(5).night.open).toBe(true)
    expect(freshSave(12).night.open).toBe(true)
  })
  it.each([null, 3, 'x', [], {}, { v: 99 }, { v: 1 }, { v: 1, night: 4 }, { v: 1, night: { beds: ['goat'], worn: [], lit: 'no' } }, { v: 1, night: { beds: ['goat', 'goat', 'hen', 'croc', 'pig'], worn: { goat: 'pan' } } }])('opens on a damaged record %j', (raw) => {
    const night = deserialize(raw).night
    expect(night.beds).toEqual([...SLEEPERS])
    expect(night.lit).toBe(true)
  })
  it('keeps a good field beside a damaged one, and one wearer for each garment', () => {
    const night = deserialize({ v: 1, night: { beds: 3, worn: { goat: ['pan', 'pan', 'sock'], pig: ['pan', 'bell'] }, lit: false, open: true } }).night
    expect(night).toEqual({ beds: [...SLEEPERS], worn: { goat: ['pan'], hippo: [], hen: [], croc: [], pig: ['bell'] }, lit: false, open: true })
  })
  it('saves small', () => {
    const night = freshNight(true)
    night.worn.hippo = [...GARMENTS]
    expect(JSON.stringify(serialize({ ...freshSave(null), night })).length).toBeLessThan(1000)
  })
})
