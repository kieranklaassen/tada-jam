import { describe, expect, it } from 'vitest'
import { react } from './reactions'
import type { Hand, Patch } from './surface'

const HANDS: Hand[] = ['finger', 'sponge', 'hose', 'cloth']
// The six things the design sheet's grid has on a patch; the two foams share a row.
const ON: Patch[] = ['c', 's', 'f', 'w', 'd', 'p']
const moment = { speed: 0.5, variant: 1, rise: 0.3 }

/** What a cell sounds and looks like, as a string to compare. */
const print = (hand: Hand, met: Patch): string => {
  const r = react(hand, met, moment)
  return JSON.stringify([r.voices, r.bursts])
}

describe('the object-by-action grid', () => {
  it('answers every touch with a sound', () => {
    for (const hand of HANDS) for (const met of ON) expect(react(hand, met, moment).voices.length).toBeGreaterThan(0)
  })

  it('gives every cell its own sound: no two of the twenty-four sound alike', () => {
    const seen = new Map<string, string>()
    for (const hand of HANDS) for (const met of ON) {
      const key = JSON.stringify(react(hand, met, moment).voices), cell = `${hand} on ${met}`
      expect(seen.get(key), `${cell} sounds as ${seen.get(key)}`).toBeUndefined()
      seen.set(key, cell)
    }
  })

  it('gives every cell a different answer in sound or in what flies', () => {
    const seen = new Map<string, string>()
    for (const hand of HANDS) for (const met of ON) {
      const key = print(hand, met), cell = `${hand} on ${met}`
      expect(seen.get(key), `${cell} answers as ${seen.get(key)}`).toBeUndefined()
      seen.set(key, cell)
    }
  })

  it('a faster rub and a later stroke change the sound', () => {
    expect(JSON.stringify(react('sponge', 's', { ...moment, speed: 1 }).voices)).not.toBe(JSON.stringify(react('sponge', 's', { ...moment, speed: 0 }).voices))
    expect(JSON.stringify(react('cloth', 'w', { ...moment, rise: 1 }).voices)).not.toBe(JSON.stringify(react('cloth', 'w', { ...moment, rise: 0 }).voices))
  })

  it('presses the body under every touch and never throws more than a few things', () => {
    for (const hand of HANDS) for (const met of ON) {
      const r = react(hand, met, moment)
      expect(r.force).toBeGreaterThan(0)
      expect(r.bursts.reduce((n, b) => n + b.count, 0)).toBeLessThanOrEqual(14)
    }
  })
})
