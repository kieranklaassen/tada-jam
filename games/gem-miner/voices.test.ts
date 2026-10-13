import { describe, expect, it } from 'vitest'
import { everyEvent } from './fixtures'
import type { EventType } from './game'
import { BLOCKS } from './layout'
import { GLASS, lengthOf, notesFor, notesOf, pitchOf } from './voices'

// Nobody has heard these sounds yet, so the numbers are held in range here.

/** Every type of event there is: a type that is added to the game and left out here does not compile. */
const TYPES: Record<EventType, true> = {
  knock: true, chip: true, break: true, clang: true, step: true, print: true, poke: true, take: true, put: true,
  squelch: true, pop: true, split: true, boom: true, jet: true, whistle: true, gong: true, bloop: true, plip: true, fff: true, ropehiss: true, worm: true, twang: true, creak: true, strain: true, thud: true, plap: true, charm: true, hang: true, whoomph: true, bump: true, gush: true, lap: true, clunk: true, pat: true,
  sit: true, ding: true, teeth: true, burp: true, clink: true, flop: true, trickle: true, soak: true, grumble: true, clack: true, slurp: true, spray: true, wash: true, unroll: true, shoot: true, hm: true,
  ring: true, scoop: true, tip: true, zip: true, bip: true, flap: true, squeal: true, roll: true, rumble: true, glug: true, gemring: true, ping: true, chime: true, prise: true, tik: true, tock: true, plink: true, leave: true, show: true,
}

describe('the voices', () => {
  it('gives every event a sound, and every note of it a pitch, a peak and a length that can be heard and does not hurt', () => {
    const events = everyEvent()
    expect([...new Set(events.map((event) => event.type))].sort()).toEqual(Object.keys(TYPES).sort())
    for (const event of events) {
      const notes = notesOf(event)
      expect(notes.length, event.type).toBeGreaterThan(0)
      expect(notes.length, event.type).toBeLessThanOrEqual(8)
      for (const note of notes) {
        expect(note.frequency, event.type).toBeGreaterThanOrEqual(40)
        expect(note.frequency, event.type).toBeLessThanOrEqual(7000)
        if (note.glideTo !== undefined) { expect(note.glideTo).toBeGreaterThanOrEqual(36); expect(note.glideTo).toBeLessThanOrEqual(7000) }
        expect(note.peak, event.type).toBeGreaterThan(0.02)
        expect(note.peak, event.type).toBeLessThanOrEqual(0.35)
        expect(note.attack, event.type).toBeGreaterThanOrEqual(0.001)
        expect(note.attack, event.type).toBeLessThanOrEqual(0.1)
        expect(note.decay, event.type).toBeGreaterThan(0)
      }
    }
  })

  it('starts every sound with its event: a note that waits is part of the same sound and waits a quarter of a second at the most', () => {
    for (const event of everyEvent()) {
      const notes = notesOf(event)
      expect(Math.min(...notes.map((note) => note.delay ?? 0)), event.type).toBe(0)
      for (const note of notes) expect(note.delay ?? 0, event.type).toBeLessThanOrEqual(0.25)
    }
  })

  it('keeps every sound short, and the one long whistle under two seconds', () => {
    for (const event of everyEvent()) {
      const length = lengthOf(notesOf(event))
      if (event.type === 'whistle') { expect(length).toBeGreaterThan(1.5); expect(length).toBeLessThanOrEqual(2) } else expect(length, event.type).toBeLessThanOrEqual(1)
    }
  })

  it('rings a gem low for red, middle for green and high for blue, in the rock, under the finger and under the pick', () => {
    expect(GLASS.red).toBeLessThan(GLASS.green)
    expect(GLASS.green).toBeLessThan(GLASS.blue)
    for (const colour of ['red', 'green', 'blue'] as const) {
      expect(notesOf({ type: 'knock', kind: 'gem', index: 20, at: { x: 0, y: 0 }, colour })[0].frequency).toBe(GLASS[colour])
      expect(notesOf({ type: 'gemring', colour, index: 20 })[0].frequency).toBe(GLASS[colour])
      expect(notesOf({ type: 'chime', colour, index: 20 })[0].frequency).toBe(GLASS[colour])
      const ping = notesOf({ type: 'ping', colour, index: 20 })[0]
      expect(ping.glideTo).toBeGreaterThan(ping.frequency)
    }
  })

  it('makes each tink of sandstone higher than the one before, each ring of granite lower, and each glug of a run lower', () => {
    const at = { x: 0, y: 0 }
    const tink = (n: number): number => notesOf({ type: n === 3 ? 'break' : 'chip', kind: 'sandstone', index: 30, n, aside: false, from: at })[0].frequency
    expect(tink(2)).toBeGreaterThan(tink(1))
    expect(tink(3)).toBeGreaterThan(tink(2))
    const ring = (n: number): number => notesOf({ type: 'ring', index: 30, n, loose: false })[0].frequency
    expect(ring(2)).toBeLessThan(ring(1))
    expect(ring(3)).toBeLessThan(ring(2))
    const glug = (n: number): number => notesOf({ type: 'glug', index: 30, n })[0].frequency
    for (let n = 1; n < 12; n++) expect(glug(n)).toBeLessThan(glug(n - 1))
    expect(glug(60)).toBeGreaterThanOrEqual(100)
  })

  it('starts each block of the hill from a pitch of its own place, lower with depth', () => {
    for (let index = 0; index < BLOCKS; index++) {
      expect(pitchOf(index)).toBeGreaterThan(400)
      expect(pitchOf(index)).toBeLessThan(1600)
    }
    expect(pitchOf(13 * 5)).toBeLessThan(pitchOf(0) * 1.01)
  })

  it('gives each kind of dweller a start of its own and a way of leaving', () => {
    const kinds = ['bat', 'newt', 'lizard', 'mushroom', 'beetle', 'fern', 'glowworm', 'snail', 'moth', 'dragonfly', 'spider', 'flower'] as const
    const starts = new Set(kinds.map((kind) => JSON.stringify(notesOf({ type: 'poke', who: kind, index: 3 }))))
    expect(starts.size).toBe(kinds.length)
    for (const kind of kinds) expect(notesOf({ type: 'leave', kind, index: 3 }).length).toBeGreaterThan(0)
  })

  it('joins what one touch sets off into one list, in order', () => {
    const at = { x: 0, y: 0 }
    const a = notesOf({ type: 'knock', kind: 'earth', index: 3, at }), b = notesOf({ type: 'clang', index: 3, from: at })
    expect(notesFor([{ type: 'knock', kind: 'earth', index: 3, at }, { type: 'clang', index: 3, from: at }])).toEqual([...a, ...b])
    expect(notesFor([])).toEqual([])
  })
})
