import { describe, expect, it } from 'vitest'
import { RATE, VOICES, notesOf, type Part, type SoundName } from './voices'

// Nobody has heard these sounds, so every number is held in a range in
// which a small speaker gives a short, quiet, audible sound.

const names = Object.keys(VOICES) as SoundName[]
const parts = (name: SoundName): readonly Part[] => VOICES[name]

describe('the voices, as numbers', () => {
  it('keeps every pitch where a tablet speaker can play it, bent or not', () => {
    for (const name of names) for (const part of parts(name)) {
      for (const hz of [part.frequency, part.glideTo ?? part.frequency]) {
        expect(hz * RATE.low, name).toBeGreaterThanOrEqual(60)
        expect(hz * RATE.high, name).toBeLessThanOrEqual(8000)
      }
    }
  })

  it('keeps every sound quiet, and no louder together than one clear note', () => {
    for (const name of names) {
      let sum = 0
      for (const part of parts(name)) {
        expect(part.peak, name).toBeGreaterThanOrEqual(0.03)
        expect(part.peak, name).toBeLessThanOrEqual(0.2)
        sum += part.peak
      }
      expect(sum, name).toBeLessThanOrEqual(0.34)
    }
  })

  it('keeps every sound short: a quick attack and under a second in all', () => {
    for (const name of names) for (const part of parts(name)) {
      expect(part.attack, name).toBeGreaterThan(0)
      expect(part.attack, name).toBeLessThanOrEqual(0.2)
      expect(part.attack + part.decay, name).toBeLessThanOrEqual(0.8)
    }
  })

  it('gives every sound between one and three parts', () => {
    for (const name of names) {
      expect(parts(name).length, name).toBeGreaterThanOrEqual(1)
      expect(parts(name).length, name).toBeLessThanOrEqual(3)
    }
  })

  it('makes no two sounds alike', () => {
    const seen = new Map<string, string>()
    for (const name of names) {
      const key = JSON.stringify(parts(name))
      expect(seen.get(key), `${name} is the same as ${seen.get(key)}`).toBeUndefined()
      seen.set(key, name)
    }
  })

  it('tells the things a child lifts apart by pitch: a berry is high, a pebble is low', () => {
    const pitch = (name: SoundName): number => Math.min(...parts(name).map((part) => part.frequency))
    expect(pitch('lift-berry')).toBeGreaterThan(pitch('lift-pebble') * 3)
    expect(pitch('plop-berry')).toBeGreaterThan(pitch('plop-pebble') * 3)
    expect(pitch('lie-berry')).toBeGreaterThan(pitch('lie-pebble') * 3)
  })

  it('bends a sound by its rate, inside the limits', () => {
    const [as] = notesOf([{ name: 'pip', rate: 1 }]), [high] = notesOf([{ name: 'pip', rate: 9 }]), [low] = notesOf([{ name: 'pip', rate: 0 }])
    expect(high.frequency).toBeCloseTo(as.frequency * RATE.high)
    expect(low.frequency).toBeCloseTo(as.frequency * RATE.low)
    expect(notesOf([{ name: 'pip', rate: 1 }, { name: 'clunk', rate: 1 }]).length).toBe(parts('pip').length + parts('clunk').length)
  })
})
