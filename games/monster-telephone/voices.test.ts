import { describe, expect, it } from 'vitest'
import type { Note } from './audio'
import { BODIES, PARTS } from './monster'
import { VOICE_NAMES, agree, bodyVoice, dance, partVoice, rub, takes, voice } from './voices'

const all: [string, Note[]][] = [
  ...VOICE_NAMES.map((n): [string, Note[]] => [n, voice(n)]), ...PARTS.map((p): [string, Note[]] => [p, partVoice(p)]),
  ...BODIES.flatMap((b): [string, Note[]][] => [[`body ${b}`, bodyVoice(b)], [`takes ${b}`, takes(b)]]), ['dance', dance()], ...[0, 3, 5].flatMap((i): [string, Note[]][] => [[`agree ${i}`, agree(i)], [`rub ${i}`, rub(i)]]),
]

describe('the voices', () => {
  it('stay within what a tablet plays and a child can bear', () => {
    for (const [name, notes] of all) {
      expect(notes.length, name).toBeGreaterThan(0)
      for (const n of notes) {
        for (const f of [n.frequency, n.glideTo ?? n.frequency]) { expect(f, name).toBeGreaterThanOrEqual(38); expect(f, name).toBeLessThanOrEqual(4200) }
        expect(n.peak, name).toBeLessThanOrEqual(0.42)
        expect((n.delay ?? 0) + n.decay, name).toBeLessThan(3)
      }
      // What sounds at once never sums past full scale.
      for (const n of notes) expect(notes.filter((o) => Math.abs((o.delay ?? 0) - (n.delay ?? 0)) < 0.02).reduce((sum, o) => sum + o.peak, 0), name).toBeLessThanOrEqual(0.7)
    }
  })
  it('gives every part, body and reaction a sound of its own', () => {
    const keys = all.map(([, notes]) => JSON.stringify(notes))
    expect(new Set(keys).size).toBe(keys.length)
  })
  it('agrees on one note and rubs on two', () => {
    expect(rub(2)[0].frequency).not.toBe(rub(2)[1].frequency)
    expect(agree(2)[1].frequency).toBeCloseTo(agree(2)[0].frequency * 2)
  })
})
