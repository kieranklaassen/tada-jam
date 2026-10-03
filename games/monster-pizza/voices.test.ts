import { describe, expect, it } from 'vitest'
import { CHARACTERS, CUSTOMERS } from './customers'
import { KINDS } from './kinds'
import { LIMITS, babble, boing, home, jiggle, knock, pip, plop, pop, seconds, stepFreq, type VoiceSpec } from './voices'

// The builder's machine cannot hear, so every voice is held to a range here.

function all(): [string, VoiceSpec][] {
  const out: [string, VoiceSpec][] = [['pop', pop], ['home', home], ['boing', boing], ['jiggle', jiggle], ['knock', knock]]
  for (const kind of KINDS) {
    for (let count = 1; count <= 12; count++) out.push([`plop ${kind} ${count}`, plop(kind, count)])
    for (let count = 0; count <= 11; count++) out.push([`pip ${kind} ${count}`, pip(kind, count)])
  }
  for (const who of CUSTOMERS) for (const shape of ['ask', 'glee', 'grumble', 'giggle'] as const) out.push([`babble ${who} ${shape}`, babble(CHARACTERS[who].voice, shape)])
  return out
}

describe('voices', () => {
  it('keeps every part of every voice inside the stated range', () => {
    for (const [name, spec] of all()) {
      expect(spec.length, name).toBeGreaterThan(0)
      for (const part of spec) {
        expect(part.freq, name).toBeGreaterThanOrEqual(LIMITS.minFreq)
        expect(part.freq, name).toBeLessThanOrEqual(LIMITS.maxFreq)
        if (part.glideTo !== undefined) {
          expect(part.glideTo, name).toBeGreaterThanOrEqual(LIMITS.minFreq)
          expect(part.glideTo, name).toBeLessThanOrEqual(LIMITS.maxFreq)
        }
        expect(part.peak, name).toBeGreaterThan(0)
        expect(part.peak, name).toBeLessThanOrEqual(LIMITS.maxPeak)
        expect(part.attack, name).toBeGreaterThanOrEqual(LIMITS.minAttack)
        expect(part.decay, name).toBeGreaterThan(0)
      }
      expect(seconds(spec), name).toBeLessThanOrEqual(LIMITS.maxSeconds)
    }
  })

  it('answers a touch at once: the pop and every landing reach their peak within a hundredth of a second', () => {
    expect(pop[0].attack).toBeLessThanOrEqual(0.01)
    for (const kind of KINDS) expect(plop(kind, 3)[0].attack).toBeLessThanOrEqual(0.01)
  })

  it('climbs one step for every piece, the same steps for every kind', () => {
    for (let count = 2; count <= 12; count++) expect(stepFreq(count)).toBeGreaterThan(stepFreq(count - 1))
    for (const kind of KINDS) {
      if (kind === 'worm') continue
      for (let count = 1; count <= 12; count++) expect(plop(kind, count)[0].freq).toBeCloseTo(stepFreq(count), 5)
    }
    // The worm slides up to the step, so it ends on it.
    expect(plop('worm', 5)[0].glideTo).toBeCloseTo(stepFreq(5), 5)
  })

  it('steps back down when a piece comes off: the pip falls from the old step to the new one', () => {
    for (let left = 1; left <= 11; left++) {
      const [part] = pip('pepper', left)
      expect(part.freq).toBeCloseTo(stepFreq(left + 1), 5)
      expect(part.glideTo).toBeCloseTo(stepFreq(left), 5)
    }
    expect(pip('pepper', 0)[0].glideTo!).toBeLessThan(stepFreq(1))
  })

  it('gives every kind a landing of its own', () => {
    const seen = new Set(KINDS.map((kind) => JSON.stringify(plop(kind, 4).map((p) => [p.wave, p.decay, p.q ?? 0, Math.round((p.glideTo ?? p.freq) / p.freq * 100)]))))
    expect(seen.size).toBe(KINDS.length)
  })

  it('gives every customer a voice of its own pitch', () => {
    const pitches = CUSTOMERS.map((who) => CHARACTERS[who].voice)
    expect(new Set(pitches).size).toBe(CUSTOMERS.length)
    for (const hz of pitches) {
      expect(hz).toBeGreaterThanOrEqual(100)
      expect(hz * 1.7).toBeLessThanOrEqual(LIMITS.maxFreq)
    }
  })
})
