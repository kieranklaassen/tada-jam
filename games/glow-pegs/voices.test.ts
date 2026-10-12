import { describe, expect, it } from 'vitest'
import { COLOURS, ROWS } from './board'
import { CUE_NAMES, MOST_VOICES, heardSteps, notesOf, pitchOf, type Cue, type CueName } from './voices'

// Nobody on the machine that wrote these sounds could hear them. These tests hold each one in a range that is
// safe for a small child's ears and a tablet's speaker, and hold the sounds that must be told apart, apart.

const NAMES: readonly CueName[] = CUE_NAMES

/** Every cue the game can give: each name with each colour, on the lowest and the highest row, alone and in a chord, with each count. */
function everyCue(): Cue[] {
  const cues: Cue[] = []
  for (const name of NAMES) for (const colour of COLOURS) for (const steps of [[0], [ROWS - 1], [0, 2, 4, 6], [0, 1, 2, 3, 4, 5, 6]]) for (const n of [0, 1, 3, 10]) cues.push({ name, colour, steps, n })
  return cues
}

describe('every sound of the toy', () => {
  it('has a voice, for every colour, row and count', () => {
    for (const cue of everyCue()) expect(notesOf(cue).length, JSON.stringify(cue)).toBeGreaterThan(0)
    for (const name of NAMES) expect(notesOf({ name }).length, name).toBeGreaterThan(0)
  })

  it('starts when it is asked for: no note hides a delay inside itself', () => {
    for (const cue of everyCue()) for (const note of notesOf(cue)) expect(note.delay, JSON.stringify(cue)).toBeUndefined()
  })

  it('is in range: a pitch a tablet can play, a soft peak, a quick attack and a short tail', () => {
    for (const cue of everyCue()) {
      const notes = notesOf(cue), label = JSON.stringify(cue)
      for (const note of notes) {
        for (const pitch of [note.frequency, note.glideTo ?? note.frequency]) {
          expect(pitch, label).toBeGreaterThanOrEqual(40)
          expect(pitch, label).toBeLessThanOrEqual(6000)
        }
        expect(note.peak, label).toBeGreaterThan(0)
        expect(note.peak, label).toBeLessThanOrEqual(0.3)
        expect(note.attack, label).toBeGreaterThan(0)
        expect(note.attack, label).toBeLessThanOrEqual(0.1)
        expect(note.decay, label).toBeGreaterThan(0)
        expect(note.attack + note.decay, label).toBeLessThanOrEqual(1.4)
      }
      // All the notes of one cue start together, so their peaks add.
      expect(notes.reduce((sum, note) => sum + note.peak, 0), label).toBeLessThanOrEqual(0.62)
      expect(notes.length, label).toBeLessThanOrEqual(2 + MOST_VOICES * 2)
    }
  })

  it('answers the touch at once: the click of a peg peaks within a hundredth of a second', () => {
    for (const colour of COLOURS) expect(Math.min(...notesOf({ name: 'click', colour, steps: [3] }).map((note) => note.attack))).toBeLessThanOrEqual(0.01)
  })
})

describe('many pegs sounded at once', () => {
  it('are one sound event: at most three voices, the lowest, the highest and one between, and no louder than one peg', () => {
    expect(MOST_VOICES).toBe(3)
    expect(heardSteps([4])).toEqual([4])
    expect(heardSteps([2, 2, 2])).toEqual([2])
    expect(heardSteps([0, 1, 2, 3, 4, 5, 6])).toHaveLength(3)
    expect(heardSteps([0, 1, 2, 3, 4, 5, 6])).toContain(0)
    expect(heardSteps([0, 1, 2, 3, 4, 5, 6])).toContain(6)
    const loud = (cue: Cue) => Math.sqrt(notesOf(cue).filter((note) => note.kind === 'tone').reduce((sum, note) => sum + note.peak * note.peak, 0))
    for (const name of ['click', 'beam', 'pull'] as const) for (const colour of [1, 2, 3, 4] as const) {
      const one = notesOf({ name, colour, steps: [3] }), seven = notesOf({ name, colour, steps: [0, 1, 2, 3, 4, 5, 6] })
      expect(seven.length, name).toBeLessThanOrEqual(one.length * MOST_VOICES)
      expect(loud({ name, colour, steps: [0, 1, 2, 3, 4, 5, 6] }), `${name} ${colour}`).toBeLessThanOrEqual(loud({ name, colour, steps: [3] }) * 1.05)
    }
  })

  it('sounds a half beam\'s pegs at half the strength of the beam\'s', () => {
    for (const colour of COLOURS) {
      const full = notesOf({ name: 'beam', colour, steps: [3], n: 0 }), half = notesOf({ name: 'beam', colour, steps: [3], n: 1 })
      expect(half.map((note) => note.peak)).toEqual(full.map((note) => note.peak * 0.5))
    }
  })
})

