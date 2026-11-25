import { describe, expect, it } from 'vitest'
import { HOLD, Mood, REST } from './mood'
import { SECTIONS, STEMS } from './score'
import { SCORE } from './tune'

describe('the mood', () => {
  it('is silent until the child has touched something', () => {
    const mood = new Mood()
    mood.step(60)
    expect(mood.levels()).toEqual({ ground: 0, song: 0, spark: 0 })
  })

  it('brings the ground and the song with a touch, and the spark with several', () => {
    const mood = new Mood()
    mood.touch()
    expect(mood.levels()).toEqual({ ground: 1, song: 1, spark: 0 })
    mood.touch()
    expect(mood.levels().spark).toBe(1)
  })

  it('thins out when the child stops, the spark first and the ground last', () => {
    const mood = new Mood()
    mood.touch(); mood.touch(); mood.touch()
    mood.step(HOLD.spark)
    expect(mood.levels()).toEqual({ ground: 1, song: 1, spark: 0 })
    mood.step(HOLD.song - HOLD.spark)
    expect(mood.levels()).toEqual({ ground: 1, song: 0, spark: 0 })
    mood.step(HOLD.ground)
    expect(mood.levels()).toEqual({ ground: REST, song: 0, spark: 0 })
    mood.touch()
    expect(mood.levels().song).toBe(1)
  })
})

describe('the score', () => {
  it('keeps every note inside its section, and has the song on its own line', () => {
    for (const stem of STEMS) for (const part of SCORE.stems[stem]) for (const section of SECTIONS) {
      for (const note of part.notes[section]) {
        expect(note.atSec).toBeGreaterThanOrEqual(0)
        expect(note.atSec + note.durSec).toBeLessThan(SCORE.sectionSec + 1)
        expect(note.gain).toBeGreaterThan(0)
        expect(note.gain).toBeLessThanOrEqual(1)
      }
    }
    for (const section of SECTIONS) {
      const song = SCORE.stems.song[0].notes[section]
      song.slice(1).forEach((note, i) => expect(song[i].atSec + song[i].durSec).toBeLessThan(note.atSec + 0.02))
    }
  })

  it('rests before it comes round', () => {
    expect(SCORE.form.at(-1)).toBeNull()
  })
})
