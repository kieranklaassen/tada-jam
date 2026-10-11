import { describe, expect, it } from 'vitest'
import { FACES, OWN_FACE, PART_FACE, POKE_EVERY, buttonHeld, buttoned, hung, landedOwn, landedWrong, lengthOf, lifted, paperTapped, poked, sailsHome, sliderHeld, stamped, takenOff, tugged, umbrella, unzipped, wornTapped, zipTooth, zippedUp, type Answer } from './answers'
import { BUTTONS, GARMENTS, PARTS, TABS, TUG_STEPS, WEARERS, ZIP_TEETH, type SpotPart } from './kinds'

const parts: readonly SpotPart[] = [...PARTS, 'back']
const others = WEARERS.filter((who) => who !== 'child')

const every: [string, Answer][] = [
  ['sailsHome', sailsHome], ['sliderHeld', sliderHeld], ['zippedUp', zippedUp], ['unzipped', unzipped], ['buttonHeld', buttonHeld], ['stamped', stamped], ['paperTapped', paperTapped], ['umbrella opens', umbrella(true)], ['umbrella shuts', umbrella(false)],
  ...GARMENTS.flatMap((garment): [string, Answer][] => [
    [`lifted ${garment}`, lifted(garment)], [`own ${garment}`, landedOwn(garment, others)], [`taken off ${garment}`, takenOff(garment)], [`hung ${garment}`, hung(garment)], [`worn tap ${garment}`, wornTapped(garment)],
    ...parts.map((part): [string, Answer] => [`wrong ${garment} on ${part}`, landedWrong(garment, part, others)]),
  ]),
  ...WEARERS.map((who): [string, Answer] => [`poked ${who}`, poked(who)]),
  ...Array.from({ length: ZIP_TEETH + 1 }, (_, i): [string, Answer] => [`tooth ${i}`, zipTooth(i)]),
  ...Array.from({ length: BUTTONS }, (_, i): [string, Answer][] => [[`button ${i} in`, buttoned(i, true)], [`button ${i} out`, buttoned(i, false)]]).flat(),
  ...Array.from({ length: TUG_STEPS }, (_, i): [string, Answer] => [`tug ${i + 1}`, tugged(i + 1, i + 1 === TUG_STEPS)]),
]

describe('the answers', () => {
  it.each(every)('%s starts on the touch with a sound, runs in order and is short', (_, answer) => {
    expect(answer.length).toBeGreaterThan(0)
    // Answered when the finger lands: the first beat is at 0 and is heard.
    expect(answer[0].at).toBe(0)
    expect(answer[0].notes.length).toBeGreaterThan(0)
    for (let i = 1; i < answer.length; i++) expect(answer[i].at).toBeGreaterThanOrEqual(answer[i - 1].at)
    expect(lengthOf(answer)).toBeLessThan(2)
    for (const beat of answer) {
      // One clock: a beat's notes start at the beat.
      for (const note of beat.notes) expect(note).not.toHaveProperty('delay')
      for (const cue of beat.cues) if ('face' in cue) expect(FACES).toContain(cue.face)
    }
  })

  it('folds each garment by its own number of tabs, one at a time, each with a sound', () => {
    for (const garment of GARMENTS) {
      for (const answer of [landedOwn(garment), landedWrong(garment, 'head')]) {
        const folds = answer.filter((beat) => beat.cues.some((cue) => 'tabs' in cue))
        expect(folds.map((beat) => beat.cues.find((cue) => 'tabs' in cue))).toEqual(Array.from({ length: TABS[garment] }, (_, i) => ({ on: 'garment', tabs: i + 1 })))
        for (const beat of folds) expect(beat.notes.length).toBeGreaterThan(0)
        expect(new Set(folds.map((beat) => beat.at)).size).toBe(TABS[garment])
      }
    }
  })

  it('answers a garment where it belongs and where it does not in two ways, and no two garments alike', () => {
    const told = (answer: Answer) => JSON.stringify(answer)
    for (const garment of GARMENTS) expect(told(landedOwn(garment))).not.toBe(told(landedWrong(garment, 'head')))
    expect(new Set(GARMENTS.map((garment) => told(landedOwn(garment)))).size).toBe(GARMENTS.length)
    expect(new Set(GARMENTS.map((garment) => told(landedWrong(garment, 'head')))).size).toBe(GARMENTS.length)
    expect(new Set(GARMENTS.map((garment) => told(wornTapped(garment)))).size).toBe(GARMENTS.length)
    // The face is the garment's where it belongs, and the part's where it does not.
    expect(new Set(GARMENTS.map((garment) => OWN_FACE[garment])).size).toBe(GARMENTS.length)
    expect(new Set(parts.map((part) => PART_FACE[part])).size).toBe(parts.length)
  })

  it('has every character take a poke, and watch, in its own way and its own time', () => {
    expect(new Set(WEARERS.map((who) => JSON.stringify(poked(who).map((beat) => beat.cues)))).size).toBe(WEARERS.length)
    expect(new Set(WEARERS.map((who) => POKE_EVERY[who])).size).toBe(WEARERS.length)
    const watching = landedOwn('hat', WEARERS).filter((beat) => beat.cues.some((cue) => 'who' in cue && cue.who !== undefined))
    expect(watching.length).toBe(WEARERS.length)
    expect(new Set(watching.map((beat) => beat.at)).size).toBe(WEARERS.length)
    expect(new Set(watching.map((beat) => JSON.stringify(beat.cues.map((cue) => ('kick' in cue ? cue.kick : ''))))).size).toBe(WEARERS.length)
  })

  it('ends the last tug in a stamp a moment after the squeak', () => {
    expect(tugged(1, false).length).toBe(1)
    expect(tugged(TUG_STEPS, true).length).toBe(2)
    expect(tugged(TUG_STEPS, true)[1].at).toBeGreaterThan(0)
  })
})
