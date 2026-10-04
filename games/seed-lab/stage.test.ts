import { describe, expect, it } from 'vitest'
import { paintRing, type Ctx } from './ink'
import { paintHand } from './tools'
import { REFERENCE, layoutOf } from './layout'
import type { PlantLive, Puff } from './live'
import { spikePage } from './spikePage'
import { drawPuff, dustCap, goldDust, paintFamily, plantInMotion, type Brush, type Sprite } from './stage'

type Call = [name: string, ...args: unknown[]]

/** A 2D context that draws nothing and writes down every call made on it, and every alpha it was set to. */
function recorder(): { ctx: Ctx; calls: Call[]; alphas: number[] } {
  const calls: Call[] = [], alphas: number[] = [], held: Record<string, unknown> = { globalAlpha: 1 }
  const gradient = { addColorStop: () => {} }
  const ctx = new Proxy(held, {
    get(target, name: string) {
      if (name in target) return target[name]
      if (name === 'createLinearGradient' || name === 'createRadialGradient') return () => gradient
      return (...args: unknown[]) => { calls.push([name, ...args]) }
    },
    set(target, name: string, value) {
      if (name === 'globalAlpha') alphas.push(value as number)
      target[name] = value
      return true
    },
  }) as unknown as Ctx
  return { ctx, calls, alphas }
}

const names = (calls: Call[]) => calls.map(([name]) => name)
const count = (calls: Call[], name: string) => calls.filter((call) => call[0] === name).length

describe('the marks of things in motion', () => {
  const puff = (kind: Puff['kind'], age: number): Puff => ({ x: 300, y: 200, r: 16, age, kind })

  it.each(['soil', 'pop', 'sneeze'] as const)('draws a %s puff the same way twice, older ones differently, and never as text', (kind) => {
    const once = recorder(), again = recorder(), later = recorder()
    drawPuff(once.ctx, puff(kind, 0.3), 1)
    drawPuff(again.ctx, puff(kind, 0.3), 1)
    drawPuff(later.ctx, puff(kind, 0.7), 1)
    expect(once.calls.length).toBeGreaterThan(10)
    expect(JSON.stringify(again.calls)).toBe(JSON.stringify(once.calls))
    expect(JSON.stringify(later.calls)).not.toBe(JSON.stringify(once.calls))
    for (const text of ['fillText', 'strokeText']) expect(names(once.calls)).not.toContain(text)
    expect(count(once.calls, 'save')).toBe(count(once.calls, 'restore'))
  })

  it('draws a pop and a sneeze in pencil alone, and soil as pen flecks over a pencil arc', () => {
    for (const kind of ['pop', 'sneeze'] as const) {
      const drawn = recorder()
      drawPuff(drawn.ctx, puff(kind, 0.4), 1)
      expect(count(drawn.calls, 'fill')).toBe(0)
      expect(count(drawn.calls, 'stroke')).toBeGreaterThan(10)
    }
    const soil = recorder()
    drawPuff(soil.ctx, puff('soil', 0.4), 1)
    expect(count(soil.calls, 'fill')).toBe(10)
    expect(count(soil.calls, 'stroke')).toBeGreaterThan(5)
  })

  it('thins a puff with age until nothing of it is left', () => {
    const young = recorder(), old = recorder()
    drawPuff(young.ctx, puff('pop', 0), 1)
    drawPuff(old.ctx, puff('pop', 1), 1)
    expect(young.alphas[0]).toBe(1)
    expect(old.alphas[0]).toBe(0)
    expect(Math.max(...old.alphas)).toBe(0)
  })

  it('draws the ring as pencil strokes and the hand as pencil strokes over one thin fill of paper', () => {
    const ring = recorder(), hand = recorder(), pressed = recorder()
    paintRing(ring.ctx, 32)
    expect(count(ring.calls, 'fill')).toBe(0)
    expect(count(ring.calls, 'stroke')).toBeGreaterThan(40)
    paintHand(hand.ctx, 1.5, 0)
    paintHand(pressed.ctx, 1.5, 1)
    expect(count(hand.calls, 'fill')).toBe(1)
    expect(count(hand.calls, 'stroke')).toBeGreaterThan(100)
    expect(JSON.stringify(pressed.calls)).not.toBe(JSON.stringify(hand.calls))
  })

  it('dusts the beetle with as many specks as it is gold, in two fills, and none when it is not', () => {
    const arcs = (amount: number) => { const drawn = recorder(); goldDust(drawn.ctx, 1.3, amount); return drawn.calls }
    expect(count(arcs(0), 'arc')).toBe(0)
    expect(count(arcs(0.5), 'arc')).toBe(32)
    expect(count(arcs(1), 'arc')).toBe(64)
    expect(count(arcs(7), 'arc')).toBe(64)
    expect(count(arcs(1), 'fill')).toBe(2)
    const cap = recorder()
    dustCap(cap.ctx, 1.1)
    expect(count(cap.calls, 'save')).toBe(count(cap.calls, 'restore'))
  })
})

