import { describe, expect, it } from 'vitest'
import type { Note } from './audio'
import { KIND } from './kinds'
import { Later, heard } from './later'
import { Play, type Cue, type World } from './play'
import { notesFor, notesOf, type Sound } from './voices'

const note = (frequency: number, delay?: number): Note => ({ kind: 'tone', frequency, peak: 0.1, attack: 0.01, decay: 0.1, ...(delay === undefined ? {} : { delay }) })
const FRAME = 1 / 60

describe('notes that start after their cue', () => {
  it('the notes with no delay are handed back to play at once, and the others wait', () => {
    const later = new Later()
    const first = later.take([note(100), note(200, 0.3), note(300, 0), note(400, 0.1)], 5)
    expect(first.map((one) => one.frequency)).toEqual([100, 300])
    expect(later.waits).toBe(2)
  })

  it('each comes in the frame its time has come on the game\'s clock, once, earliest first, and starts then with no delay left', () => {
    const later = new Later()
    later.take([note(200, 0.3), note(400, 0.1), note(500, 0.1)], 5)
    expect(later.due(5.05)).toEqual([])
    const second = later.due(5.1)
    expect(second.map((one) => one.frequency)).toEqual([400, 500])
    expect(second.every((one) => one.delay === 0)).toBe(true)
    expect(later.due(5.1)).toEqual([])
    expect(later.due(5.25)).toEqual([])
    expect(later.due(5.31).map((one) => one.frequency)).toEqual([200])
    expect(later.waits).toBe(0)
    // Two cues a moment apart: their notes come in the order of their times, not of their cues.
    later.take([note(1, 0.5)], 10)
    later.take([note(2, 0.2)], 10.1)
    expect(later.due(11).map((one) => one.frequency)).toEqual([2, 1])
  })

  it('a clock that stands still hands out nothing: a resting game holds its notes with everything else', () => {
    const later = new Later()
    later.take([note(200, 0.3)], 5)
    for (let i = 0; i < 100; i++) expect(later.due(5.2)).toEqual([])
    expect(later.waits).toBe(1)
  })

  it('a touch that ends a scene drops what has not begun: no note starts after it', () => {
    const later = new Later()
    later.take([note(200, 0.3), note(300, 0.6)], 5)
    expect(later.due(5.3)).toHaveLength(1)
    later.drop()
    expect(later.waits).toBe(0)
    for (let time = 5.3; time < 8; time += FRAME) expect(later.due(time)).toEqual([])
  })

  it('every sound of the toy that has a later note is heard whole through it, each note within a frame of its own moment', () => {
    const cues: Cue[] = [
      { type: 'setdown', parts: ['pie', 'hat', 'dog'], x: 0, z: 0 },
      { type: 'drop', kind: 'hat' }, { type: 'secret', which: 'bounce' }, { type: 'secret', which: 'peek' }, { type: 'burp', kind: 'dog', onto: 'hat', rest: 1 },
    ]
    for (const cue of cues) {
      const notes = notesOf(cue), later = new Later(), heard: { at: number; frequency: number }[] = []
      expect(notes.some((one) => (one.delay ?? 0) > 0), cue.type).toBe(true)
      for (const one of later.take(notes, 2)) heard.push({ at: 2, frequency: one.frequency })
      for (let frame = 1; frame <= 240; frame++) for (const one of later.due(2 + frame * FRAME)) heard.push({ at: 2 + frame * FRAME, frequency: one.frequency })
      expect(heard, cue.type).toHaveLength(notes.length)
      for (const one of notes) {
        const mine = heard.filter((other) => other.frequency === one.frequency && other.at >= 2 + (one.delay ?? 0) - 1e-9 && other.at <= 2 + (one.delay ?? 0) + FRAME + 1e-9)
        expect(mine.length, `${cue.type} ${one.frequency}`).toBeGreaterThan(0)
      }
    }
  })

  it('the gate\'s clunk and the tower\'s creak, the two a scene-ending touch used to leave sounding, no longer wait at all: each is a cue in the frame of what it is the sound of', () => {
    const later = new Later()
    const first = later.take(notesFor([{ type: 'gate', open: false }, { type: 'clunk' }, { type: 'float', parts: ['pie', 'hat'], x: 0, z: 0 }, { type: 'thud', parts: ['pie', 'hat'], x: 0, z: 0 }], new Map()), 0)
    expect(first).toHaveLength(4)
    expect(later.waits).toBe(0)
  })
})

