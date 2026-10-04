import { describe, expect, it } from 'vitest'
import { ACTIONS, GRID, OBJECTS } from './grid'
import type { Happening, Held } from './hand'
import { TUFTS } from './rules'
import type { Cue } from './scenes'
import { MOST_NOTES, notesFor, notesForCue, type Note } from './sound'
import { CELL_VOICES, OTHER_VOICES, RUB_VOICES, VOICE_RANGE, pitchForLength } from './voices'
import type { Salon } from './world'

const salon = (over: Partial<Salon> = {}): Salon => ({
  chair: 'lion', friend: 'poodle', waiting: ['yak', 'rabbit'], seed: 1, lock: 60, model: 44, seat: 'beside', cape: 'on',
  mane: Array(TUFTS).fill(50), ribbon: null, clippings: [{ len: 20, hue: 'lion', on: 'floor', x: 46 }], shown: { snip: true, pull: true, ribbon: false }, ...over,
})
const at = { x: 0, y: 0 }
const cell = (object: (typeof OBJECTS)[number], action: (typeof ACTIONS)[number], extra: Partial<Extract<Happening, { kind: 'cell' }>> = {}): Happening =>
  ({ kind: 'cell', object, action, cell: GRID[object][action], held: null, at, rings: null, piece: null, place: null, sprangBack: false, ...extra })
const inRange = (note: Note) => {
  for (const hz of [note.pitch, ...(note.glideTo === undefined ? [] : [note.glideTo])]) expect(hz >= VOICE_RANGE.pitch.min && hz <= VOICE_RANGE.pitch.max, `${hz} Hz`).toBe(true)
  expect(note.peak >= VOICE_RANGE.peak.min && note.peak <= VOICE_RANGE.peak.max).toBe(true)
  expect(note.attack >= VOICE_RANGE.attack.min && note.attack <= VOICE_RANGE.attack.max).toBe(true)
  expect(note.length >= VOICE_RANGE.length.min && note.length <= VOICE_RANGE.length.max).toBe(true)
  expect((note.after ?? 0) >= 0 && (note.after ?? 0) <= 0.3).toBe(true)
}

