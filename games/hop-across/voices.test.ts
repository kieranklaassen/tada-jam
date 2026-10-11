import { describe, expect, it } from 'vitest'
import type { Note } from './audio'
import type { BoardEvent, Landing, SpotReason } from './board'
import { HOPS, RIGHT, visitAt } from './careful'
import { LADDER } from './config'
import { hop } from './play'
import { below, makeRng } from './rng'
import {
  BLIP, CRUNCHES, DUST_OFF, EARS_UP, HEAP, LAUGH, LEAF_DOWN, LEAF_UP, NAPKIN, NOSE, OVER, PAT, PURR, QUACK, QUACK_CROSS, SHAKE, SHOVE, SHUNT, SLIDE_ON, SNORE, TRAIN, WAKE, YAWN,
  HAMPER, HO_HO, SNORT, bellNotes, bystanderNotes, duckNotes, edgeNotes, flattenNotes, glugNotes, knockNotes, landingNotes, peelNotes, rollNotes, scoopNotes, sliceNotes, slideOffNotes, spitNotes, splashNotes, spotNotes, squeakNotes, squealNotes, stuckNotes, turtleNotes, voiceFor,
} from './voices'

const LANDINGS: Landing[] = ['bank', 'grass', 'road', 'cloth', 'rails', 'log', 'bed', 'roof', 'shell']
const SPOTS: SpotReason[] = ['self', 'rim', 'seat', 'burrow', 'wait', 'dither']
const FLATTENERS = ['car', 'lorry', 'train'] as const
const ROLLERS = ['car', 'lorry', 'log'] as const
const WHO = [0, 1, 2, 3]

/** Nobody has heard these, so every number is held where a sound is neither silent, piercing nor long. */
function inRange(notes: readonly Note[], label: string): void {
  expect(notes.length, label).toBeGreaterThan(0)
  for (const note of notes) {
    expect(note.frequency, label).toBeGreaterThanOrEqual(40)
    expect(note.frequency, label).toBeLessThanOrEqual(5000)
    if (note.glideTo !== undefined) {
      expect(note.glideTo, label).toBeGreaterThanOrEqual(40)
      expect(note.glideTo, label).toBeLessThanOrEqual(5000)
    }
    expect(note.peak, label).toBeGreaterThanOrEqual(0.02)
    expect(note.peak, label).toBeLessThanOrEqual(0.32)
    expect(note.attack, label).toBeGreaterThan(0)
    expect(note.attack, label).toBeLessThanOrEqual(0.15)
    expect(note.decay, label).toBeGreaterThan(0)
    expect(note.decay, label).toBeLessThanOrEqual(0.6)
    expect(note.delay ?? 0, label).toBeGreaterThanOrEqual(0)
    expect(note.delay ?? 0, label).toBeLessThanOrEqual(1.2)
  }
}
const shape = (notes: readonly Note[]): string => JSON.stringify(notes)

const SCENE_SOUNDS: Record<string, readonly Note[]> = { QUACK, QUACK_CROSS, PAT, SHAKE, EARS_UP, NAPKIN, LAUGH, DUST_OFF, CRUNCHES, LEAF_UP, HEAP, LEAF_DOWN, SLIDE_ON }
const WORLD_SOUNDS: Record<string, readonly Note[]> = { SHUNT, OVER, WAKE, SNORE, TRAIN, SHOVE, YAWN, NOSE, BLIP, PURR }

