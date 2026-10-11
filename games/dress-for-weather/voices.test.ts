import { describe, expect, it } from 'vitest'
import { BUTTONS, GARMENTS, TUG_STEPS, WEARERS, ZIP_TEETH } from './kinds'
import { LANDS, LIMITS, POKES, SETTLES, WATCHES, WORN_TAPS, WRONGS, buttonCreak, buttonOut, buttonPop, clap, collarSnap, flick, frontOpens, paperTap, peg, riffle, sail, secondsOf, sliderPress, snap, stamp, tugSqueak, whup, zipTick, type Sound } from './voices'

// Nobody has heard these sounds, so every number in them is held to a range here.

const all: [string, readonly Sound[]][] = [
  ['riffle', riffle], ['sail', sail], ['sliderPress', sliderPress], ['collarSnap', collarSnap], ['frontOpens', frontOpens], ['buttonCreak', buttonCreak], ['stamp', stamp], ['whup', whup], ['clap', clap], ['paperTap', paperTap],
  ...GARMENTS.flatMap((garment): [string, readonly Sound[]][] => [
    [`flick ${garment}`, flick(garment)], [`peg ${garment}`, peg(garment)], [`lands ${garment}`, LANDS[garment]], [`settles ${garment}`, SETTLES[garment]],
    ...WRONGS[garment].map((sound, i): [string, readonly Sound[]] => [`wrong ${garment} ${i}`, sound]),
    ...WORN_TAPS[garment].map((sound, i): [string, readonly Sound[]] => [`worn tap ${garment} ${i}`, sound]),
  ]),
  ...WEARERS.flatMap((who): [string, readonly Sound[]][] => [[`watches ${who}`, WATCHES[who]], ...POKES[who].map((sound, i): [string, readonly Sound[]] => [`poke ${who} ${i}`, sound])]),
  ...Array.from({ length: 5 }, (_, i): [string, readonly Sound[]] => [`snap ${i}`, snap(i)]),
  ...Array.from({ length: ZIP_TEETH + 1 }, (_, i): [string, readonly Sound[]] => [`zip ${i}`, zipTick(i)]),
  ...Array.from({ length: BUTTONS }, (_, i): [string, readonly Sound[]][] => [[`button in ${i}`, buttonPop(i)], [`button out ${i}`, buttonOut(i)]]).flat(),
  ...Array.from({ length: TUG_STEPS }, (_, i): [string, readonly Sound[]] => [`tug ${i + 1}`, tugSqueak(i + 1)]),
]

describe('the voices', () => {
  it.each(all)('%s is a short sound inside the range of pitch and loudness', (_, sound) => {
    expect(sound.length).toBeGreaterThan(0)
    for (const note of sound) {
      for (const pitch of [note.frequency, note.glideTo ?? note.frequency]) {
        expect(pitch).toBeGreaterThanOrEqual(LIMITS.minFrequency)
        expect(pitch).toBeLessThanOrEqual(LIMITS.maxFrequency)
      }
      expect(note.peak).toBeGreaterThan(0)
      expect(note.peak).toBeLessThanOrEqual(LIMITS.maxPeak)
      expect(note.attack).toBeGreaterThanOrEqual(LIMITS.minAttack)
      expect(note.decay).toBeGreaterThan(0)
      // Sight and sound share the hall's clock: no sound carries a wait of its own.
      expect(note).not.toHaveProperty('delay')
    }
    expect(secondsOf(sound)).toBeLessThanOrEqual(LIMITS.maxSeconds)
  })

  it('gives the zip a tick that climbs with every tooth, and the tabs and the buttons steps that climb', () => {
    const pitch = (sound: readonly Sound[]) => sound[0].frequency
    for (let i = 1; i <= ZIP_TEETH; i++) expect(pitch(zipTick(i))).toBeGreaterThan(pitch(zipTick(i - 1)))
    for (let i = 1; i < 4; i++) expect(pitch(snap(i))).toBeGreaterThan(pitch(snap(i - 1)))
    for (let i = 1; i < BUTTONS; i++) expect(pitch(buttonPop(i))).not.toBe(pitch(buttonPop(i - 1)))
    for (let i = 2; i <= TUG_STEPS; i++) expect(pitch(tugSqueak(i))).not.toBe(pitch(tugSqueak(i - 1)))
  })

  it('gives every garment a sound of its own for each thing it does, and every character a voice of its own', () => {
    const differ = (sounds: readonly (readonly Sound[] | readonly Sound[][])[]) => expect(new Set(sounds.map((sound) => JSON.stringify(sound))).size).toBe(sounds.length)
    differ(GARMENTS.map((garment) => LANDS[garment]))
    differ(GARMENTS.map((garment) => SETTLES[garment]))
    differ(GARMENTS.map((garment) => WRONGS[garment]))
    differ(GARMENTS.map((garment) => WORN_TAPS[garment]))
    differ(GARMENTS.map((garment) => flick(garment)))
    differ(WEARERS.map((who) => POKES[who]))
    differ(WEARERS.map((who) => WATCHES[who]))
    // Where it belongs and where it does not are two sounds for the same garment.
    for (const garment of GARMENTS) expect(JSON.stringify(WRONGS[garment][0])).not.toBe(JSON.stringify(SETTLES[garment]))
  })
})