/** The Mount's own way with a frame: one step of play, and what is heard of it. */
function frames(play: Play, later: Later, takes: Map<string, number>, clock: { now: number }, count: number): Note[] {
  const all: Note[] = []
  for (let i = 0; i < count; i++) {
    clock.now += FRAME
    play.step(FRAME)
    all.push(...heard(play.cues, takes, later, clock.now, true))
    play.cues.length = 0
  }
  return all
}
const world = (over: Partial<World> = {}): World => ({ hole: { x: 0, z: 0.5 }, belly: [], breath: [], street: [], ...over })

describe('a note that waits is dropped in the frame its cause is over', () => {
  it('the balloon\'s hum and whatever else a riding stack still had to play stop when the stack drops from the breath', () => {
    const play = new Play(world({ belly: ['pie'], breath: ['hat', 'balloon'] })), later = new Later(), takes = new Map<string, number>(), clock = { now: 0 }
    // The first frame is the first bob: the hum is taken up again and again for the length of it.
    frames(play, later, takes, clock, 1)
    expect(later.waitingOn('breath')).toBeGreaterThanOrEqual(2)
    // The hole is called away, and the stack drops.
    play.press({ on: 'street', x: 4, z: 1 })
    play.tap()
    let dropped = -1
    for (let frame = 0; frame < 60 && dropped < 0; frame++) {
      frames(play, later, takes, clock, 1)
      if (play.riders.length === 0) dropped = frame
    }
    expect(dropped).toBeGreaterThanOrEqual(0)
    // In that same frame nothing of the breath waits any more, and no hum is heard from there on.
    expect(later.waitingOn('breath')).toBe(0)
    const after = frames(play, later, takes, clock, 240)
    expect(after.filter((note) => (note as Sound).cause === 'breath')).toEqual([])
    // The thud of its landing is not the breath's, and is heard.
    expect(after.some((note) => note.glideTo === 55)).toBe(true)
  })

  it('the mayor\'s wail stops when his hat is back out, and what was still to be heard of a thing going in stops when the hole gives it back', () => {
    const play = new Play(world({ belly: ['pie'], street: [{ parts: ['hat'], x: 1.2, z: 0.5 }] })), later = new Later(), takes = new Map<string, number>(), clock = { now: 0 }
    play.press({ on: 'thing', thing: play.things[0], x: 1.2, z: 0.5 })
    play.tap()
    for (let frame = 0; frame < 240 && !play.belly.includes('hat'); frame++) frames(play, later, takes, clock, 1)
    expect(play.belly).toContain('hat')
    // He wails for more than two seconds, and the hat's bloop is still to come.
    expect(later.waitingOn('wail')).toBe(5)
    expect(later.waitingOn('fall')).toBeGreaterThan(0)
    expect(play.falling.length).toBe(1)
    // Two frames on the child taps the hole: the hat comes straight back up.
    frames(play, later, takes, clock, 2)
    play.press({ on: 'hole', x: play.x, z: play.z })
    play.tap()
    const now = heard(play.cues, takes, later, clock.now, true)
    play.cues.length = 0
    expect(play.riders.map((rider) => rider.kind)).toEqual(['hat'])
    expect(later.waitingOn('wail')).toBe(0)
    expect(later.waitingOn('fall')).toBe(0)
    // The burp itself is heard, and what follows it waits as before.
    expect(now.length).toBeGreaterThan(0)
    expect(later.waits).toBeGreaterThan(0)
    const after = frames(play, later, takes, clock, 240)
    expect(after.filter((note) => (note as Sound).cause === 'wail' || (note as Sound).cause === 'fall')).toEqual([])
  })

  it('a wail whose hat stays down is heard whole, and so is a thing that goes in undisturbed', () => {
    const play = new Play(world({ belly: ['pie'], street: [{ parts: ['hat'], x: 1.2, z: 0.5 }] })), later = new Later(), takes = new Map<string, number>(), clock = { now: 0 }
    play.press({ on: 'thing', thing: play.things[0], x: 1.2, z: 0.5 })
    play.tap()
    const all = frames(play, later, takes, clock, 360)
    expect(all.filter((note) => (note as Sound).cause === 'wail')).toHaveLength(5)
    expect(all.filter((note) => (note as Sound).cause === 'fall').length).toBeGreaterThanOrEqual(2)
    expect(later.waits).toBe(0)
    expect(KIND.hat.width).toBeLessThan(play.mouth)
  })

  it('before the sound runs a frame\'s notes are handed on whole, delays and all, for the unlock to hold', () => {
    const later = new Later()
    const notes = heard([{ type: 'setdown', parts: ['pie', 'hat'], x: 0, z: 0 }], new Map(), later, 3, false)
    expect(notes).toHaveLength(3)
    expect(notes.some((one) => (one.delay ?? 0) > 0)).toBe(true)
    expect(later.waits).toBe(0)
  })
})
