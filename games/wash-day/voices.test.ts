import { describe, expect, it } from 'vitest'
import type { Note } from './audio'
import { KINDS } from './cloth'
import { FRIEND_KINDS } from './layout'
import type { Mood } from './taste'
import * as V from './voices'

// Nobody has heard these on the machine they were written on. This holds every
// note inside what a small speaker can play and a small ear can bear.

const R = [0, 0.25, 0.5, 0.75, 0.999]
const VARIANTS = [0, 1, 2]
const MOODS: Mood[] = ['strut', 'trip', 'plank', 'preen', 'shudder', 'lick', 'sneeze', 'pleased', 'patch', 'squelch', 'bubbly', 'proud']

const plain: [string, (r: number) => Note[]][] = [
  ['squelch', V.squelch], ['zip', V.zip], ['scrub', V.scrub], ['letGo', V.letGo], ['slap', V.slap], ['blop', V.blop], ['splat', V.splat], ['plip', V.plip],
  ['whoosh', V.whoosh], ['noticed', V.noticed], ['foamSqueak', V.foamSqueak], ['drip', V.drip], ['ping', V.ping], ['brrrt', V.brrrt], ['purr', V.purr],
  ['hissed', V.hissed], ['clatter', V.clatter], ['rubber', V.rubber], ['jingle', V.jingle], ['pop', V.pop], ['whee', V.whee], ['plop', V.plop],
  ['pfft', V.pfft], ['bonk', V.bonk], ['slither', V.slither], ['creak', V.creak], ['rattleGate', V.rattleGate], ['latch', V.latch], ['gust', V.gust],
  ['squish', V.squish], ['buzz', V.buzz], ['snort', V.snort], ['rattle', V.rattle], ['sneeze', V.sneeze], ['hiccup', V.hiccup],
]

const all: [string, Note[]][] = [
  ...R.flatMap((r): [string, Note[]][] => [
    ...plain.map(([name, voice]): [string, Note[]] => [name, voice(r)]),
    ['tickDry slow', V.tickDry(0, r)], ['tickDry fast', V.tickDry(1, r)],
    ['squeak muddy', V.squeak(0, r)], ['squeak clean', V.squeak(1, r)],
    ['pip small', V.pip(0, r)], ['pip large', V.pip(1, r)],
    ['pluck left', V.pluck(0, r)], ['pluck right', V.pluck(1, r)],
    ['clack on', V.clack(true, r)], ['clack off', V.clack(false, r)],
    ['yowl low', V.yowl(0, r)], ['yowl high', V.yowl(10, r)],
    ...KINDS.flatMap((kind): [string, Note[]][] => [
      [`ridge ${kind} slow`, V.ridge(kind, 0, r)], [`ridge ${kind} fast`, V.ridge(kind, 1, r)],
      [`wrung ${kind} full`, V.wrung(kind, 1, false, r)], [`wrung ${kind} dry`, V.wrung(kind, 0, true, r)],
      [`pegged ${kind}`, V.pegged(kind, r)], [`donned ${kind}`, V.donned(kind, r)],
    ]),
    ...FRIEND_KINDS.flatMap((kind): [string, Note[]][] => [
      [`step ${kind}`, V.step(kind, r)], [`laugh ${kind}`, V.laugh(kind, r)], [`drippedOn ${kind}`, V.drippedOn(kind, r)],
      [`puzzled ${kind}`, V.puzzled(kind, r)], [`unsure ${kind}`, V.unsure(kind, r)], [`tubVoice ${kind}`, V.tubVoice(kind, r)],
      [`climbIn ${kind}`, V.climbIn(kind, r)], [`arrived ${kind}`, V.arrived(kind, r)],
      ...MOODS.map((what): [string, Note[]] => [`mood ${kind} ${what}`, V.mood(kind, what, r)]),
    ]),
    ...VARIANTS.flatMap((variant): [string, Note[]][] => [
      [`oink ${variant}`, V.oink(variant, r)], [`squawk ${variant}`, V.squawk(variant, r)],
      [`bleat ${variant}`, V.bleat(variant, r)], [`mew ${variant}`, V.mew(variant, r)],
    ]),
  ]),
  ...KINDS.flatMap((kind): [string, Note[]][] => [[`tubbed ${kind}`, V.tubbed(kind)], [`lathered ${kind}`, V.lathered(kind)]]),
  ['fizz', V.fizz()],
  ['flump light', V.flump(0)], ['flump heavy', V.flump(1)],
  ['twang end', V.twang(0)], ['twang middle', V.twang(0.5)], ['twang far end', V.twang(1)],
]

