import { describe, expect, it } from 'vitest'
import type { Note } from './audio'
import { GARMENTS, SLEEPERS } from './things'
import { CLOTHES, MOODS, ROOM, USES, VOICE, hollow, stepOf } from './voices'

const all: [string, Note[]][] = [
  ...SLEEPERS.flatMap((sleeper) => [...MOODS.map((mood): [string, Note[]] => [`${sleeper} ${mood}`, VOICE[sleeper][mood]]), [`${sleeper} step`, stepOf(sleeper)] as [string, Note[]]]),
  ...GARMENTS.flatMap((garment) => USES.map((use): [string, Note[]] => [`${garment} ${use}`, CLOTHES[garment][use]])),
  ...Object.entries(ROOM).map(([name, notes]): [string, Note[]] => [name, notes]),
]
const length = (notes: readonly Note[]) => Math.max(...notes.map((note) => (note.delay ?? 0) + note.attack + note.decay))

describe('the voices', () => {
  it.each(all)('%s is in range', (_name, notes) => {
    expect(notes.length).toBeGreaterThan(0)
    for (const note of notes) {
      // Nothing a tablet's speaker cannot play, nothing that hurts.
      expect(note.frequency).toBeGreaterThanOrEqual(110)
      expect(note.frequency).toBeLessThan(9000)
      expect(note.glideTo ?? note.frequency).toBeGreaterThanOrEqual(110)
      expect(note.peak).toBeGreaterThan(0)
      expect(note.peak).toBeLessThanOrEqual(note.kind === 'tone' ? 0.35 : 0.7)
      expect(note.attack).toBeGreaterThan(0)
      expect(note.decay).toBeGreaterThan(0)
    }
    expect(length(notes)).toBeLessThan(3)
  })
  it('gives every sleeper, garment and use a sound of its own', () => {
    expect(new Set(all.map(([, notes]) => JSON.stringify(notes))).size).toBe(all.length)
  })
  it('gives each of five throats its own make', () => {
    // Which waves a voice is made of, how its notes follow, and where it lies.
    const make = SLEEPERS.map((sleeper) => { const notes = VOICE[sleeper].murmur; return `${[...new Set(notes.map((note) => note.wave ?? note.kind))].sort().join()} ${notes.length} ${Math.round(Math.log2(notes[0].frequency) * 2)}` })
    expect(new Set(make).size).toBe(5)
  })
  it('is quieter asleep than awake', () => {
    for (const sleeper of SLEEPERS) {
      const loudest = (notes: Note[]) => Math.max(...notes.map((note) => note.kind === 'noise' ? note.peak / 3 : note.peak))
      expect(loudest(VOICE[sleeper].snore)).toBeLessThan(loudest(VOICE[sleeper].grump))
    }
    for (const garment of GARMENTS) expect(Math.max(...CLOTHES[garment].breath.map((note) => note.peak))).toBeLessThanOrEqual(0.14)
  })
  it('makes a snore hollow inside a saucepan', () => {
    const snore = VOICE.goat.snore
    expect(hollow(snore).length).toBeGreaterThan(snore.length * 2)
    expect(length(hollow(snore))).toBeGreaterThan(length(snore))
  })
})