describe('what things sound like', () => {
  it('gives every cell of the grid a sound, short and inside the stated ranges', () => {
    for (const object of OBJECTS) for (const action of ACTIONS) {
      for (const rings of [null, 4, 50, 100]) {
        const notes = notesFor(cell(object, action, { rings }), salon(), salon())
        expect(notes.length, `${object}/${action}`).toBeGreaterThanOrEqual(1)
        expect(notes.length).toBeLessThanOrEqual(3)
        notes.forEach(inRange)
      }
    }
  })

  it('answers a press the moment it lands: a squeak for hair, the lion\'s own voice for his face, a scritch for a piece, a ring of steel for the scissors', () => {
    const held = (h: Held) => notesFor({ kind: 'caught', held: h, at }, salon(), salon())
    expect(held({ object: 'lock' })).toEqual([OTHER_VOICES.caught])
    expect(held({ object: 'tuft', index: 2 })).toEqual([OTHER_VOICES.caught])
    expect(held({ object: 'face', who: 'chair', part: 'nose' })[0].pitch).toBeLessThan(OTHER_VOICES.caught.pitch)
    expect(held({ object: 'clipping', index: 0 })).toEqual([CELL_VOICES['clipping/pull']])
    expect(notesFor({ kind: 'scissors', at }, salon(), salon())).toEqual([OTHER_VOICES.scissors])
    for (const notes of [held({ object: 'lock' }), held({ object: 'face', who: 'chair', part: 'ear' })]) notes.forEach(inRange)
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
    const giggle = (part: 'nose' | 'ear' | 'chin' | 'cheek') => notesFor(cell('face', 'poke', { held: { object: 'face', who: 'chair', part } }), salon(), salon())[0].pitch
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

  it('sounds the friend\'s lock and a face in their owner\'s voice, lower for the lion than for the poodle', () => {
    const hum = (friend: 'lion' | 'poodle') => notesFor(cell('model', 'poke'), salon({ chair: 'yak', friend }), salon({ chair: 'yak', friend }))[0].pitch
    expect(hum('lion')).toBeLessThan(hum('poodle'))
    const giggle = (who: 'chair' | 'friend') => notesFor(cell('face', 'poke', { held: { object: 'face', who, part: 'cheek' } }), salon(), salon())[0].pitch
    expect(giggle('chair')).toBeLessThan(giggle('friend'))
    const peek = notesFor(cell('face', 'ribbon', { held: { object: 'face', who: 'friend', part: 'cheek' } }), salon(), salon())
    expect(peek).toHaveLength(2)
    expect(peek[1].after).toBeGreaterThan(0)
    peek.forEach(inRange)
  })

  it('gives every thing that moves the game on a small sound as it gives under the finger, and none of its own when it acts', () => {
    const pressed = (['door', 'stool', 'bench', 'knot', 'chair'] as const).map((button) => notesFor({ kind: 'pressed', button, at }, salon(), salon()))
    for (const notes of pressed) { expect(notes).toHaveLength(1); notes.forEach(inRange) }
    expect(notesFor({ kind: 'button', button: 'door', at }, salon(), salon())).toEqual([])
  })

  it('sounds the friend\'s lock in the friend\'s own voice: stretched, snapped back and snipped', () => {
    const poodle = salon({ friend: 'poodle' }), yak = salon({ friend: 'yak' })
    for (const action of ['pull', 'snip'] as const) {
      const high = notesFor(cell('model', action, { rings: 44 }), poodle, poodle)[0], low = notesFor(cell('model', action, { rings: 44 }), yak, yak)[0]
      expect(high.pitch, action).toBeGreaterThan(low.pitch)
    }
    const boing = (s: Salon): Note => notesFor({ kind: 'letGo', held: { object: 'model' }, at }, s, s)[0]
    expect(boing(poodle).pitch).toBeGreaterThan(boing(yak).pitch)
  })

  it('has the customer giggle in its own voice when its lock is snipped, and sounds a tuft lower the longer it is', () => {
    const lion = salon({ chair: 'lion' }), rabbit = salon({ chair: 'rabbit' })
    const giggle = (s: Salon): Note => notesFor(cell('lock', 'snip', { rings: 40 }), s, s)[2]
    expect(giggle(lion)).toBeDefined()
    expect(giggle(rabbit).pitch).toBeGreaterThan(giggle(lion).pitch)
    const sproing = (rings: number): number => notesFor(cell('tuft', 'poke', { rings }), lion, lion)[0].pitch
    expect(sproing(10)).toBeGreaterThan(sproing(50))
    expect(sproing(50)).toBeGreaterThan(sproing(95))
  })

  it('gives every cue of a scene its notes, and none of them is a cheer or a buzzer', () => {
    const cues: Cue[] = ['door', 'doorShut', 'step', 'hatOff', 'hairOut', 'capeOn', 'capeOff', 'landed', 'tooLong', 'tooShort', 'asLong', 'flap', 'air', 'ping', 'nip', 'tug', 'ribbonTaken', 'ribbonTick', 'ribbonHome']
    for (const cue of cues) {
      const notes = notesForCue(cue, 'lion', salon())
      expect(notes.length, cue).toBeGreaterThanOrEqual(1)
      expect(notes.length).toBeLessThanOrEqual(3)
      notes.forEach(inRange)
    }
    // The showing sounds the two lengths as they are: two plucks, the same two whichever way it went, and at one
    // moment when the ends meet. Nothing is louder or longer for a match than for a miss.
    const s = salon({ lock: 70, model: 44 })
    const long = notesForCue('tooLong', 'lion', s), short = notesForCue('tooShort', 'lion', { ...s, lock: 20 }), even = notesForCue('asLong', 'lion', { ...s, lock: 44 })
    for (const notes of [long, short, even]) { expect(notes).toHaveLength(2); expect(notes[0].peak).toBe(notes[1].peak); expect(notes[0].length).toBe(notes[1].length) }
    expect(long[0].peak).toBe(even[0].peak)
    expect(even[1].after!).toBeLessThan(long[1].after!)
    expect(even[0].pitch).toBeCloseTo(even[1].pitch)
  })

  it('lets hair go with a soft drop, and says nothing when the scissors leave', () => {
    expect(notesFor({ kind: 'letGo', held: { object: 'lock' }, at }, salon(), salon())).toEqual([OTHER_VOICES.letGo])
    expect(notesFor({ kind: 'letGo', held: { object: 'face', who: 'chair', part: 'cheek' }, at }, salon(), salon())).toEqual([])
    expect(notesFor({ kind: 'away' }, salon(), salon())).toEqual([])
    expect(notesFor({ kind: 'airSnip', at }, salon(), salon())).toEqual([OTHER_VOICES.airSnip])
    expect(MOST_NOTES).toBeGreaterThanOrEqual(2)
  })
})
