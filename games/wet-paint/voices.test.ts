import { describe, expect, it } from 'vitest'
import { BROWN, GREEN, ORANGE, VIOLET } from './colours'
import { LIMITS, POT_PITCH, beadVoice, catVoice, combVoice, dropVoice, everyVoice, glugVoice, knockVoice, mixPitch, paperVoice, seconds, slideVoice, soapTailVoice, soapVoice, strawVoice, swishVoice, takeVoice } from './voices'

// Nobody has heard these on the machine they were written on, so every voice is held in a range by its numbers.

describe('the voices', () => {
  it('stay in range: pitch, loudness, attack and length', () => {
    for (const voice of everyVoice()) {
      expect(voice.length).toBeGreaterThan(0)
      expect(seconds(voice)).toBeLessThanOrEqual(LIMITS.maxSeconds)
      for (const note of voice) {
        for (const pitch of [note.frequency, note.glideTo ?? note.frequency]) {
          expect(pitch).toBeGreaterThanOrEqual(LIMITS.minFrequency)
          expect(pitch).toBeLessThanOrEqual(LIMITS.maxFrequency)
        }
        expect(note.peak).toBeGreaterThan(0)
        expect(note.peak).toBeLessThanOrEqual(LIMITS.maxPeak)
        expect(note.attack).toBeGreaterThanOrEqual(LIMITS.minAttack)
        expect(note.decay).toBeGreaterThan(0)
      }
    }
  })

  it('hold no note that starts later than its voice: a later sound is asked for later, on the model\'s clock', () => {
    for (const voice of everyVoice()) for (const note of voice) expect(note.delay).toBeUndefined()
  })

  it('give each pot its own note, yellow bright and blue deep, and each mix a note between its parents', () => {
    expect(POT_PITCH[1]).toBeGreaterThan(POT_PITCH[0])
    expect(POT_PITCH[2]).toBeLessThan(POT_PITCH[0])
    expect(mixPitch(ORANGE)).toBeGreaterThan(POT_PITCH[0])
    expect(mixPitch(ORANGE)).toBeLessThan(POT_PITCH[1])
    expect(mixPitch(GREEN)).toBeGreaterThan(POT_PITCH[2])
    expect(mixPitch(GREEN)).toBeLessThan(POT_PITCH[1])
    expect(mixPitch(VIOLET)).toBeGreaterThan(POT_PITCH[2])
    expect(mixPitch(VIOLET)).toBeLessThan(POT_PITCH[0])
    expect(mixPitch(BROWN)).toBeLessThan(POT_PITCH[2])
    const pitches = [...POT_PITCH, mixPitch(ORANGE), mixPitch(GREEN), mixPitch(VIOLET), mixPitch(BROWN)].map((p) => Math.round(p))
    expect(new Set(pitches).size).toBe(pitches.length)
  })

  it('never say the same thing twice running', () => {
    for (const make of [(v: number) => dropVoice(0, v), (v: number) => glugVoice(1, v), catVoice, (v: number) => beadVoice(ORANGE, v), (v: number) => knockVoice(false, v)]) {
      for (let variant = 0; variant < 6; variant++) expect(make(variant)).not.toEqual(make(variant + 1))
    }
  })

  it('sound lower and rounder where the same colour already lies, and higher the faster a pull goes', () => {
    expect(dropVoice(0, 0, 'bloom', 1)[0].frequency).toBeLessThan(dropVoice(0, 0, 'bloom', 0)[0].frequency)
    expect(swishVoice(1, 0)[0].frequency).toBeGreaterThan(swishVoice(0, 0)[0].frequency)
  })

  it('give every state of the water a sound of its own under each action, whichever turn of phrase comes up', () => {
    const STATES = ['plain', 'bloom', 'rings', 'two', 'mix'] as const
    const shape = (notes: readonly unknown[] | null): string => JSON.stringify(notes)
    for (let variant = 0; variant < 3; variant++) {
      for (const make of [
        (state: (typeof STATES)[number]) => dropVoice(1, variant, state, 0.5, 3),
        (state: (typeof STATES)[number]) => combVoice(state, 0.3, 1, variant),
        (state: (typeof STATES)[number]) => strawVoice(state, 0.3, variant),
        (state: (typeof STATES)[number]) => [...soapVoice(state, variant), ...(soapTailVoice(state, variant) ?? [])],
      ]) {
        expect(new Set(STATES.map((state) => shape(make(state)))).size).toBe(STATES.length)
      }
      // And across the actions on one state.
      for (const state of STATES) {
        expect(new Set([shape(dropVoice(1, variant, state, 0.5, 3)), shape(combVoice(state, 0.3, 1, variant)), shape(strawVoice(state, 0.3, variant)), shape(soapVoice(state, variant))]).size).toBe(4)
      }
    }
  })

  it('give each tool its own sound when it is taken up, and each stage of a scene its own', () => {
    expect(new Set((['finger', 'comb', 'straw', 'soap'] as const).map((tool) => JSON.stringify(takeVoice(tool)))).size).toBe(4)
    expect(new Set(([0, 1, 2, 3] as const).map((what) => JSON.stringify(paperVoice(what)))).size).toBe(4)
    expect(new Set(([0, 1, 2] as const).map((what) => JSON.stringify(slideVoice(what)))).size).toBe(3)
  })
})
