import { describe, expect, it } from 'vitest'
import { newProp, type Act, type Anchors } from './acts'
import { BANK_ACTS, bankAct, type Target } from './bankActs2'
import type { BrookAct } from './brookActs'
import { AFTER_LIP, BROOK_ACTS, answersAt, fallAct } from './brookActs3'
import { bareBuild, type Build, type Family } from './build'
import { PLACES } from './layout'
import { POKE_ACTS } from './pokeActs'
import { newStage } from './rig'
import { TRAITS, traitsOf, twistsOf, type Trait, type Twist } from './traits'
import { VOICES } from './voices'

// The two grids of the sheet, cell by cell. Every cell is an act of its own:
// its own name, its own motion and its own sounds, so a child who tries
// each thing on each of the folk is answered differently every time.

const FAMILIES: readonly Exclude<Family, 'hull'>[] = ['mast', 'leaf', 'feather', 'berry', 'cap', 'pebble']
const TARGETS: readonly Target[] = ['gnome', 'frog', 'bird', 'water']
const AT: Anchors = { frog: { x: 150, y: 512 }, bird: { x: 236, y: 228 }, sprite: { x: 1058, y: 470 }, gnome: { x: 630, y: 560 }, boat: { x: 560, y: 510 }, drop: { x: 480, y: 420 }, home: { x: 800, y: 690 }, gain: 1 }

/** What an act does to the stage and to its thing, sampled along its length: its motion, as figures. */
function motion(act: Act): string {
  const out: number[] = []
  for (let i = 1; i <= 12; i++) {
    const stage = newStage(), prop = newProp(), k = i / 13
    act.pose(k, k * act.length, stage, prop, AT)
    const { fx, ...rigs } = stage
    for (const rig of Object.values(rigs)) for (const value of Object.values(rig)) out.push(Math.round((value as number) * 100))
    out.push(fx.length, Math.round(prop.x), Math.round(prop.y), Math.round(prop.rot * 100), Math.round(prop.scale * 100), Math.round(prop.alpha * 100))
  }
  return out.join(',')
}

const REST = motion({ id: 'rest', length: 1, cues: [], who: [], pose: () => {}, leaves: 'arc' })
const sounds = (act: Act): string => act.cues.map(([at, name, rate]) => `${at}:${name}:${rate ?? 1}`).join(' ')

function eachIsItsOwn(acts: readonly Act[]): void {
  expect(new Set(acts.map((act) => act.id)).size).toBe(acts.length)
  expect(new Set(acts.map(motion)).size).toBe(acts.length)
  expect(new Set(acts.map(sounds)).size).toBe(acts.length)
  for (const act of acts) {
    expect(motion(act), act.id).not.toBe(REST)
    expect(act.cues.length, act.id).toBeGreaterThan(0)
    expect(act.length, act.id).toBeGreaterThan(0.3)
    for (const [at, name] of act.cues) {
      expect(at, act.id).toBeGreaterThanOrEqual(0)
      expect(at, act.id).toBeLessThanOrEqual(act.length)
      expect(VOICES[name], `${act.id} ${name}`).toBeDefined()
    }
  }
}

describe('the bank grid', () => {
  it('has an act in every cell: six kinds of thing by the gnome, the frog, the kingfisher and the water', () => {
    for (const family of FAMILIES) for (const target of TARGETS) expect(bankAct(family, target), `${family}:${target}`).not.toBeNull()
    expect(BANK_ACTS.length).toBe(FAMILIES.length * TARGETS.length)
  })

  it('names each cell after its row and its column', () => {
    for (const family of FAMILIES) for (const target of TARGETS) expect(bankAct(family, target)?.id).toBe(`${family}:${target}`)
  })

  it('gives every cell its own motion and its own sounds', () => {
    eachIsItsOwn(BANK_ACTS)
  })

  it('keeps the one it is given to busy, and nobody answers a hull', () => {
    for (const family of FAMILIES) {
      for (const target of ['gnome', 'frog', 'bird'] as const) expect(bankAct(family, target)?.who, `${family}:${target}`).toContain(target)
    }
    for (const target of TARGETS) expect(bankAct('hull', target)).toBeNull()
  })

  it('answers a poke of each of the folk with an act of its own too', () => {
    eachIsItsOwn(POKE_ACTS)
    eachIsItsOwn([...BANK_ACTS, ...POKE_ACTS])
  })
})

