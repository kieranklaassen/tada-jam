import { describe, expect, it } from 'vitest'
import { BESIDE_X, COLLAR_Y, LOCK_X, STRIP_W, tipY } from './layout'
import { manePlumes, plume } from './paintAnimals'
import { capeOutline, stripOutline } from './paintStrips'
import { makeRng } from './rng'
import { SPIKE, SPIKE_SEED, SpikeView, paintSalon } from './spike'
import { blob, boxOf, fadeTo, type Ctx, type MakeSheet, type Sheet } from './wash'

// A stand-in for a 2D context: it takes every call and every setting, and keeps the names of what was called.
function fakeSheets(): { make: MakeSheet; calls: string[]; made: () => number } {
  const calls: string[] = []
  let made = 0
  const make: MakeSheet = (width, height) => {
    made++
    const canvas = { width, height }
    const g = new Proxy({} as Record<string, unknown>, {
      get: (target, name: string) => {
        if (name in target) return target[name]
        return (...args: unknown[]) => {
          calls.push(name)
          if (name === 'createRadialGradient') return { addColorStop: () => {} }
          if (name === 'createPattern') return {}
          return args.length ? undefined : undefined
        }
      },
      set: (target, name: string, value) => { target[name] = value; return true },
    })
    return { canvas, g } as unknown as Sheet
  }
  return { make, calls, made: () => made }
}

describe('the painted salon', () => {
  it('paints the whole scene from its seed and writes nothing', () => {
    const { make, calls } = fakeSheets()
    const surface = make(1180, 820)
    const pieces = paintSalon(surface.g as Ctx, make, 1180, 820)
    expect(pieces).toBeGreaterThan(80)
    expect(pieces).toBeLessThan(260)
    for (const name of ['fillText', 'strokeText', 'measureText']) expect(calls).not.toContain(name)
  })

  it('lays down the same number of pieces every time for the same seed', () => {
    const counts = [0, 1].map(() => { const { make } = fakeSheets(); return paintSalon(make(1180, 820).g as Ctx, make, 1180, 820, SPIKE_SEED) })
    expect(counts[0]).toBe(counts[1])
  })

  it('builds every wash on the same few sheets', () => {
    const { make, made } = fakeSheets()
    paintSalon(make(2360, 1640).g as Ctx, make, 2360, 1640)
    // The surface, the grain tile and six scratch sheets.
    expect(made()).toBeLessThanOrEqual(8)
  })

  it('paints nothing on a surface with no size', () => {
    const { make, calls } = fakeSheets()
    expect(paintSalon(make(0, 0).g as Ctx, make, 0, 0)).toBe(0)
    expect(calls).toEqual([])
  })

  it('paints once for a size and then only copies', () => {
    const { make, calls } = fakeSheets()
    const view = new SpikeView(make), surface = make(1180, 820)
    expect(view.draw(surface.g as Ctx, 1180, 820)).toBe(1)
    const afterFirst = calls.length
    expect(view.draw(surface.g as Ctx, 1180, 820)).toBe(1)
    // A frame after the first is one copy of the painted sheet.
    expect(calls.slice(afterFirst)).toEqual(['setTransform', 'drawImage'])
    expect(view.pieces).toBeGreaterThan(80)
    view.draw(surface.g as Ctx, 1024, 768)
    expect(calls.length - afterFirst).toBeGreaterThan(100)
    expect(view.draw(surface.g as Ctx, 0, 0)).toBe(0)
  })

  it('shows the first position: a lock plainly longer than its model, both inside the range of lengths', () => {
    expect(SPIKE.lock - SPIKE.model).toBeGreaterThanOrEqual(24)
    for (const steps of [SPIKE.lock, SPIKE.model, ...SPIKE.mane]) expect(steps >= 4 && steps <= 100).toBe(true)
    expect(SPIKE.mane).toHaveLength(9)
  })
})

describe('the shapes', () => {
  it('hangs a strip from the collar with its free end where its length says', () => {
    for (const steps of [4, 30, 78, 100]) {
      const box = boxOf(stripOutline(LOCK_X, steps))
      expect(box.y).toBeCloseTo(COLLAR_Y)
      expect(box.y + box.h).toBeCloseTo(tipY(steps))
      expect(box.w).toBeCloseTo(STRIP_W)
    }
  })

  it('shows the longer of two strips as the one that reaches lower, with tops level', () => {
    const lock = boxOf(stripOutline(LOCK_X, SPIKE.lock)), model = boxOf(stripOutline(BESIDE_X, SPIKE.model))
    expect(lock.y).toBe(model.y)
    expect(lock.y + lock.h).toBeGreaterThan(model.y + model.h)
    expect(model.x).toBeGreaterThan(lock.x + lock.w)
  })

  it('keeps both strips over the cape for their whole length', () => {
    const cape = boxOf(capeOutline())
    for (const [x, steps] of [[LOCK_X, 96], [BESIDE_X, 96]]) {
      const box = boxOf(stripOutline(x, steps))
      expect(box.x).toBeGreaterThan(cape.x)
      expect(box.x + box.w).toBeLessThan(cape.x + cape.w)
    }
  })

  it('makes a tuft longer when its length is longer', () => {
    const reach = (points: { x: number; y: number }[]) => Math.max(...points.map((p) => Math.hypot(p.x, p.y)))
    expect(reach(plume(0, 0, 0, 120, 60, 0))).toBeGreaterThan(reach(plume(0, 0, 0, 40, 60, 0)))
    const short = manePlumes(makeRng(3), [10, 10, 10]), long = manePlumes(makeRng(3), [90, 90, 90])
    for (let i = 0; i < 3; i++) expect(boxOf(long[i]).w + boxOf(long[i]).h).toBeGreaterThan(boxOf(short[i]).w + boxOf(short[i]).h)
  })

  it('draws an uneven outline that stays near its ellipse', () => {
    for (const p of blob(makeRng(1), 100, 50, 40, 20, 0.1, 16)) {
      expect(Math.abs(p.x - 100)).toBeLessThanOrEqual(40 * 1.1 + 1e-9)
      expect(Math.abs(p.y - 50)).toBeLessThanOrEqual(20 * 1.1 + 1e-9)
    }
  })

  it('fades a colour to itself and never to black', () => {
    expect(fadeTo('#ee8232', 0)).toBe('rgba(238,130,50,0)')
    expect(fadeTo('#000', 0.5)).toBe('rgba(0,0,0,0.5)')
    expect(fadeTo('#fff', 1)).toBe('rgba(255,255,255,1)')
  })
})