describe('the scale', () => {
  it('rises step by step and holds at either end', () => {
    for (let step = 1; step <= 10; step++) expect(pitchOf(step)).toBeGreaterThan(pitchOf(step - 1))
    expect(pitchOf(-4)).toBe(pitchOf(0))
    expect(pitchOf(99)).toBe(pitchOf(10))
  })

  it('makes a higher row a higher note, and each echo a step above the one before', () => {
    const top = (cue: Cue) => Math.max(...notesOf(cue).filter((note) => note.kind === 'tone' && note.peak >= 0.1).map((note) => note.frequency))
    for (const colour of [1, 2, 3, 4] as const) {
      expect(top({ name: 'click', colour, steps: [6] }), `colour ${colour}`).toBeGreaterThan(top({ name: 'click', colour, steps: [0] }))
      // An echo is asked for one step above the peg before it (toy.test.ts), and a step up is a higher note.
      expect(top({ name: 'click', colour, steps: [3] })).toBeGreaterThan(top({ name: 'click', colour, steps: [2] }))
    }
    expect(top({ name: 'bell', steps: [6] })).toBeGreaterThan(top({ name: 'bell', steps: [0] }))
  })
})

describe('the sounds that must be told apart', () => {
  const same = (a: Cue, b: Cue) => JSON.stringify(notesOf(a)) === JSON.stringify(notesOf(b))

  it('gives each colour its own voice going in, coming out, knocked out and landing', () => {
    for (const name of ['knock', 'pull', 'land', 'beam', 'drop', 'mothTaste', 'spiderTaste', 'geckoTaste'] as const) {
      for (const a of COLOURS) for (const b of COLOURS) if (a < b) expect(same({ name, colour: a, steps: [3] }, { name, colour: b, steps: [3] }), `${name} ${a} and ${b}`).toBe(false)
    }
    // Going in, white is the bare click and its bell follows; the other four differ from each other and from it.
    for (const a of COLOURS) for (const b of COLOURS) if (a < b) expect(same({ name: 'click', colour: a, steps: [3] }, { name: 'click', colour: b, steps: [3] })).toBe(false)
  })

  it('gives a peg pulled out a falling voice and a peg pushed in one that does not fall', () => {
    for (const colour of [1, 3, 5] as const) {
      const out = notesOf({ name: 'pull', colour, steps: [3] }).filter((note) => note.glideTo !== undefined && note.glideTo < note.frequency)
      expect(out.length, `colour ${colour}`).toBeGreaterThan(0)
    }
    // Blue pulled out is a soft hum that fades where it is: lower than its note going in, and it does not slide.
    const hum = notesOf({ name: 'pull', colour: 2, steps: [3] }).filter((note) => note.peak >= 0.1)
    expect(hum.every((note) => note.glideTo === undefined && note.frequency < pitchOf(3))).toBe(true)
  })

  it('gives no two of the cabinet\'s own sounds the same voice', () => {
    const own: CueName[] = ['well', 'button', 'grip', 'lever', 'rattle', 'clunk', 'pat', 'squeak', 'tink', 'flutter', 'leaf', 'boing', 'twang', 'drum', 'baton', 'chirp', 'slip', 'catch', 'flick', 'thump', 'pluck', 'hop', 'trap']
    for (let i = 0; i < own.length; i++) for (let j = i + 1; j < own.length; j++) expect(same({ name: own[i] }, { name: own[j] }), `${own[i]} and ${own[j]}`).toBe(false)
  })
})

describe('the three mirror keys', () => {
  const key = (n: number) => notesOf({ name: 'button', n })
  const kinds = (n: number) => [...new Set(key(n).map((note) => note.kind))].sort().join('+')
  const loudest = (n: number) => key(n).reduce((a, b) => (b.peak > a.peak ? b : a))

  it('sound unlike in kind: a knock, a chime and a rush, no two made of the same stuff', () => {
    expect(new Set([kinds(0), kinds(1), kinds(2)]).size).toBe(3)
    // Wood: a low note that falls, with a tick of noise. Glass: two clear notes an octave apart. Air: noise alone.
    expect(loudest(0).kind).toBe('tone')
    expect(loudest(0).glideTo).toBeLessThan(loudest(0).frequency)
    expect(key(1).every((note) => note.kind === 'tone' && note.glideTo === undefined)).toBe(true)
    expect(key(2).every((note) => note.kind === 'noise')).toBe(true)
  })

  it('are not a count: the same thing is never heard once, then twice, then four times, nor one note stepping up', () => {
    // No key's sound is another key's with more notes of the same voice added.
    const voice = (n: number) => key(n).map((note) => `${note.kind} ${note.kind === 'tone' ? note.wave : ''}`).sort().join()
    expect(new Set([voice(0), voice(1), voice(2)]).size).toBe(3)
    expect(key(2).length).toBeLessThan(4)
    // Their loudest notes do not climb with the number of pegs the key gives.
    const pitch = [0, 1, 2].map((n) => loudest(n).frequency)
    expect(pitch[0] < pitch[1] && pitch[1] < pitch[2]).toBe(false)
    // And each is one sound: every key is one cue with no delay inside it (held above for every cue).
    for (const n of [0, 1, 2]) expect(key(n).every((note) => note.delay === undefined)).toBe(true)
  })
})
