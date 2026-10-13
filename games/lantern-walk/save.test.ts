import { describe, expect, it } from 'vitest'
import { FOX_LANE, HEDGEHOG_LANE, HEDGEHOG_MAT, HOOK_GRIP, PLACES, REACH } from './layout'
import { deserialize, freshSave, serialize } from './save'
import { MOST_POINTS, MOST_WINDOWS, sheetOf } from './sheet'
import { STATE_VERSION } from './state'
import { CREATURES } from './wood'

// What comes back from storage is read field by field: an older or damaged
// shape never throws and never costs the child the fields that were sound.

describe('a first visit', () => {
  it('is at the table with a flat sheet and an unlit candle', () => {
    const save = freshSave(null)
    expect(save.place).toBe('table')
    expect(save.made).toBe('flat')
    expect(save.lit).toBe(false)
    expect(save.finished).toBe(false)
    expect(save.sheet).toEqual(sheetOf(save.position))
    expect(save.met).toEqual([])
  })

  it('is what anything unreadable gives, without throwing', () => {
    for (const raw of [null, undefined, 0, 'x', [], { v: 99 }, { v: 'one' }, { position: 'three-windows' }]) expect(deserialize(raw, null)).toEqual(freshSave(null))
  })
})

describe('a save read back', () => {
  const whole = { v: STATE_VERSION, position: 'one-window', finished: false, place: 'wood', made: 'lit', sheet: sheetOf('three-windows'), lit: true, lantern: { x: 400, y: 500 }, fox: { x: 500, y: 0 }, hedgehog: { x: 700, y: 0 }, worms: 21, moths: 'lantern', met: ['fox', 'owl'] }

  it('comes back as it was written', () => {
    const read = deserialize(JSON.parse(JSON.stringify(serialize(deserialize(whole)))))
    expect(read).toEqual({ ...whole, fox: { x: 500, y: PLACES.fox.y }, hedgehog: { x: 700, y: PLACES.hedgehog.y } })
  })

  it('is repaired field by field: one damaged number never costs the rest', () => {
    const read = deserialize({ ...whole, lantern: { x: 'far', y: 99999 }, fox: null, hedgehog: { x: -50 }, worms: 4096, moths: 7, met: ['fox', 'dragon', 3], sheet: 'gone', made: 'burnt' })
    expect(read.position).toBe('one-window')
    expect(read.place).toBe('wood')
    expect(read.made).toBe('lit')
    expect(read.lantern).toEqual({ x: PLACES.lantern.x, y: REACH.bottom })
    expect(read.fox.x).toBe(PLACES.fox.x)
    expect(read.hedgehog.x).toBe(HEDGEHOG_LANE.left)
    expect(read.worms).toBe(31)
    expect(read.moths).toBe('bark')
    expect(read.met).toEqual(['fox'])
    expect(read.sheet).toEqual(sheetOf('one-window'))
  })

  it('keeps every creature in its lane and the lantern within the finger\'s reach', () => {
    const read = deserialize({ ...whole, lantern: { x: -900, y: -900 }, fox: { x: 5000 }, hedgehog: { x: 5000 } })
    expect(read.lantern).toEqual({ x: REACH.left, y: REACH.top })
    expect(read.fox.x).toBe(FOX_LANE.right)
    expect(read.hedgehog.x).toBe(HEDGEHOG_LANE.right)
  })

  it('a finished walk is found with the lantern on its hook, and only then is the hedgehog on the mat', () => {
    const read = deserialize({ ...whole, finished: true, lantern: { x: 100, y: 300 }, hedgehog: { x: HEDGEHOG_MAT } })
    expect(read.lantern).toEqual(HOOK_GRIP)
    expect(read.hedgehog.x).toBe(HEDGEHOG_MAT)
    expect(deserialize({ ...whole, finished: true, place: 'table' }).finished).toBe(false)
  })

  it('at the table the candle is never burning, and in the wood the lantern is always made', () => {
    expect(deserialize({ ...whole, place: 'table', made: 'lit' }).made).toBe('candle')
    expect(deserialize({ ...whole, place: 'table', made: 'lit' }).lit).toBe(false)
    expect(deserialize({ ...whole, place: 'wood', made: 'flat' }).made).toBe('lit')
    // Moths ride with a light: a wood left dark has them on the bark.
    expect(deserialize({ ...whole, lit: false }).moths).toBe('bark')
  })

  it('names only creatures, each once, in the game\'s own order', () => {
    expect(deserialize({ ...whole, met: ['badger', 'badger', 'moths', 'fox'] }).met).toEqual(CREATURES.filter((name) => ['badger', 'moths', 'fox'].includes(name)))
  })

  it('is small plain data: the fullest sheet and every field at its longest stay far under 64 KB', () => {
    const outline = Array.from({ length: MOST_POINTS * 2 }, (_, i) => 3 + ((i * 37) % 94))
    const full = deserialize({ ...whole, met: [...CREATURES], sheet: Array.from({ length: MOST_WINDOWS + 4 }, () => ({ outline, paper: 'yellow', cut: true })) })
    expect(full.sheet).toHaveLength(MOST_WINDOWS)
    const text = JSON.stringify(serialize(full))
    expect(text.length).toBeLessThan(4096)
    expect(JSON.parse(text)).toEqual(serialize(full))
  })
})
