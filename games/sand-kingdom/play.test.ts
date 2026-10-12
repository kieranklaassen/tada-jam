import { describe, expect, it } from 'vitest'
import type { Note } from './audio'
import { DIG_RADIUS, RAISED, RIM_WIDTH, SEA, base, deltaAt, isUnderSea, tower } from './field'
import { deserializeKingdom, serializeKingdom } from './kingdom'
import { CLOUDS } from './layout'
import { MOST_GRAINS, Play } from './play'
import { firstThings, writeThings } from './things'
import { THUD_PITCHES, VOICES, hiss, thud } from './voices'

const DT = 1 / 60

const fresh = (seed = 1): Play => new Play(deserializeKingdom(null, null), seed)
const sand = (x: number, z: number) => ({ kind: 'sand', x, z }) as const

/** Everything queued since the last look, as one list of notes, and the queue emptied. */
function heard(play: Play): Note[] {
  const notes = play.voices.flat()
  play.voices.length = 0
  return notes
}
/** Whether what was heard holds a whole named voice. */
function holds(notes: Note[], voice: readonly Note[]): boolean {
  return voice.every((note) => notes.some((other) => other.frequency === note.frequency && other.kind === note.kind && other.decay === note.decay))
}
function steps(play: Play, seconds: number): void {
  for (let t = 0; t < seconds; t += DT) play.step(DT)
}
/** A stroke along a line, a little at a time, as a finger moves. */
function draw(play: Play, fromX: number, fromZ: number, toX: number, toZ: number, seconds = 0.5): void {
  const count = Math.round(seconds / DT)
  for (let i = 1; i <= count; i++) {
    play.drag(fromX + ((toX - fromX) * i) / count, fromZ + ((toZ - fromZ) * i) / count, 0)
    play.step(DT)
  }
}

describe('a finger lands on the sand', () => {
  it('is answered at once: a dent with a rim, a thud, and grains in the air', () => {
    const play = fresh()
    play.press(sand(0, 3))
    // No step has been played: the answer is in the press itself.
    expect(deltaAt(play.field, 0, 3)).toBeLessThan(-0.15)
    expect(deltaAt(play.field, DIG_RADIUS + RIM_WIDTH / 2, 3)).toBeGreaterThan(0.02)
    expect(play.grains.length).toBeGreaterThanOrEqual(8)
    const notes = heard(play)
    expect(THUD_PITCHES.some((_, i) => holds(notes, thud(i)))).toBe(true)
    expect(play.dirty).toBe(true)
    // A dent is not a groove: nothing is entered in the order the grooves were dug.
    expect(play.dug).toHaveLength(0)
    expect(play.finger).toEqual({ x: 0, z: 3, digging: true })
  })

  it('never gives the same thud twice running', () => {
    const play = fresh()
    let last = -1
    for (let i = 0; i < 30; i++) {
      play.press(sand(-8 + i * 0.5, 4))
      play.release()
      const pitch = heard(play)[0].frequency
      expect(pitch).not.toBe(last)
      last = pitch
    }
  })

  it('goes deeper in a groove, with a squelch', () => {
    const play = fresh()
    play.press(sand(0, 3))
    play.release()
    const once = deltaAt(play.field, 0, 3)
    heard(play)
    play.press(sand(0, 3))
    expect(deltaAt(play.field, 0, 3)).toBeLessThan(once - 0.1)
    expect(holds(heard(play), VOICES.squelch)).toBe(true)
  })

  it('pats raised sand flat, with a slap, and digs nothing', () => {
    const play = fresh()
    // Two grooves side by side heap a ridge between them.
    const gap = (DIG_RADIUS + RIM_WIDTH / 2) * 2
    for (const z of [2, 2 + gap]) {
      play.press(sand(-2, z))
      draw(play, -2, z, 2, z)
      play.release()
    }
    const top = 2 + gap / 2
    const before = deltaAt(play.field, 0, top)
    expect(before).toBeGreaterThan(RAISED)
    heard(play)
    const grooves = play.dug.length
    play.press(sand(0, top))
    const after = deltaAt(play.field, 0, top)
    expect(after).toBeLessThan(before)
    expect(after).toBeGreaterThan(0)
    expect(holds(heard(play), VOICES.slap)).toBe(true)
    expect(play.dug).toHaveLength(grooves)
  })
})

