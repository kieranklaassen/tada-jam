import { describe, expect, it } from 'vitest'
import { paintEffect, paintThing, THING_SIZE } from './things'
import type { Effect, Thing } from './things'

// A stand-in context: it takes every call and remembers its name and its numbers, and every colour that is set.
function standIn(): { ctx: CanvasRenderingContext2D; calls: string[]; seen: string[] } {
  const calls: string[] = []
  const seen: string[] = []
  const state: Record<string, unknown> = { globalAlpha: 1 }
  const ctx = new Proxy(
    {},
    {
      get: (_, name) => {
        if (name === 'globalAlpha') return state.globalAlpha
        return (...n: unknown[]) => {
          calls.push(String(name))
          seen.push(`${String(name)} ${n.map((v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v)).join(' ')}`)
          return undefined
        }
      },
      set: (_, name, value) => {
        state[String(name)] = value
        seen.push(`${String(name)} = ${String(value)}`)
        return true
      },
    },
  ) as unknown as CanvasRenderingContext2D
  return { ctx, calls, seen }
}

const THINGS: Thing[] = ['seeds', 'bed', 'cup', 'shelf', 'lamp', 'washing']
const EFFECTS: Effect[] = ['scuff', 'prints', 'sandBlast', 'mudBall', 'stoneShot', 'puff', 'splat']

function plain(s: { calls: string[] }): void {
  expect(s.calls).toContain('fill')
  expect(s.calls).not.toContain('fillText')
  expect(s.calls).not.toContain('strokeText')
  expect(s.calls.filter((c) => c === 'save')).toHaveLength(s.calls.filter((c) => c === 'restore').length)
}

describe('the things on the back wall', () => {
  it('are each within 50 by 40', () => {
    expect(Object.keys(THING_SIZE).sort()).toEqual([...THINGS].sort())
    for (const thing of THINGS) {
      expect(THING_SIZE[thing].width, thing).toBeGreaterThan(0)
      expect(THING_SIZE[thing].width, thing).toBeLessThanOrEqual(50)
      expect(THING_SIZE[thing].height, thing).toBeGreaterThan(0)
      expect(THING_SIZE[thing].height, thing).toBeLessThanOrEqual(40)
    }
  })

  for (const thing of THINGS) {
    for (const lit of [undefined, false, true]) {
      it(`paints the ${thing}${lit ? ', lit,' : lit === false ? ', unlit,' : ''} in shapes and no writing`, () => {
        const s = standIn()
        expect(() => paintThing(s.ctx, thing, lit)).not.toThrow()
        plain(s)
      })
    }
  }

  it('paints the lit lamp differently from the unlit one, and a lamp that is told nothing as unlit', () => {
    const lit = standIn()
    const unlit = standIn()
    const untold = standIn()
    paintThing(lit.ctx, 'lamp', true)
    paintThing(unlit.ctx, 'lamp', false)
    paintThing(untold.ctx, 'lamp')
    expect(lit.seen).not.toEqual(unlit.seen)
    expect(untold.seen).toEqual(unlit.seen)
  })
})

describe('the effects', () => {
  for (const effect of EFFECTS) {
    it(`paints the ${effect} at every progress in shapes and no writing`, () => {
      for (const progress of [undefined, 0, 0.5, 1, -3, 7]) {
        const s = standIn()
        expect(() => paintEffect(s.ctx, effect, progress)).not.toThrow()
        plain(s)
        expect(s.seen.join(' ')).not.toContain('NaN')
      }
    })
  }

  for (const effect of ['sandBlast', 'puff'] as const) {
    it(`changes the ${effect} as it goes on`, () => {
      const pictures = [0, 0.5, 1].map((progress) => {
        const s = standIn()
        paintEffect(s.ctx, effect, progress)
        return s.seen.join('\n')
      })
      expect(new Set(pictures).size).toBe(3)
    })
  }
})
