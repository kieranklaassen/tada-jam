import { describe, expect, it } from 'vitest'
import { KINDS, TOY_IDS } from './layout'
import { TAPPED_MOVE } from './motion'
import { FIXED, HOP, LAND, LEVELLED, RANGES, TAPPED, inScene, peelTick, purr, quack, rip, rollPick, soften, zip, type Sound } from './voices'

const built: Sound[] = [
  ...[0, 300, 1200, 2400, 9000].map(zip),
  ...[0, 62, 300, 700, 2000].map(rip),
  ...[-3, 0, 0.5, 1, 4].map(purr),
  ...KINDS.map(rollPick),
  ...[0, 0.5, 1].map(peelTick),
  ...LEVELLED.flatMap((make) => [-1, 0, 0.5, 1, 3].map(make)),
  ...FIXED.map((sound) => soften(sound, 0)),
]
const all: Sound[] = [...FIXED, ...built]
const inside = (value: number, [low, high]: readonly [number, number]): boolean => value >= low && value <= high

describe('every sound, in plain numbers', () => {
  it('keeps every note inside the stated ranges', () => {
    for (const sound of all) {
      expect(sound.notes.length, sound.name).toBeGreaterThan(0)
      for (const note of sound.notes) {
        expect(inside(note.frequency, RANGES.hz), `${sound.name}: ${note.frequency} Hz`).toBe(true)
        if (note.glideTo !== undefined) expect(inside(note.glideTo, RANGES.hz), `${sound.name}: glides to ${note.glideTo} Hz`).toBe(true)
        expect(inside(note.peak, RANGES.peak), `${sound.name}: peak ${note.peak}`).toBe(true)
        expect(inside(note.attack, RANGES.attack), `${sound.name}: attack ${note.attack}`).toBe(true)
        expect(inside(note.decay, RANGES.decay), `${sound.name}: decay ${note.decay}`).toBe(true)
      }
    }
  })

  it('hides no delay inside a sound: every note starts when the sound does', () => {
    for (const sound of all) for (const note of sound.notes) expect(note.delay, sound.name).toBeUndefined()
  })

  it('keeps every sound short, and never louder all told than the stated sum', () => {
    for (const sound of all) {
      expect(Math.max(...sound.notes.map((note) => note.attack + note.decay)), sound.name).toBeLessThanOrEqual(RANGES.seconds)
      expect(sound.notes.reduce((sum, note) => sum + note.peak, 0), sound.name).toBeLessThanOrEqual(RANGES.sum)
    }
  })

  it('gives no two fixed sounds the same name or the same numbers', () => {
    const names = new Set<string>(), numbers = new Map<string, string>()
    for (const sound of FIXED) {
      expect(names.has(sound.name), `${sound.name} is named twice`).toBe(false)
      names.add(sound.name)
      const key = JSON.stringify(sound.notes)
      expect(numbers.get(key), `${sound.name} is a copy`).toBeUndefined()
      numbers.set(key, sound.name)
    }
  })
})

describe('sound follows the hand and the toy', () => {
  it('raises the zip with the speed of the pull, up to a ceiling', () => {
    expect(zip(1200).notes[0].frequency).toBeGreaterThan(zip(300).notes[0].frequency)
    expect(zip(9000).notes[0].frequency).toBe(zip(2400).notes[0].frequency)
  })

  it('makes a longer strip tear longer and lower', () => {
    expect(rip(700).notes[0].decay).toBeGreaterThan(rip(62).notes[0].decay)
    expect(rip(700).notes[0].frequency).toBeLessThan(rip(62).notes[0].frequency)
  })

  it('lets the purr fall close to silence, and never to nothing', () => {
    expect(purr(1).notes[0].peak).toBeGreaterThan(purr(0).notes[0].peak * 3)
    expect(purr(-3).notes[0].peak).toBe(purr(0).notes[0].peak)
  })

  it('gives each roll its own pitch, rising down the tray', () => {
    const pitches = KINDS.map((kind) => rollPick(kind).notes[0].frequency)
    expect(pitches).toEqual([...pitches].sort((a, b) => a - b))
    expect(new Set(pitches).size).toBe(KINDS.length)
  })

  it('has one sound for each move of a toy\'s answer to a tap, and a take-off and a landing of its own for each toy', () => {
    for (const id of TOY_IDS) {
      expect(TAPPED[id].length, id).toBe(TAPPED_MOVE[id].cues.length)
      expect(HOP[id].notes.length, id).toBeGreaterThan(0)
      expect(LAND[id].notes.length, id).toBeGreaterThan(0)
    }
    // The heavier the toy, the lower its landing.
    const low = (id: (typeof TOY_IDS)[number]): number => Math.min(...LAND[id].notes.filter((note) => note.kind === 'tone').map((note) => note.frequency))
    expect(low('bus')).toBeLessThan(low('train'))
    expect(low('train')).toBeLessThan(low('car'))
    expect(low('car')).toBeLessThan(low('duck'))
    expect(low('duck')).toBeLessThan(low('pegA'))
  })
})

describe('the town grows quiet while it is only watched', () => {
  it('makes every habit sound softer at a lower level, and never louder than at full', () => {
    for (const make of LEVELLED) {
      const full = make(1), low = make(0)
      expect(full.name).toBe(low.name)
      full.notes.forEach((note, k) => expect(low.notes[k].peak, full.name).toBeLessThan(note.peak))
      expect(make(7).notes[0].peak).toBe(full.notes[0].peak)
    }
  })

  it('softens any sound without changing what it is, and leaves a full one alone', () => {
    expect(soften(quack, 1)).toBe(quack)
    const soft = soften(quack, 0)
    expect(soft.name).toBe('quack')
    soft.notes.forEach((note, k) => {
      expect(note.peak).toBeLessThan(quack.notes[k].peak)
      expect(note.frequency).toBe(quack.notes[k].frequency)
    })
  })

  it('marks a sound as part of a scene without changing it', () => {
    expect(inScene(quack)).toEqual({ ...quack, scene: true })
    expect(quack.scene).toBeUndefined()
  })
})
