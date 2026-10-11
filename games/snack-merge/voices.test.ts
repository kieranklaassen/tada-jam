import { describe, expect, it } from 'vitest'
import type { Note } from './audio'
import { ALL_KINDS, BREAD, CHEESE, THINGS } from './kinds'
import { ANSWERS, BELL, GULP, PAT, POKED, ROCK_BACK, SAT, SHUFFLE, SLIDE_OUT, TICK, TIPPED, answered, pitched, BUMPED, BURP, CLICK, CLINK, DING, FLAME, GIVEN, GRUNT, HICCUP, KNOCK, LANDED, LICK, POP, RUMBLE, RUSTLE, SET_DOWN, SLID, SQUEAK, THROWN_OUT, TINK, TUP, ZIP, call, lengthOf, said, shaped } from './voices'

// Nobody has listened to these sounds yet. Until someone does, this holds every
// note in a range that can be heard and cannot hurt, and keeps the cells apart.

const ROWS = { SLID, LANDED, BUMPED, GIVEN, THROWN_OUT, SET_DOWN }
const SINGLES = { POP, ZIP, CLICK, RUMBLE, BURP, HICCUP, CLINK, RUSTLE, TUP, TINK, DING, SQUEAK, GRUNT, KNOCK, LICK, FLAME }

function sane(notes: readonly Note[]): void {
  expect(notes.length).toBeGreaterThan(0)
  for (const note of notes) {
    expect(note.frequency).toBeGreaterThanOrEqual(40)
    expect(note.frequency).toBeLessThanOrEqual(8000)
    if (note.glideTo !== undefined) {
      expect(note.glideTo).toBeGreaterThanOrEqual(40)
      expect(note.glideTo).toBeLessThanOrEqual(8000)
    }
    expect(note.peak).toBeGreaterThan(0)
    expect(note.peak).toBeLessThanOrEqual(0.55)
    expect(note.attack).toBeGreaterThan(0)
    expect(note.decay).toBeGreaterThan(0)
    expect(note.delay ?? 0).toBeGreaterThanOrEqual(0)
  }
}

describe('the sounds', () => {
  it('has a sound in every cell of the grid, one for each thing in each column', () => {
    for (const row of Object.values(ROWS)) {
      expect(row).toHaveLength(THINGS.length)
      row.forEach(sane)
    }
  })

  it('keeps every note in range, and every sound short', () => {
    for (const notes of Object.values(SINGLES)) sane(notes)
    for (const row of Object.values(ROWS)) for (const notes of row) expect(lengthOf(notes)).toBeLessThanOrEqual(1.6)
    for (const notes of Object.values(SINGLES)) expect(lengthOf(notes)).toBeLessThanOrEqual(1.2)
  })

  it('gives no two cells of the grid the same sound', () => {
    const cells = Object.values(ROWS).flatMap((row) => row.map((notes) => JSON.stringify(notes)))
    expect(new Set(cells).size).toBe(cells.length)
  })

  it('gives no two snacks the same call, and every call starts with the pop', () => {
    const calls = ALL_KINDS.map((k) => JSON.stringify(call(k)))
    expect(new Set(calls).size).toBe(ALL_KINDS.length)
    for (const k of ALL_KINDS) {
      sane(call(k))
      expect(call(k).slice(0, POP.length)).toEqual(shaped(POP))
      expect(lengthOf(call(k))).toBeLessThanOrEqual(2)
    }
  })

  it('says a snack of several things as its things together, none louder than one alone', () => {
    const toastie = said(LANDED, BREAD | CHEESE)
    expect(toastie).toHaveLength(LANDED[0].length + LANDED[1].length)
    const loudest = (notes: readonly Note[]) => Math.max(...notes.map((n) => n.peak))
    expect(loudest(toastie)).toBeLessThan(Math.max(loudest(LANDED[0]), loudest(LANDED[1])))
    for (const k of ALL_KINDS) for (const row of Object.values(ROWS)) sane(said(row, k))
  })

  it('makes a sound softer and later without changing the one it was made from', () => {
    const before = JSON.stringify(POP)
    const later = shaped(POP, 0.5, 0.2)
    expect(later[0].peak).toBeCloseTo(POP[0].peak * 0.5)
    expect(later[0].delay).toBeCloseTo((POP[0].delay ?? 0) + 0.2)
    expect(JSON.stringify(POP)).toBe(before)
  })

  it('keeps the sounds of the tip, the empty jar and the next monster in range and short', () => {
    for (const notes of [TIPPED, SLIDE_OUT, GULP, TICK, PAT, SHUFFLE, BELL, SAT, ROCK_BACK]) {
      sane(notes)
      expect(lengthOf(notes)).toBeLessThanOrEqual(1.6)
    }
  })

  it('gives each of the three monsters its own answer to each of the six things, eighteen sounds, none alike', () => {
    expect(ANSWERS).toHaveLength(3)
    for (const row of ANSWERS) {
      expect(row).toHaveLength(THINGS.length)
      for (const notes of row) {
        sane(notes)
        expect(lengthOf(notes)).toBeLessThanOrEqual(2.2)
      }
    }
    const all = ANSWERS.flatMap((row) => row.map((notes) => JSON.stringify(notes)))
    expect(new Set(all).size).toBe(18)
  })

  it('answers a snack of several things with the answers to all of them at once, the same every time', () => {
    for (const monster of [0, 1, 2]) for (const k of ALL_KINDS) {
      const notes = answered(monster, k)
      sane(notes)
      expect(answered(monster, k)).toEqual(notes)
    }
    expect(answered(0, BREAD | CHEESE)).toHaveLength(ANSWERS[0][0].length + ANSWERS[0][1].length)
  })

  it('answers a poke at each monster in its own voice', () => {
    expect(POKED).toHaveLength(3)
    POKED.forEach(sane)
    expect(new Set(POKED.map((notes) => JSON.stringify(notes))).size).toBe(3)
  })

  it('pitches a sound up or down and keeps it in range', () => {
    const up = pitched(POP, 1.5)
    expect(up[0].frequency).toBeCloseTo(POP[0].frequency * 1.5)
    sane(pitched(POP, 0.5))
    sane(up)
  })
})
