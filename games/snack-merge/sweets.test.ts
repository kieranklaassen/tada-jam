import { describe, expect, it } from 'vitest'
import { ALL_KINDS, CHEESE, JELLY, type Kind } from './kinds'
import { makeRng } from './rng'
import { paintSweet } from './sweets'

/** A 2D context that draws nothing and notes how often a shape was cut out of what is already painted. */
function cutting(): { context: CanvasRenderingContext2D; cuts: () => number } {
  let mode = 'source-over', cuts = 0
  const saved: string[] = []
  const gradient = { addColorStop: () => {} }
  const target: Record<string, unknown> = {
    save: () => { saved.push(mode) },
    restore: () => { mode = saved.pop() ?? 'source-over' },
    fill: () => { if (mode === 'destination-out') cuts += 1 },
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
  }
  const context = new Proxy(target, {
    get: (t, key) => (key in t ? t[key as string] : () => {}),
    set: (_, key, value) => {
      if (key === 'globalCompositeOperation') mode = String(value)
      return true
    },
  }) as unknown as CanvasRenderingContext2D
  return { context, cuts: () => cuts }
}

function cutsIn(k: Kind): number {
  const { context, cuts } = cutting()
  const grain = makeRng(k)
  paintSweet(context, k, 48, 'calm', () => grain.next())
  return cuts()
}

describe('the sweets', () => {
  it('cuts the holes of a wobble cheese right through it, so what lies behind shows; a plain cheese keeps painted ones', () => {
    expect(cutsIn((CHEESE | JELLY) as Kind)).toBe(4)
    expect(cutsIn(CHEESE)).toBe(0)
  })

  it('paints every snack there is without failing', () => {
    for (const k of ALL_KINDS) expect(() => cutsIn(k)).not.toThrow()
  })
})
