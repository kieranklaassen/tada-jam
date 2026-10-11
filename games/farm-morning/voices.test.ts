import { describe, expect, it } from 'vitest'
import { BROUGHT, CELLS, GRID, cellOf } from './cells'
import { ANIMALS } from './state'
import { VOICES, lengthOf, notesOf, type SoundId } from './voices'

const ids = Object.keys(VOICES) as SoundId[]
/** A voice with its timing taken out: what is played, whatever the delays. */
const shape = (id: SoundId): string => JSON.stringify(VOICES[id].map((note) => [note.kind, Math.round(note.frequency), note.glideTo ? Math.round(note.glideTo) : 0, note.wave ?? '', note.q ?? 0]))

describe('the voices', () => {
  it('keeps every pitch, peak and length in a range a small speaker can play and an ear can take', () => {
    for (const id of ids) {
      expect(VOICES[id].length, id).toBeGreaterThan(0)
      for (const note of VOICES[id]) {
        expect(note.frequency, id).toBeGreaterThanOrEqual(50)
        expect(note.frequency, id).toBeLessThanOrEqual(8000)
        if (note.glideTo !== undefined) {
          expect(note.glideTo, id).toBeGreaterThanOrEqual(50)
          expect(note.glideTo, id).toBeLessThanOrEqual(8000)
        }
        expect(note.peak, id).toBeGreaterThan(0)
        expect(note.peak, id).toBeLessThanOrEqual(0.4)
        expect(note.attack, id).toBeGreaterThan(0)
        expect(note.attack + note.decay, id).toBeLessThanOrEqual(1.2)
        expect(note.delay ?? 0, id).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('has a voice for every cell of the grid, and no silent cell', () => {
    for (const cell of GRID) {
      expect(VOICES[cell], cell).toBeDefined()
      expect(VOICES[cell].length, cell).toBeGreaterThanOrEqual(3)
    }
  })

  it('gives no two cells the same voice', () => {
    expect(new Set(GRID.map(shape)).size).toBe(GRID.length)
  })

  it('has no row and no column whose cells sound alike once the leap is taken out', () => {
    const own = (id: SoundId): string => JSON.stringify(VOICES[id].slice(id.startsWith('finger') ? 0 : 1).map((note) => [note.kind, Math.round(note.frequency / 50)]))
    for (const brought of BROUGHT) expect(new Set(ANIMALS.map((animal) => own(cellOf(brought, animal)))).size, brought).toBe(ANIMALS.length)
    for (const animal of ANIMALS) expect(new Set(BROUGHT.map((brought) => own(cellOf(brought, animal)))).size, animal).toBe(BROUGHT.length)
  })

  it('ends each cell\'s voice inside its answer, give or take half a second', () => {
    for (const cell of GRID) expect(lengthOf(VOICES[cell]), cell).toBeLessThanOrEqual(CELLS[cell].lasts + 0.5)
  })

  it('answers a touch at once: something sounds in the first twentieth of a second of every voice a finger starts', () => {
    // Not started by a finger, but by what a touch set going: each sounds when its maker gets there.
    const delayed: SoundId[] = ['hens-drum', 'mew', 'tok-white', 'tok-russet', 'tok-bantam', 'peck-white', 'peck-russet', 'peck-bantam', 'beaks', 'bubble']
    for (const id of ids) if (!delayed.includes(id)) expect(Math.min(...VOICES[id].map((note) => note.delay ?? 0)), id).toBeLessThanOrEqual(0.05)
  })

  it('joins everything one touch sets off into one list', () => {
    const joined = notesOf(['scoop-pony', 'run-white'])
    expect(joined).toHaveLength(VOICES['scoop-pony'].length + VOICES['run-white'].length)
    expect(lengthOf(joined)).toBeLessThan(4)
    expect(notesOf([])).toEqual([])
  })

  it('keeps the short answers short', () => {
    for (const id of ['lay', 'clink', 'drift', 'knock', 'rattle', 'cloud'] as const) expect(lengthOf(VOICES[id]), id).toBeLessThan(0.5)
    for (const id of ['lift-scoop', 'lift-bucket', 'lift-brush', 'lift-fork'] as const) expect(lengthOf(VOICES[id]), id).toBeLessThan(0.7)
  })
})