describe('the game\'s voices', () => {
  it('holds every number of every sound in range', () => {
    for (const who of WHO) {
      for (const landing of LANDINGS) inRange(landingNotes(landing, who), `landing on ${landing}, pawn ${who}`)
      for (const why of SPOTS) inRange(spotNotes(why, who), `spot ${why}, pawn ${who}`)
      for (const kind of FLATTENERS) inRange(flattenNotes(kind, who), `flattened by a ${kind}, pawn ${who}`)
      for (const sleepers of [false, true]) inRange(peelNotes(who, sleepers), 'peel')
      inRange(stuckNotes(who), 'stuck')
      inRange(splashNotes(who), 'splash')
      inRange(glugNotes(who), 'glug')
      inRange(edgeNotes(who), 'edge')
      inRange(spitNotes(who), 'spit')
      inRange(slideOffNotes(who), 'slide off')
      inRange(knockNotes(who), 'knock')
      inRange(scoopNotes(who), 'scoop')
    }
    for (const who of [1, 2, 3]) inRange(squeakNotes(who), `squeak ${who}`)
    for (const kind of ROLLERS) inRange(rollNotes(kind), `roll ${kind}`)
    for (const count of [0, 1, 2]) for (const under of [false, true]) inRange(turtleNotes(count, under), `turtle ${count}`)
    for (const nth of [1, 2, 3]) inRange(bellNotes(nth), `bell ${nth}`)
    for (const nth of [0, 1, 2, 3, 4]) inRange(sliceNotes(nth), `slice ${nth}`)
    for (const [name, notes] of Object.entries({ ...SCENE_SOUNDS, ...WORLD_SOUNDS })) inRange(notes, name)
  })

  it('gives every surface its own landing, every mover its own step and every flattener its own squash', () => {
    expect(new Set(LANDINGS.filter((l) => l !== 'bank').map((landing) => shape(landingNotes(landing, 0)))).size).toBe(LANDINGS.length - 1)
    expect(new Set(SPOTS.map((why) => shape(spotNotes(why, 0)))).size).toBe(SPOTS.length)
    expect(new Set(ROLLERS.map((kind) => shape(rollNotes(kind)))).size).toBe(3)
    expect(new Set(FLATTENERS.map((kind) => shape(flattenNotes(kind, 0)))).size).toBe(3)
    expect(new Set([0, 1, 2].map((count) => shape(turtleNotes(count, false)))).size).toBe(3)
    expect(shape(splashNotes(0))).not.toBe(shape(glugNotes(0)))
    expect(shape(splashNotes(0))).not.toBe(shape(edgeNotes(0)))
    // A bell rung by the next one down the line rings higher, and a peel off the sleepers is a twang of its own.
    expect(bellNotes(2)[0].frequency).toBeGreaterThan(bellNotes(1)[0].frequency)
    expect(shape(peelNotes(0, true))).not.toBe(shape(peelNotes(0, false)))
    expect(new Set(Object.values({ ...SCENE_SOUNDS, ...WORLD_SOUNDS }).map(shape)).size).toBe(Object.keys(SCENE_SOUNDS).length + Object.keys(WORLD_SOUNDS).length)
  })

  it('rings the bell a note higher for each one down the line that lands on it', () => {
    const ring = (who: number): BoardEvent => ({ type: 'bell', who, at: { c: 1, r: 2 }, col: 2, nth: who + 1 })
    const pitches = WHO.map((who) => voiceFor([ring(who)])[0].frequency)
    for (let who = 1; who < 4; who++) expect(pitches[who]).toBeGreaterThan(pitches[who - 1])
  })

  it('has a small one duck with a squeak of its own under a leapfrog, and her landing come later than a hop\'s', () => {
    for (const who of [1, 2, 3]) {
      inRange(duckNotes(who), `duck ${who}`)
      const leap: BoardEvent = { type: 'hop', who, from: { c: 1, r: 2 }, to: { c: 2, r: 2 }, landing: 'grass', leap: true }
      const notes = voiceFor([leap])
      expect(shape(notes.slice(0, duckNotes(who).length))).toBe(shape(duckNotes(who)))
      expect(shape(notes)).not.toBe(shape(voiceFor([{ ...leap, leap: false }])))
    }
    expect(new Set([1, 2, 3].map((who) => shape(duckNotes(who)))).size).toBe(3)
    const hers = (leap: boolean): BoardEvent => ({ type: 'hop', who: 0, from: { c: 2, r: 2 }, to: { c: 1, r: 2 }, landing: 'grass', leap })
    expect(voiceFor([hers(true)])[0].delay ?? 0).toBeGreaterThan(voiceFor([hers(false)])[0].delay ?? 0)
  })

  it('gives every bystander a voice of its own', () => {
    const all = [
      bystanderNotes({ who: 'duck' }), bystanderNotes({ who: 'hamper', c: 8 }), bystanderNotes({ who: 'old' }), bystanderNotes({ who: 'sleeper' }),
      ...(['teddy', 'robot', 'giraffe', 'doll'] as const).map((what) => bystanderNotes({ who: 'onlooker', c: 3, what })),
    ]
    all.forEach((notes, n) => inRange(notes, `bystander ${n}`))
    expect(new Set(all.map(shape)).size).toBe(8)
    expect(shape(bystanderNotes({ who: 'hamper', c: 8 }))).toBe(shape(HAMPER))
    expect(shape(bystanderNotes({ who: 'old' }))).toBe(shape(HO_HO))
    expect(shape(bystanderNotes({ who: 'sleeper' }))).toBe(shape(SNORT))
  })

  it('gives each of the family its own pitch, its own squeak and its own peel', () => {
    expect(new Set(WHO.map((who) => shape(landingNotes('road', who)))).size).toBe(4)
    expect(new Set(WHO.map((who) => shape(peelNotes(who)))).size).toBe(4)
    expect(new Set([1, 2, 3].map((who) => shape(squeakNotes(who)))).size).toBe(3)
    expect(squeakNotes(0)).toEqual([])
    expect(spitNotes(1)[1].frequency).toBeGreaterThan(spitNotes(0)[1].frequency)
  })

  it('answers every hop of a long walk on every position with a voice that is in range, starts at once and is over within three seconds', () => {
    const seen = new Set<BoardEvent['type']>()
    for (const position of LADDER) {
      const rng = makeRng(3)
      let saved = visitAt(position, 2)
      for (let n = 0; n < 260; n++) {
        const turn = hop(saved, below(rng, 3) === 0 ? RIGHT : HOPS[below(rng, HOPS.length)])
        saved = turn.saved
        for (const event of turn.events) seen.add(event.type)
        const notes = voiceFor(turn.events, { sleepers: [n % 2 === 0, false, n % 3 === 0, false] })
        expect(notes.length).toBeGreaterThan(0)
        expect(notes.length).toBeLessThanOrEqual(64)
        // Something sounds within a hop's length of the finger landing.
        expect(Math.min(...notes.map((note) => note.delay ?? 0))).toBeLessThanOrEqual(0.2)
        for (const note of notes) {
          expect((note.delay ?? 0) + note.attack + note.decay).toBeLessThan(3)
          expect(note.peak).toBeLessThanOrEqual(0.32)
        }
      }
    }
    // The walks met every kind of event, so every branch of the voice was played.
    const every: BoardEvent['type'][] = ['hop', 'spot', 'stuck', 'spit', 'roll', 'turtle', 'shunt', 'over', 'carry', 'scoop', 'slideOff', 'knock', 'flatten', 'peel', 'bell', 'wake', 'snore', 'train', 'nose', 'blip']
    for (const type of every) expect(seen, type).toContain(type)
  })

  it('squeals for a pawn that comes down on a lorry\'s cab, in its own pitch, and not for one that lands on the bed', () => {
    for (const who of WHO) inRange(squealNotes(who), `squeal ${who}`)
    expect(new Set(WHO.map((who) => squealNotes(who)[0].frequency)).size).toBe(WHO.length)
    const hopOn = (cab: boolean): BoardEvent => ({ type: 'hop', who: 1, from: { c: 0, r: 1 }, to: { c: 1, r: 0 }, landing: 'bed', mover: { c: 1, r: 1, index: 0 }, ...(cab ? { cab: true } : {}) })
    const squeal = squealNotes(1)[0]
    const has = (notes: readonly Note[]) => notes.some((note) => note.frequency === squeal.frequency && note.glideTo === squeal.glideTo)
    expect(has(voiceFor([hopOn(true)]))).toBe(true)
    expect(has(voiceFor([hopOn(false)]))).toBe(false)
  })

  it('squeals for a pawn that slides back off the cab of a lorry whose bed is taken, after the tonk of the lorry', () => {
    const off = (who: number): BoardEvent => ({ type: 'spot', who, at: { c: 0, r: 1 }, why: 'cab', off: { c: 1, r: 1, index: 0 } })
    for (const who of WHO) {
      const notes = voiceFor([off(who)])
      inRange(notes, `off the cab ${who}`)
      const squeal = squealNotes(who)[0], tonk = landingNotes('bed', who)[0]
      expect(notes.some((note) => note.frequency === squeal.frequency && note.glideTo === squeal.glideTo)).toBe(true)
      expect(notes.some((note) => note.frequency === tonk.frequency && note.decay === tonk.decay)).toBe(true)
    }
  })

  it('has each small one squeak as itself when it hops on the spot, as it does in a hop, and the rabbit not', () => {
    const spot = (who: number, why: 'self' | 'wait' | 'dither'): BoardEvent => ({ type: 'spot', who, at: { c: 0, r: 2 }, why })
    const squeaks = (who: number, notes: readonly Note[]) => { const own = squeakNotes(who)[0]; return notes.some((note) => note.frequency === own.frequency && note.glideTo === own.glideTo && note.decay === own.decay) }
    for (const who of [1, 2, 3]) {
      expect(squeakNotes(who).length).toBeGreaterThan(0)
      expect(squeaks(who, voiceFor([spot(who, 'wait')]))).toBe(true)
      // The thud of the hop on the spot is still there, after the squeak.
      expect(voiceFor([spot(who, 'wait')]).length).toBe(squeakNotes(who).length + spotNotes('wait', who).length)
      // At the water's edge its peep is its squeak.
      expect(voiceFor([spot(who, 'dither')]).length).toBe(spotNotes('dither', who).length)
    }
    expect(voiceFor([spot(0, 'self')]).length).toBe(spotNotes('self', 0).length)
    expect(new Set([1, 2, 3].map((who) => shape(voiceFor([spot(who, 'wait')])))).size).toBe(3)
  })

  it('gives a small one under a lorry the long rumbling squelch too, higher than the rabbit\'s, and only its tiny squeak under a car', () => {
    const longest = (notes: readonly Note[]) => Math.max(...notes.map((note) => note.decay))
    const lowest = (notes: readonly Note[]) => Math.min(...notes.map((note) => note.frequency))
    for (const who of [1, 2, 3]) {
      expect(longest(flattenNotes('lorry', who))).toBeGreaterThanOrEqual(0.3)
      expect(longest(flattenNotes('car', who))).toBeLessThan(0.12)
      expect(lowest(flattenNotes('lorry', who))).toBeGreaterThan(lowest(flattenNotes('lorry', 0)))
      expect(lowest(flattenNotes('lorry', who))).toBeLessThan(400)
    }
    expect(longest(flattenNotes('lorry', 0))).toBeGreaterThanOrEqual(0.3)
  })

  it('plays a lane\'s step once however many movers roll', () => {
    const { events } = hop(visitAt('cars', 1), { dc: 0, dr: 0 })
    const rolls = events.filter((event) => event.type === 'roll' && event.kind === 'car').length
    expect(rolls).toBeGreaterThan(3)
    const one = rollNotes('car')[0]
    expect(voiceFor(events).filter((note) => note.kind === one.kind && note.frequency === one.frequency && note.decay === one.decay)).toHaveLength(1)
  })
})
