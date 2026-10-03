import { describe, expect, it } from 'vitest'
import { FAMILIES, FAR_LENGTH_RATIO, FAR_SEMITONES, INSIDE, KINDS, RANGE, RUSTLE, VOICES, callOf, callSeconds, centre, differsIn, familyOf, isKind, isNear, nearOf, semitones, shapeOf } from './voices'

const within = (value: number, [low, high]: readonly [number, number]) => value >= low && value <= high

describe('each voice stays inside its range', () => {
  for (const kind of KINDS) {
    it(kind, () => {
      const voice = VOICES[kind]
      expect(within(voice.pitch, RANGE.pitch)).toBe(true)
      expect(within(voice.glideTo, RANGE.pitch)).toBe(true)
      expect(within(voice.peak, RANGE.peak)).toBe(true)
      expect(within(voice.attack, RANGE.attack)).toBe(true)
      expect(within(voice.length, RANGE.length)).toBe(true)
      expect(within(callSeconds(voice), RANGE.call)).toBe(true)
      expect(voice.attack).toBeLessThan(voice.length / 2)
      if (voice.warbleRate > 0) {
        expect(within(voice.warbleRate, RANGE.warbleRate)).toBe(true)
        expect(within(voice.warbleDepth, RANGE.warbleDepth)).toBe(true)
      } else expect(voice.warbleDepth).toBe(0)
      if (voice.notes === 1) expect(voice.gap).toBe(0)
      else expect(voice.gap).toBeGreaterThanOrEqual(0.06)
    })
  }
})

describe('the steps of difference', () => {
  it('has three families of two', () => {
    for (const family of FAMILIES) expect(KINDS.filter((kind) => familyOf(kind) === family)).toHaveLength(2)
    for (const kind of KINDS) {
      expect(nearOf(kind)).not.toBe(kind)
      expect(nearOf(nearOf(kind))).toBe(kind)
      expect(isNear(kind, nearOf(kind))).toBe(true)
      expect(isNear(kind, kind)).toBe(false)
    }
  })

  it('two kinds of one family differ in one thing only, at the same pitch, length and loudness', () => {
    const one = { pip: 'notes', tok: 'notes', hoom: 'warble', brrl: 'warble', wheep: 'direction', dooo: 'direction' } as const
    for (const kind of KINDS) {
      const a = VOICES[kind], b = VOICES[nearOf(kind)]
      expect(differsIn(a, b)).toEqual([one[kind]])
      expect(a.peak).toBe(b.peak)
      expect(a.length).toBe(b.length)
      expect(a.wave).toBe(b.wave)
    }
  })

  it('two kinds of different families differ in how high and in how long at once', () => {
    for (const a of KINDS) for (const b of KINDS) {
      if (familyOf(a) === familyOf(b)) continue
      const va = VOICES[a], vb = VOICES[b]
      expect(Math.abs(semitones(centre(va), centre(vb)))).toBeGreaterThanOrEqual(FAR_SEMITONES)
      expect(Math.max(va.length, vb.length) / Math.min(va.length, vb.length)).toBeGreaterThanOrEqual(FAR_LENGTH_RATIO)
      expect(differsIn(va, vb)).toEqual(expect.arrayContaining(['pitch', 'length']))
    }
  })

  it('no two kinds have the same call', () => {
    const calls = KINDS.map((kind) => JSON.stringify(callOf(kind)))
    expect(new Set(calls).size).toBe(KINDS.length)
  })
})

describe('a call as notes', () => {
  it('is softer inside a hide and the same in every other number', () => {
    for (const kind of KINDS) {
      const out = callOf(kind), inside = callOf(kind, true)
      expect(inside).toHaveLength(out.length)
      out.forEach((note, i) => {
        expect(inside[i]).toEqual({ ...note, peak: note.peak * INSIDE })
        expect(20 * Math.log10(note.peak / inside[i].peak)).toBeCloseTo(6, 1)
      })
    }
  })

  it('ends when the call ends, with no note under another', () => {
    for (const kind of KINDS) {
      const notes = callOf(kind), voice = VOICES[kind]
      expect(notes).toHaveLength(voice.notes)
      const last = notes[notes.length - 1]
      expect(last.at + last.attack + last.decay).toBeCloseTo(callSeconds(voice), 9)
      for (let i = 1; i < notes.length; i++) expect(notes[i].at).toBeGreaterThanOrEqual(notes[i - 1].at + notes[i - 1].attack + notes[i - 1].decay)
      for (const note of notes) expect(note.decay).toBeGreaterThan(0)
    }
  })
})

describe('the picture of a call', () => {
  it('lasts as long as the call and shows each property of the voice', () => {
    for (const kind of KINDS) {
      const voice = VOICES[kind], shape = shapeOf(kind)
      expect(shape.seconds).toBe(callSeconds(voice))
      expect(shape.hops).toBe(voice.notes)
      expect(shape.shiver).toBe(voice.warbleRate > 0)
      expect(shape.lift).toBeGreaterThanOrEqual(0)
      expect(shape.lift).toBeLessThanOrEqual(1)
    }
    expect(shapeOf('wheep').tip).toBe(1)
    expect(shapeOf('dooo').tip).toBe(-1)
  })

  it('lifts a higher voice higher, by a margin an eye can see', () => {
    expect(shapeOf('pip').lift - shapeOf('wheep').lift).toBeGreaterThan(0.2)
    expect(shapeOf('wheep').lift - shapeOf('hoom').lift).toBeGreaterThan(0.2)
  })

  it('differs for any two kinds, and a leaf pile shows none of it', () => {
    const shapes = KINDS.map((kind) => JSON.stringify(shapeOf(kind)))
    expect(new Set(shapes).size).toBe(KINDS.length)
    expect(RUSTLE.tip).toBe(0)
    expect(RUSTLE.hops).toBe(1)
  })
})

it('knows a kind from anything else', () => {
  expect(isKind('pip')).toBe(true)
  expect(isKind('cat')).toBe(false)
  expect(isKind(3)).toBe(false)
  expect(isKind(null)).toBe(false)
})
