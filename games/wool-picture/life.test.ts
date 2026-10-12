import { describe, expect, it } from 'vitest'
import { cling, motionOf, still, type Motion } from './life'
import { ALL_KINDS, type Kind } from './wool'

const CHANNELS = ['dx', 'dy', 'sx', 'sy', 'skew', 'rot', 'flow', 'flowBy'] as const

/** A kind's motion over fifteen seconds, sampled thirty times a second, each channel as its swing from rest. */
function trace(kind: Kind, shift = 0): number[][] {
  const out: number[][] = [], m = still(), rest = still()
  for (let i = 0; i < 450; i++) {
    motionOf(kind, i / 30 + shift, 0, 0, m)
    out.push(CHANNELS.map((channel) => m[channel] - rest[channel]))
  }
  return out
}

/** Which channels a kind moves at all. */
const moving = (kind: Kind): string => {
  const t = trace(kind)
  return CHANNELS.filter((_, c) => t.some((row) => Math.abs(row[c]) > 1e-6)).join('+')
}

/** How far apart two traces are at their nearest, over every shift of one against the other up to six seconds. */
function nearest(a: Kind, b: Kind): number {
  const ta = trace(a)
  let least = Infinity
  for (let shift = 0; shift < 6; shift += 0.25) {
    const tb = trace(b, shift)
    let sum = 0
    for (let i = 0; i < ta.length; i++) for (let c = 0; c < CHANNELS.length; c++) {
      // Slides are in stage units and the rest are small ratios: bring them to one scale.
      const scale = c < 2 || c === 7 ? 0.01 : 1
      sum += Math.abs(ta[i][c] - tb[i][c]) * scale
    }
    least = Math.min(least, sum / ta.length)
  }
  return least
}

describe('how a shape moves', () => {
  it('moves every kind, fluff included', () => {
    for (const kind of ALL_KINDS) expect(moving(kind), kind).not.toBe('')
  })

  it('gives no two kinds one motion: not at the same moment, and not one a little later than the other', () => {
    for (let i = 0; i < ALL_KINDS.length; i++) {
      for (let j = i + 1; j < ALL_KINDS.length; j++) {
        expect(nearest(ALL_KINDS[i], ALL_KINDS[j]), `${ALL_KINDS[i]} and ${ALL_KINDS[j]}`).toBeGreaterThan(0.004)
      }
    }
  })

  it('stays small and comes back: no kind slides further than 24 units, stretches past a tenth, or leans past an eighth', () => {
    for (const kind of ALL_KINDS) {
      const m: Motion = still()
      for (let i = 0; i < 1800; i++) {
        motionOf(kind, i / 30, 3, 0, m)
        expect(Math.abs(m.dx), kind).toBeLessThanOrEqual(24)
        expect(Math.abs(m.dy), kind).toBeLessThanOrEqual(24)
        expect(Math.abs(m.sx - 1), kind).toBeLessThanOrEqual(0.125)
        expect(Math.abs(m.sy - 1), kind).toBeLessThanOrEqual(0.125)
        expect(Math.abs(m.skew), kind).toBeLessThanOrEqual(0.135)
      }
    }
  })

  it('lies still under the hand: a shape being laid into does not move', () => {
    for (const kind of ALL_KINDS) expect(motionOf(kind, 7.3, 1, 1, still())).toEqual(still())
  })

  it('sets two shapes of one kind off at different moments', () => {
    const a = motionOf('hill', 2, 1, 0, still()), b = motionOf('hill', 2, 2, 0, still())
    expect(a.sy).not.toBeCloseTo(b.sy, 4)
  })

  it('clings with one squash when the finger lifts, and is over within a second', () => {
    expect(cling(0)).toBe(0)
    expect(Math.abs(cling(0.1))).toBeGreaterThan(0.2)
    expect(cling(0.7)).toBeCloseTo(0, 5)
    expect(cling(2)).toBe(0)
  })
})
