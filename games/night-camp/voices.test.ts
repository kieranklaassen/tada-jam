import { describe, expect, it, vi } from 'vitest'
import { voiceOf } from './sound'
import { FIXED, LOG_STEPS, RANGES, clink, clunk, logHome, logOut, logTap, type Note } from './voices'
import { ROD_LENGTH } from './world'

const numbered: [string, readonly Note[]][] = [
  ...Array.from({ length: LOG_STEPS }, (_, i): [string, Note[]] => [`log-out ${i + 1}`, logOut(i + 1)]),
  ...Array.from({ length: LOG_STEPS }, (_, i): [string, Note[]] => [`log-home ${i + 1}`, logHome(i + 1)]),
  ...Array.from({ length: LOG_STEPS }, (_, i): [string, Note[]] => [`log-tap ${i + 1}`, logTap(i + 1)]),
  ...Array.from({ length: ROD_LENGTH.oil }, (_, i): [string, Note[]] => [`clink ${i + 1}`, clink(i + 1)]),
  ...Array.from({ length: ROD_LENGTH.water }, (_, i): [string, Note[]] => [`clunk ${i + 1}`, clunk(i + 1)]),
]
const all: [string, readonly Note[]][] = [...Object.entries(FIXED), ...numbered]
const inside = (value: number, [low, high]: readonly [number, number]) => value >= low && value <= high

describe('every voice, in plain numbers', () => {
  it('keeps every note inside the stated ranges', () => {
    for (const [name, notes] of all) {
      expect(notes.length, name).toBeGreaterThan(0)
      for (const note of notes) {
        expect(inside(note.hz, RANGES.hz), `${name}: ${note.hz} Hz`).toBe(true)
        if (note.to !== undefined) expect(inside(note.to, RANGES.hz), `${name}: glides to ${note.to} Hz`).toBe(true)
        expect(inside(note.peak, RANGES.peak), `${name}: peak ${note.peak}`).toBe(true)
        expect(inside(note.attack, RANGES.attack), `${name}: attack ${note.attack}`).toBe(true)
        expect(inside(note.decay, RANGES.decay), `${name}: decay ${note.decay}`).toBe(true)
        expect(inside(note.delay, RANGES.delay), `${name}: delay ${note.delay}`).toBe(true)
      }
    }
  })

  it('keeps every voice short and never louder, all told, than the stated sum', () => {
    for (const [name, notes] of all) {
      expect(Math.max(...notes.map((note) => note.delay + note.attack + note.decay)), name).toBeLessThanOrEqual(RANGES.seconds)
      // Notes that sound at the same moment add up; ones that follow each other do not.
      for (const note of notes) {
        const together = notes.filter((other) => other.delay < note.delay + note.attack + 0.02 && other.delay + other.attack + other.decay * 0.3 > note.delay)
        expect(together.reduce((sum, other) => sum + other.peak, 0), name).toBeLessThanOrEqual(RANGES.sum)
      }
    }
  })

  it('gives no two fixed voices the same numbers', () => {
    const seen = new Map<string, string>()
    for (const [name, notes] of Object.entries(FIXED)) {
      const key = JSON.stringify(notes)
      expect(seen.get(key), `${name} is a copy`).toBeUndefined()
      seen.set(key, name)
    }
  })
})

describe('a row is heard as it is drawn', () => {
  it('steps every log a little higher than the last, over three octaves', () => {
    for (let n = 2; n <= LOG_STEPS; n++) {
      expect(logOut(n)[0].hz).toBeGreaterThan(logOut(n - 1)[0].hz * 1.02)
      expect(logHome(n)[0].hz).toBe(logOut(n)[0].hz)
    }
    expect(logOut(LOG_STEPS)[0].hz / logOut(1)[0].hz).toBeLessThan(8.1)
  })

  it('puts a deeper knock under every fifth log, and under no other', () => {
    for (let n = 1; n <= LOG_STEPS; n++) {
      const knock = logOut(n).find((note) => note.kind === 'tone' && note.hz < 180)
      expect(knock !== undefined, `log ${n}`).toBe(n % 5 === 0)
    }
  })

  it('comes home softer than it went out, so pushing back is quieter than pulling', () => {
    for (const n of [1, 17, 60]) expect(logHome(n)[0].peak).toBeLessThan(logOut(n)[0].peak)
  })

  it('climbs the flasks and the cans too, each by its own steps', () => {
    for (let n = 2; n <= ROD_LENGTH.oil; n++) expect(clink(n)[0].hz).toBeGreaterThan(clink(n - 1)[0].hz)
    for (let n = 2; n <= ROD_LENGTH.water; n++) expect(clunk(n)[0].hz).toBeGreaterThan(clunk(n - 1)[0].hz)
    expect(clink(1)[0].hz).toBeGreaterThan(clunk(ROD_LENGTH.water)[0].hz)
    expect(clunk(1)[0].hz).toBeLessThan(logOut(1)[0].hz)
  })
})

describe('the bridge to sound', () => {
  it('starts one node for each note, at its own delay', () => {
    const started: number[] = []
    const param = () => ({ setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), value: 0 })
    const node = () => ({ connect: (next: unknown) => next, start: (at: number) => { started.push(at) }, stop: vi.fn(), frequency: param(), gain: param(), Q: param(), type: 'sine', buffer: null as unknown, loop: false })
    const context = { sampleRate: 44100, createOscillator: node, createGain: node, createBiquadFilter: node, createBufferSource: node, createBuffer: () => ({ getChannelData: () => new Float32Array(64) }) } as unknown as AudioContext
    voiceOf(logOut(5))(context, {} as AudioNode, 10)
    expect(started.length).toBe(logOut(5).length)
    for (const at of started) expect(at).toBeGreaterThanOrEqual(10)
    started.length = 0
    voiceOf(FIXED['frog-hop'])(context, {} as AudioNode, 2)
    expect(Math.max(...started)).toBeCloseTo(2 + 1.1)
  })
})
