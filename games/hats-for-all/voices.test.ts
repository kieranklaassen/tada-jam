import { describe, expect, it } from 'vitest'
import { CREATURE_KINDS, HAT_KINDS } from './kinds'
import { RANGE, babble, bap, creak, fwump, hoot, pip, plop, pok, scuttle, squeak, voiceLength, type Mood, type Partial } from './voices'

const MOODS: Mood[] = ['glad', 'grump', 'ask', 'plain']
const COUNTS = [0, 1, 2, 3, 4, 5, 11]

/** Every voice the game can make, by name. */
function everyVoice(): [string, Partial[]][] {
  const all: [string, Partial[]][] = []
  for (const count of COUNTS) {
    all.push([`creak ${count}`, creak(count)], [`squeak ${count}`, squeak(count)], [`scuttle ${count}`, scuttle(count)], [`hoot ${count}`, hoot(count)])
    for (const hat of HAT_KINDS) for (const [name, voice] of [['pok', pok], ['pip', pip], ['bap', bap], ['fwump', fwump], ['plop', plop]] as const) all.push([`${name} ${hat} ${count}`, voice(hat, count)])
    for (const creature of CREATURE_KINDS) for (const mood of MOODS) all.push([`babble ${creature} ${mood} ${count}`, babble(creature, mood, count)])
  }
  return all
}

/** The loudest the partials of a voice can add up to at one moment, taking each at its peak for as long as it sounds. */
function loudestSum(partials: readonly Partial[]): number {
  let loudest = 0
  for (const one of partials) {
    const moment = one.at + one.attack
    loudest = Math.max(loudest, partials.filter((p) => p.at <= moment && moment <= p.at + p.attack + p.decay).reduce((sum, p) => sum + p.peak, 0))
  }
  return loudest
}

describe('every voice', () => {
  it('stays inside the stated ranges', () => {
    for (const [name, partials] of everyVoice()) {
      expect(partials.length, name).toBeGreaterThan(0)
      for (const partial of partials) {
        for (const hz of [partial.frequency, partial.glideTo ?? partial.frequency]) {
          expect(hz, name).toBeGreaterThanOrEqual(RANGE.frequency[0])
          expect(hz, name).toBeLessThanOrEqual(RANGE.frequency[1])
        }
        expect(partial.peak, name).toBeGreaterThan(0)
        expect(partial.peak, name).toBeLessThanOrEqual(RANGE.peak)
        expect(partial.attack, name).toBeGreaterThanOrEqual(RANGE.attack[0])
        expect(partial.attack, name).toBeLessThanOrEqual(RANGE.attack[1])
        expect(partial.decay, name).toBeGreaterThan(0)
        expect(partial.at, name).toBeGreaterThanOrEqual(0)
      }
      expect(loudestSum(partials), name).toBeLessThanOrEqual(RANGE.sum)
      expect(voiceLength(partials), name).toBeLessThanOrEqual(RANGE.length)
    }
  })

  it('differs from the one before it', () => {
    expect(pok('cone', 0)[0].frequency).not.toBe(pok('cone', 1)[0].frequency)
    expect(babble('bop', 'glad', 0)[0].frequency).not.toBe(babble('bop', 'glad', 1)[0].frequency)
  })
})

describe('the hats', () => {
  it('each sound their own size, the small dome highest and the tall cone lowest', () => {
    for (const voice of [pok, pip, bap, fwump, plop]) {
      const [cone, dome, brim] = HAT_KINDS.map((hat) => voice(hat, 0)[0].frequency)
      expect(cone).toBeLessThan(brim)
      expect(brim).toBeLessThan(dome)
    }
  })

  it('sound different going out, coming off, landing and going home', () => {
    const first = [pok, pip, bap, fwump, plop].map((voice) => `${voice('brim', 0)[0].kind} ${voice('brim', 0)[0].frequency}`)
    expect(new Set(first).size).toBe(5)
  })
})

describe('the creatures', () => {
  it('each babble in a pitch and a rhythm of their own', () => {
    const pitches = CREATURE_KINDS.map((creature) => babble(creature, 'plain', 0)[0].frequency)
    const rhythms = CREATURE_KINDS.map((creature) => `${babble(creature, 'plain', 0).length} ${babble(creature, 'plain', 0)[0].decay}`)
    expect(new Set(pitches).size).toBe(CREATURE_KINDS.length)
    expect(new Set(rhythms).size).toBe(CREATURE_KINDS.length)
    // No two voices sit within a fifth of a tone of each other.
    const sorted = [...pitches].sort((a, b) => a - b)
    for (let i = 1; i < sorted.length; i++) expect(sorted[i] / sorted[i - 1]).toBeGreaterThan(1.3)
  })

  it('end a question going up and a grump going down', () => {
    for (const creature of CREATURE_KINDS) {
      const ask = babble(creature, 'ask', 0).at(-1)!, grump = babble(creature, 'grump', 0).at(-1)!
      expect(ask.glideTo!).toBeGreaterThan(ask.frequency)
      expect(grump.glideTo!).toBeLessThan(grump.frequency)
    }
  })
})