describe('the brook grid', () => {
  const NO_TWIST: readonly Twist[] = []

  it('answers every trait at the reeds, the sprite, the stones and the branch', () => {
    for (const place of ['reeds', 'sprite', 'stones', 'branch'] as const) {
      for (const trait of TRAITS) expect(answersAt(place, [trait], NO_TWIST).length, `${place}:${trait}`).toBe(1)
    }
  })

  it('gives every cell its own motion and its own sounds', () => {
    // An act that holds the boat is the first part of the act it is held from: it shares that beginning by design.
    eachIsItsOwn(BROOK_ACTS.filter((act) => act.id !== 'branch:broad-tall'))
    expect(new Set(BROOK_ACTS.map((act) => act.id)).size).toBe(BROOK_ACTS.length)
  })

  it('changes a row for each of the five makings that has a say', () => {
    const id = (acts: BrookAct[]): string => acts.map((act) => act.id).join(' ')
    expect(id(answersAt('reeds', ['nosail'], ['pod']))).toBe('reeds:pod')
    expect(id(answersAt('stones', ['broad'], ['pod']))).toBe('stones:pod')
    expect(id(answersAt('branch', ['broad'], ['stalk'], { broadOnTall: true }))).toBe('branch:broad-tall')
    // The leaf on the short mast and the tall stalk beside it: the leaf swings under, and the stalk meets the branch by itself.
    expect(id(answersAt('branch', ['broad'], ['stalk']))).toBe('branch:broad branch:stalk')
    // Two masts that do not both carry a sail have an answer of their own where the answer is the sails'.
    expect(id(answersAt('sprite', ['twomasts'], [], { bareMast: true }))).toBe('sprite:baremast')
    expect(id(answersAt('stones', ['twomasts'], [], { bareMast: true }))).toBe('stones:baremast')
    expect(id(answersAt('reeds', ['twomasts'], [], { bareMast: true }))).toBe('reeds:twomasts')
    expect(id(answersAt('branch', ['nosail'], ['stalk']))).toContain('branch:stalk')
    expect(id(answersAt('branch', ['broad'], ['feather']))).toContain('branch:feather')
    expect(id(answersAt('sprite', ['broad'], ['feather']))).toContain('sprite:feather')
    // The acorn cap fills at the fall, and a broad leaf on the bendy stem runs like a small one at every place.
    expect(sounds(fallAct(['broad'], ['cap']))).not.toBe(sounds(fallAct(['broad'], NO_TWIST)))
    expect(motion(fallAct(['broad'], ['cap']))).not.toBe(motion(fallAct(['broad'], NO_TWIST)))
    const bendy = { ...bareBuild('bark'), masts: ['stem', null], sails: ['maple', null] } as Build
    const stiff = { ...bareBuild('bark'), masts: ['twig', null], sails: ['maple', null] } as Build
    expect(traitsOf(stiff)).toContain('broad')
    expect(traitsOf(bendy)).not.toContain('broad')
    expect(twistsOf(bendy)).toContain('stem')
  })

  it('takes every boat over the fall its own way, and always over', () => {
    const acts = TRAITS.map((trait: Trait) => fallAct([trait], NO_TWIST))
    expect(new Set(acts.map(motion)).size).toBe(TRAITS.length)
    expect(new Set(acts.map(sounds)).size).toBe(TRAITS.length)
    for (const act of [...acts, fallAct([], NO_TWIST)]) {
      expect(act.cues.length).toBeGreaterThan(0)
      expect(act.holds).toBeUndefined()
      expect(act.moves).toBeLessThan(AFTER_LIP)
    }
  })

  it('takes two bare masts over the fall stern first and tipping, the gnome holding his hat: both answers, not one', () => {
    const bare = { ...bareBuild('bark'), masts: ['twig', 'stem'] } as Build
    expect(traitsOf(bare)).toEqual(expect.arrayContaining(['twomasts', 'nosail']))
    const act = fallAct(traitsOf(bare), twistsOf(bare))
    const names = act.cues.map((cue) => cue[1])
    // The gurgle of going over stern first, and the slide and the splosh of a boat with no sail.
    expect(names).toEqual(expect.arrayContaining(['gurgle', 'slide', 'splosh']))
    // At the lip it is turned about and tipped over its leading end, and the gnome has a hand on his hat.
    const stage = newStage()
    act.pose(1 / act.length, 1, stage, newProp(), AT)
    expect(stage.boat.face).toBeLessThan(0)
    expect(stage.boat.tilt).toBeLessThan(-0.3)
    expect(stage.gnome.armL).toBeGreaterThan(0.5)
    expect(stage.gnome.turn).toBeGreaterThan(0.9)
    // It is neither answer alone.
    const stern = fallAct(['twomasts'], NO_TWIST), nose = fallAct(['nosail'], NO_TWIST)
    expect(new Set([motion(act), motion(stern), motion(nose)]).size).toBe(3)
    expect(new Set([sounds(act), sounds(stern), sounds(nose)]).size).toBe(3)
  })

  it('holds a boat only where a ring from behind frees it, and nowhere is the end of the way', () => {
    for (const act of BROOK_ACTS) if (act.holds) expect(act.frees, act.id).toBeDefined()
    for (const place of PLACES) {
      for (const trait of TRAITS) {
        const held = answersAt(place, [trait], NO_TWIST).filter((act) => act.holds)
        for (const act of held) expect(act.frees?.moves ?? 0, act.id).toBeLessThan(0)
      }
    }
  })

  it('lets a boat with none of the traits drift through every place', () => {
    for (const place of ['reeds', 'sprite', 'stones', 'branch', 'pond'] as const) expect(answersAt(place, [], NO_TWIST)).toEqual([])
  })
})