describe('a finger drawn through the sand', () => {
  it('opens a groove that follows it, hisses for as long as it moves, and goes quiet when it stops', () => {
    const play = fresh()
    play.press(sand(-2, 3))
    heard(play)
    draw(play, -2, 3, 2, 3)
    for (const x of [-1, 0, 1]) expect(deltaAt(play.field, x, 3)).toBeLessThan(-0.15)
    const moving = heard(play)
    expect(moving.filter((note) => note.kind === 'noise' && note.q === 1.4).length).toBeGreaterThanOrEqual(4)
    // The finger rests where it is: the grains come down, and then nothing sounds.
    steps(play, 1.5)
    heard(play)
    steps(play, 1)
    expect(heard(play)).toEqual([])
    expect(play.finger).not.toBeNull()
  })

  it('hisses higher for a faster finger', () => {
    const pitchAt = (seconds: number): number => {
      const play = fresh()
      play.press(sand(-3, 4))
      heard(play)
      draw(play, -3, 4, 3, 4, seconds)
      const hisses = heard(play).filter((note) => note.kind === 'noise' && note.q === 1.4)
      return Math.max(...hisses.map((note) => note.frequency))
    }
    expect(pitchAt(0.4)).toBeGreaterThan(pitchAt(2) + 300)
    expect(hiss(3)[0].q).toBe(1.4)
  })

  it('lets the sea in where the groove is dug down to it, with one gurgle a stroke', () => {
    const play = fresh()
    play.press(sand(0, 1))
    heard(play)
    draw(play, 0, 1, 0, -2.5, 1)
    expect(isUnderSea(play.field, 0, -2.3, SEA)).toBe(true)
    const notes = heard(play)
    expect(holds(notes, VOICES.gurgle)).toBe(true)
    expect(notes.filter((note) => note.frequency === VOICES.gurgle[0].frequency)).toHaveLength(1)
    expect(play.rings.length).toBeGreaterThan(0)
  })

  it('drops into an older groove with a crunch and no crumble at its rim, and cuts a heap with a crumble', () => {
    const play = fresh()
    play.press(sand(0, 1))
    draw(play, 0, 1, 0, 5)
    play.release()
    steps(play, 1.5)
    heard(play)
    play.press(sand(-2, 3))
    heard(play)
    draw(play, -2, 3, 2, 3)
    const notes = heard(play)
    expect(holds(notes, VOICES.crunch)).toBe(true)
    expect(holds(notes, VOICES.crumble)).toBe(false)
    // A tower stands on the beach; a stroke into it cuts the heap.
    tower(play.field, 5, 3, 0, 1)
    play.press(sand(5, 5.6))
    heard(play)
    draw(play, 5, 5.6, 5, 3)
    expect(holds(heard(play), VOICES.crumble)).toBe(true)
  })

  it('carries the same groove on when a lifted finger comes back, without digging the sand between', () => {
    const play = fresh()
    play.press(sand(-3, 3))
    draw(play, -3, 3, -1, 3)
    play.lift()
    expect(play.finger).toBeNull()
    const grooves = play.dug.length
    play.drag(2, 3, 0)
    draw(play, 2, 3, 4, 3)
    expect(deltaAt(play.field, 0.5, 3)).toBe(0)
    expect(deltaAt(play.field, 3, 3)).toBeLessThan(-0.15)
    expect(play.dug).toHaveLength(grooves)
  })

  it('leaves what was dug when the touch ends, however it ends', () => {
    const play = fresh()
    play.press(sand(-2, 3))
    draw(play, -2, 3, 0, 3)
    play.release()
    expect(play.finger).toBeNull()
    expect(deltaAt(play.field, -1, 3)).toBeLessThan(-0.15)
    // A move that arrives after the end digs nothing.
    play.drag(3, 3, 0)
    expect(deltaAt(play.field, 3, 3)).toBe(0)
  })
})

