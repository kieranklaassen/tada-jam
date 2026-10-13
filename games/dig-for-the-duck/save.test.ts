import { describe, expect, it } from 'vitest'
import { COLS, ROWS, STEAM, TIP_RIGHT, WATER, decode, encode, known, sand } from './cells'
import { LADDER } from './config'
import { layHill } from './hills'
import { deserialize, freshSave, serialize, type Save } from './save'
import { saveOn } from './testing'

// What is stored, and that whatever comes back from storage opens a game.

const through = (save: Save): Save => deserialize(JSON.parse(JSON.stringify(serialize(save))), null)

describe('the saved hill', () => {
  it('goes through storage and comes back the same, on every hill and layout', () => {
    for (const id of LADDER) for (let variant = 0; variant < 3; variant++) {
      const save = saveOn(id, variant, { mole: 'afloat', worm: 'squelching', badger: 'rained', shown: ['clay', 'hot'] })
      expect(through(save)).toEqual(save)
    }
  })

  it('holds the hill as one string of a character a cell, which only a known cell can be read back from', () => {
    const cells = layHill('massif', 1).cells
    cells[5] = WATER; cells[6] = STEAM; cells[7] = TIP_RIGHT; cells[8] = sand(4, true, true)
    const text = encode(cells)
    expect(text.length).toBe(COLS * ROWS)
    expect(Array.from(decode(text)!)).toEqual(Array.from(cells))
    expect(decode(text.slice(1))).toBeNull()
    expect(decode(`${String.fromCharCode(48 + 21)}${text.slice(1)}`)).toBeNull()
    expect(decode(42)).toBeNull()
    expect(known(21)).toBe(false)
    expect(known(sand(0))).toBe(true)
  })

  it('opens a fresh sand hill from nothing, from rubbish and from another version', () => {
    for (const raw of [null, undefined, 7, 'x', [], {}, { v: 99, position: 'dune' }, { v: 1 }]) {
      const save = deserialize(raw, null)
      expect(save.position).toBe('dune')
      expect(decode(save.cells)).not.toBeNull()
      expect(save.finished).toBe(false)
    }
  })

  it('repairs each field by itself: a hill that cannot be read is laid afresh at the position, unfinished, and what was shown is kept', () => {
    const good = serialize(saveOn('fen', 2, { shown: ['clay', 'moss'], worm: 'squelching' }))
    expect(deserialize({ ...good, cells: 'short' }, null)).toMatchObject({ position: 'fen', hill: 'fen', variant: 2, finished: false, worm: 'dry', shown: ['clay', 'moss'] })
    expect(deserialize({ ...good, variant: 9 }, null)).toMatchObject({ hill: 'fen', variant: 0, finished: false })
    expect(deserialize({ ...good, hill: 'moon' }, null)).toMatchObject({ hill: 'fen', finished: false })
    expect(deserialize({ ...good, mole: 'flying', badger: 3, shown: ['moss', 'moss', 'cheese', 'sand'] }, null)).toMatchObject({ mole: 'home', badger: 'dry', worm: 'squelching', shown: ['moss'] })
    expect(deserialize({ ...good, shown: 'all' }, null).shown).toEqual([])
  })

  it('keeps the hill and the position together: an unfinished hill is the hill of the position, a finished one the hill before it', () => {
    const finished = serialize({ ...saveOn('dune'), position: 'claypit', finished: true })
    expect(through(finished)).toMatchObject({ hill: 'dune', position: 'claypit', finished: true })
    // A finished flag on a hill that is neither: the game opens on the position's hill, to be played.
    expect(deserialize({ ...finished, position: 'fen' }, null)).toMatchObject({ hill: 'fen', position: 'fen', finished: false })
    expect(deserialize({ ...serialize(saveOn('scree')), position: 'dune' }, null)).toMatchObject({ hill: 'dune', finished: false })
  })

  it('a first visit takes no notice of the age: the sand hill, for the youngest, the oldest and no age at all', () => {
    for (const age of [null, 0, 6, 9, 10, 99]) expect(freshSave(age)).toMatchObject({ position: 'dune', hill: 'dune', variant: 0 })
  })
})
