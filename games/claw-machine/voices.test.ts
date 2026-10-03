import { describe, expect, it } from 'vitest'
import type { ToyEvent } from './toybox'
import { RANGE, TRAY_NOTES, voiceOf } from './voices'

const EVERY: ToyEvent[] = [
  { type: 'chirp', distance: 0 }, { type: 'chirp', distance: 60 }, { type: 'tick' },
  { type: 'buffer', speed: 6 }, { type: 'buffer', speed: 70 }, { type: 'clack' },
  { type: 'pop', heavy: 1 }, { type: 'pop', heavy: 2 }, { type: 'bite' },
  ...TRAY_NOTES.map((_, column): ToyEvent => ({ type: 'bonk', column })),
  { type: 'ratchet', progress: 0, heavy: 0 }, { type: 'ratchet', progress: 1, heavy: 2 }, { type: 'let-go' },
  { type: 'click', heavy: 1, level: 0 }, { type: 'click', heavy: 2, level: 2 }, { type: 'boing' },
]

describe('the voices', () => {
  it('keeps every part of every voice inside the stated ranges', () => {
    for (const event of EVERY) {
      const parts = voiceOf(event)
      expect(parts.length).toBeGreaterThan(0)
      for (const part of parts) {
        for (const hz of [part.freq, part.to ?? part.freq]) {
          expect(hz).toBeGreaterThanOrEqual(RANGE.lowHz)
          expect(hz).toBeLessThanOrEqual(RANGE.highHz)
        }
        expect(part.peak).toBeGreaterThan(0)
        expect(part.peak).toBeLessThanOrEqual(RANGE.mostPeak)
        expect(part.attack).toBeGreaterThanOrEqual(RANGE.leastAttack)
        expect((part.delay ?? 0) + part.attack + part.decay).toBeLessThanOrEqual(RANGE.longest)
      }
    }
  })

  it('rings a higher note for each column of the tray', () => {
    const notes = TRAY_NOTES.map((_, column) => voiceOf({ type: 'bonk', column })[0].freq)
    for (let i = 1; i < notes.length; i++) expect(notes[i]).toBeGreaterThan(notes[i - 1])
  })

  it('pitches by weight and by height: a big toy lower, the hoist higher as it climbs', () => {
    expect(voiceOf({ type: 'pop', heavy: 2 })[0].freq).toBeLessThan(voiceOf({ type: 'pop', heavy: 1 })[0].freq)
    expect(voiceOf({ type: 'click', heavy: 2, level: 0 })[1].freq).toBeLessThan(voiceOf({ type: 'click', heavy: 1, level: 0 })[1].freq)
    expect(voiceOf({ type: 'ratchet', progress: 1, heavy: 1 })[0].freq).toBeGreaterThan(voiceOf({ type: 'ratchet', progress: 0, heavy: 1 })[0].freq)
    expect(voiceOf({ type: 'click', heavy: 1, level: 2 })[0].freq).toBeGreaterThan(voiceOf({ type: 'click', heavy: 1, level: 0 })[0].freq)
  })

  it('never lets two different happenings share a voice', () => {
    const seen = new Map<string, string>()
    for (const event of EVERY) {
      const voice = JSON.stringify(voiceOf(event)), what = JSON.stringify(event)
      expect(seen.get(voice) ?? what).toBe(what)
      seen.set(voice, what)
    }
  })
})
