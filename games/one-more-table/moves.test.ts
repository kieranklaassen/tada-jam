import { describe, expect, it } from 'vitest'
import { DISHES, GUESTS } from './cast'
import { ACTS, BREATH, EATS, TAKES, still, type Pose } from './moves'
import { VOICES, notesOf } from './voices'

const print = (m: (u: number, p: Pose, d: number, w: number) => void) => [0.15, 0.35, 0.5, 0.65, 0.85].flatMap((u) => { const p = still({} as Pose); m(u, p, 1, 100); return Object.values(p) })
const apart = (a: number[], b: number[]) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0)

describe('every move', () => {
  it('is its own', () => {
    const all = [...GUESTS.map((g) => print(ACTS[g])), ...GUESTS.map((g) => print(TAKES[g])), ...DISHES.map((d) => print(EATS[d]))]
    all.forEach((a, i) => all.forEach((b, k) => { if (k > i) expect(apart(a, b)).toBeGreaterThan(1.5) }))
    expect(new Set(GUESTS.map((g) => JSON.stringify(BREATH[g]))).size).toBe(GUESTS.length)
  })
  it('gives numbers, and never gets wide', () => {
    for (const g of GUESTS) for (const m of [ACTS[g], TAKES[g]]) for (let u = 0; u <= 1; u += 0.02) { const p = still({} as Pose); m(u, p, -1, 100); for (const v of Object.values(p)) expect(Number.isFinite(v)).toBe(true); expect(Math.abs(p.sx - 1)).toBeLessThan(0.3) }
  })
})

describe('every sound', () => {
  it('is its own, in range and short', () => {
    expect(new Set(Object.values(VOICES).map((v) => JSON.stringify(v))).size).toBe(Object.keys(VOICES).length)
    for (const name of Object.keys(VOICES) as (keyof typeof VOICES)[]) for (const steps of [-8, 0, 20]) for (const n of notesOf(name, steps)) {
      expect(n.frequency).toBeGreaterThan(30); expect(n.frequency).toBeLessThan(11000)
      expect(n.peak).toBeLessThanOrEqual(0.3); expect((n.delay ?? 0) + n.attack + n.decay).toBeLessThan(2.6)
    }
  })
})
