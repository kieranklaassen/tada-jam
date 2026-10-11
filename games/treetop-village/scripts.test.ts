import { describe, expect, it } from 'vitest'
import type { Note } from './audio'
import { PERSONALITY, REST, gaitPose, idlePose, makeOn, type On, type Pose } from './motion'
import { RUN_SECONDS, aboard, ask, beatsBegun, board, everyMeeting, flourish, grip, meeting, notesBegun, playAt, ride, stretch, wait, type Script } from './scripts'
import { FOLK, type Fit, type Folk } from './tree'
import { KINDS, meet, type Kind } from './ways'

// One timeline: a script's beats say where the walker is, what its card and
// its piece do, and what sounds. These tests walk every cell of the grid and
// every other script, and fail when a note would sound while its maker is
// not drawn doing anything, or goes on long after it has stopped.

/** How long after its beat a note may still ring: the tail of a bell or a hoot. */
const TAIL = 0.5

const state = (on: On): number[] => [on.along, on.hang, on.sink, on.seat ? 1 : 0, ...Object.values(on.pose), ...Object.values(on.piece)]
const at = (script: Script, t: number): number[] => state(playAt(script, t, makeOn()))
const trace = (script: Script, samples = 48): string => Array.from({ length: samples + 1 }, (_, i) => at(script, (script.seconds * i) / samples).map((n) => n.toFixed(3)).join(',')).join(';')
const heard = (script: Script): string => JSON.stringify(script.beats.map((beat) => [beat.at.toFixed(3), beat.sound]))
const starts = (note: Note): number => note.delay ?? 0
const ends = (note: Note): number => starts(note) + note.attack + note.decay

type Named = { name: string; script: Script }

/** The fifty-six meetings: each walker at each piece, fitted both ways. A walker who is carried meets the bucket by getting in, and then by the ride. */
const cells = (): (Named & { folk: Folk; kind: Kind; fit: Fit; up: boolean; scripts: Script[] })[] => {
  const all = everyMeeting().map((cell) => {
    const script = meeting(cell.folk, cell.kind, cell.fit, cell.up, cell.place)
    return { ...cell, name: `${cell.folk} at a ${cell.kind} on a ${cell.fit}, ${cell.up ? 'from its first end' : 'from its far end'}`, script, scripts: [script] }
  })
  for (const folk of ['owl', 'mice', 'beetle'] as const) for (const fit of ['rise', 'span'] as const) {
    all.push({ folk, kind: 'bucket', fit, up: true, place: -1, name: `${folk} in a bucket on a ${fit}`, script: board(folk), scripts: [board(folk), ride(folk, fit)] })
  }
  return all
}

const others = (): Named[] => [
  ...FOLK.flatMap((folk) => [
    { name: `the flourish of ${folk}`, script: flourish(folk) },
    { name: `the asking of ${folk}`, script: ask(folk) },
    { name: `${folk} holding on`, script: grip(folk) },
    { name: `the stretch of ${folk}`, script: stretch(folk) },
  ]),
  ...(['owl', 'mice', 'beetle'] as const).flatMap((folk) => [
    { name: `${folk} getting into a bucket`, script: board(folk) },
    { name: `${folk} finding the bucket away`, script: wait(folk) },
    { name: `${folk} riding up`, script: ride(folk, 'rise') },
    { name: `${folk} riding across`, script: ride(folk, 'span') },
  ]),
  { name: 'a bucket running empty on a rise', script: ride(null, 'rise') },
  { name: 'a bucket running empty on a span', script: ride(null, 'span') },
]

const everyScript = (): Named[] => [...cells().flatMap((cell) => cell.scripts.map((script) => ({ name: cell.name, script }))), ...others()]

