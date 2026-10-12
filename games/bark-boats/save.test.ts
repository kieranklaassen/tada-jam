import { describe, expect, it } from 'vitest'
import { ALL_MAKINGS, type Making } from './build'
import { picture, saveWith } from './drive'
import { LAID_OUT, SEAT } from './layout'
import { openWorld } from './open'
import { boxOf, overlaps } from './pieces'
import { deserialize, firstBuild, freshSave, serialize, type Save } from './save'
import { Session } from './session'
import { MAX_POND } from './world'

// The saved state, read as something untrusted; and lesson 8: the child's
// age chooses what a first visit finds on the stone and nothing else, ever.

/** Every making a save holds, wherever it is. */
function makings(save: Save): Making[] {
  const all: (Making | null)[] = [save.boat.hull, ...save.boat.masts, ...save.boat.sails, ...save.boat.deck, ...save.loose.map((item) => item.kind)]
  return all.filter((kind): kind is Making => kind !== null).sort()
}

const TWELVE = [...ALL_MAKINGS].sort()
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

describe('age is a first-visit default', () => {
  it('5 and younger, or no age: the bark hull with the short twig pressed in', () => {
    for (const age of [null, 2, 3, 4, 5, 0, -1, Number.NaN]) {
      const save = freshSave(age)
      expect(save.boat.hull, String(age)).toBe('bark')
      expect(save.boat.masts, String(age)).toEqual(['twig', null])
      expect(save.boat.aboard).toBe(false)
    }
  })

  it('6 and older, with no upper end: a bare stone and all twelve makings on the bank', () => {
    for (const age of [6, 7, 8, 12, 40]) {
      const save = freshSave(age)
      expect(save.boat.hull, String(age)).toBeNull()
      expect(save.loose.length, String(age)).toBe(12)
    }
    expect(firstBuild(6).hull).toBeNull()
    expect(firstBuild(5).hull).toBe('bark')
  })

  it('gates nothing: at every age the same twelve makings are there to be picked up', () => {
    for (const age of [null, 2, 4, 6, 8, 12]) expect(makings(freshSave(age)), String(age)).toEqual(TWELVE)
  })

  it('is not asked again: a saved game is found as it was left, whatever the age now', () => {
    const stored = copy(serialize(saveWith({ hull: 'pod', masts: ['stem', null], sails: ['feather', null], deck: ['cap'] })))
    const first = deserialize(stored, 4)
    for (const age of [null, 2, 6, 12]) expect(deserialize(stored, age), String(age)).toEqual(first)
    expect(picture(new Session(stored, 12, 1).w)).toBe(picture(new Session(stored, 4, 1).w))
  })

  it('reaches the game only as that default: a damaged record gives a first visit for the age', () => {
    expect(deserialize({ v: 1, boat: 'gone' }, 8).boat.hull).toBeNull()
    expect(deserialize({ v: 1, boat: 'gone' }, 4).boat.hull).toBe('bark')
  })
})

