import { describe, expect, it } from 'vitest'
import { Yard, freshYard } from './model'
import { deserializeSave, freshSave, serializeSave, type Save } from './save'
import { STATE_VERSION } from './state'
import { HOME, START, THINGS, THING_GAP } from './yard'

const stored = (save: Save): unknown => JSON.parse(JSON.stringify(save))

describe('the saved yard', () => {
  it('starts the same at every age and with no age: the raccoon home, the egg in the nest, the goose at the start of her round', () => {
    for (const age of [null, 3, 6, 8, 10, 12]) {
      expect(freshSave(age)).toEqual({ v: STATE_VERSION, position: 'yard', finished: false, raccoon: HOME, things: START, goose: { leg: 0, along: 0 } })
    }
  })

  it('round-trips through storage', () => {
    const save: Save = { ...freshSave(null), raccoon: { x: 400, row: 1 }, goose: { leg: 3, along: 0.25 } }
    save.things.ball = { at: 'paws' }
    save.things.egg = { at: 'floor', x: 700, row: 2 }
    save.things.boot = { at: 'scarecrow' }
    expect(deserializeSave(stored(serializeSave(save, save)), null)).toEqual(save)
  })

  it.each([['nothing', undefined], ['null', null], ['a string', 'yard'], ['a list', [1, 2]], ['a newer version', { ...freshSave(null), v: STATE_VERSION + 1 }], ['no version', { raccoon: { x: 400, row: 1 } }]])(
    'gives a fresh yard for %s', (_, raw) => {
      expect(deserializeSave(raw, 8)).toEqual(freshSave(8))
    },
  )

  it('repairs each field by itself and keeps the rest', () => {
    const good = stored({ ...freshSave(null), raccoon: { x: 400, row: 1 }, goose: { leg: 2, along: 0.5 } }) as Record<string, unknown>
    expect(deserializeSave({ ...good, raccoon: 'gone' }, null)).toMatchObject({ raccoon: HOME, goose: { leg: 2, along: 0.5 } })
    expect(deserializeSave({ ...good, raccoon: { x: 400, row: 9 } }, null).raccoon).toEqual(HOME)
    expect(deserializeSave({ ...good, goose: { leg: 99, along: 0.5 } }, null)).toMatchObject({ raccoon: { x: 400, row: 1 }, goose: { leg: 0, along: 0 } })
    expect(deserializeSave({ ...good, things: 7 }, null).things).toEqual(START)
    expect(deserializeSave({ ...good, things: { ball: { at: 'moon' }, potato: { at: 'floor', x: 300, row: 1 } } }, null).things).toMatchObject({ ball: START.ball, potato: { at: 'floor', x: 300, row: 1 }, egg: START.egg })
    // Open play has no finished cycle, whatever a record says.
    expect(deserializeSave({ ...good, finished: true }, null).finished).toBe(false)
  })

  it('brings a raccoon or a thing saved in the pond back to the bank', () => {
    const good = stored(freshSave(null)) as Record<string, unknown>
    expect(deserializeSave({ ...good, raccoon: { x: 440, row: 3 } }, null).raccoon.x).not.toBe(440)
  })

  it('keeps one thing at most in the paws and one in each place: the first keeps its spot', () => {
    const good = stored(freshSave(null)) as Record<string, unknown>
    const things = deserializeSave({ ...good, things: { ball: { at: 'paws' }, potato: { at: 'paws' }, clock: { at: 'nest' }, boot: { at: 'bowl' }, cabbage: { at: 'bowl' }, egg: { at: 'nest' } } }, null).things
    expect(things.ball).toEqual({ at: 'paws' })
    expect(things.potato).toEqual(START.potato)
    expect(things.cabbage).toEqual(START.cabbage)
    // The egg's starting spot is the nest: it goes there, and the clock that was read into the nest goes to its own.
    expect(things.egg).toEqual({ at: 'nest' })
    expect(things.clock).toEqual(START.clock)
    expect(THINGS.filter((id) => things[id].at === 'paws')).toHaveLength(1)
  })

  it('sends an egg whose record is damaged to its nest, whatever was saved there, and a thing sent home lies clear of one lying on its starting spot', () => {
    const good = stored(freshSave(null)) as Record<string, unknown>
    const potato = START.potato as { at: 'floor'; x: number; row: number }
    const things = deserializeSave({ ...good, things: { ball: { at: 'nest' }, potato: 'gone', clock: { at: 'floor', x: potato.x, row: potato.row }, boot: START.boot, cabbage: START.cabbage, egg: 7 } }, null).things
    expect(things.egg).toEqual({ at: 'nest' })
    // The ball that was in the nest is at its own starting spot.
    expect(things.ball).toEqual(START.ball)
    // The clock lies on the potato's starting spot, so the potato is laid at the nearest free one.
    expect(things.clock).toEqual({ at: 'floor', x: potato.x, row: potato.row })
    expect(things.potato.at).toBe('floor')
    const laid = things.potato as { at: 'floor'; x: number; row: number }
    expect(laid.row !== potato.row || Math.abs(laid.x - potato.x) >= THING_GAP).toBe(true)
    const spots = THINGS.map((id) => JSON.stringify(things[id]))
    expect(new Set(spots).size).toBe(THINGS.length)
  })

  it('plays on from whatever it was given without a fault', () => {
    const yard = new Yard(deserializeSave({ v: STATE_VERSION, raccoon: { x: -5000, row: 0 }, things: { egg: { at: 'floor', x: 1e9, row: 3 } }, goose: { leg: 5, along: 1 } }, null))
    yard.press({ x: 600, y: 600 })
    for (let i = 0; i < 600; i++) yard.step(1 / 60)
    expect(Number.isFinite(yard.raccoon.x)).toBe(true)
  })

  it('keeps the largest legal state under half of the 64 KB cap', () => {
    const save: Save = { ...freshSave(null), raccoon: { x: 1089.123456, row: 3 }, goose: { leg: 5, along: 0.999999 } }
    for (const id of THINGS) save.things[id] = { at: 'floor', x: 1069.123456, row: 3 }
    expect(JSON.stringify(serializeSave(save, save)).length).toBeLessThan(32 * 1024)
    expect(JSON.stringify(serializeSave(freshSave(null), freshYard())).length).toBeLessThan(1024)
  })
})