describe('a plant in motion', () => {
  const full: Sprite = { canvas: { name: 'full' } as unknown as CanvasImageSource, x: -36, y: -230, w: 72, h: 236 }
  const pen: Sprite = { ...full, canvas: { name: 'pen' } as unknown as CanvasImageSource }
  const stem = 198, state = (over: Partial<PlantLive>): PlantLive => ({ grow: 1, bend: 0, squash: 1, at: null, held: false, ...over })

  /** A brush that writes down what it is asked to lay, on a recorder for the transforms. */
  function drawn(live: PlantLive, y = 400.3, z = 1) {
    const surface = recorder(), laid: { what: string; top: number; bottom: number }[] = []
    let pods = 0, made = 0
    const brush: Brush = {
      ctx: surface.ctx, ratio: 2,
      put: (made) => { laid.push({ what: (made.canvas as unknown as { name: string }).name, top: made.y, bottom: made.y + made.h }) },
      band: (made, top, bottom) => { laid.push({ what: (made.canvas as unknown as { name: string }).name, top, bottom }) },
    }
    plantInMotion(brush, () => { made++; return full }, () => pen, stem, 1, live, 250, y, z, () => { pods++ })
    return { laid, pods, made, calls: surface.calls }
  }

  it('lays the whole drawing once when it is grown and upright, with its pod', () => {
    const still = drawn(state({}))
    expect(still.laid).toEqual([{ what: 'full', top: -230, bottom: 6 }])
    expect(still.pods).toBe(1)
    expect(count(still.calls, 'save')).toBe(count(still.calls, 'restore'))
  })

  it('draws nothing of a plant that has not started, and no pod on one that has not finished', () => {
    const waiting = drawn(state({ grow: 0 }))
    expect(waiting.laid).toEqual([])
    // Its drawing is not even asked for, so it is not made before it is needed.
    expect(waiting.made).toBe(0)
    expect(waiting.calls).toEqual([])
    expect(drawn(state({ grow: 0.01 })).made).toBe(1)
    for (const grow of [0, 0.3, 0.85, 0.99]) expect(drawn(state({ grow })).pods).toBe(0)
  })

  it('shows a growing plant from the soil up: the wash to a height, the pen line alone above it, higher as it grows', () => {
    let last = 0
    for (const grow of [0.1, 0.3, 0.5, 0.7]) {
      const { laid, calls } = drawn(state({ grow }))
      expect(laid.map((one) => one.what)).toEqual(['full', 'pen'])
      expect(laid[0].bottom).toBe(6)
      // The pen's band sits on the wash's, and its top is where the plant has got to.
      expect(laid[1].bottom).toBeCloseTo(laid[0].top, 9)
      expect(laid[1].top).toBeLessThan(last)
      expect(laid[1].top).toBeGreaterThan(-stem)
      last = laid[1].top
      // The pen tip is one dot at the top of what is shown.
      const tip = calls.filter((call) => call[0] === 'ellipse')
      expect(tip).toHaveLength(1)
      expect(tip[0][2]).toBeCloseTo(laid[1].top, 9)
    }
  })

  it('opens the flower last, and lets it pop past its size just before it is done', () => {
    const scaleOf = (grow: number) => { const scales = drawn(state({ grow })).calls.filter((call) => call[0] === 'scale'); return scales.length ? Number(scales[scales.length - 1][1]) : 0 }
    expect(scaleOf(0.7)).toBe(0)
    expect(scaleOf(0.82)).toBeLessThan(0.6)
    expect(scaleOf(0.9)).toBeCloseTo(1, 6)
    expect(scaleOf(0.95)).toBeGreaterThan(1.1)
    expect(scaleOf(0.95)).toBeLessThan(1.2)
    expect(scaleOf(0.999)).toBeCloseTo(1, 1)
    // The flower is the top of the drawing: the rows above the neck of the stem.
    const flower = drawn(state({ grow: 0.95 })).laid.filter((one) => one.top === -230)
    expect(flower.map((one) => one.what)).toEqual(['full'])
  })

  it('bends in a curve: bands that meet on whole pixels with no gap, each leaning more than the one under it, and the flower on top with the pod', () => {
    const y = 400.3, { laid, pods, calls } = drawn(state({ bend: 0.2 }), y)
    expect(laid.length).toBeGreaterThanOrEqual(5)
    expect(laid.every((one) => one.what === 'full')).toBe(true)
    expect(laid[0].bottom).toBe(6)
    expect(laid[laid.length - 1].top).toBe(-230)
    for (let i = 1; i < laid.length; i++) {
      expect(laid[i].bottom).toBe(laid[i - 1].top)
      expect(Math.abs((y + laid[i].bottom) * 2 - Math.round((y + laid[i].bottom) * 2))).toBeLessThan(1e-6)
    }
    const slopes = calls.filter((call) => call[0] === 'transform').map((call) => Number(call[3]))
    expect(slopes).toHaveLength(laid.length - 1)
    for (let i = 1; i < slopes.length; i++) expect(slopes[i]).toBeLessThan(slopes[i - 1])
    // The other way, it leans the other way; and the flower is turned, not sheared.
    const other = drawn(state({ bend: -0.2 }), y).calls
    expect(other.filter((call) => call[0] === 'transform').every((call) => Number(call[3]) > 0)).toBe(true)
    expect(Number(calls.find((call) => call[0] === 'rotate')![1])).toBeGreaterThan(0)
    expect(Number(other.find((call) => call[0] === 'rotate')![1])).toBeLessThan(0)
    expect(pods).toBe(1)
  })

  it('squashes about its soil line and widens as it does, and is scaled as a whole in the air', () => {
    const squashed = drawn(state({ squash: 0.8 })).calls.find((call) => call[0] === 'transform')!
    expect(Number(squashed[4])).toBeCloseTo(0.8, 9)
    expect(Number(squashed[1])).toBeGreaterThan(1)
    expect(Number(squashed[1])).toBeLessThan(1.25)
    expect(squashed.slice(5)).toEqual([0, 0])
    const small = drawn(state({ at: { x: 250, y: 400.3, k: 0.5 } }), 400.3, 0.5).calls.find((call) => call[0] === 'transform')!
    expect([small[1], small[4]]).toEqual([0.5, 0.5])
    // A squash that is no size at all is drawn as none.
    expect(Number(drawn(state({ squash: 0 })).calls.find((call) => call[0] === 'transform')![4])).toBe(1)
  })
})

describe('the family lines', () => {
  const view = spikePage(), layout = layoutOf(REFERENCE.w, REFERENCE.h)
  const strokes = (away?: ReadonlySet<number>) => { const drawn = recorder(); paintFamily(drawn.ctx, view, layout, away); return count(drawn.calls, 'stroke') }

  it('leaves out the lines of a plant that is away, and of the young of a parent that is away', () => {
    const all = strokes(), young = view.plants.filter((plant) => plant.row === 'tray')
    expect(strokes(new Set())).toBe(all)
    const one = strokes(new Set([young[0].id]))
    expect(one).toBeLessThan(all)
    expect(strokes(new Set(young.map((plant) => plant.id)))).toBeLessThan(one)
    const origin = young[0].origin
    if (origin.kind === 'seed') expect(strokes(new Set([origin.onto]))).toBeLessThan(all)
  })
})
