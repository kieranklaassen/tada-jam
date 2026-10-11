import { describe, expect, it } from 'vitest'
import type { Note } from './audio'
import { ask, board, everyMeeting, flourish, grip, meeting, ride, stretch, wait, type Script } from './scripts'
import { FOLK, PLACES, PLACE_COUNT } from './tree'
import type { Cue } from './village'
import { notesFor, notesOf, placePitch } from './voices'
import { KINDS } from './ways'

// Nobody has heard these sounds: the test holds every note to a range in
// which nothing can be shrill, booming, loud or long.

const places = Array.from({ length: PLACE_COUNT }, (_, index) => index)

/** The cues of the child's own touches and of the scenes, which voices.ts names. */
const namedCues = (): Cue[] => {
  const cues: Cue[] = ['flutter', 'pat', 'pop', 'arrive', 'grab', 'rustle', 'acorn', 'sun', 'moon', 'spring', 'page', 'dusk', 'morning', 'shake'].map((id) => ({ id }))
  for (const kind of KINDS) cues.push({ id: `lift:${kind}` }, { id: `touch:${kind}`, n: 3 }, { id: `off:${kind}`, n: 3 })
  for (const kind of KINDS) if (kind !== 'bucket') cues.push({ id: `tap:${kind}`, n: 3 })
  for (const place of places) cues.push({ id: `snap:${PLACES[place].fit === 'rise' ? 'ladder' : 'plank'}`, n: place }, { id: 'knock', n: place }, { id: 'held', n: place }, { id: 'light', n: place })
  for (const folk of FOLK) cues.push({ id: `peek:${folk}` }, { id: `window:${folk}` }, { id: `again:${folk}` })
  return cues
}

/** Every script's beats, as the cues the rules raise for them: each brings its own notes. */
const scripts = (): { name: string; script: Script }[] => [
  ...everyMeeting().map((cell) => ({ name: `${cell.folk} ${cell.kind} ${cell.fit}`, script: meeting(cell.folk, cell.kind, cell.fit, cell.up, cell.place) })),
  ...FOLK.flatMap((folk) => [flourish, ask, grip, stretch].map((make) => ({ name: `${make.name} ${folk}`, script: make(folk) }))),
  ...(['owl', 'mice', 'beetle'] as const).flatMap((folk) => [{ name: `board ${folk}`, script: board(folk) }, { name: `wait ${folk}`, script: wait(folk) }, { name: `ride ${folk} rise`, script: ride(folk, 'rise') }, { name: `ride ${folk} span`, script: ride(folk, 'span') }]),
  { name: 'empty rise', script: ride(null, 'rise') }, { name: 'empty span', script: ride(null, 'span') },
]

const inRange = (note: Note, where: string): void => {
  expect(note.frequency, where).toBeGreaterThanOrEqual(70)
  expect(note.frequency, where).toBeLessThanOrEqual(6000)
  if (note.glideTo !== undefined) { expect(note.glideTo, where).toBeGreaterThanOrEqual(70); expect(note.glideTo, where).toBeLessThanOrEqual(6000) }
  expect(note.peak, where).toBeGreaterThan(0)
  expect(note.peak, where).toBeLessThanOrEqual(0.3)
  expect(note.attack, where).toBeGreaterThan(0)
  expect(note.attack, where).toBeLessThanOrEqual(0.3)
  expect(note.decay, where).toBeGreaterThan(0)
  // The longest single note is a bucket's run from one end to the other.
  expect(note.decay, where).toBeLessThanOrEqual(2.4)
  expect(note.delay ?? 0, where).toBeGreaterThanOrEqual(0)
  expect((note.delay ?? 0) + note.attack + note.decay, where).toBeLessThanOrEqual(4)
  if (note.kind === 'noise') expect(note.q ?? 1, where).toBeGreaterThan(0)
}

/** The most that sounds at one instant, as a sum of peaks. */
const loudest = (notes: readonly Note[]): number => {
  let most = 0
  for (let t = 0; t < 4; t += 0.01) {
    let sum = 0
    for (const note of notes) {
      const start = note.delay ?? 0
      if (t >= start && t <= start + note.attack + note.decay) sum += note.peak
    }
    most = Math.max(most, sum)
  }
  return most
}

