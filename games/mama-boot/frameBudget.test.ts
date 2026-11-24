import { beforeAll, describe, expect, it } from 'vitest'
import { HEN, THINGS, type BroodId } from './layout'
import { ACTS, type ActName } from './moves'
import type { Guidance } from './guidance'
import { Hand, state } from './testing'
import { View } from './view'

// The frame budget, counted and never timed, so that it holds on a busy
// runner. The view runs on a stand-in for the canvas that draws nothing and
// counts everything.

/** The most pictures and strokes one frame may lay. The heaviest measured is in REFINEMENT.md. */
const PIECES = 175
/** Pictures that cover most of the surface: the yard, once. */
const FULL = 1

type Count = { drawn: number; full: number; made: number }
const count: Count = { drawn: 0, full: 0, made: 0 }

function canvas(width: number, height: number, counts: boolean): HTMLCanvasElement {
  const pen: Record<string, unknown> = {}
  const c = { width, height, getContext: () => proxy }
  const proxy = new Proxy(pen, {
    get(t, k: string) {
      if (k in t) return t[k]
      if (k === 'createRadialGradient') return () => ({ addColorStop() {} })
      return (...a: unknown[]) => {
        if (!counts || (k !== 'drawImage' && k !== 'fill' && k !== 'stroke')) return
        count.drawn += 1
        if (k === 'drawImage' && (a[0] as { width: number }).width >= 1180) count.full += 1
      }
    },
    set(t, k: string, v) { t[k] = v; return true },
  })
  return c as unknown as HTMLCanvasElement
}
const make = (w: number, h: number) => { count.made += 1; return canvas(w, h, false) }
const surface = canvas(2360, 1640, true).getContext('2d')!
const GUIDE: Guidance = { glow: 1, demo: 0.4, demoIndex: 1 }

let view: View
beforeAll(() => { view = new View(make); view.draw(surface, new Hand().yard, 1180, 820, 2, null, 0) })

function frame(h: Hand): Count {
  Object.assign(count, { drawn: 0, full: 0, made: 0 })
  view.draw(surface, h.yard, 1180, 820, 2, GUIDE, 1 / 60)
  return { ...count }
}

describe('one frame', () => {
  it('makes no picture, stamps the yard once and stays under the budget, in the busiest yard', () => {
    let most = 0
    const h = new Hand(state((s) => s.brood.forEach((b, i) => { b.kind = 'chick'; b.mother = i ? (`c${i - 1}` as BroodId) : 'boot' })))
    h.run(5)
    h.drag('teapot', { x: HEN.x, y: HEN.y - 90 })
    h.tap('boot'); h.tap('ball')
    for (let i = 0; i < 240; i++) {
      h.run(1 / 60)
      h.yard.brood.forEach((c) => { c.thread = 1 })
      const f = frame(h)
      most = Math.max(most, f.drawn)
      expect(f.made).toBe(0)
      expect(f.full).toBe(FULL)
    }
    expect(most).toBeLessThanOrEqual(PIECES)
    expect(most).toBeGreaterThan(60)
  })
  it('draws every act on everyone, opening, tucking and laying, without a fault', () => {
    for (const name of Object.keys(ACTS) as ActName[]) {
      const h = new Hand()
      for (const b of [...THINGS.map((k) => h.yard.things[k]), h.yard.hen, ...h.yard.brood]) b.act = { name, t: 0.2, amount: 1 }
      expect(frame(h).drawn).toBeLessThanOrEqual(PIECES)
    }
    const h = new Hand(state((s) => s.brood.splice(3)))
    h.tap('c0'); h.tap('c1'); h.tap('hen')
    for (let i = 0; i < 200; i++) { h.run(1 / 60); expect(frame(h).drawn).toBeLessThanOrEqual(PIECES) }
    h.drag('c0', { x: HEN.x, y: HEN.y - 90 })
    for (let i = 0; i < 160; i++) { h.run(1 / 60); frame(h) }
  })
  it('never hands the surface a number that is not one', () => {
    const h = new Hand()
    const bad: string[] = []
    const strict = new Proxy({}, { get: (t: Record<string, unknown>, k: string) => (k in t ? t[k] : (...a: unknown[]) => { if (a.some((v) => typeof v === 'number' && !Number.isFinite(v))) bad.push(k) }), set: (t, k: string, v) => { t[k] = v; return true } }) as unknown as CanvasRenderingContext2D
    h.tap('c0'); h.tap('pig'); h.drag('boot', { x: HEN.x, y: HEN.y - 90 })
    for (let i = 0; i < 200; i++) { h.run(1 / 60); view.draw(strict, h.yard, 1180, 820, 2, GUIDE, 1 / 60) }
    expect(bad).toEqual([])
  })
})
