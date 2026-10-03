import { describe, expect, it } from 'vitest'
import { MAX_LEN, MIN_LEN } from './rules'
import { CUSTOMERS, TASTES } from './tastes'
import { CELL_VOICES, OTHER_VOICES, VOICE_RANGE, alike, inVoice, pitchForLength, type VoiceSpec } from './voices'

const within = (value: number, range: { min: number; max: number }): boolean => value >= range.min && value <= range.max
const all: [string, VoiceSpec][] = [...Object.entries(CELL_VOICES), ...Object.entries(OTHER_VOICES)]

describe('the voices', () => {
  it.each(all)('%s stays inside the stated ranges', (_name, v) => {
    expect(within(v.pitch, VOICE_RANGE.pitch)).toBe(true)
    if (v.glideTo !== undefined) expect(within(v.glideTo, VOICE_RANGE.pitch)).toBe(true)
    expect(within(v.peak, VOICE_RANGE.peak)).toBe(true)
    expect(within(v.attack, VOICE_RANGE.attack)).toBe(true)
    expect(within(v.length, VOICE_RANGE.length)).toBe(true)
    if (v.kind === 'noise') expect(within(v.q ?? 0, VOICE_RANGE.q)).toBe(true)
    else expect(v.wave).toBeDefined()
    // A sound comes in faster than it dies away.
    expect(v.attack).toBeLessThan(v.length)
  })

  it('has thirty cell voices and no two that could be taken for each other', () => {
    const cells = Object.entries(CELL_VOICES) as [string, VoiceSpec][]
    expect(cells).toHaveLength(30)
    for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) {
      expect(alike(cells[i][1], cells[j][1]), `${cells[i][0]} and ${cells[j][0]}`).toBe(false)
    }
  })

  it('keeps the other voices apart from each other', () => {
    const others = Object.entries(OTHER_VOICES) as [string, VoiceSpec][]
    for (let i = 0; i < others.length; i++) for (let j = i + 1; j < others.length; j++) {
      expect(alike(others[i][1], others[j][1]), `${others[i][0]} and ${others[j][0]}`).toBe(false)
    }
  })

  it('is no louder at its loudest than a quarter of full scale, and a snip is the loudest touch', () => {
    const peaks = all.map(([, v]) => v.peak)
    expect(Math.max(...peaks)).toBeLessThanOrEqual(0.25)
    expect(CELL_VOICES['lock/snip'].peak).toBe(Math.max(...Object.values(CELL_VOICES).map((v) => v.peak)))
  })

  it('sounds a lock lower the longer it is, over two octaves', () => {
    expect(pitchForLength(MIN_LEN)).toBeCloseTo(880)
    expect(pitchForLength(MAX_LEN)).toBeCloseTo(220)
    let last = Infinity
    for (let steps = MIN_LEN; steps <= MAX_LEN; steps += 4) {
      const hz = pitchForLength(steps)
      expect(hz).toBeLessThan(last)
      expect(within(hz, VOICE_RANGE.pitch)).toBe(true)
      last = hz
    }
    expect(pitchForLength(-50)).toBeCloseTo(880)
    expect(pitchForLength(500)).toBeCloseTo(220)
  })

  it('moves a voice onto each customer and keeps it in range and apart from the others', () => {
    for (const id of ['face/poke', 'model/poke', 'face/pull'] as const) {
      const voiced = CUSTOMERS.map((who) => inVoice(CELL_VOICES[id], TASTES[who].voiceHz))
      for (const v of voiced) {
        expect(within(v.pitch, VOICE_RANGE.pitch)).toBe(true)
        if (v.glideTo !== undefined) expect(within(v.glideTo, VOICE_RANGE.pitch)).toBe(true)
      }
      expect(new Set(voiced.map((v) => Math.round(v.pitch))).size).toBe(4)
    }
  })

  it('tells like from unlike', () => {
    const a: VoiceSpec = { kind: 'tone', wave: 'sine', pitch: 400, peak: 0.1, attack: 0.01, length: 0.3 }
    expect(alike(a, { ...a, pitch: 410 })).toBe(true)
    expect(alike(a, { ...a, pitch: 600 })).toBe(false)
    expect(alike(a, { ...a, glideTo: 800 })).toBe(false)
    expect(alike(a, { ...a, length: 0.6 })).toBe(false)
    expect(alike(a, { ...a, kind: 'noise', q: 1 })).toBe(false)
  })
})
