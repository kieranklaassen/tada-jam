import { describe, expect, it } from 'vitest'
import { APPLE, CARRIERS, KINDS, PITCH, wakes } from './cast'
import { at, byFlame, FLAME, HALF, heart, LENGTH, nearest, placeAt, PLACES, sizeAt } from './garden'
import { cut } from './panes'
import { WAITING } from './play'
import { STAGE } from './stage'

describe('the garden', () => {
  it('has a path with no leap in it, and finds the spot under a finger', () => {
    for (let u = 0; u < LENGTH; u += 10) {
      const p = at(u), q = at(u + 10)
      expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(11)
      const r = at(nearest(p))
      expect(Math.hypot(r.x - p.x, r.y - p.y)).toBeLessThan(6)
    }
    expect(sizeAt(0)).toBe(1)
    expect(byFlame(FLAME)).toBe(true)
  })
  it('keeps its turns apart', () => {
    for (let a = 400; a < LENGTH; a += 20) for (let b = a + 500; b < LENGTH; b += 20) {
      const p = at(a), q = at(b)
      expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThan(HALF * 2 + 6)
    }
  })
  it('wakes sixteen different sleepers, each always the same', () => {
    const all = KINDS.flatMap((kind) => CARRIERS.map((who) => wakes(kind, who)))
    expect(new Set(all).size).toBe(16)
    expect(new Set(Object.values(PITCH)).size).toBe(4)
    expect(new Set(Object.values(APPLE)).size).toBe(4)
  })
  it('gives every place, light and waiting one room of its own inside the stage', () => {
    for (const one of PLACES) {
      const h = heart(one)
      expect(placeAt(h).place.id).toBe(one.id)
      expect(placeAt(one.apple).place.id).toBe(one.id)
      expect(h.x > 40 && h.x < STAGE.width - 40 && h.y > 40 && h.y < STAGE.height - 40).toBe(true)
      // The path stays clear of what is there.
      for (const other of PLACES) if (other.id !== one.id) {
        const o = heart(other)
        expect(Math.hypot(h.x - o.x, h.y - o.y)).toBeGreaterThan(62 * (one.size + other.size))
        expect(Math.hypot(one.apple.x - other.apple.x, one.apple.y - other.apple.y)).toBeGreaterThan(60)
      }
      for (const w of WAITING) expect(Math.abs(h.x - w.x) > 80 || Math.abs(h.y - w.y) > 110).toBe(true)
      expect(byFlame(h)).toBe(false)
    }
    // The finger has at least 48 units for each who waits.
    for (let i = 1; i < WAITING.length; i++) expect(WAITING[i].x - WAITING[i - 1].x).toBeGreaterThanOrEqual(70)
  })
  it('cuts the window the same each time, and every place has glass', () => {
    const a = cut(), b = cut()
    expect(a).toEqual(b)
    for (const one of PLACES) expect(a.filter((p) => p.owner === one.id && p.kind === 'band').length).toBeGreaterThan(3)
    for (const p of a) for (const q of p.points) expect(Number.isFinite(q.x + q.y)).toBe(true)
  })
})
