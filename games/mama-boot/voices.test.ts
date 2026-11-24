import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PAIRS, THINGS } from './layout'
import { GAITS } from './lineage'
import { ACTS } from './moves'
import { VOICES, notesOf } from './voices'

const length = (name: string) => Math.max(...notesOf(name).map((e) => (e.delay ?? 0) + e.attack + e.decay))

describe('the sounds', () => {
  it('has each sound the yard can ask for', () => {
    const source = readFileSync(new URL('./yard.ts', import.meta.url), 'utf8')
    for (const m of source.matchAll(/'((?:press|egg|hen|ring|puddle|seat|set|wet|seen|round|scenery)\.[a-z]+)'/gi)) expect(VOICES[m[1]], m[1]).toBeDefined()
    for (const k of THINGS) for (const on of ['tap', 'set', 'seat', 'wet', 'seen', 'hen', 'look']) expect(VOICES[`${on}.${k}`], `${on}.${k}`).toBeDefined()
    for (const [a, b] of PAIRS) expect(VOICES[`pair.${a}-${b}`]).toBeDefined()
    for (const k of ['self', 'egg', 'chick', 'hen']) expect(VOICES[`look.${k}`]).toBeDefined()
  })
  it('stays gentle, and within what a tablet can sound', () => {
    for (const [name, notes] of Object.entries(VOICES)) {
      expect(notes.length, name).toBeGreaterThan(0)
      expect(length(name), name).toBeLessThan(3.2)
      for (const e of notes) {
        expect(e.peak, name).toBeLessThanOrEqual(0.45)
        expect(e.frequency, name).toBeGreaterThanOrEqual(80)
        expect(e.frequency, name).toBeLessThan(5400)
        // A pure note far up is thin and hard on the ear.
        if (e.kind === 'tone') expect(Math.max(e.frequency, e.glideTo ?? 0), name).toBeLessThan(e.peak <= 0.08 ? 4600 : 2600)
      }
    }
  })
  it('answers a touch at once', () => {
    for (const [name, notes] of Object.entries(VOICES)) if (name.startsWith('press.')) expect(Math.min(...notes.map((e) => e.delay ?? 0))).toBe(0)
  })
  it('gives each mother a cry of its own, higher for each step down', () => {
    expect(new Set(GAITS.map((g) => JSON.stringify(VOICES[`cry.${g}`]))).size).toBe(GAITS.length)
    for (const g of GAITS) for (const s of [1, 2, 3, 4]) expect(notesOf(`cry.${g}`, s + 1)[0].frequency).toBeGreaterThan(notesOf(`cry.${g}`, s)[0].frequency)
  })
  it('shares no sound between two things', () => {
    const all = Object.values(VOICES).map((v) => JSON.stringify(v))
    expect(new Set(all).size).toBe(all.length)
  })
})

describe('the acts', () => {
  it('share no movement: no two acts are the same', () => {
    const key = (name: keyof typeof ACTS) => JSON.stringify([0.1, 0.25, 0.4, 0.6, 0.8].map((t) => ACTS[name].at(t)))
    const names = Object.keys(ACTS) as (keyof typeof ACTS)[]
    expect(new Set(names.map(key)).size).toBe(names.length)
  })
  it('end at rest', () => {
    for (const [name, a] of Object.entries(ACTS)) {
      const end = a.at(1) as Record<string, number>
      for (const k of ['lift', 'rot']) if (name !== 'ballHover') expect(Math.abs(end[k] ?? 0), `${name} ${k}`).toBeLessThan(0.25)
    }
  })
})
