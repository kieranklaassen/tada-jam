import { describe, expect, it } from 'vitest'
import type { Note } from './audio'
import { DYE_NOTE, WAKE, brush, clung, cueLength, folkVoice, mothFlutter, pat, pegKnock, pluck, puff, roomPat, type Cue, type Feeling } from './voices'
import { ALL_KINDS, DYES } from './wool'

const FEELINGS: readonly Feeling[] = ['look', 'poke']

/** Every sound the toy has, as cues. */
function everySound(): [string, Cue][] {
  const single = (notes: Note[]): Cue => [{ after: 0, notes }]
  const all: [string, Cue][] = [['a pat on the room', single(roomPat)], ['a peg', single(pegKnock)], ['the moth', mothFlutter]]
  for (let dye = 0; dye < DYES; dye++) {
    for (let size = 0; size < 3; size++) {
      all.push([`a puff of dye ${dye}, size ${size}`, single(puff(dye, size))], [`a pluck of dye ${dye}, size ${size}`, single(pluck(dye, size))])
    }
    all.push([`the cling of dye ${dye}`, single(clung(dye))])
  }
  for (const speed of [0, 0.5, 1]) for (const amount of [0, 1]) all.push([`brushing at ${speed}, ${amount}`, single(brush(speed, amount))], [`a pat at ${amount}`, single(pat(amount))])
  for (const kind of ALL_KINDS) all.push([`${kind} waking`, WAKE[kind]])
  for (let who = 0; who < 4; who++) for (const feeling of FEELINGS) for (let variant = 0; variant < 3; variant++) all.push([`figure ${who}, ${feeling} ${variant}`, folkVoice(who, feeling, variant)])
  return all
}

const signature = (cue: Cue): string => JSON.stringify(cue)

describe('the voices', () => {
  it('keeps every note in a range a small speaker plays and an ear bears: pitch, loudness and length', () => {
    for (const [name, cue] of everySound()) {
      expect(cue.length, name).toBeGreaterThan(0)
      for (const part of cue) {
        expect(part.after, name).toBeGreaterThanOrEqual(0)
        expect(part.notes.length, name).toBeGreaterThan(0)
        for (const note of part.notes) {
          expect(note.frequency, name).toBeGreaterThanOrEqual(40)
          expect(note.frequency, name).toBeLessThanOrEqual(6000)
          if (note.glideTo !== undefined) {
            expect(note.glideTo, name).toBeGreaterThanOrEqual(40)
            expect(note.glideTo, name).toBeLessThanOrEqual(6000)
          }
          expect(note.peak, name).toBeGreaterThan(0)
          expect(note.peak, name).toBeLessThanOrEqual(0.2)
          expect(note.attack, name).toBeGreaterThanOrEqual(0.003)
          expect(note.attack + note.decay, name).toBeLessThanOrEqual(1.5)
        }
      }
      expect(cueLength(cue), name).toBeLessThanOrEqual(1.6)
    }
  })

  it('waits on no audio clock: no note carries a delay, and a cue says when each part starts', () => {
    for (const [name, cue] of everySound()) for (const part of cue) for (const note of part.notes) expect(note.delay, name).toBeUndefined()
  })

  it('gives every kind of shape a waking sound of its own', () => {
    const seen = new Set(ALL_KINDS.map((kind) => signature(WAKE[kind])))
    expect(seen.size).toBe(ALL_KINDS.length)
  })

  it('gives every bowl a note of its own, and each size of tuft a different pluck', () => {
    expect(new Set(DYE_NOTE).size).toBe(DYES)
    for (let dye = 0; dye < DYES; dye++) expect(new Set([0, 1, 2].map((size) => signature([{ after: 0, notes: pluck(dye, size) }]))).size).toBe(3)
  })

  it('gives each figure a voice no other has, and a feeling changes it', () => {
    for (const feeling of FEELINGS) expect(new Set([0, 1, 2, 3].map((who) => signature(folkVoice(who, feeling, 0)))).size, feeling).toBe(4)
    for (let who = 0; who < 4; who++) {
      expect(new Set(FEELINGS.map((feeling) => signature(folkVoice(who, feeling, 0)))).size, `figure ${who}`).toBe(FEELINGS.length)
      expect(new Set([0, 1, 2].map((variant) => signature(folkVoice(who, 'poke', variant)))).size, `figure ${who} poked`).toBe(3)
    }
  })

  it('brushes brighter the faster the finger goes and fainter as the tuft thins', () => {
    expect(brush(1, 1)[0].frequency).toBeGreaterThan(brush(0, 1)[0].frequency)
    expect(brush(0.5, 0)[0].peak).toBeLessThan(brush(0.5, 1)[0].peak)
  })
})
