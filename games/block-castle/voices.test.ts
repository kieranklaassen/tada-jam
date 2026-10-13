import { describe, expect, it } from 'vitest'
import type { Note } from './audio'
import { KINDS, MAX_TOP, SHAPE, settle } from './blocks'
import { WHO } from './folk'
import { NOD_CREAK } from './motion'
import { LIMITS, PITCH, SCALE, VARIANT_COUNT, creak, flip, folk, intoBasket, land, lift, pat, rise, shed } from './voices'

/** The highest tier there is: three long ones and three cubes, one on another. */
const TOP_TIER = Math.max(...settle([...Array(3).fill({ kind: 'long', col: 0, row: 0 }), ...Array(3).fill({ kind: 'cube', col: 0, row: 0 })]).map((block) => block.tier))

/** Every voice the toy can make, with a name for a failing test. */
function everyVoice(): [string, Note[]][] {
  const all: [string, Note[]][] = [['flip', flip], ['creak', creak], ['shed slope', shed('slope')], ['shed tip', shed('tip')]]
  for (const kind of KINDS) {
    all.push([`lift ${kind}`, lift(kind)], [`basket ${kind}`, intoBasket(kind)], [`rise ${kind}`, rise(kind)])
    // Every tier a block can land on: the highest pile the frame shows is six blocks, three long ones and three cubes.
    for (let level = 0; level <= TOP_TIER; level++) for (let variant = 0; variant < VARIANT_COUNT; variant++) for (const soft of [false, true]) {
      all.push([`land ${kind} ${level} ${variant} ${soft}`, land(kind, level, level > 0, variant, kind === 'long' && level > 0, soft)])
    }
  }
  for (const surface of ['rug', 'floor', 'wall'] as const) all.push([`pat ${surface}`, pat(surface)])
  for (const who of WHO) all.push([`${who}`, folk(who)], [`${who} startled`, folk(who, true)])
  return all
}

const lasts = (notes: readonly Note[]): number => Math.max(...notes.map((note) => (note.delay ?? 0) + note.attack + note.decay))
const loudest = (notes: readonly Note[]): number => Math.max(...notes.map((note) => note.peak))

describe('every voice', () => {
  it.each(everyVoice())('%s stays in range', (_, notes) => {
    expect(notes.length).toBeGreaterThan(0)
    for (const note of notes) {
      for (const pitch of [note.frequency, note.glideTo ?? note.frequency]) {
        expect(pitch).toBeGreaterThanOrEqual(LIMITS.lowest)
        expect(pitch).toBeLessThanOrEqual(LIMITS.highest)
      }
      expect(note.peak).toBeGreaterThan(0)
      expect(note.peak).toBeLessThanOrEqual(LIMITS.peak)
      expect(note.attack).toBeGreaterThan(0)
      expect(note.decay).toBeGreaterThan(0)
      expect(note.delay ?? 0).toBeGreaterThanOrEqual(0)
    }
    expect(lasts(notes)).toBeLessThanOrEqual(LIMITS.seconds)
  })

  it('has a scale long enough for the highest pile', () => {
    expect(TOP_TIER).toBe(5)
    expect(MAX_TOP).toBe(3 * SHAPE.long.high + 3 * SHAPE.cube.high)
    expect(SCALE.length).toBeGreaterThan(TOP_TIER)
    for (let i = 1; i < SCALE.length; i++) expect(SCALE[i]).toBeGreaterThan(SCALE[i - 1])
  })
})