describe('the sounds, as numbers', () => {
  it('gives every cue of a touch and of a scene a sound, at once', () => {
    for (const cue of namedCues()) {
      const notes = notesOf(cue)
      expect(notes.length, cue.id).toBeGreaterThan(0)
      expect(notes.length, cue.id).toBeLessThanOrEqual(24)
      // A touch is answered at once: something sounds in the first twentieth of a second.
      expect(Math.min(...notes.map((note) => note.delay ?? 0)), cue.id).toBeLessThanOrEqual(0.05)
    }
  })

  it('plays the notes a beat brings with it, and nothing else for it', () => {
    const notes = flourish('owl').beats[0].sound
    expect(notesOf({ id: 'flourish:owl', notes })).toBe(notes)
    expect(notesOf({ id: 'beat', notes })).toBe(notes)
    // Without its notes a beat's cue is silent: nothing is made up for it here.
    expect(notesOf({ id: 'beat' })).toEqual([])
    expect(notesOf({ id: 'nothing-the-game-knows' })).toEqual([])
  })

  it('keeps every note in range: pitch, loudness, length and when it starts', () => {
    for (const cue of namedCues()) for (const note of notesOf(cue)) inRange(note, `${cue.id}: ${JSON.stringify(note)}`)
    for (const { name, script } of scripts()) for (const beat of script.beats) for (const note of beat.sound) inRange(note, `${name}: ${JSON.stringify(note)}`)
  })

  it('never sums to more than a full signal at one instant, whatever one moment sets off', () => {
    for (const cue of namedCues()) expect(loudest(notesOf(cue)), cue.id).toBeLessThanOrEqual(1)
    for (const { name, script } of scripts()) for (const beat of script.beats) expect(loudest(beat.sound), name).toBeLessThanOrEqual(1)
    // The loudest moment of the game: a piece snaps on, the leaves shake and a walker asks after it in the same frame.
    for (const folk of FOLK) expect(loudest(notesFor([{ id: 'snap:ladder', n: 0 }, { id: `ask:${folk}`, notes: ask(folk).beats[0].sound }]))).toBeLessThanOrEqual(1)
  })

  it('caps what one moment plays', () => {
    expect(notesFor([...namedCues(), ...scripts().flatMap(({ script }) => script.beats.map((beat) => ({ id: 'beat', notes: beat.sound })))]).length).toBeLessThanOrEqual(64)
    expect(notesFor([])).toEqual([])
    for (const { name, script } of scripts()) for (const beat of script.beats) expect(beat.sound.length, name).toBeLessThanOrEqual(64)
  })

  it('gives a place a pitch by its height: low in the tree is low', () => {
    const rises = places.filter((index) => PLACES[index].fit === 'rise' && PLACES[index].from === 0)
    const top = places.filter((index) => PLACES[index].fit === 'span' && PLACES[index].pa.y === 290)
    expect(placePitch(rises[0])).toBeLessThan(placePitch(top[0]))
    for (const place of places) { expect(placePitch(place)).toBeGreaterThanOrEqual(170); expect(placePitch(place)).toBeLessThanOrEqual(430) }
  })

  it('gives each kind of piece its own touch, its own answer to a tap and its own knock as it comes off, and each walker its own look out of its door', () => {
    for (const what of ['touch', 'tap', 'off', 'lift']) {
      const kinds = KINDS.filter((kind) => !(what === 'tap' && kind === 'bucket'))
      expect(new Set(kinds.map((kind) => JSON.stringify(notesOf({ id: `${what}:${kind}` })))).size, what).toBe(kinds.length)
    }
    expect(new Set(FOLK.map((folk) => JSON.stringify(notesOf({ id: `peek:${folk}` })))).size).toBe(FOLK.length)
    expect(new Set(FOLK.map((folk) => JSON.stringify(flourish(folk).beats.map((beat) => beat.sound)))).size).toBe(FOLK.length)
  })
})
