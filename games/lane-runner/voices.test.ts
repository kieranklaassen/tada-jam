import { describe, expect, it } from 'vitest'
import { ACTS } from './lap'
import { LOADS } from './lapState'
import { OBSTACLES } from './trail'
import { GAG_NAMES, everyVoice, notesFor, stepNotes } from './voices'
import { planFor } from './handover'

// Nobody may have heard the game before it is shown, so every voice is held
// in range here: pitch, loudness, length, and no delay hidden inside one.

describe('the voices', () => {
  const all = everyVoice()

  it('are many, and every one is in a range a small speaker and a small ear can take', () => {
    expect(all.length).toBeGreaterThan(120)
    for (const { name, notes } of all) {
      let loudest = 0
      for (const note of notes) {
        expect(note.frequency, name).toBeGreaterThanOrEqual(60)
        expect(note.frequency, name).toBeLessThanOrEqual(6000)
        if (note.glideTo !== undefined) {
          expect(note.glideTo, name).toBeGreaterThanOrEqual(40)
          expect(note.glideTo, name).toBeLessThanOrEqual(6000)
        }
        expect(note.peak, name).toBeGreaterThan(0)
        expect(note.peak, name).toBeLessThanOrEqual(0.45)
        expect(note.attack, name).toBeGreaterThan(0)
        expect(note.attack + note.decay, name).toBeLessThanOrEqual(1.2)
        loudest += note.peak
      }
      // All the notes of one voice start together: together they stay under the limiter.
      expect(loudest, name).toBeLessThanOrEqual(1)
    }
  })

  it('hide no delay: every note of every voice starts on the frame of its motion', () => {
    for (const { name, notes } of all) for (const note of notes) expect(note.delay ?? 0, name).toBe(0)
  })

  it('give every cell of the grid a sound of its own', () => {
    const heard = new Map<string, string>()
    for (const gag of GAG_NAMES) {
      const notes = notesFor({ type: 'gag', gag, obstacle: 'stream', lane: 1 })
      expect(notes.length, gag).toBeGreaterThan(0)
      const key = JSON.stringify(notes)
      expect(heard.get(key), `${gag} sounds like ${heard.get(key)}`).toBeUndefined()
      heard.set(key, gag)
    }
    expect(GAG_NAMES.length).toBeGreaterThanOrEqual(40)
  })

  it('announce each obstacle before it is reached with a sound of its own', () => {
    const heard = new Set<string>()
    for (const obstacle of OBSTACLES) {
      const notes = notesFor({ type: 'near', obstacle })
      expect(notes.length, obstacle).toBeGreaterThan(0)
      heard.add(JSON.stringify(notes))
    }
    expect(heard.size).toBe(OBSTACLES.length)
  })

  it('have a sound for every cue of every act that has one, and for every step of every hand-over', () => {
    for (const kind of Object.keys(ACTS) as (keyof typeof ACTS)[]) {
      ACTS[kind].cues.forEach((_, index) => expect(notesFor({ type: 'cue', act: kind, index }).length, `${kind} cue ${index}`).toBeGreaterThan(0))
    }
    const silentOnPurpose = new Set(['come', 'home', 'look'])
    for (const load of LOADS) {
      for (const left of [0, 1, 2, 3, 4]) {
        for (const marks of [{ wet: false, muddy: false, berries: false, ruffles: 0 }, { wet: true, muddy: true, berries: true, ruffles: 2 }]) {
          for (const rode of [false, true]) {
            for (const step of planFor({ load, left, marks, rode, fetched: false }).steps) {
              const notes = stepNotes(step.who, step.step, step.n)
              if (!silentOnPurpose.has(step.step)) expect(notes.length, `${load}: ${step.who} ${step.step}`).toBeGreaterThan(0)
            }
          }
        }
      }
    }
  })
})
