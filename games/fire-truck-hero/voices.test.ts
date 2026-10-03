import { describe, expect, it } from 'vitest'
import { LIMITS, SPLAT_VARIANTS, Variants, creak, honk, hose, lengthOf, plip, splat, spurt, squelch, thud, type VoiceSpec } from './voices'

/** Every voice of the toy, across the whole range of what it is pitched by. */
function everyVoice(): [string, VoiceSpec][] {
  const voices: [string, VoiceSpec][] = [['spurt', spurt()], ['honk', honk()], ['thud', thud()]]
  for (const reach of [0, 1, 4, 8, 13, 20]) voices.push([`hose ${reach}`, hose(reach)])
  for (let variant = 0; variant < SPLAT_VARIANTS; variant++) {
    for (const wet of [0, 0.5, 1]) voices.push([`splat ${wet} ${variant}`, splat(wet, variant)])
    voices.push([`plip ${variant}`, plip(variant)], [`squelch ${variant}`, squelch(variant)], [`creak ${variant}`, creak(variant)])
  }
  return voices
}

describe('every voice of the toy', () => {
  it('keeps each partial inside the stated ranges', () => {
    for (const [name, voice] of everyVoice()) {
      expect(voice.length, name).toBeGreaterThan(0)
      expect(voice.length, name).toBeLessThanOrEqual(LIMITS.partials)
      for (const partial of voice) {
        for (const pitch of [partial.frequency, partial.glideTo ?? partial.frequency]) {
          expect(pitch, name).toBeGreaterThanOrEqual(LIMITS.frequency[0])
          expect(pitch, name).toBeLessThanOrEqual(LIMITS.frequency[1])
        }
        expect(partial.peak, name).toBeGreaterThanOrEqual(LIMITS.peak[0])
        expect(partial.peak, name).toBeLessThanOrEqual(LIMITS.peak[1])
        expect(partial.attack, name).toBeGreaterThanOrEqual(LIMITS.attack[0])
        expect(partial.attack, name).toBeLessThanOrEqual(LIMITS.attack[1])
        expect(partial.decay, name).toBeGreaterThanOrEqual(LIMITS.decay[0])
        expect(partial.decay, name).toBeLessThanOrEqual(LIMITS.decay[1])
        expect(partial.at, name).toBeGreaterThanOrEqual(0)
        if (partial.kind === 'tone') expect(partial.wave, name).toBeDefined()
        else expect(partial.q, name).toBeGreaterThan(0)
      }
    }
  })

  it('is never louder than the loudest, with every partial at its peak at once', () => {
    for (const [name, voice] of everyVoice()) {
      expect(voice.reduce((sum, partial) => sum + partial.peak, 0), name).toBeLessThanOrEqual(LIMITS.loudest)
    }
  })

  it('is over within a second, so the yard goes quiet when the child stops', () => {
    for (const [name, voice] of everyVoice()) expect(lengthOf(voice), name).toBeLessThanOrEqual(LIMITS.longestS)
    expect(LIMITS.longestS).toBeLessThan(1)
  })
})

describe('the hose', () => {
  it('hisses higher the farther the water goes, and gurgles lower', () => {
    const near = hose(1), far = hose(12)
    expect(far[0].frequency).toBeGreaterThan(near[0].frequency * 1.5)
    expect(far[1].frequency).toBeLessThan(near[1].frequency)
    expect(far[1].peak).toBeLessThan(near[1].peak)
  })

  it('lasts longer than the gap between two gulps, so a stream is one unbroken hiss', () => {
    expect(lengthOf(hose(6))).toBeGreaterThan(1 / 3)
  })

  it('is the same for any distance beyond the yard', () => {
    expect(hose(40)).toEqual(hose(13))
    expect(hose(-3)).toEqual(hose(0))
  })

  it('starts each touch with a pop that rises', () => {
    const [pop] = spurt()
    expect(pop.glideTo!).toBeGreaterThan(pop.frequency)
    expect(pop.attack).toBeLessThan(0.01)
  })
})

describe('a landing', () => {
  it('is lower and fuller on wet sand than on dry', () => {
    const dry = splat(0, 0), wet = splat(1, 0)
    expect(wet[0].frequency).toBeLessThan(dry[0].frequency)
    expect(wet[1].frequency).toBeLessThan(dry[1].frequency)
    expect(lengthOf(wet)).toBeGreaterThan(lengthOf(dry))
  })

  it('has variants that all differ in pitch', () => {
    for (const make of [(v: number) => splat(0.3, v), plip, squelch]) {
      const pitches = new Set(Array.from({ length: SPLAT_VARIANTS }, (_, variant) => Math.round(make(variant)[0].frequency)))
      expect(pitches.size).toBe(SPLAT_VARIANTS)
    }
  })

  it('takes any variant number', () => {
    expect(splat(0, 5)).toEqual(splat(0, 1))
    expect(splat(0, -1)).toEqual(splat(0, 3))
    expect(splat(7, 0)).toEqual(splat(1, 0))
  })

  it('sounds different on sand, in a puddle and in mud', () => {
    // A puddle rises, sand and mud fall, and mud is lowest.
    expect(plip(0)[0].glideTo!).toBeGreaterThan(plip(0)[0].frequency)
    expect(splat(0.5, 0)[0].glideTo!).toBeLessThan(splat(0.5, 0)[0].frequency)
    expect(squelch(0)[0].frequency).toBeLessThan(splat(1, 0)[0].frequency)
  })
})

describe('the truck', () => {
  it('honks two notes together, twice', () => {
    const horn = honk()
    expect(horn).toHaveLength(4)
    expect(new Set(horn.map((partial) => partial.at)).size).toBe(2)
    expect(new Set(horn.map((partial) => partial.frequency)).size).toBe(2)
  })

  it('creaks far more quietly than it honks', () => {
    expect(creak(0)[0].peak).toBeLessThan(honk()[0].peak / 2)
  })

  it('lands from its hop with a low thud', () => {
    expect(thud()[0].frequency).toBeLessThan(200)
  })
})

describe('taking turns', () => {
  it('never picks the same variant twice running', () => {
    const variants = new Variants()
    let last = -1
    for (let i = 0; i < 500; i++) {
      const pick = variants.next(SPLAT_VARIANTS)
      expect(pick).not.toBe(last)
      expect(pick).toBeGreaterThanOrEqual(0)
      expect(pick).toBeLessThan(SPLAT_VARIANTS)
      last = pick
    }
  })

  it('uses every variant', () => {
    const variants = new Variants()
    const seen = new Set<number>()
    for (let i = 0; i < 60; i++) seen.add(variants.next(SPLAT_VARIANTS))
    expect(seen.size).toBe(SPLAT_VARIANTS)
  })

  it('makes the same picks for the same play', () => {
    const a = new Variants(7), b = new Variants(7)
    for (let i = 0; i < 20; i++) expect(a.next(4)).toBe(b.next(4))
  })

  it('has nothing to choose with one variant', () => {
    expect(new Variants().next(1)).toBe(0)
  })
})
