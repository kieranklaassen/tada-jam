import { describe, expect, it } from 'vitest'
import { KINDS } from './plants'
import { VISITORS } from './cast'
import { VASES } from './layout'
import { FIXED, LIMITS, clonk, dropped, eaten, gateLift, humNote, intoBoot, intoVase, landing, later, pickUp, pokeVoice, seconds, setDown, sneeze, sniffed, snip, standing, steps, type Sound } from './voices'

// Nobody has heard the toy on a tablet, so every voice is held inside a stated
// range here: no pitch a small speaker cannot play, nothing loud, nothing with
// a click for an attack, nothing that outlasts the touch it answers.

const every: [string, Sound][] = [
  ...Object.entries(FIXED),
  ...KINDS.flatMap((kind): [string, Sound][] => [
    [`snip ${kind} at the top`, snip(kind, 0)],
    [`snip ${kind} at the earth`, snip(kind, 1)],
    [`landing ${kind}`, landing(kind)],
    [`standing ${kind}`, standing(kind)],
  ]),
  ...[0, 1, 4, 7].map((count): [string, Sound] => [`into the boot with ${count}`, intoBoot(count)]),
  ...[22, 120, 372].map((len): [string, Sound] => [`pick up ${len}`, pickUp(len)]),
  ...VASES.flatMap((vase): [string, Sound][] => [
    [`into the ${vase} when it is empty`, intoVase(vase, 0)],
    [`into the ${vase} when it is full`, intoVase(vase, 7)],
    [`the ${vase} set down`, setDown(vase)],
  ]),
  ...VISITORS.flatMap((who): [string, Sound][] => [
    [`the ${who} poked`, pokeVoice(who)],
    [`the ${who} walking`, steps(who)],
    [`the ${who} lifting its vase at the gate`, gateLift(who)],
    [`the ${who} sneezing`, sneeze(who)],
    ...KINDS.map((kind): [string, Sound] => [`${kind} sniffed by the ${who}`, sniffed(kind, who)]),
  ]),
  ...KINDS.flatMap((kind): [string, Sound][] => [
    [`${kind} let go on a visitor`, dropped(kind)],
    [`${kind} eaten, flower and all`, eaten(kind, true)],
    [`${kind} eaten as a stalk`, eaten(kind, false)],
  ]),
  [`the jar going over`, clonk('jar')],
  [`the tall vase going over`, clonk('vase')],
  ...[0, 1, 2, 6].map((index): [string, Sound] => [`hummed note ${index}`, humNote(index)]),
]

describe('voices', () => {
  it.each(every)('%s stays in range', (_, sound) => {
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
      expect(note.delay ?? 0).toBeGreaterThanOrEqual(0)
    }
    expect(seconds(sound)).toBeLessThanOrEqual(LIMITS.maxSeconds)
  })

  it('gives each plant a snip, a landing and a way of standing of its own', () => {
    for (const make of [(kind: (typeof KINDS)[number]) => snip(kind, 0.5), landing, standing]) {
      const heard = new Set(KINDS.map((kind) => JSON.stringify(make(kind))))
      expect(heard.size).toBe(KINDS.length)
    }
  })

  it('gives each plant a sound of its own when it is sniffed and when it is let go on a visitor, and each vase and each visitor its own', () => {
    expect(new Set(KINDS.map((kind) => JSON.stringify(dropped(kind)))).size).toBe(KINDS.length)
    for (const who of VISITORS) expect(new Set(KINDS.map((kind) => JSON.stringify(sniffed(kind, who)))).size).toBe(KINDS.length)
    expect(new Set(VASES.map((vase) => JSON.stringify(setDown(vase)))).size).toBe(VASES.length)
    // The boot never goes over, so only the jar and the tall vase have a way of coming down.
    expect(clonk('jar')).not.toEqual(clonk('vase'))
    for (const make of [pokeVoice, steps, sneeze]) expect(new Set(VISITORS.map((who) => JSON.stringify(make(who)))).size).toBe(VISITORS.length)
  })

  it('never repeats, in the row of a plant in the grid, a sound that row already has', () => {
    for (const kind of KINDS) {
      const row = [snip(kind, 0.5), landing(kind), standing(kind), sniffed(kind, 'goat'), dropped(kind)].map((sound) => JSON.stringify(sound))
      expect(new Set(row).size).toBe(row.length)
    }
  })

  it('pitches a snip by where the cut is: the nearer the earth, the higher', () => {
    for (const kind of KINDS) {
      const top = snip(kind, 0), earth = snip(kind, 1)
      expect(earth[0].frequency).toBeGreaterThan(top[0].frequency)
    }
  })

  it('moves a sound later without changing it', () => {
    const moved = later(FIXED.tonk, 0.25)
    expect(moved.map((note) => note.delay)).toEqual(FIXED.tonk.map((note) => (note.delay ?? 0) + 0.25))
    expect(seconds(moved)).toBeCloseTo(seconds(FIXED.tonk) + 0.25)
  })
})
