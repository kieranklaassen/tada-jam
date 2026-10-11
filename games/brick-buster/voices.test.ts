import { describe, expect, it } from 'vitest'
import * as v from './voices'
import { LIMITS, seconds, wallNote, type Sound } from './voices'

// Nobody has heard the game on the machine that builds it, so every sound is held to a stated range.

/** Every sound the module exports: a plain one as it is, and one that takes numbers or a flag at each of its ends. */
const SOUNDS: Record<string, Sound> = {}
const WITH: Record<string, unknown[][]> = {
  boing: [[0], [1], [-1]], rollTick: [[0], [1]], railTick: [[0], [1]], roofTok: [[0], [1]], earFlap: [[0], [1]],
  ring: [0, 1, 2, 3, 4, 5].flatMap((col) => [0, 1, 2].map((row) => [col, row])), standUp: [0, 1, 2, 3, 4, 5].flatMap((col) => [0, 1, 2].map((row) => [col, row])),
  tinkle: [[0], [1], [2], [3], [4]], flap: [[0], [1], [2]], rattle: [[0], [1], [2]], jellyBlub: [0, 1, 2].flatMap((count) => [[count, 0, 0], [count, 5, 2]]), chink: [[0, 0], [5, 2]], tock: [[0, 0], [5, 2]], hum: [[0, 0], [5, 2]], boi: [[0], [1], [2]],
  bwub: [[0], [1]], titter: [[0], [1], [2]], freeze: [[0], [1], [2]], maraca: [[0], [1], [2]], snore: [[false], [true]], shakeDry: [[0], [1], [2]],
}
const NOT_SOUNDS = new Set(['LIMITS', 'seconds', 'wallNote', 'softer'])
for (const [name, value] of Object.entries(v)) {
  if (NOT_SOUNDS.has(name)) continue
  if (typeof value === 'function') for (const args of WITH[name] ?? []) SOUNDS[`${name} ${args.join(' ')}`] = (value as (...args: unknown[]) => Sound)(...args)
  else SOUNDS[name] = value as Sound
}

describe('the sounds, as numbers', () => {
  it('holds every sound the module exports', () => {
    for (const [name, value] of Object.entries(v)) if (typeof value === 'function' && !NOT_SOUNDS.has(name)) expect(WITH[name], name).toBeDefined()
    expect(Object.keys(SOUNDS).length).toBeGreaterThan(120)
  })

  it.each(Object.entries(SOUNDS))('%s stays in range', (_, sound) => {
    expect(sound.length).toBeGreaterThan(0)
    expect(seconds(sound)).toBeLessThanOrEqual(LIMITS.maxSeconds)
    for (const tone of sound) {
      for (const frequency of [tone.frequency, tone.glideTo ?? tone.frequency]) {
        expect(frequency).toBeGreaterThanOrEqual(LIMITS.minFreq)
        expect(frequency).toBeLessThanOrEqual(LIMITS.maxFreq)
      }
      expect(tone.peak).toBeGreaterThan(0)
      expect(tone.peak).toBeLessThanOrEqual(LIMITS.maxPeak)
      expect(tone.attack).toBeGreaterThanOrEqual(LIMITS.minAttack)
      expect(tone.decay).toBeGreaterThan(0)
    }
  })

  it('no sound hides a delay: every part starts when the sound is played', () => {
    for (const sound of Object.values(SOUNDS)) for (const tone of sound) expect(tone).not.toHaveProperty('delay')
  })

  it('each column of the wall is the next note up, and each row up is an octave', () => {
    for (let col = 1; col < 6; col++) expect(wallNote(col, 0)).toBeGreaterThan(wallNote(col - 1, 0))
    expect(wallNote(5, 0)).toBeCloseTo(wallNote(0, 1), 5)
    expect(wallNote(2, 2)).toBeCloseTo(wallNote(2, 0) * 4, 5)
  })

  it('a sound made softer keeps its shape and loses only loudness, and a part too quiet to hear is left out', () => {
    for (const sound of [v.doom, v.wetSlap, v.sizzle, v.deepBoom]) {
      expect(v.softer(sound, 1)).toEqual(sound)
      const half = v.softer(sound, 0.5)
      expect(half.length).toBe(sound.length)
      half.forEach((tone, index) => {
        expect(tone.peak).toBeCloseTo(sound[index].peak * 0.5, 6)
        expect({ ...tone, peak: 0 }).toEqual({ ...sound[index], peak: 0 })
      })
      expect(v.softer(sound, 0.01)).toEqual([])
    }
  })

  it('every brick has a note of the wall\'s one scale in its own voice: a jelly, an ice brick, a seed and a sleepy brick, like glass', () => {
    const octaves = (frequency: number, note: number) => Math.log2(frequency / note)
    for (let col = 0; col < 6; col++) {
      for (let row = 0; row < 3; row++) {
        const note = wallNote(col, row)
        for (const [name, sound] of [['glass', v.ring(col, row)], ['jelly', v.jellyBlub(0, col, row)], ['ice', v.chink(col, row)], ['seed', v.tock(col, row)], ['sleepy', v.hum(col, row)]] as const) {
          const tuned = sound.filter((tone) => tone.kind === 'tone' && tone.glideTo === undefined && Math.abs(octaves(tone.frequency, note) - Math.round(octaves(tone.frequency, note))) < 1e-6)
          expect(tuned.length, `${name} at column ${col}, row ${row}`).toBeGreaterThan(0)
          // The part that carries the note is the loudest pitched part of the sound.
          const pitched = sound.filter((tone) => tone.kind === 'tone')
          expect(Math.max(...tuned.map((tone) => tone.peak)), name).toBe(Math.max(...pitched.map((tone) => tone.peak)))
        }
      }
    }
  })
})
