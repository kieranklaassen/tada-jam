import { describe, expect, it } from 'vitest'
import { TEMPO, catIdle, curtainIdle, dripIdle, duckIdle, lampIdle, teddyIdle } from './idle'

describe('what moves at rest', () => {
  it('gives each one its own tempo: no two alike, and none a whole multiple of another', () => {
    const tempos = Object.values(TEMPO)
    for (let a = 0; a < tempos.length; a++) {
      for (let b = a + 1; b < tempos.length; b++) {
        const ratio = Math.max(tempos[a], tempos[b]) / Math.min(tempos[a], tempos[b])
        expect(Math.abs(ratio - Math.round(ratio))).toBeGreaterThan(0.04)
      }
    }
  })

  it('moves no two of them on the same curve', () => {
    const samples = (curve: (t: number) => number): number[] => Array.from({ length: 120 }, (_, n) => curve(n * 0.13))
    const norm = (list: number[]): number[] => { const mean = list.reduce((a, b) => a + b, 0) / list.length, top = Math.max(...list.map((n) => Math.abs(n - mean))) || 1; return list.map((n) => (n - mean) / top) }
    const curves = [
      norm(samples((t) => teddyIdle(t).breath)), norm(samples((t) => duckIdle(t).bob)), norm(samples((t) => catIdle(t).tail)),
      norm(samples(lampIdle)), norm(samples(curtainIdle)),
    ]
    for (let a = 0; a < curves.length; a++) {
      for (let b = a + 1; b < curves.length; b++) {
        const apart = curves[a].reduce((sum, n, i) => sum + Math.abs(n - curves[b][i]), 0) / curves[a].length
        expect(apart).toBeGreaterThan(0.2)
      }
    }
  })

  it('keeps every movement small, and lets a drop fall now and then', () => {
    let drops = 0, falling = false
    for (let t = 0; t < 30; t += 1 / 60) {
      expect(Math.abs(teddyIdle(t).sway)).toBeLessThan(0.03)
      expect(Math.abs(duckIdle(t).bob)).toBeLessThan(6)
      expect(Math.abs(catIdle(t).tail)).toBeLessThan(0.5)
      expect(Math.abs(lampIdle(t) - 1)).toBeLessThan(0.05)
      const drop = dripIdle(t)
      if (drop !== null) { expect(drop).toBeGreaterThanOrEqual(0); expect(drop).toBeLessThan(1) }
      if (drop !== null && !falling) drops += 1
      falling = drop !== null
    }
    expect(drops).toBeGreaterThanOrEqual(6)
  })
})