describe('one timeline for what is seen and what is heard', () => {
  it('sounds a note only in a beat in which its maker is drawn doing something', () => {
    const still: string[] = []
    for (const { name, script } of everyScript()) {
      for (const beat of script.beats) {
        if (beat.sound.length === 0) continue
        const where = `${name}, the beat at ${beat.at.toFixed(2)} s`
        // Something moves all through the beat: its moments do not look alike.
        const moments = new Set(Array.from({ length: 11 }, (_, i) => at(script, beat.at + (beat.lasts * (i + 0.37)) / 11).map((n) => n.toFixed(3)).join(',')))
        if (beat.act === null || moments.size < 5) still.push(where)
      }
    }
    expect(still).toEqual([])
  })

  it('starts every note inside its own beat, and lets none ring on long after the beat is over', () => {
    const stray: string[] = []
    for (const { name, script } of everyScript()) {
      for (const beat of script.beats) {
        for (const note of beat.sound) {
          const where = `${name}, the beat at ${beat.at.toFixed(2)} s lasting ${beat.lasts.toFixed(2)} s: a note from ${starts(note).toFixed(2)} to ${ends(note).toFixed(2)} s`
          if (starts(note) < 0 || starts(note) >= Math.max(beat.lasts, 0.05) || ends(note) > beat.lasts + TAIL) stray.push(where)
        }
      }
    }
    expect(stray).toEqual([])
  })

  it('is heard from its first moment and is never silent for long: a walker on a piece can be heard doing it', () => {
    const silent: string[] = []
    for (const { name, script } of everyScript()) {
      const notes = script.beats.flatMap((beat) => beat.sound.map((note) => ({ from: beat.at + starts(note), to: beat.at + ends(note) })))
      expect(notes.length, name).toBeGreaterThan(0)
      // The longest stretch with nothing sounding, from the start of the script to its end.
      let quiet = 0, until = 0
      for (const note of [...notes].sort((a, b) => a.from - b.from)) { quiet = Math.max(quiet, note.from - until); until = Math.max(until, note.to) }
      quiet = Math.max(quiet, script.seconds - until)
      if (quiet > 1.6) silent.push(`${name}: ${quiet.toFixed(2)} s`)
    }
    expect(silent).toEqual([])
  })

  it('hands out each beat once, at the moment it begins', () => {
    for (const { name, script } of everyScript()) {
      let begun = beatsBegun(script, -1, 0).length
      for (let t = 0; t < script.seconds + 0.1; t += 1 / 60) begun += beatsBegun(script, t, t + 1 / 60).length
      expect(begun, name).toBe(script.beats.length)
      expect(script.beats[0].at, name).toBe(0)
    }
  })
})

describe('the grid, cell by cell', () => {
  it('has fifty-six meetings', () => {
    expect(new Set(cells().map((cell) => `${cell.folk}:${cell.kind}:${cell.fit}`)).size).toBe(FOLK.length * KINDS.length * 2)
  })

  it('looks like no other cell: no two meetings move the same way', () => {
    // A bucket on a rise runs up the tree and on a span along a line: the same waiting, another journey.
    const look = cells().map((cell) => ({ name: cell.name, key: `${cell.folk}:${cell.kind}:${cell.fit}`, value: cell.scripts.map((script) => trace(script)).join('|') + (cell.kind === 'bucket' && cell.folk !== 'squirrel' ? cell.fit : '') }))
    const alike: string[] = []
    for (let i = 0; i < look.length; i++) for (let j = i + 1; j < look.length; j++) if (look[i].key !== look[j].key && look[i].value === look[j].value) alike.push(`${look[i].name} and ${look[j].name}`)
    expect(alike).toEqual([])
  })

  it('sounds like no other cell: no two meetings are the same notes', () => {
    const sound = cells().map((cell) => ({ name: cell.name, key: `${cell.folk}:${cell.kind}:${cell.fit}`, value: cell.scripts.map(heard).join('|') }))
    const alike: string[] = []
    for (let i = 0; i < sound.length; i++) for (let j = i + 1; j < sound.length; j++) if (sound[i].key !== sound[j].key && sound[i].value === sound[j].value) alike.push(`${sound[i].name} and ${sound[j].name}`)
    expect(alike).toEqual([])
  })

  it('ends where the grid says: across at the far end, a stay where it began', () => {
    const wrong: string[] = []
    for (const cell of cells()) {
      if (cell.kind === 'bucket' && cell.folk !== 'squirrel') continue
      const end = playAt(cell.script, cell.script.seconds, makeOn())
      const far = meet(cell.folk, cell.kind, cell.fit, cell.up) === 'across' ? 1 : 0
      // It ends standing on a landing, out of the piece and off its seat.
      if (Math.abs(playAt(cell.script, 0, makeOn()).along) > 0.05 || Math.abs(end.along - far) > 0.01 || Math.abs(end.hang) > 0.5 || Math.abs(end.sink) > 0.5 || end.seat) wrong.push(`${cell.name}: ends at ${end.along.toFixed(2)}, hanging ${end.hang.toFixed(1)}, sunk ${end.sink.toFixed(1)}`)
    }
    expect(wrong).toEqual([])
  })

  it('takes a time a child can watch, and stays on the piece all the way', () => {
    for (const cell of cells()) {
      expect(cell.script.seconds, cell.name).toBeGreaterThanOrEqual(0.45)
      expect(cell.script.seconds, cell.name).toBeLessThanOrEqual(8)
      for (let i = 0; i <= 60; i++) {
        const on = playAt(cell.script, (cell.script.seconds * i) / 60, makeOn())
        for (const n of state(on)) expect(Number.isFinite(n), cell.name).toBe(true)
        expect(on.along, cell.name).toBeGreaterThanOrEqual(-0.06)
        expect(on.along, cell.name).toBeLessThanOrEqual(1.06)
        expect(on.pose.squash, cell.name).toBeGreaterThan(0.5)
        expect(on.pose.squash, cell.name).toBeLessThan(1.6)
        expect(on.pose.puff, cell.name).toBeGreaterThan(0.5)
        expect(on.pose.puff, cell.name).toBeLessThanOrEqual(2)
      }
    }
  })

  it('keeps a ride as long as the bucket runs, and leaves a walker in its bucket as it got in', () => {
    for (const folk of ['owl', 'mice', 'beetle'] as const) {
      for (const fit of ['rise', 'span'] as const) expect(ride(folk, fit).seconds).toBeCloseTo(RUN_SECONDS)
      // Getting in ends in the pose it waits in: nothing jumps when the script is over.
      const got = playAt(board(folk), board(folk).seconds, makeOn()), waits = aboard(folk, 0, makeOn())
      expect(got.sink, folk).toBeCloseTo(waits.sink, 0)
      expect(got.piece.sag, folk).toBeCloseTo(waits.piece.sag, 0)
      expect(got.seat && waits.seat).toBe(true)
    }
    for (const fit of ['rise', 'span'] as const) expect(ride(null, fit).seconds).toBeCloseTo(RUN_SECONDS)
  })
})

