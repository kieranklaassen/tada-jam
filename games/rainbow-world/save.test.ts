import { describe, expect, it } from 'vitest'
import { BARE_MAT_FROM_AGE } from './config'
import { inField } from './layout'
import { PIECES, PIECE_IDS } from './pieces'
import { deserialize, freshSave, placesOf, serialize, startsWithADoll, withPlaces, type Save } from './save'
import { STATE_VERSION } from './state'
import { World } from './world'

/** What ctx.storage hands back on the next visit. */
const stored = (save: Save): unknown => JSON.parse(JSON.stringify(serialize(save)))

describe('the saved mat', () => {
  it('starts a first visit by age: a doll on the mat for the youngest and for no age, a bare mat from four up, open at both ends', () => {
    for (const age of [null, 0, 2, BARE_MAT_FROM_AGE - 1]) {
      expect(startsWithADoll(age)).toBe(true)
      expect(freshSave(age).pieces['doll-small'].at).toBe('mat')
    }
    for (const age of [BARE_MAT_FROM_AGE, 5, 12, 40]) {
      expect(startsWithADoll(age)).toBe(false)
      expect(PIECE_IDS.every((id) => freshSave(age).pieces[id].at === 'home')).toBe(true)
    }
    const first = freshSave(null).pieces['doll-small']
    expect(inField(first.x, first.y)).toBe(true)
  })

  it('holds every field the design sheet names, and no cycle is ever finished', () => {
    const save = freshSave(null)
    expect(Object.keys(save).sort()).toEqual(['basket', 'finished', 'pieces', 'position', 'v'])
    expect(save).toMatchObject({ v: STATE_VERSION, position: 'open-mat', finished: false, basket: 'upright' })
    expect(Object.keys(save.pieces)).toEqual([...PIECE_IDS])
    for (const id of PIECE_IDS) expect(Object.keys(save.pieces[id]).sort()).toEqual(['at', 'on', 'turned', 'x', 'y'])
    expect(deserialize({ ...save, finished: true }).finished).toBe(false)
  })

  it('round-trips through storage, and a saved mat wins over the age', () => {
    const world = new World(placesOf(freshSave(null)))
    world.press(PIECES.horse.home.x, PIECES.horse.home.y - 40)
    world.press(480, 540)
    world.step(2)
    const save = withPlaces(freshSave(null), world.places(), world.basket)
    expect(save.pieces.horse).toEqual({ at: 'mat', x: 480, y: 540, on: null, turned: false })
    expect(deserialize(stored(save), 9)).toEqual(save)
    expect(new World(placesOf(deserialize(stored(save), 9))).places()).toEqual(world.places())
  })

  it.each([
    ['nothing', undefined],
    ['null', null],
    ['a string', 'mat'],
    ['an array', [1, 2]],
    ['a version above the current one', { ...freshSave(9), v: STATE_VERSION + 1 }],
    ['no version', { pieces: {} }],
  ])('gives a fresh visit for %s', (_, raw) => {
    expect(deserialize(raw, null)).toEqual(freshSave(null))
    expect(deserialize(raw, 9)).toEqual(freshSave(9))
  })

  it('repairs each damaged field by itself and keeps the rest', () => {
    const good = withPlaces(freshSave(9), { ...placesOf(freshSave(9)), 'doll-tall': { at: 'mat', x: 600, y: 560, on: null, turned: true } }, 'upright')
    const raw = stored(good) as { basket: unknown; pieces: Record<string, unknown> }
    raw.basket = 7
    raw.pieces.horse = 'gone'
    raw.pieces.silk = { at: 'moon', x: 'left', y: null, on: 'nobody', turned: 'yes' }
    raw.pieces['arch-small'] = { at: 'mat', x: Number.NaN, y: 40, on: null, turned: true }
    raw.pieces['arch-middle'] = { at: 'mat', x: 5000, y: -5000, on: 'arch-middle', turned: false }
    raw.pieces.stranger = { at: 'mat', x: 1, y: 1 }
    const read = deserialize(raw, 9)
    expect(read.basket).toBe('upright')
    expect(read.pieces['doll-tall']).toEqual(good.pieces['doll-tall'])
    expect(read.pieces.horse).toEqual(good.pieces.horse)
    expect(read.pieces.silk).toEqual({ at: 'home', x: 0, y: 0, on: null, turned: false })
    expect(read.pieces['arch-small']).toEqual({ at: 'home', x: 0, y: 0, on: null, turned: true })
    // A place far off the mat is brought to the nearest place on it, and nothing rests on itself.
    expect(read.pieces['arch-middle'].at).toBe('mat')
    expect(inField(read.pieces['arch-middle'].x, read.pieces['arch-middle'].y, -1)).toBe(true)
    expect(read.pieces['arch-middle'].on).toBeNull()
    expect(Object.keys(read.pieces)).toEqual([...PIECE_IDS])
  })

  it('keeps the basket and what is in it: a thing saved in the basket is in the basket on load', () => {
    const later = stored(freshSave(9)) as { basket: string; pieces: Record<string, { at: string; on: string | null }> }
    later.basket = 'tipped'
    later.pieces['doll-round'].at = 'basket'
    const read = deserialize(later, 9)
    expect(read.basket).toBe('tipped')
    expect(read.pieces['doll-round'].at).toBe('basket')
    const world = new World(placesOf(read), read.basket)
    expect(world.basket).toBe('tipped')
    expect(world.piece('doll-round').at).toBe('basket')
    expect(withPlaces(read, world.places(), world.basket)).toEqual(read)
  })

  it('keeps what rests on what, and stands a thing on the bare mat where the saved pair cannot be', () => {
    const save = freshSave(9)
    save.pieces['arch-large'] = { at: 'mat', x: 500, y: 560, on: null, turned: true }
    save.pieces['doll-round'] = { at: 'mat', x: 500, y: 560, on: 'arch-large', turned: false }
    save.pieces.silk = { at: 'mat', x: 500, y: 560, on: 'doll-round', turned: false }
    const world = new World(placesOf(deserialize(stored(save), 9)))
    expect(world.places()['doll-round'].on).toBe('arch-large')
    expect(world.places().silk.on).toBe('doll-round')
    // Asleep is a view of what the doll rests on: its eyes are shut from the first frame.
    expect(world.piece('doll-round').shut).toBe(1)
    // Damaged: each rests on the other, one rests on a thing that is not on the mat, a doll stands on a standing arch.
    const bad = freshSave(9)
    bad.pieces['doll-tall'] = { at: 'mat', x: 500, y: 560, on: 'doll-small', turned: false }
    bad.pieces['doll-small'] = { at: 'mat', x: 500, y: 560, on: 'doll-tall', turned: false }
    bad.pieces.horse = { at: 'mat', x: 700, y: 560, on: 'silk', turned: false }
    bad.pieces['arch-middle'] = { at: 'mat', x: 400, y: 600, on: null, turned: false }
    bad.pieces['doll-round'] = { at: 'mat', x: 400, y: 600, on: 'arch-middle', turned: false }
    const mended = new World(placesOf(deserialize(stored(bad), 9)))
    for (const id of ['doll-tall', 'horse', 'doll-round'] as const) expect(mended.places()[id].on, id).toBeNull()
    mended.step(1)
    expect(mended.takeSounds()).toEqual([])
  })

  it('keeps the largest state far under half of the 64 KB cap', () => {
    const largest = freshSave(null)
    for (const id of PIECE_IDS) largest.pieces[id] = { at: 'basket', x: 1180, y: 820, on: 'arch-middle', turned: true }
    largest.basket = 'upright'
    expect(JSON.stringify(serialize(largest)).length).toBeLessThan(32 * 1024)
    expect(JSON.stringify(serialize(largest)).length).toBeLessThan(1024)
  })
})
