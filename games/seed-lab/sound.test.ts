import { describe, expect, it } from 'vitest'
import { voiceOf } from './sound'
import { CELL_VOICES, GAME_VOICES, RANGE, TOY_VOICES, VISITOR_VOICES, higher, liking, noteOf, wholeLength, type Part } from './voices'

/** A stand-in for an audio context that records what each part asked of it. */
function fakeContext() {
  const made = { oscillators: [] as { type: string; pitch: number; glide: number | null; startedAt: number }[], noises: [] as { pitch: number; q: number; startedAt: number }[], peaks: [] as number[] }
  const param = (onSet: (value: number) => void = () => {}, onRamp: (value: number) => void = () => {}) => ({ value: 0, setValueAtTime: onSet, exponentialRampToValueAtTime: onRamp })
  const chain = { connect: () => chain, disconnect: () => {} }
  const context = {
    sampleRate: 8000,
    createOscillator() {
      const entry = { type: '', pitch: 0, glide: null as number | null, startedAt: -1 }
      made.oscillators.push(entry)
      return { set type(value: string) { entry.type = value }, frequency: param((value) => { entry.pitch = value }, (value) => { entry.glide = value }), connect: () => chain, disconnect: () => {}, start: (at: number) => { entry.startedAt = at }, stop: () => {}, onended: null }
    },
    createGain: () => ({ gain: param(() => {}, (value) => { if (value > 0.001) made.peaks.push(value) }), ...chain }),
    createBufferSource() {
      const entry = { pitch: 0, q: 0, startedAt: -1 }
      made.noises.push(entry)
      return { buffer: null, loop: false, connect: () => ({ ...chain, connect: () => chain }), disconnect: () => {}, start: (at: number) => { entry.startedAt = at }, stop: () => {}, onended: null, entry }
    },
    createBiquadFilter() {
      const entry = made.noises[made.noises.length - 1]
      return { type: '', Q: { set value(value: number) { entry.q = value } }, frequency: param((value) => { entry.pitch = value }), ...chain }
    },
    createBuffer: (_channels: number, length: number) => ({ getChannelData: () => new Float32Array(length) }),
  }
  return { made, context: context as unknown as AudioContext, out: chain as unknown as AudioNode }
}

describe('the bridge from numbers to sound', () => {
  it('plays one tone or one noise a part, at the part’s own pitch, wave, band and start', () => {
    const { made, context, out } = fakeContext()
    const parts: Part[] = [
      { source: 'tone', pitch: 440, wave: 'triangle', peak: 0.1, attack: 0.01, length: 0.2, glideTo: 660 },
      { source: 'noise', pitch: 1200, q: 2, peak: 0.05, attack: 0.01, length: 0.1, after: 0.25 },
    ]
    voiceOf(parts)(context, out, 10)
    expect(made.oscillators).toEqual([{ type: 'triangle', pitch: 440, glide: 660, startedAt: 10 }])
    expect(made.noises).toHaveLength(1)
    expect(made.noises[0]).toMatchObject({ pitch: 1200, q: 2 })
    expect(made.noises[0].startedAt).toBeCloseTo(10.25, 6)
    expect(made.peaks).toEqual([0.1, 0.05])
  })

  it('plays every voice of the game without a fault, as many sources as it has parts', () => {
    const all: [string, readonly Part[]][] = [...Object.entries(CELL_VOICES), ...Object.entries(TOY_VOICES), ['note', noteOf(2, 'pink', 1)]]
    for (const [name, parts] of all) {
      const { made, context, out } = fakeContext()
      voiceOf(parts)(context, out, 0)
      expect(made.oscillators.length + made.noises.length, name).toBe(parts.length)
    }
  })

  it('plays nothing for a voice with no parts', () => {
    const { made, context, out } = fakeContext()
    voiceOf([])(context, out, 0)
    expect(made.oscillators.length + made.noises.length).toBe(0)
  })
})