describe('every sound of the yard', () => {
  it('has notes, each in range', () => {
    for (const [name, notes] of all) {
      expect(notes.length, name).toBeGreaterThan(0)
      expect(notes.length, name).toBeLessThanOrEqual(12)
      for (const note of notes) {
        expect(Number.isFinite(note.frequency), name).toBe(true)
        expect(note.frequency, name).toBeGreaterThanOrEqual(55)
        // A tone stays where a tablet's speaker plays it; a band of noise may sit higher, as a hiss.
        expect(note.frequency, name).toBeLessThanOrEqual(note.kind === 'tone' ? 5000 : 8000)
        if (note.glideTo !== undefined) {
          expect(note.glideTo, name).toBeGreaterThanOrEqual(50)
          expect(note.glideTo, name).toBeLessThanOrEqual(note.kind === 'tone' ? 5000 : 8000)
        }
        expect(note.peak, name).toBeGreaterThan(0)
        expect(note.peak, name).toBeLessThanOrEqual(0.25)
        expect(note.attack, name).toBeGreaterThan(0)
        expect(note.decay, name).toBeGreaterThan(0)
        expect(note.delay ?? 0, name).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('is short: nothing one touch sets off outlasts a second and a half', () => {
    for (const [name, notes] of all) expect(V.lengthOf(notes), name).toBeLessThanOrEqual(1.5)
  })

  it('a ridge tick is short enough to sing at the speed of a hand', () => {
    for (const r of R) {
      for (const kind of KINDS) expect(V.lengthOf(V.ridge(kind, 1, r)), kind).toBeLessThan(0.09)
      expect(V.lengthOf(V.tickDry(1, r))).toBeLessThan(0.08)
    }
  })

  it('the pitch of the ridges follows the hand under every cloth and on bare wood', () => {
    for (const kind of KINDS) expect(V.ridge(kind, 1, 0.5)[0].frequency, kind).toBeGreaterThan(V.ridge(kind, 0, 0.5)[0].frequency * 1.3)
    expect(V.tickDry(1, 0.5)[0].frequency).toBeGreaterThan(V.tickDry(0, 0.5)[0].frequency)
  })

  it('the same sound never comes twice alike', () => {
    expect(V.squelch(0.1)).not.toEqual(V.squelch(0.9))
    expect(V.pip(0.5, 0.1)).not.toEqual(V.pip(0.5, 0.9))
    expect(V.pluck(0.2, 0.5)).not.toEqual(V.pluck(0.8, 0.5))
  })

  it('later and quieter are the same voice, moved and turned down', () => {
    const voice = V.blop(0.5)
    expect(V.lengthOf(V.after(voice, 0.3))).toBeCloseTo(V.lengthOf(voice) + 0.3)
    V.quiet(voice, 0.5).forEach((note, i) => expect(note.peak).toBeCloseTo(voice[i].peak / 2))
  })
})

describe('the grid: six garments at six things that happen to them', () => {
  const columns: [string, (kind: (typeof KINDS)[number]) => Note[]][] = [
    ['dropped in the tub', (kind) => V.tubbed(kind)],
    ['rubbed on the board', (kind) => V.ridge(kind, 0.5, 0.5)],
    ['soaped', (kind) => V.lathered(kind)],
    ['wrung', (kind) => V.wrung(kind, 0.5, false, 0.5)],
    ['pegged', (kind) => V.pegged(kind, 0.5)],
    ['put on', (kind) => V.donned(kind, 0.5)],
  ]

  it.each(columns)('%s: no two garments sound alike', (_, voice) => {
    const sounds = KINDS.map((kind) => JSON.stringify(voice(kind)))
    expect(new Set(sounds).size).toBe(KINDS.length)
    // Not the same sound at another pitch either: no two share both their first note's make and its length.
    const shapes = KINDS.map((kind) => { const notes = voice(kind); return `${notes.length}/${notes[0].kind}/${'wave' in notes[0] ? notes[0].wave : ''}/${V.lengthOf(notes).toFixed(2)}` })
    expect(new Set(shapes).size).toBe(KINDS.length)
  })

  it('no garment sounds the same at two things', () => {
    for (const kind of KINDS) expect(new Set(columns.map(([, voice]) => JSON.stringify(voice(kind)))).size, kind).toBe(columns.length)
  })

  it('a scarf squeaks higher as it runs dry, and the dungarees gush', () => {
    expect(V.wrung('scarf', 0, false, 0.5)[0].frequency).toBeGreaterThan(V.wrung('scarf', 1, false, 0.5)[0].frequency * 2)
    expect(V.wrung('dungarees', 0, true, 0.5)).not.toEqual(V.wrung('dungarees', 0, false, 0.5))
  })
})

describe('the friends', () => {
  it('each has three ways of answering a poke, and no two answer alike', () => {
    for (const voice of [V.oink, V.squawk, V.bleat, V.mew]) {
      const ways = VARIANTS.map((variant) => JSON.stringify(voice(variant, 0.5)))
      expect(new Set(ways).size).toBe(3)
    }
    const first = [V.oink, V.squawk, V.bleat, V.mew].map((voice) => JSON.stringify(voice(0, 0.5)))
    expect(new Set(first).size).toBe(4)
  })

  it('each says every thing in its own voice', () => {
    for (const voice of [V.step, V.laugh, V.drippedOn, V.puzzled, V.unsure, V.tubVoice, V.climbIn, V.arrived]) {
      expect(new Set(FRIEND_KINDS.map((kind) => JSON.stringify(voice(kind, 0.5)))).size).toBe(3)
    }
    for (const what of MOODS) expect(new Set(FRIEND_KINDS.map((kind) => JSON.stringify(V.mood(kind, what, 0.5)))).size, what).toBe(3)
  })

  it("a friend's own moods differ from each other", () => {
    const own: Record<string, Mood[]> = { pig: ['strut', 'trip', 'proud', 'patch', 'squelch', 'bubbly'], heron: ['shudder', 'plank', 'preen', 'proud', 'patch', 'squelch', 'bubbly'], goat: ['lick', 'sneeze', 'pleased', 'proud', 'patch', 'squelch', 'bubbly'] }
    for (const kind of FRIEND_KINDS) expect(new Set(own[kind].map((what) => JSON.stringify(V.mood(kind, what, 0.5)))).size, kind).toBe(own[kind].length)
  })
})
