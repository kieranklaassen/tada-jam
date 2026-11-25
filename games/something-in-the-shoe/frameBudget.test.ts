import { describe, expect, it } from 'vitest'
import { lengthOf } from './acts'
import { House } from './house'
import { SUN } from './layout'
import { OWNERS } from './owners'
import { freshState } from './save'
import { FINDS } from './testing'
import { View } from './view'

// The frame budget, counted and never timed: fills and strokes of flat shapes,
// the room stamped once (twice while day and night cross).

/** One foot and one boot. The row of five may lay more. */
const ONE = 300, ROW = 620

const bad: string[] = []
let made = 0
function pen(): CanvasRenderingContext2D {
  return new Proxy({} as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : (...a: unknown[]) => { if (a.some((v) => typeof v === 'number' && !Number.isFinite(v))) bad.push(k) }),
    set: (t, k: string, v) => { t[k] = v; if (typeof v === 'number' && !Number.isFinite(v)) bad.push(k); return true },
  }) as unknown as CanvasRenderingContext2D
}
const make = (width: number, height: number): HTMLCanvasElement => { made++; const p = pen(); return { width, height, getContext: () => p } as unknown as HTMLCanvasElement }
const GUIDE = { glow: 1, demo: 0.4, demoIndex: 0 }

describe('one frame', () => {
  const view = new View(make, 2), out = pen(), begun = { ...freshState(), shown: true, begun: true }
  it('stays under the budget for everything anyone can find, and makes nothing', () => {
    made = 0
    let most = 0
    for (const owner of OWNERS) for (const found of FINDS) {
      const h = new House({ ...begun, owner, shoes: freshState().shoes })
      for (let t = 0; t < lengthOf(found, owner); t += 0.23) {
        h.acts = [{ owner, found, t, cue: 0, cues: [], home: true }]
        most = Math.max(most, view.draw(out, h, 1180, 820, 2, GUIDE))
      }
    }
    expect(made).toBe(0)
    expect(most).toBeLessThanOrEqual(ONE)
    expect(most).toBeGreaterThan(90)
    expect(bad).toEqual([])
  })
  it('stays under the row\'s budget through a night and a morning', () => {
    const h = new House({ ...begun, shoes: freshState().shoes })
    h.tap({ kind: 'sun' })
    let most = 0
    for (let i = 0; i < 1500; i++) {
      h.step(1 / 60)
      if (i > 100 && i < 300 && i % 20 === 0) h.tap({ kind: 'thing', id: (['frog', 'bell', 'mouse', 'porridge', 'mandarin', 'carrot', 'biscuit'] as const)[(i / 20) % 7] })
      if (i === 400) h.tap(h.at(SUN))
      most = Math.max(most, view.draw(out, h, 1180, 820, 2, GUIDE))
    }
    expect(h.phase).toBe('day')
    expect(most).toBeLessThanOrEqual(ROW)
    expect(bad).toEqual([])
  })
})
