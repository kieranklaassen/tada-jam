import { describe, expect, it } from 'vitest'
import type { Note } from './audio'
import { CELLS, type CellKey, type CueName } from './grid'
import { CAT_ACTS, CAT_BEATS, type CatAct } from './motion'
import { BOUNCE_SECONDS, FLIGHT_SECONDS, TIP_BEATS, TIP_LASTS, TOW_BEATS, TOW_LASTS } from './scenes'
import { GRID_VOICES, MEWS, OTHER_VOICES, TOOTH_PITCH, click, notesFor, notesOf, partsFor, tooth, type Cue, type CueId } from './voices'

// Nobody has heard the game, so every sound is held in range here: its pitch,
// how loud it gets and how long it lasts. And every sound belongs to a moment:
// no cell of the grid sounds like another, and no sound runs on long after
// the answer it is part of.

/** When a note has died away, in seconds from the start of its sound. */
const ends = (note: Note): number => (note.delay ?? 0) + note.attack + note.decay
const lasts = (notes: readonly Note[]): number => Math.max(...notes.map(ends))
const print = (notes: readonly Note[]): string => JSON.stringify(notes)

const variants = (name: CueId): Note[][] => [0, 1, 2, 3].map((index) => notesOf({ name, index }))
/** The variants of a grid sound that some cell plays. */
const played = (name: CueName): number[] => [...new Set((Object.keys(CELLS) as CellKey[]).flatMap((key) => CELLS[key].beats.filter((beat) => beat.cue === name).map((beat) => beat.index ?? 0)))]
const ALL: [string, Note[]][] = [
  ...(Object.keys(GRID_VOICES) as CueName[]).flatMap((name) => played(name).map((index): [string, Note[]] => [`${name} ${index}`, notesOf({ name, index })])),
  ...(Object.keys(OTHER_VOICES) as CueId[]).flatMap((name) => variants(name).map((notes, index): [string, Note[]] => [`${name} ${index}`, notes])),
  ...MEWS.map((notes, index): [string, Note[]] => [`mew ${index}`, [...notes]]),
  ...TOOTH_PITCH.map((_, index): [string, Note[]] => [`tooth ${index}`, tooth(index)]),
  ...[0, 0.5, 1].flatMap((depth) => [true, false].map((rising): [string, Note[]] => [`click ${depth} ${rising}`, click(depth, rising)])),
]

describe('every sound', () => {
  it('is made of notes a small speaker can play, none of them loud, sharp or long', () => {
    for (const [name, notes] of ALL) {
      expect(notes.length, name).toBeGreaterThan(0)
      expect(notes.length, name).toBeLessThanOrEqual(12)
      for (const note of notes) {
        for (const pitch of [note.frequency, note.glideTo ?? note.frequency]) {
          expect(pitch, name).toBeGreaterThanOrEqual(50)
          // Above the top of a piano only a quiet shimmer is allowed.
          expect(pitch, name).toBeLessThanOrEqual(note.peak <= 0.08 ? 7000 : 4400)
        }
        expect(note.peak, name).toBeGreaterThan(0)
        expect(note.peak, name).toBeLessThanOrEqual(0.26)
        expect(note.attack, name).toBeGreaterThan(0)
        expect(note.decay, name).toBeGreaterThan(0)
        expect(note.delay ?? 0, name).toBeGreaterThanOrEqual(0)
        if (note.kind === 'noise') expect(note.q ?? 1, name).toBeLessThanOrEqual(12)
      }
      // The loudest moment of a sound, with every note that sounds at it at its peak, stays well under full scale.
      for (const note of notes) {
        const at = (note.delay ?? 0) + note.attack
        const together = notes.filter((other) => (other.delay ?? 0) <= at && ends(other) >= at).reduce((sum, other) => sum + other.peak, 0)
        expect(together, name).toBeLessThanOrEqual(0.6)
      }
      expect(lasts(notes), name).toBeLessThanOrEqual(1.3)
    }
  })

  it('gets lower as the line pays out into the deep, and higher and brighter as it comes in', () => {
    expect(click(1, false)[0].frequency).toBeLessThan(click(0, false)[0].frequency)
    expect(click(0.5, true)[0].frequency).toBeGreaterThan(click(0.5, false)[0].frequency)
    for (let i = 1; i < TOOTH_PITCH.length; i++) expect(TOOTH_PITCH[i]).toBeGreaterThan(TOOTH_PITCH[i - 1])
  })

  it('joins everything one step set off into one list, in order', () => {
    const cues: Cue[] = [{ name: 'click', depth: 0.2, up: false }, { name: 'splashIn' }, { name: 'tooth', index: 3 }]
    expect(notesFor(cues)).toEqual([...click(0.2, false), ...notesOf({ name: 'splashIn' }), ...tooth(3)])
    expect(notesFor([])).toEqual([])
  })
})

