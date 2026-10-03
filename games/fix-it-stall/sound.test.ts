import { describe, expect, it } from 'vitest'
import { voice, voiceOf } from './sound'
import { VOICE_IDS, VOICES, type Note } from './voices'

/** A context that only writes down what was built on it. */
function fakeContext() {
  const built: { kind: string; hz: number[]; start: number; gains: number[] }[] = []
  const param = (into: number[]) => ({ value: 0, setValueAtTime: (v: number) => void into.push(v), exponentialRampToValueAtTime: (v: number) => void into.push(v) })
  let last: (typeof built)[number] | null = null
  const node = (kind: string | null) => () => {
    const entry = kind ? { kind, hz: [] as number[], start: -1, gains: [] as number[] } : last!
    if (kind) { built.push(entry); last = entry }
    const self: Record<string, unknown> = {
      type: '', buffer: null, loop: false, onended: null,
      frequency: param(entry.hz), gain: param(entry.gains), Q: { value: 0 },
      connect: (to: unknown) => to, disconnect: () => {}, stop: () => {},
      start: (at: number) => { entry.start = at },
    }
    return self
  }
  const context = {
    sampleRate: 8000,
    createOscillator: node('tone'), createBufferSource: node('noise'), createGain: node(null), createBiquadFilter: node(null),
    createBuffer: (_c: number, length: number) => ({ getChannelData: () => new Float32Array(length) }),
  }
  return { context: context as unknown as AudioContext, built }
}

describe('the bridge from numbers to sound', () => {
  it('plays every voice of the game: one sounding thing a note, each of the note\'s kind, none before the touch', () => {
    for (const id of VOICE_IDS) {
      const { context, built } = fakeContext()
      voice(id)(context, {} as AudioNode, 10)
      const notes = VOICES[id] as readonly Note[]
      expect(built.map((b) => b.kind), id).toEqual(notes.map((n) => n.kind))
      built.forEach((b, i) => {
        expect(b.start, id).toBeGreaterThanOrEqual(10)
        expect(b.start, id).toBeCloseTo(10 + (notes[i].after ?? 0), 6)
        // It rises to the note's own peak and no further.
        expect(Math.max(...b.gains), id).toBeCloseTo(notes[i].peak, 6)
      })
    }
  })

  it('moves a whole voice up or down together, and keeps it inside what can be heard', () => {
    const notes: Note[] = [{ kind: 'tone', wave: 'sine', pitch: 200, glideTo: 100, peak: 0.1, attack: 0.01, length: 0.1 }]
    const at = (pitch: number) => { const { context, built } = fakeContext(); voiceOf(notes, pitch)(context, {} as AudioNode, 0); return built[0].hz }
    expect(at(1)).toEqual([200, 100])
    expect(at(1.5)).toEqual([300, 150])
    expect(at(1000)).toEqual([6000, 6000])
    expect(at(0.001)).toEqual([40, 40])
  })
})
