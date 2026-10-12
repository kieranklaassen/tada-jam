import { describe, expect, it } from 'vitest'
import { COVERS, HELLO, MANNERS } from './motion'
import type { Sound } from './notes'
import { walk } from './script'
import { SOUNDS, lengthOf, notesOf, partsOf, type SoundId } from './voices'
import { DWELLERS, PLACES, THINGS } from './wood'

// Nobody has listened to these sounds. What can be held without ears is held
// here: every number in a range that is safe to play to a small child, every
// sound tied to the length of the motion it rides on, no two given the same
// sound, and none written that the game never plays.

const ids = Object.keys(SOUNDS) as SoundId[]
const sound = (id: SoundId): Sound => SOUNDS[id]
const shape = (id: SoundId): string => JSON.stringify(sound(id).marks)

describe('the sounds as numbers', () => {
  it('keeps every mark in range: pitch, loudness, onset and length', () => {
    for (const id of ids) {
      expect(sound(id).marks.length, id).toBeGreaterThan(0)
      expect(sound(id).marks.length, id).toBeLessThanOrEqual(14)
      // The highest and lowest pitch the model ever asks for.
      for (const pitch of [0.7, 1, 1.78]) {
        partsOf(id).forEach((_, part) => {
          for (const note of notesOf(id, part, pitch)) {
            for (const frequency of [note.frequency, note.glideTo ?? note.frequency]) {
              expect(frequency, id).toBeGreaterThanOrEqual(30)
              expect(frequency, id).toBeLessThanOrEqual(8200)
            }
          }
        })
      }
      for (const mark of sound(id).marks) {
        expect(mark.peak, id).toBeGreaterThan(0)
        expect(mark.peak, id).toBeLessThanOrEqual(0.25)
        expect(mark.attack, id).toBeGreaterThanOrEqual(0.002)
        expect(mark.decay, id).toBeGreaterThan(0)
        // No single mark rings on: a long sound is many short marks, each at the moment of its motion.
        expect(mark.attack + mark.decay, id).toBeLessThanOrEqual(1.25)
      }
      // What sounds together at one moment stays well under full loudness.
      for (const part of partsOf(id)) expect(part.marks.reduce((sum, mark) => sum + mark.peak, 0), id).toBeLessThanOrEqual(0.4)
    }
  })

  it('no delay hidden inside a voice: every note of every part starts when the part is asked for', () => {
    for (const id of ids) {
      const parts = partsOf(id)
      expect(parts.map((part) => part.at)).toEqual([...parts.map((part) => part.at)].sort((a, b) => a - b))
      expect(parts.reduce((count, part) => count + part.marks.length, 0)).toBe(sound(id).marks.length)
      parts.forEach((_, part) => {
        for (const note of notesOf(id, part)) {
          expect('delay' in note, id).toBe(false)
          expect('at' in note, id).toBe(false)
        }
      })
    }
  })

  it('starts no mark after the motion it rides on is over, and ends soon after it', () => {
    for (const id of ids) {
      for (const mark of sound(id).marks) expect(mark.at ?? 0, id).toBeLessThan(sound(id).rides)
      expect(lengthOf(id), id).toBeLessThanOrEqual(sound(id).rides + 1.2)
    }
  })

  it('ties each cover\'s sound to the time the cover takes, and each find\'s to its act', () => {
    for (const place of PLACES) {
      expect(sound(`${place}Open`).rides).toBe(COVERS[place].open)
      expect(sound(`${place}Shut`).rides).toBe(COVERS[place].shut)
    }
    for (const find of [...THINGS, ...DWELLERS]) expect(sound(find).rides, find).toBe(MANNERS[find].length)
    expect(sound('hello').rides).toBe(HELLO)
  })

  it('gives no two things the same sound', () => {
    expect(new Set(ids.map(shape)).size).toBe(ids.length)
    // A cover opening is not the same cover shutting played again.
    for (const place of PLACES) expect(shape(`${place}Open`)).not.toBe(shape(`${place}Shut`))
  })

  it('scales a sound by its pitch and leaves the written one alone', () => {
    const written = shape('hello')
    const high = notesOf('hello', 0, 1.5)
    expect(high[0].frequency).toBeCloseTo(sound('hello').marks[0].frequency * 1.5, 6)
    expect(shape('hello')).toBe(written)
  })

  it('writes no sound the game never plays: the whole walk hears every one', () => {
    const heard = new Set(walk(1, 20).ears.heard.map((one) => one.event.id))
    expect(ids.filter((id) => !heard.has(id))).toEqual([])
  }, 30000)
})