describe('the toy’s other sounds', () => {
  const inside = (value: number, [low, high]: readonly [number, number]) => value >= low && value <= high

  it('each stay inside the stated ranges, like every voice of the grid', () => {
    for (const [name, parts] of Object.entries(TOY_VOICES) as [string, readonly Part[]][]) {
      for (const part of parts) {
        expect(inside(part.pitch, RANGE.pitch), `${name} pitch`).toBe(true)
        if (part.glideTo !== undefined) expect(inside(part.glideTo, RANGE.pitch), `${name} glide`).toBe(true)
        expect(inside(part.peak, RANGE.peak), `${name} peak`).toBe(true)
        expect(inside(part.attack, RANGE.attack), `${name} attack`).toBe(true)
        expect(inside(part.length, RANGE.length), `${name} length`).toBe(true)
        expect(inside(part.after ?? 0, RANGE.after), `${name} after`).toBe(true)
      }
      expect(inside(wholeLength(parts), RANGE.whole), `${name} whole`).toBe(true)
    }
  })

  it('are each their own sound, and none is a voice of the grid', () => {
    const toy = Object.values(TOY_VOICES).map((parts) => JSON.stringify(parts))
    expect(new Set(toy).size).toBe(toy.length)
    const grid = new Set(Object.values(CELL_VOICES).map((parts) => JSON.stringify(parts)))
    for (const voice of toy) expect(grid.has(voice)).toBe(false)
  })
})

describe('the game’s other sounds and the visitors’ voices', () => {
  const inside = (value: number, [low, high]: readonly [number, number]) => value >= low && value <= high
  const all: [string, readonly Part[]][] = [
    ...Object.entries(GAME_VOICES),
    ...Object.entries(VISITOR_VOICES).flatMap(([who, voice]) => Object.entries(voice).map(([name, parts]) => [`${who} ${name}`, parts] as [string, readonly Part[]])),
  ]

  it('each stay inside the stated ranges', () => {
    for (const [name, parts] of all) {
      expect(parts.length, name).toBeGreaterThan(0)
      for (const part of parts) {
        expect(inside(part.pitch, RANGE.pitch), `${name} pitch`).toBe(true)
        if (part.glideTo !== undefined) expect(inside(part.glideTo, RANGE.pitch), `${name} glide`).toBe(true)
        expect(inside(part.peak, RANGE.peak), `${name} peak`).toBe(true)
        expect(inside(part.attack, RANGE.attack), `${name} attack`).toBe(true)
        expect(inside(part.length, RANGE.length), `${name} length`).toBe(true)
        expect(inside(part.after ?? 0, RANGE.after), `${name} after`).toBe(true)
      }
      expect(inside(wholeLength(parts), RANGE.whole), `${name} whole`).toBe(true)
    }
  })

  it('are each their own sound: no two alike, and none a voice of the grid or of the toy', () => {
    const mine = all.map(([, parts]) => JSON.stringify(parts))
    expect(new Set(mine).size).toBe(mine.length)
    const others = new Set([...Object.values(CELL_VOICES), ...Object.values(TOY_VOICES)].map((parts) => JSON.stringify(parts)))
    for (const voice of mine) expect(others.has(voice)).toBe(false)
  })

  it('give each visitor a voice of its own: its own wave or noise, and its own register', () => {
    const first = Object.entries(VISITOR_VOICES).map(([, voice]) => `${voice.like[0].source}:${voice.like[0].wave ?? 'noise'}`)
    expect(new Set(first).size).toBeGreaterThanOrEqual(4)
    const pitch = Object.entries(VISITOR_VOICES).map(([, voice]) => voice.like[0].pitch)
    expect(new Set(pitch).size).toBe(pitch.length)
    expect(VISITOR_VOICES.snail.like[0].pitch).toBeLessThan(VISITOR_VOICES.ant.like[0].pitch)
  })

  it('never rate the child: a miss is no louder than a like, and is never a low square buzz', () => {
    for (const voice of Object.values(VISITOR_VOICES)) {
      const peak = (parts: readonly Part[]) => Math.max(...parts.map((part) => part.peak))
      expect(peak(voice.miss)).toBeLessThanOrEqual(peak(voice.like) + 0.011)
      for (const part of voice.miss) expect(part.wave === 'square' && part.pitch < 200).toBe(false)
    }
  })

  it('run four likes up, one a trait, and keep a raised voice inside the range', () => {
    for (const who of Object.keys(VISITOR_VOICES) as (keyof typeof VISITOR_VOICES)[]) {
      const pitches = [0, 1, 2, 3].map((trait) => liking(who, trait)[0].pitch)
      for (let at = 1; at < 4; at++) expect(pitches[at]).toBeGreaterThan(pitches[at - 1])
    }
    for (const part of higher(CELL_VOICES['bud-poke'], 40)) expect(part.pitch).toBeLessThanOrEqual(RANGE.pitch[1])
    expect(higher(CELL_VOICES['bud-poke'], 0)).toEqual(CELL_VOICES['bud-poke'])
  })
})
