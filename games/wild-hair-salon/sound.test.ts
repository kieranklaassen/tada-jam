import { describe, expect, it } from 'vitest'
import { ACTIONS, GRID, OBJECTS } from './grid'
import type { Happening, Held } from './hand'
import { TUFTS } from './rules'
import { MOST_NOTES, notesFor, type Note } from './sound'
import { CELL_VOICES, OTHER_VOICES, RUB_VOICES, VOICE_RANGE, pitchForLength } from './voices'
import type { Salon } from './world'

const salon = (over: Partial<Salon> = {}): Salon => ({
  chair: 'lion', friend: 'poodle', waiting: ['yak', 'rabbit'], seed: 1, lock: 60, model: 44, seat: 'beside', cape: 'on',
  mane: Array(TUFTS).fill(50), ribbon: null, clippings: [{ len: 20, hue: 'lion', on: 'floor', x: 46 }], shown: { snip: true, pull: true, ribbon: false }, ...over,
})
const at = { x: 0, y: 0 }
const cell = (object: (typeof OBJECTS)[number], action: (typeof ACTIONS)[number], extra: Partial<Extract<Happening, { kind: 'cell' }>> = {}): Happening =>
  ({ kind: 'cell', object, action, cell: GRID[object][action], held: null, at, rings: null, piece: null, place: null, ...extra })
const inRange = (note: Note) => {
  for (const hz of [note.pitch, ...(note.glideTo === undefined ? [] : [note.glideTo])]) expect(hz >= VOICE_RANGE.pitch.min && hz <= VOICE_RANGE.pitch.max, `${hz} Hz`).toBe(true)
  expect(note.peak >= VOICE_RANGE.peak.min && note.peak <= VOICE_RANGE.peak.max).toBe(true)
  expect(note.attack >= VOICE_RANGE.attack.min && note.attack <= VOICE_RANGE.attack.max).toBe(true)
  expect(note.length >= VOICE_RANGE.length.min && note.length <= VOICE_RANGE.length.max).toBe(true)
  expect((note.after ?? 0) >= 0 && (note.after ?? 0) <= 0.3).toBe(true)
}

describe('what things sound like', () => {
  it('gives every cell the toy holds a sound, short and inside the stated ranges', () => {
    for (const object of ['lock', 'tuft', 'clipping', 'face'] as const) for (const action of ['pull', 'snip', 'poke', 'ruffle'] as const) {
      for (const rings of [null, 4, 50, 100]) {
        const notes = notesFor(cell(object, action, { rings }), salon(), salon())
        expect(notes.length, `${object}/${action}`).toBeGreaterThanOrEqual(1)
        expect(notes.length).toBeLessThanOrEqual(2)
        notes.forEach(inRange)
      }
    }
  })

  it('answers a press the moment it lands: a squeak for hair, the lion\'s own voice for his face, a scritch for a piece, a ring of steel for the scissors', () => {
    const held = (h: Held) => notesFor({ kind: 'caught', held: h, at }, salon(), salon())
    expect(held({ object: 'lock' })).toEqual([OTHER_VOICES.caught])
    expect(held({ object: 'tuft', index: 2 })).toEqual([OTHER_VOICES.caught])
    expect(held({ object: 'face', part: 'nose' })[0].pitch).toBeLessThan(OTHER_VOICES.caught.pitch)
    expect(held({ object: 'clipping', index: 0 })).toEqual([CELL_VOICES['clipping/pull']])
    expect(notesFor({ kind: 'scissors', at }, salon(), salon())).toEqual([OTHER_VOICES.scissors])
    for (const notes of [held({ object: 'lock' }), held({ object: 'face', part: 'ear' })]) notes.forEach(inRange)
  })

  it('sounds a plucked lock lower the longer it is, and the creak of a pull falling as it grows', () => {
    const pluck = (rings: number) => notesFor(cell('lock', 'poke', { rings }), salon(), salon())[0].pitch
    expect(pluck(20)).toBeGreaterThan(pluck(60))
    expect(pluck(60)).toBeGreaterThan(pluck(95))
    expect(pluck(40)).toBeCloseTo(pitchForLength(40))
    const creak = (rings: number) => notesFor(cell('lock', 'pull', { rings }), salon(), salon())[0]
    expect(creak(30).pitch).toBeGreaterThan(creak(80).pitch)
    expect(creak(50).glideTo!).toBeLessThan(creak(50).pitch)
  })

  it('follows the snip with the stump twanging up, a moment later, at its new length', () => {
    const notes = notesFor(cell('lock', 'snip', { rings: 30 }), salon(), salon())
    expect(notes[0]).toEqual(CELL_VOICES['lock/snip'])
    expect(notes[1].after).toBeGreaterThan(0)
    expect(notes[1].pitch).toBeCloseTo(pitchForLength(30))
  })

  it('giggles in the lion\'s voice, differently on the nose, an ear, the chin and a cheek', () => {
    const giggle = (part: 'nose' | 'ear' | 'chin' | 'cheek') => notesFor(cell('face', 'poke', { held: { object: 'face', part } }), salon(), salon())[0].pitch
    const pitches = [giggle('nose'), giggle('ear'), giggle('chin'), giggle('cheek')]
    expect(new Set(pitches.map((p) => Math.round(p))).size).toBe(4)
    // The lion's voice is low: his giggle sits under the voice it is made from.
    expect(giggle('cheek')).toBeLessThan(CELL_VOICES['face/poke'].pitch)
  })

  it('answers a head rub with the customer\'s own sound', () => {
    expect(notesFor(cell('face', 'ruffle'), salon(), salon())).toEqual([RUB_VOICES.lion])
    expect(notesFor(cell('face', 'ruffle'), salon({ chair: 'rabbit', friend: 'lion' }), salon({ chair: 'rabbit', friend: 'lion' }))).toEqual([RUB_VOICES.rabbit])
  })

  it('sticks a piece on a face with a smack, and sighs when a piece too small to cut blows away', () => {
    expect(notesFor(cell('clipping', 'pull', { place: { on: 'face', who: 'chair', spot: 'lip' } }), salon(), salon())).toEqual([OTHER_VOICES.smack])
    expect(notesFor(cell('clipping', 'pull', { place: { on: 'floor', x: 10 } }), salon(), salon())).toEqual([CELL_VOICES['clipping/pull']])
    const gone = notesFor(cell('clipping', 'snip'), salon(), salon({ clippings: [] }))
    expect(gone.map((n) => n.pitch)).toEqual([CELL_VOICES['clipping/snip'].pitch, OTHER_VOICES.sigh.pitch])
    expect(notesFor(cell('clipping', 'snip'), salon(), salon({ clippings: [...salon().clippings, ...salon().clippings] }))).toHaveLength(1)
  })

  it('lets hair go with a soft drop, and says nothing when the scissors leave', () => {
    expect(notesFor({ kind: 'letGo', held: { object: 'lock' }, at }, salon(), salon())).toEqual([OTHER_VOICES.letGo])
    expect(notesFor({ kind: 'letGo', held: { object: 'face', part: 'cheek' }, at }, salon(), salon())).toEqual([])
    expect(notesFor({ kind: 'away' }, salon(), salon())).toEqual([])
    expect(notesFor({ kind: 'airSnip', at }, salon(), salon())).toEqual([OTHER_VOICES.airSnip])
    expect(MOST_NOTES).toBeGreaterThanOrEqual(2)
  })
})
