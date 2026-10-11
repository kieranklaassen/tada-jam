import { describe, expect, it } from 'vitest'
import type { Note, Voice } from './audio'
import { GRID } from './pairings'
import { ACTS, Bus, TIPTOE, VARIANTS, notesOf, notesOfAll } from './voices'
import { PLACE_IDS, THINGS } from './yard'

const names = Object.keys(VARIANTS) as (keyof typeof VARIANTS)[]

function inRange(note: Note, what: string): void {
  expect(note.frequency, what).toBeGreaterThanOrEqual(50)
  expect(note.frequency, what).toBeLessThanOrEqual(6000)
  if (note.glideTo !== undefined) { expect(note.glideTo, what).toBeGreaterThanOrEqual(50); expect(note.glideTo, what).toBeLessThanOrEqual(6000) }
  expect(note.peak, what).toBeGreaterThan(0)
  expect(note.peak, what).toBeLessThanOrEqual(0.42)
  expect(note.attack, what).toBeGreaterThan(0)
  expect((note.delay ?? 0) + note.attack + note.decay, what).toBeLessThanOrEqual(1.25)
}

describe('the voices, which nobody has heard', () => {
  it('keeps every note of every sound in range: a pitch a tablet can play, a peak that does not clip, a short length', () => {
    for (const name of names) {
      for (let n = 0; n < VARIANTS[name]; n++) {
        const notes = notesOf({ name, n })
        expect(notes.length, `${name} ${n}`).toBeGreaterThan(0)
        for (const note of notes) inRange(note, `${name} ${n}`)
      }
    }
  })

  it('gives each of the six things its own sound when lifted and its own when set down', () => {
    for (const name of ['lift', 'land'] as const) {
      const voices = Array.from({ length: 6 }, (_, n) => JSON.stringify(notesOf({ name, n })))
      expect(new Set(voices).size).toBe(6)
      const first = Array.from({ length: 6 }, (_, n) => `${notesOf({ name, n })[0].kind} ${notesOf({ name, n })[0].frequency}`)
      expect(new Set(first).size, `${name}: no two start on the same note`).toBe(6)
    }
    expect(new Set(Array.from({ length: 5 }, (_, n) => JSON.stringify(notesOf({ name: 'poke', n })))).size).toBe(5)
  })

  it('walks the tiptoe tune one note a push, and plays it lower for a raccoon that carries', () => {
    const light = TIPTOE.map((_, n) => notesOf({ name: 'step', n })[0].frequency)
    const laden = TIPTOE.map((_, n) => notesOf({ name: 'step', n: n + 12 })[0].frequency)
    expect(new Set(light.map((f) => Math.round(f))).size).toBeGreaterThanOrEqual(5)
    light.forEach((f, i) => expect(laden[i]).toBeLessThan(f))
  })

  it('joins everything one touch sets off into one voice', () => {
    expect(notesOfAll([{ name: 'ruffle', n: 0 }, { name: 'aim', n: 0 }])).toHaveLength(notesOf({ name: 'ruffle', n: 0 }).length + notesOf({ name: 'aim', n: 0 }).length)
  })

  it('keeps her footsteps far quieter than anything a touch sets off', () => {
    expect(Math.max(...notesOf({ name: 'waddle', n: 0 }).map((note) => note.peak))).toBeLessThan(0.05)
  })

  it('keeps every sound of the pairings in the same range, over within a second and a quarter and never longer than twice its act', () => {
    for (const [name, notes] of Object.entries(ACTS)) for (const note of notes) inRange(note, name)
    for (const thing of THINGS) for (const place of PLACE_IDS) for (const act of GRID[thing][place].acts) {
      if (!act.sound) continue
      const lasts = Math.max(...ACTS[act.sound].map((note) => (note.delay ?? 0) + note.attack + note.decay))
      expect(lasts, `${thing} ${place} ${act.sound}`).toBeLessThanOrEqual(Math.max(0.5, act.len * 2))
    }
    expect(new Set(Object.values(ACTS).map((notes) => JSON.stringify(notes))).size).toBe(Object.keys(ACTS).length)
  })

  it('answers every tap that sends the raccoon with the first plucked note, lower when it carries, and drops the peg\'s tok on bare floor only', () => {
    const plucked = (n: number): number => notesOf({ name: 'aim', n }).find((note) => note.kind === 'tone' && note.wave === 'triangle' && note.glideTo === undefined)!.frequency
    expect(plucked(0)).toBe(notesOf({ name: 'step', n: 0 })[0].frequency)
    expect(plucked(2)).toBe(plucked(0))
    expect(plucked(1)).toBeLessThan(plucked(0))
    expect(plucked(3)).toBe(plucked(1))
    for (const n of [0, 1]) expect(notesOf({ name: 'aim', n }).some((note) => note.kind === 'noise')).toBe(true)
    for (const n of [2, 3]) expect(notesOf({ name: 'aim', n }).some((note) => note.kind === 'noise')).toBe(false)
  })

  it('lands the alarm clock with a clank, one ding and two last ticks, and then it is quiet', () => {
    const notes = notesOf({ name: 'land', n: THINGS.indexOf('clock') })
    expect(notes.map((note) => note.kind)).toEqual(['noise', 'tone', 'noise', 'noise'])
    const delays = notes.map((note) => note.delay ?? 0)
    expect(delays).toEqual([...delays].sort((a, b) => a - b))
    expect(Math.max(...notes.map((note) => (note.delay ?? 0) + note.attack + note.decay))).toBeLessThan(1)
  })

  it('whistles two notes when there is something to tidy and one falling note when there is not', () => {
    expect(notesOf({ name: 'whistle', n: 1 })).toHaveLength(2)
    const one = notesOf({ name: 'whistle', n: 0 })
    expect(one).toHaveLength(1)
    expect(one[0].glideTo).toBeLessThan(one[0].frequency)
  })

  it('makes no sound for a hush or for an act it does not know', () => {
    expect(notesOf({ name: 'hush', n: 0 })).toEqual([])
    expect(notesOf({ name: 'act', n: 0, sound: 'no such sound' })).toEqual([])
    expect(notesOf({ name: 'act', n: 0, sound: 'ring' }).length).toBeGreaterThan(0)
  })
})