describe('the saved state is read as untrusted', () => {
  const junk: unknown[] = [undefined, null, 0, 42, 'boat', true, [], [1, 2], {}, { v: 0 }, { v: 2 }, { v: '1' }, { v: 1 }, { v: 1, boat: null, loose: 7, pond: 'x', journey: [] }]

  it('never throws, and always holds each of the twelve makings exactly once', () => {
    for (const raw of junk) {
      const save = deserialize(raw, null)
      expect(makings(save), JSON.stringify(raw)).toEqual(TWELVE)
      expect(() => openWorld(save, 1)).not.toThrow()
    }
  })

  it('gives a fresh game for a record of a newer version, which this build cannot read', () => {
    expect(deserialize({ ...freshSave(4), v: 2, finished: true }, 4)).toEqual(freshSave(4))
  })

  it('repairs each field by itself', () => {
    const raw = {
      v: 1, position: 'nowhere', finished: 'yes', place: 'moon',
      boat: { hull: 'bark', masts: ['twig', 'twig'], sails: ['maple', 'birch'], deck: ['berry', 'berry', 'twig', 'bark', 'pebble', 'cap', 'feather', 'birch'], at: 'sky', x: 'far', aboard: 'no' },
      loose: [{ kind: 'maple', x: 1, y: 1 }, { kind: 'stalk' }, { kind: 'spoon', x: 3, y: 3 }, 'pod', { kind: 'pod', x: 180.4, y: 779.6 }],
      journey: { reach: 99, stuck: 'true' }, pond: [{ hull: 'tin' }, { hull: 'pod', masts: [null, 'stem'], sails: ['maple', 'feather'], deck: ['pebble'] }, 7],
    }
    const save = deserialize(raw, null)
    expect(save.finished).toBe(false)
    expect(save.place).toBe('bank')
    // The second twig is no twig; a sail with no mast under it is not a sail; a making already aboard is not aboard twice.
    expect(save.boat.masts).toEqual(['twig', null])
    expect(save.boat.sails).toEqual(['maple', null])
    expect(save.boat.deck).toEqual(['berry', 'pebble', 'cap', 'feather'])
    expect(save.boat).toMatchObject({ at: 'stone', x: SEAT.x, aboard: false })
    expect(save.journey).toEqual({ reach: null, stuck: false, done: false })
    expect(save.pond).toEqual([{ hull: 'pod', masts: [null, 'stem'], sails: [null, 'feather'], deck: ['pebble'] }])
    expect(makings(save)).toEqual(TWELVE)
    expect(save.loose.find((item) => item.kind === 'pod')).toEqual({ kind: 'pod', x: 180, y: 780 })
    expect(save.loose.find((item) => item.kind === 'stalk')).toEqual({ kind: 'stalk', ...LAID_OUT.stalk })
  })

  it('makes the fields agree: finished is a boat at the pond, the brook is a place reached, a boat away has the gnome in it', () => {
    const built = { hull: 'walnut', masts: ['twig', null], sails: [null, null], deck: [] }
    const finished = deserialize({ v: 1, finished: true, place: 'bank', boat: { ...built, at: 'stone' }, journey: { reach: 1, stuck: true }, pond: [] }, null)
    expect(finished).toMatchObject({ finished: true, place: 'pond', journey: { reach: 5, stuck: false } })
    expect(finished.boat.aboard).toBe(true)
    expect(finished.pond.length).toBe(1)
    const noBoat = deserialize({ v: 1, finished: true, place: 'pond', boat: { hull: null }, journey: { reach: 5 } }, null)
    expect(noBoat).toMatchObject({ finished: false, place: 'bank', journey: { reach: null, stuck: false } })
    const brook = deserialize({ v: 1, place: 'brook', boat: built, journey: { reach: -3, stuck: true } }, null)
    expect(brook).toMatchObject({ place: 'brook', journey: { reach: 0, stuck: true }, boat: { aboard: true, at: 'eddy' } })
    const afloat = deserialize({ v: 1, place: 'bank', boat: { ...built, at: 'eddy', x: 99999 } }, null)
    expect(afloat.boat).toMatchObject({ at: 'eddy', aboard: true })
    expect(afloat.boat.x).toBeLessThanOrEqual(800)
  })

  it('keeps only the five boats sent last', () => {
    const boat = (hull: string): unknown => ({ hull, masts: [null, null], sails: [null, null], deck: [] })
    const save = deserialize({ v: 1, boat: boat('bark'), pond: ['bark', 'pod', 'walnut', 'bark', 'pod', 'walnut', 'pod'].map(boat) }, null)
    expect(save.pond.length).toBe(MAX_POND)
    expect(save.pond.map((each) => each.hull)).toEqual(['walnut', 'bark', 'pod', 'walnut', 'pod'])
  })

  it('lays no two makings on top of each other, whatever the record says', () => {
    const heap = ALL_MAKINGS.map((kind) => ({ kind, x: 800, y: 700 }))
    const save = deserialize({ v: 1, boat: { hull: null }, loose: heap }, null)
    for (const a of save.loose) for (const b of save.loose) if (a !== b) expect(overlaps(boxOf(a.kind, a), boxOf(b.kind, b)), `${a.kind} on ${b.kind}`).toBe(false)
  })

  it('reads its own writing back unchanged, and stays small plain JSON', () => {
    const states: Save[] = [freshSave(4), freshSave(8), saveWith({ hull: 'walnut', masts: ['twig', 'stem'], sails: ['feather', 'birch'], deck: ['cap', 'berry', 'pebble'] }, { place: 'brook', journey: { reach: 3, stuck: true }, pond: Array(5).fill({ hull: 'bark', masts: ['twig', 'stalk'], sails: ['maple', 'birch'], deck: ['berry', 'cap', 'pebble', 'feather'] }) })]
    for (const state of states) {
      const text = JSON.stringify(serialize(state))
      expect(text.length).toBeLessThan(2048)
      const back = deserialize(JSON.parse(text), null)
      expect(JSON.stringify(serialize(back))).toBe(text)
    }
  })
})
