import { describe, expect, it } from 'vitest'
import { PERSONALITIES } from './clips'
import { LIMITS, varied, voiceLength, VOICES, type VoiceId } from './voices'

const ids = Object.keys(VOICES) as VoiceId[]

describe('a refusal\'s voice', () => {
  it('sounds the moment the refusal lands when the motion draws it: the slap, the boing, the sneeze, the snip', () => {
    // The part of each voice that is the hit itself, by where it stands in the voice.
    const hit = { duck: VOICES.duckRefuse[2], frog: VOICES.frogRefuse[1], hippo: VOICES.hippoRefuse[1], crab: VOICES.crabRefuse[1] }
    for (const kind of ['duck', 'frog', 'hippo', 'crab'] as const) expect(Math.abs(hit[kind].at - PERSONALITIES[kind].cue.hit), kind).toBeLessThanOrEqual(0.03)
  })
})

describe('the voices', () => {
  it('keep every partial inside the stated ranges of pitch, loudness and attack', () => {
    for (const id of ids) for (const p of VOICES[id]) {
      for (const hz of [p.from, p.to]) {
        expect(hz, `${id} pitch`).toBeGreaterThanOrEqual(LIMITS.lowest)
        expect(hz, `${id} pitch`).toBeLessThanOrEqual(LIMITS.highest)
      }
      expect(p.peak, `${id} peak`).toBeGreaterThan(0)
      expect(p.peak, `${id} peak`).toBeLessThanOrEqual(LIMITS.loudest)
      expect(p.attack, `${id} attack`).toBeGreaterThanOrEqual(LIMITS.shortestAttack)
      expect(p.decay, `${id} decay`).toBeGreaterThan(0)
      expect(p.at, `${id} start`).toBeGreaterThanOrEqual(0)
      if (p.wave === 'noise') expect(p.q, `${id} band`).toBeGreaterThan(0)
    }
  })

  it('are short: none outlasts the limit, and the answer to a finger starts at once', () => {
    for (const id of ids) expect(voiceLength(VOICES[id]), id).toBeLessThanOrEqual(LIMITS.longest)
    for (const id of ['squeak', 'pop', 'boop'] as const) expect(Math.min(...VOICES[id].map((p) => p.at)), id).toBe(0)
  })

  it('never sum to more than a full signal at any one start', () => {
    // Partials that start together add up; the master gain and the compressor are not relied on to hide it.
    for (const id of ids) {
      const starts = new Map<number, number>()
      for (const p of VOICES[id]) starts.set(p.at, (starts.get(p.at) ?? 0) + p.peak)
      for (const [at, sum] of starts) expect(sum, `${id} at ${at}`).toBeLessThanOrEqual(1)
    }
  })

  it('give every kind its own catch, refusal, poke, startle, carrying-off, landing and step', () => {
    for (const kindOf of ['Catch', 'Refuse', 'Poke', 'Startle', 'LiftOff', 'Land', 'Step'] as const) {
      const seen = new Set<string>()
      for (const kind of ['duck', 'frog', 'hippo', 'crab'] as const) seen.add(JSON.stringify(VOICES[`${kind}${kindOf}`]))
      expect(seen.size, kindOf).toBe(4)
    }
  })

  it('pitch the kinds apart: the hippo lowest, the frog above it, the duck and the crab high', () => {
    const middle = (id: VoiceId) => VOICES[id].reduce((sum, p) => sum + (p.from + p.to) / 2, 0) / VOICES[id].length
    expect(middle('hippoPoke')).toBeLessThan(middle('frogPoke'))
    expect(middle('frogPoke')).toBeLessThan(middle('duckPoke'))
    expect(middle('duckPoke')).toBeLessThan(middle('crabPoke'))
  })

  it('stay inside the limits when varied, however far', () => {
    for (const id of ids) for (const [pitch, gain] of [[0.5, 1], [2, 1], [1, 3], [0.1, 0.1], [9, 9]]) {
      for (const p of varied(id, pitch, gain)) {
        expect(p.from).toBeGreaterThanOrEqual(LIMITS.lowest)
        expect(p.to).toBeLessThanOrEqual(LIMITS.highest)
        expect(p.peak).toBeLessThanOrEqual(LIMITS.loudest)
      }
    }
    expect(varied('squeak', 0.8)[0].from).toBeCloseTo(VOICES.squeak[0].from * 0.8, 5)
  })
})