describe('the bus that a touch can hush', () => {
  type FakeGain = { gain: { calls: string[]; value: number; cancelScheduledValues(at: number): void; setValueAtTime(value: number, at: number): void; setTargetAtTime(value: number, at: number, over: number): void }; connect(to: unknown): void; disconnect(): void; to: unknown }
  const fake = (): { context: AudioContext; gains: FakeGain[] } => {
    const gains: FakeGain[] = []
    const context = {
      createGain: () => {
        const calls: string[] = []
        const gain: FakeGain = {
          gain: { calls, value: 1, cancelScheduledValues: () => { calls.push('cancel') }, setValueAtTime: (value) => { calls.push(`set ${value}`) }, setTargetAtTime: (value) => { calls.push(`fade ${value}`) } },
          connect(to) { this.to = to },
          disconnect() { this.to = null; calls.push('off') },
          to: null,
        }
        gains.push(gain)
        return gain
      },
    } as unknown as AudioContext
    return { context, gains }
  }

  it('sends every voice through one node, and at a hush fades that node and gives what follows a fresh one', () => {
    const bus = new Bus(), { context, gains } = fake()
    const out = {} as AudioNode
    const through: unknown[] = []
    const voice: Voice = (_context, node) => { through.push(node) }
    bus.through(voice, false)(context, out, 1)
    bus.through(voice, false)(context, out, 2)
    expect(gains).toHaveLength(1)
    expect(through).toEqual([gains[0], gains[0]])
    expect(gains[0].to).toBe(out)
    bus.through(voice, true)(context, out, 3)
    expect(gains).toHaveLength(2)
    expect(gains[0].gain.calls).toEqual(['set 1', 'cancel', 'fade 0'])
    expect(through[2]).toBe(gains[1])
    expect(gains[1].gain.calls).toEqual(['set 1'])
  })

  it('cuts what is sounding at once when the game is put away: no fade is scheduled, the node is silent and off the output, and what follows gets a fresh one', () => {
    const bus = new Bus(), { context, gains } = fake()
    const out = {} as AudioNode
    bus.cut()
    bus.through(() => {}, false)(context, out, 1)
    bus.cut()
    expect(gains[0].gain.calls).toEqual(['set 1', 'cancel', 'off'])
    expect(gains[0].gain.value).toBe(0)
    expect(gains[0].to).toBeNull()
    bus.through(() => {}, false)(context, out, 2)
    expect(gains).toHaveLength(2)
    expect(gains[1].to).toBe(out)
  })

  it('hushes nothing when nothing has sounded yet, and starts again on a new audio context', () => {
    const bus = new Bus(), first = fake(), second = fake()
    const voice: Voice = () => {}
    bus.through(voice, true)(first.context, {} as AudioNode, 0)
    expect(first.gains).toHaveLength(1)
    bus.through(voice, true)(second.context, {} as AudioNode, 0)
    expect(second.gains).toHaveLength(1)
    expect(first.gains[0].gain.calls).toEqual(['set 1'])
  })
})