describe('everything else a finger lands on', () => {
  it('answers as itself, each with its own sound', () => {
    const play = fresh()
    const answers: [string, () => void, readonly Note[]][] = [
      ['the crab', () => play.press({ kind: 'folk', who: 'crab', index: 0 }), VOICES.clack],
      ['the starfish', () => play.press({ kind: 'folk', who: 'starfish', index: 0 }), VOICES.squeak],
      ['a gull', () => play.press({ kind: 'folk', who: 'gull', index: 1 }), VOICES.squawk],
      ['the eel', () => play.press({ kind: 'folk', who: 'eel', index: 0 }), VOICES.bloop],
      ['a rock', () => play.press({ kind: 'rock', x: 5, y: 1.4, z: 6 }), VOICES.knock],
      ['a cloud', () => play.press({ kind: 'cloud', index: 0 }), VOICES.puff],
      ['the sky', () => play.press({ kind: 'sky', x: 0 }), VOICES.breath],
      ['the sea', () => play.press({ kind: 'water', x: 0, z: -8 }), VOICES.plip],
    ]
    for (const [name, touch, voice] of answers) {
      steps(play, 1.5)
      heard(play)
      touch()
      play.step(DT)
      expect(holds(heard(play), voice), name).toBe(true)
      play.release()
    }
  })

  it('pushes the cloud nearest a touch on the sky, and squashes a cloud that is touched', () => {
    const play = fresh()
    play.press({ kind: 'sky', x: CLOUDS[1].x + 1 })
    steps(play, 0.5)
    expect(play.clouds[1].slide).toBeGreaterThan(0.3)
    // The others only drift.
    expect(play.clouds[0].slide).toBeLessThan(0.1)
    play.press({ kind: 'cloud', index: 0 })
    steps(play, 0.1)
    expect(play.clouds[0].squash).toBeGreaterThan(0.1)
    steps(play, 4)
    expect(Math.abs(play.clouds[0].squash)).toBeLessThan(0.02)
  })

  it('splashes in the sea: a ring spreads and drops jump', () => {
    const play = fresh()
    play.press({ kind: 'water', x: 1, z: -8 })
    expect(play.rings).toHaveLength(1)
    expect(play.grains.every((grain) => grain.wet)).toBe(true)
    expect(play.grains.length).toBeGreaterThan(4)
    steps(play, 2)
    expect(play.rings).toHaveLength(0)
  })

  it('sheds a few grains from a knocked rock, and the crab snaps at one that lands on it', () => {
    const play = fresh()
    play.press({ kind: 'rock', x: play.folk.crab.x, y: base(play.folk.crab.z) + 1.5, z: play.folk.crab.z - 0.9 })
    heard(play)
    steps(play, 1.2)
    expect(play.grains).toHaveLength(0)
    expect(holds(heard(play), VOICES.clack)).toBe(true)
  })
})

describe('the beach over time', () => {
  it('plays no time in a frame of no time', () => {
    const play = fresh()
    play.press(sand(0, 3))
    heard(play)
    const before = JSON.stringify([play.grains, play.time, play.sea, play.folk.crab.x])
    play.step(0)
    expect(JSON.stringify([play.grains, play.time, play.sea, play.folk.crab.x])).toBe(before)
    expect(heard(play)).toEqual([])
  })

  it('brings every grain down, with ticks, and never holds more than its most', () => {
    const play = fresh()
    for (let i = 0; i < 60; i++) {
      play.press(sand(-6 + (i % 20) * 0.6, 2 + Math.floor(i / 20)))
      play.release()
    }
    expect(play.grains.length).toBeLessThanOrEqual(MOST_GRAINS)
    heard(play)
    steps(play, 2)
    expect(play.grains).toHaveLength(0)
    expect(heard(play).some((note) => note.kind === 'noise' && note.q === 6)).toBe(true)
  })

  it('keeps the sea lapping a little either side of low tide', () => {
    const play = fresh()
    let low = Infinity, high = -Infinity
    for (let t = 0; t < 20; t += DT) {
      play.step(DT)
      low = Math.min(low, play.sea)
      high = Math.max(high, play.sea)
    }
    expect(low).toBeLessThan(SEA - 0.02)
    expect(high).toBeGreaterThan(SEA + 0.02)
    expect(high - low).toBeLessThan(0.1)
  })
})