describe('sound is handed over as the timeline reaches it', () => {
  it('hands over every note of every script exactly once, at whatever pace the script is stepped, and none before its time', () => {
    for (const { name, script } of everyScript()) {
      const all = script.beats.reduce((sum, beat) => sum + beat.sound.length, 0)
      for (const dt of [1 / 60, 1 / 23, 0.31]) {
        let got = notesBegun(script, -1, 0).length
        for (let t = 0; t < script.seconds; t += dt) {
          const to = Math.min(script.seconds, t + dt)
          const notes = notesBegun(script, t, to)
          // Each is ready to sound at once: nothing is scheduled ahead of the picture.
          expect(notes.every((note) => !note.delay), name).toBe(true)
          got += notes.length
        }
        expect(got, `${name} at steps of ${dt.toFixed(3)}`).toBe(all)
      }
      // Up to any moment, only the notes whose time has come.
      for (let i = 0; i <= 10; i++) {
        const t = (script.seconds * i) / 10
        const due = script.beats.reduce((sum, beat) => sum + beat.sound.filter((note) => beat.at + (note.delay ?? 0) <= t).length, 0)
        expect(notesBegun(script, -1, t).length, `${name} at ${t.toFixed(2)}`).toBe(due)
      }
    }
  })

  it('leaves out the beats before the one it is told to start from', () => {
    const script = flourish('squirrel')
    const first = script.beats[0].sound.length
    expect(first).toBeGreaterThan(0)
    expect(notesBegun(script, -1, script.seconds, 1).length).toBe(script.beats.reduce((sum, beat) => sum + beat.sound.length, 0) - first)
  })
})

describe('every walker moves like itself', () => {
  const pose = (): Pose => ({ ...REST })
  const sampled = (make: (u: number) => Pose): string => Array.from({ length: 24 }, (_, i) => Object.values(make(i / 24)).map((n) => n.toFixed(3)).join(',')).join(';')
  const pairs: [Folk, Folk][] = FOLK.flatMap((a, i) => FOLK.slice(i + 1).map((b): [Folk, Folk] => [a, b]))

  it('shares no number of its personality with another walker', () => {
    for (const key of Object.keys(PERSONALITY.squirrel) as (keyof typeof PERSONALITY.squirrel)[]) expect(new Set(FOLK.map((folk) => PERSONALITY[folk][key])).size, key).toBe(FOLK.length)
  })

  it('shares no idle, gait, flourish, asking, stretch or way of holding on with another walker', () => {
    for (const [a, b] of pairs) {
      expect(sampled((u) => idlePose(a, u * 12, pose())), `${a} and ${b} at rest`).not.toBe(sampled((u) => idlePose(b, u * 12, pose())))
      expect(sampled((u) => gaitPose(a, u * 2, pose())), `${a} and ${b} walking`).not.toBe(sampled((u) => gaitPose(b, u * 2, pose())))
      for (const make of [flourish, ask, stretch]) expect(trace(make(a)), `${a} and ${b}`).not.toBe(trace(make(b)))
      expect(heard(grip(a)), `${a} and ${b} holding on`).not.toBe(heard(grip(b)))
    }
  })

  it('is alive at rest: every walker moves while it stands', () => {
    for (const folk of FOLK) expect(new Set(sampled((u) => idlePose(folk, u * 12, pose())).split(';')).size).toBeGreaterThan(6)
  })
})