describe('a landing', () => {
  it('is higher for every level it lands on', () => {
    for (const kind of KINDS) for (let level = 1; level <= TOP_TIER; level++) {
      expect(land(kind, level, true, 0)[0].frequency).toBeGreaterThan(land(kind, level - 1, true, 0)[0].frequency)
    }
  })

  it('is its own for every kind', () => {
    expect(new Set(KINDS.map((kind) => PITCH[kind])).size).toBe(KINDS.length)
    const shape = (notes: readonly Note[]): string => notes.map((note) => `${note.kind}:${(note.delay ?? 0).toFixed(2)}:${note.decay.toFixed(2)}`).join(' ')
    expect(new Set(KINDS.map((kind) => shape(land(kind, 2, true, 0)))).size).toBe(KINDS.length)
  })

  it('never sounds twice alike: three variants of every knock', () => {
    for (const kind of KINDS) expect(new Set(Array.from({ length: VARIANT_COUNT }, (_, variant) => JSON.stringify(land(kind, 0, false, variant)))).size).toBe(VARIANT_COUNT)
  })

  it('is dull on wool and bright on wood', () => {
    const wool = land('cube', 0, false, 0), wood = land('cube', 0, true, 0)
    expect(wool.some((note) => note.frequency < 100)).toBe(true)
    expect(wood.some((note) => note.frequency < 100)).toBe(false)
  })

  it('rings on when a long one has air under it', () => {
    expect(lasts(land('long', 2, true, 0, true))).toBeGreaterThan(lasts(land('long', 2, true, 0, false)) + 0.3)
  })

  it('is quieter for a block that only dropped a level', () => {
    for (const kind of KINDS) expect(loudest(land(kind, 0, false, 0, false, true))).toBeLessThan(loudest(land(kind, 0, false, 0)))
  })

  it('can be played late, for a pile that drops block by block', () => {
    const late = land('cube', 0, false, 0, false, true, 0.2)
    expect(Math.min(...late.map((note) => note.delay ?? 0))).toBeCloseTo(0.2)
  })
})

describe('the other sounds', () => {
  it('lift every kind in its own way', () => {
    expect(new Set(KINDS.map((kind) => JSON.stringify(lift(kind).map((note) => [note.kind, note.wave, note.decay])))).size).toBe(KINDS.length)
  })

  it('answer a touch at once: the first note of a lift, a pat and a poke has no delay', () => {
    for (const kind of KINDS) expect(lift(kind)[0].delay ?? 0).toBe(0)
    for (const surface of ['rug', 'floor', 'wall'] as const) expect(pat(surface)[0].delay ?? 0).toBe(0)
    for (const who of WHO) expect(folk(who)[0].delay ?? 0).toBe(0)
    expect(creak[0].delay ?? 0).toBe(0)
  })

  it('give each of the folk a voice of his own, short when he is only startled', () => {
    expect(new Set(WHO.map((who) => JSON.stringify(folk(who)))).size).toBe(WHO.length)
    for (const who of WHO) {
      expect(lasts(folk(who, true))).toBeLessThan(lasts(folk(who)))
      expect(loudest(folk(who, true))).toBeLessThan(loudest(folk(who)))
    }
  })

  it('tell the three surfaces of the room apart', () => {
    expect(new Set((['rug', 'floor', 'wall'] as const).map((surface) => pat(surface)[0].frequency)).size).toBe(3)
  })
})

describe('a slope set on a block', () => {
  it('has a small creak of its own as its toe nods, and no slap: the slap is the rug\'s', () => {
    const slap = (notes: Note[]): Note[] => notes.filter((note) => note.kind === 'noise' && note.frequency === 1300)
    const creaks = (notes: Note[]): Note[] => notes.filter((note) => note.kind === 'noise' && (note.q ?? 1) > 5 && note.glideTo !== undefined)
    const onRug = land('slope', 0, false, 0), onBlock = land('slope', 1, true, 0)
    expect(slap(onRug)).toHaveLength(1)
    expect(creaks(onRug)).toHaveLength(0)
    expect(slap(onBlock)).toHaveLength(0)
    expect(creaks(onBlock)).toHaveLength(2)
    // It rises and then falls, after the knock, and it is quieter than the knock.
    const [up, back] = creaks(onBlock)
    expect(up.glideTo!).toBeGreaterThan(up.frequency)
    expect(back.glideTo!).toBeLessThan(back.frequency)
    expect(up.delay).toBeCloseTo(NOD_CREAK)
    expect(back.delay!).toBeGreaterThan(up.delay!)
    expect(up.peak).toBeLessThan(onBlock[0].peak)
    // No other kind creaks on a block.
    for (const kind of KINDS) if (kind !== 'slope') expect(creaks(land(kind, 1, true, 0)), kind).toHaveLength(0)
  })
})