describe('found as left', () => {
  const stored = (play: Play): unknown => JSON.parse(JSON.stringify(serializeKingdom(play.toState())))

  it('saves the sand as it was dug and opens on it, with nothing in the air and nothing sounding', () => {
    const play = fresh()
    play.press(sand(-2, 3))
    draw(play, -2, 3, 2, 4)
    // Put away with the finger still down and grains still flying.
    const saved = stored(play)
    const back = new Play(deserializeKingdom(saved, 5), 99)
    for (const [x, z] of [[-2, 3], [0, 3.5], [2, 4], [5, 5]] as const) expect(deltaAt(back.field, x, z)).toBeCloseTo(deltaAt(play.field, x, z), 2)
    expect(back.dug).toEqual(play.dug)
    expect(back.grains).toHaveLength(0)
    expect(back.voices).toHaveLength(0)
    expect(back.finger).toBeNull()
    expect(back.dirty).toBe(false)
    // Opened and put away again with no touch, the save is the same.
    back.step(DT)
    expect(stored(back)).toEqual(saved)
  })

  it('opens the same beach whatever the age, and a first visit on a smooth one', () => {
    const play = fresh()
    play.press(sand(1, 2))
    const saved = stored(play)
    for (const age of [null, 3, 7]) expect(stored(new Play(deserializeKingdom(saved, age), 1))).toEqual(saved)
    expect(stored(fresh())).toEqual({ v: 1, position: 'shore', finished: false, sand: '', dug: [], sun: 'up', ...writeThings(firstThings(null)) })
  })

  it('remembers where the newest grooves began, and no more than the water needs', () => {
    const play = fresh()
    for (let i = 0; i < 30; i++) {
      const x = -9 + i * 0.6
      play.press(sand(x, 2))
      draw(play, x, 2, x, 3.4, 0.2)
      play.release()
    }
    const saved = stored(play) as { dug: number[] }
    expect(saved.dug).toHaveLength(24)
    expect(saved.dug).toEqual(play.dug)
  })

  it('enters every groove the child digs in the order, wherever it began, and never a dent', () => {
    const play = fresh()
    // Thirty taps all over the beach: thirty dents, and no groove.
    for (let i = 0; i < 30; i++) {
      play.press(sand(-8 + i * 0.55, 6))
      play.release()
    }
    expect(play.dug).toHaveLength(0)
    // One begun on level sand.
    play.press(sand(-6, 2))
    draw(play, -6, 2, -6, 4)
    play.release()
    expect(play.dug).toHaveLength(1)
    // One begun out at sea and drawn ashore: it is a groove from where the sand is first dug to a groove's depth.
    play.press({ kind: 'water', x: -2, z: -6 })
    draw(play, -2, -6, -2, 0, 0.8)
    play.release()
    expect(play.dug).toHaveLength(2)
    // One begun in the shallow water at the sea's edge.
    play.press({ kind: 'water', x: 2, z: -3.1 })
    draw(play, 2, -3.1, 2, -0.5, 0.6)
    play.release()
    expect(play.dug).toHaveLength(3)
    // One begun on raised sand: through the heap and on across the level sand.
    tower(play.field, 5, 3, 0, 1)
    play.press(sand(5, 3))
    draw(play, 5, 3, 7.5, 3, 0.6)
    play.release()
    expect(play.dug).toHaveLength(4)
    // One begun in the water of a groove that the sea has already come into.
    play.press(sand(-2, -1))
    draw(play, -2, -1, 0, -0.6, 0.6)
    play.release()
    expect(play.dug).toHaveLength(5)
    // The earlier grooves keep their rank: each was entered once, in the order they were dug.
    expect(new Set(play.dug).size).toBe(play.dug.length)
  })
})
