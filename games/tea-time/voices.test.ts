import { describe, expect, it } from 'vitest'
import { LIMITS, brush, clothThump, cupRing, glug, hop, land, lengthOf, lidClick, pat, patter, plip, potPress, saucerRattle, squeak, squelch, trickle, type VoiceSpec } from './voices'

// Nobody could listen to these where they were written, so every voice is
// held inside stated ranges here, at the ends and the middle of whatever it
// follows (a level, a strength, a size, a turn).

const levels = [0, 0.15, 0.5, 1, -3, 9]
const turns = [0, 1, 2, 7, 31, 400]

const all: [string, VoiceSpec][] = [
  ['potPress', potPress],
  ['pat', pat],
  ['lidClick', lidClick],
  ['hop', hop],
  ['land', land],
  ['saucerRattle', saucerRattle],
  ['clothThump', clothThump],
  ['brush', brush],
  ...levels.map((level): [string, VoiceSpec] => [`plip at ${level}`, plip(level)]),
  ...levels.flatMap((level) => turns.map((turn): [string, VoiceSpec] => [`trickle at ${level}, turn ${turn}`, trickle(level, (turn % 3) / 2, turn)])),
  ...turns.map((turn): [string, VoiceSpec] => [`glug ${turn}`, glug(turn)]),
  ...turns.map((turn): [string, VoiceSpec] => [`patter ${turn}`, patter(turn)]),
  ...turns.map((turn): [string, VoiceSpec] => [`squeak ${turn}`, squeak(turn)]),
  ...levels.map((level): [string, VoiceSpec] => [`squelch at ${level}`, squelch(level)]),
  ...levels.flatMap((level) => [0.2, 0.53, 0.79, 1, 5].map((scale): [string, VoiceSpec] => [`cupRing at ${level}, size ${scale}`, cupRing(level, scale)])),
]

describe('every voice', () => {
  it.each(all)('%s stays inside the stated ranges', (_name, voice) => {
    expect(voice.length).toBeGreaterThan(0)
    for (const part of voice) {
      for (const pitch of [part.pitch, part.to ?? part.pitch]) {
        expect(pitch).toBeGreaterThanOrEqual(LIMITS.minPitch)
        expect(pitch).toBeLessThanOrEqual(LIMITS.maxPitch)
      }
      expect(part.peak).toBeGreaterThanOrEqual(LIMITS.minPeak)
      expect(part.peak).toBeLessThanOrEqual(LIMITS.maxPeak)
      expect(part.attack).toBeGreaterThanOrEqual(LIMITS.minAttack)
      expect(part.decay).toBeGreaterThan(0)
      expect(part.at).toBeGreaterThanOrEqual(0)
      if (part.kind === 'noise') expect(part.q).toBeGreaterThan(0)
      else expect(part.wave).toBeDefined()
    }
    expect(lengthOf(voice)).toBeLessThanOrEqual(LIMITS.maxSeconds)
  })

  it('answers a touch at once: the first part of each starts with the voice, or within a tenth of a second for the lid', () => {
    for (const [name, voice] of all) expect(Math.min(...voice.map((part) => part.at)), name).toBeLessThanOrEqual(0.1)
  })

  it('never sums to more than twice the loudest single part allowed, at the moment its parts overlap most', () => {
    for (const [name, voice] of all) {
      const together = voice.filter((part) => part.at < 0.02).reduce((sum, part) => sum + part.peak, 0)
      expect(together, name).toBeLessThanOrEqual(LIMITS.maxPeak * 2)
    }
  })
})

describe('what a child can hear in a pour', () => {
  it('climbs in pitch as the cup fills, by more than an octave from empty to the rim', () => {
    let last = 0
    for (let i = 0; i <= 20; i++) {
      // The same turn, so only the level moves the pitch.
      const pitch = trickle(i / 20, 1, 4)[0].pitch
      expect(pitch).toBeGreaterThan(last)
      last = pitch
    }
    expect(trickle(1, 1, 4)[0].pitch / trickle(0, 1, 4)[0].pitch).toBeGreaterThan(2)
  })

  it('tells a drop, half a cup and a brim apart by more than the waver between two grains', () => {
    const waver = Math.max(...turns.map((turn) => trickle(0.5, 1, turn)[0].pitch)) / Math.min(...turns.map((turn) => trickle(0.5, 1, turn)[0].pitch))
    expect(trickle(0.62, 1, 4)[0].pitch / trickle(0.26, 1, 4)[0].pitch).toBeGreaterThan(waver)
    expect(trickle(1, 1, 4)[0].pitch / trickle(0.62, 1, 4)[0].pitch).toBeGreaterThan(waver)
  })

  it('is louder for a stronger stream and never silent', () => {
    expect(trickle(0.5, 1, 3)[0].peak).toBeGreaterThan(trickle(0.5, 0.1, 3)[0].peak)
    expect(trickle(0.5, 0, 3)[0].peak).toBeGreaterThanOrEqual(LIMITS.minPeak)
  })

  it('never plays two neighbouring grains alike', () => {
    for (let turn = 0; turn < 60; turn++) expect(trickle(0.4, 1, turn)[0].pitch).not.toBe(trickle(0.4, 1, turn + 1)[0].pitch)
  })
})

describe('a tapped cup', () => {
  it('rings lower the fuller it is, so a row of cups can be tuned by pouring', () => {
    let last = Infinity
    for (let i = 0; i <= 10; i++) {
      const pitch = cupRing(i / 10, 1)[0].pitch
      expect(pitch).toBeLessThan(last)
      last = pitch
    }
    expect(cupRing(0, 1)[0].pitch / cupRing(1, 1)[0].pitch).toBeGreaterThan(1.3)
  })

  it('rings higher the smaller it is', () => {
    expect(cupRing(0, 0.53)[0].pitch).toBeGreaterThan(cupRing(0, 0.79)[0].pitch)
    expect(cupRing(0, 0.79)[0].pitch).toBeGreaterThan(cupRing(0, 1)[0].pitch)
  })
})

describe('a drop', () => {
  it('sounds different in tea, in a fuller cup and on the cloth', () => {
    expect(plip(1)[0].pitch).toBeGreaterThan(plip(0)[0].pitch * 1.5)
    expect(pat[0].kind).toBe('noise')
    expect(plip(0)[0].kind).toBe('tone')
  })
})
