import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { THINGS } from './things'
import { OWNERS } from './owners'
import { VOICES, notesOf } from './voices'

describe('the sounds', () => {
  it('has each sound the room can ask for', () => {
    const source = readFileSync(new URL('./house.ts', import.meta.url), 'utf8')
    for (const m of source.matchAll(/say\('([a-z.]+)'\)/g)) expect(VOICES[m[1]], m[1]).toBeDefined()
    for (const id of THINGS) for (const k of ['pick', 'leap', 'in', 'drop', 'find', 'head']) expect(VOICES[`${k}.${id}`]).toBeDefined()
    for (const o of OWNERS) for (const k of ['yelp', 'giggle', 'snort', 'loves', 'minds']) expect(VOICES[`${k}.${o}`]).toBeDefined()
    expect(notesOf('none such')).toEqual([])
  })
  it('stays gentle, and within what a tablet can sound', () => {
    for (const [name, notes] of Object.entries(VOICES)) for (const e of notes) {
      expect(e.peak, name).toBeLessThanOrEqual(0.45)
      expect(Math.min(e.frequency, e.glideTo ?? 999), name).toBeGreaterThanOrEqual(64)
      expect(Math.max(e.frequency, e.glideTo ?? 0), name).toBeLessThan(5400)
      expect((e.delay ?? 0) + e.attack + e.decay, name).toBeLessThan(3)
    }
  })
  it('has no two owners with one voice', () => {
    for (const k of ['yelp', 'giggle', 'loves']) expect(new Set(OWNERS.map((o) => JSON.stringify(VOICES[`${k}.${o}`]))).size).toBe(OWNERS.length)
  })
})