describe('each cell of the grid', () => {
  const keys = Object.keys(CELLS) as CellKey[]
  const soundOf = (key: CellKey): string => CELLS[key].beats.map((beat) => print(notesOf({ name: beat.cue, index: beat.index }))).join('|')

  it('sounds like no other cell', () => {
    const heard = new Map<string, CellKey>()
    for (const key of keys) {
      // The tow has its own scene, the squid's wave is silent, and the hook itself plays the shark's teeth.
      if (CELLS[key].beats.length === 0) { expect(['worm.shark', 'glow.squid.bye', 'none.shark']).toContain(key); continue }
      const sound = soundOf(key)
      expect(heard.get(sound), key).toBeUndefined()
      heard.set(sound, key)
    }
  })

  it('uses no sound that another cell also uses, but for the cork of the octopus\'s pot', () => {
    const users = new Map<CueName, Set<CellKey>>()
    for (const key of keys) for (const beat of CELLS[key].beats) users.set(beat.cue, (users.get(beat.cue) ?? new Set()).add(key))
    for (const [cue, cells] of users) expect([...cells], cue).toHaveLength(cue === 'cork' ? 2 : 1)
    // And every sound the grid names is used.
    expect([...users.keys()].sort()).toEqual((Object.keys(GRID_VOICES) as CueName[]).sort())
  })

  it('gives no two sounds the same notes', () => {
    const seen = new Map<string, string>()
    for (const [name, notes] of ALL) {
      const cue = name.split(' ')[0], key = print(notes)
      if (seen.has(key)) expect(seen.get(key), name).toBe(cue)
      seen.set(key, cue)
    }
  })

  it('has every sound begin inside its answer and die away soon after it', () => {
    for (const key of keys) {
      const cell = CELLS[key]
      for (const beat of cell.beats) {
        expect(beat.at, key).toBeGreaterThanOrEqual(0)
        expect(beat.at, key).toBeLessThan(cell.lasts)
        const done = beat.at + lasts(notesOf({ name: beat.cue, index: beat.index }))
        expect(done, `${key} ${beat.cue}`).toBeLessThanOrEqual(cell.lasts + 0.9)
      }
      if (cell.outcome !== 'joke' && cell.outcome !== 'tows') expect(cell.at, key).toBeLessThanOrEqual(cell.lasts)
    }
  })

  it('keeps a joke to about a second or two, so the next thing can be tried', () => {
    for (const key of keys) if (CELLS[key].outcome === 'joke' && key !== 'none.shark') expect(CELLS[key].lasts, key).toBeLessThanOrEqual(3)
  })
})

describe('the scenes and the deck', () => {
  it('has every sound of a scene begin inside it and die away by its end, or soon after', () => {
    for (const [beats, length] of [[TOW_BEATS, TOW_LASTS], [TIP_BEATS, TIP_LASTS]] as const) {
      for (const beat of beats) {
        expect(beat.at).toBeGreaterThanOrEqual(0)
        expect(beat.at + lasts(notesOf(beat.cue)), beat.cue.name).toBeLessThanOrEqual(length + 0.6)
      }
    }
  })

  it('sorts the sounds of a step by whose they are, so that each can be stopped by itself', () => {
    const cues: Cue[] = [{ name: 'click', depth: 0.2, up: false }, { name: 'knock', by: 'turtle' }, { name: 'catPurr', by: 'cat' }, { name: 'splashIn' }, { name: 'knock', by: 'turtle' }]
    const parts = partsFor(cues)
    expect(parts.map((part) => part.tag)).toEqual(['', 'turtle', 'cat'])
    expect(parts[0].notes).toEqual([...click(0.2, false), ...notesOf({ name: 'splashIn' })])
    expect(parts[1].notes).toEqual([...notesOf({ name: 'knock' }), ...notesOf({ name: 'knock' })])
    // Nothing is lost or doubled.
    expect(parts.flatMap((part) => part.notes)).toHaveLength(notesFor(cues).length)
    expect(partsFor([])).toEqual([])
  })

  it('keeps the splash of a catch that leaves the boat out of the bounce and the tip-back: it is a cue of its own, with no delay written into it', () => {
    for (const name of ['bounce', 'tipBack'] as const) {
      expect(notesOf({ name }).some((note) => note.kind === 'noise'), name).toBe(false)
      expect(lasts(notesOf({ name })), name).toBeLessThan(Math.min(BOUNCE_SECONDS, FLIGHT_SECONDS.tipBack))
    }
    const splash: readonly Note[] = notesOf({ name: 'railSplash' })
    expect(splash.some((note) => note.kind === 'noise')).toBe(true)
    for (const note of splash) expect(note.delay ?? 0).toBe(0)
  })

  it('has every sound of the cat fall inside what the cat is doing', () => {
    for (const act of Object.keys(CAT_BEATS) as CatAct[]) {
      for (const beat of CAT_BEATS[act]!) {
        expect(beat.at, act).toBeLessThan(CAT_ACTS[act])
        expect(beat.at + lasts(notesOf({ name: beat.cue })), `${act} ${beat.cue}`).toBeLessThanOrEqual(CAT_ACTS[act] + 0.7)
      }
    }
  })
})
