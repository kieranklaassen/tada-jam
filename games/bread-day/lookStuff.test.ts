import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { DoughBody, formOf, type Form } from './doughBody'
import { createStuffPainter } from './lookStuff'
import { EMPTY, type Bread, type Stuff } from './stuff'
import { reachableBreads } from './tastes'

// The painter needs a browser to be looked at; here a recording stand-in for
// the canvas checks what it may and may not do: a few flat fills a frame, no
// text, no blur, no gradient, and the same marks for the same seed.

type Call = [string, ...unknown[]]
function recorder(): { g: CanvasRenderingContext2D; calls: Call[]; inks: Set<string> } {
  const calls: Call[] = [], inks = new Set<string>(), held = { fillStyle: '' }
  const g = new Proxy(held, {
    get: (target, name: string) => (name in target ? target[name as 'fillStyle'] : (...args: unknown[]) => { calls.push([name, ...args.map((arg) => (typeof arg === 'number' ? Math.round(arg * 100) / 100 : typeof arg))]) }),
    set: (target, name: string, value: string) => { if (name === 'fillStyle') { target.fillStyle = value; inks.add(value) } else calls.push([`set ${name}`, value]); return true },
  })
  return { g: g as unknown as CanvasRenderingContext2D, calls, inks }
}

const form = (change: Partial<Stuff>): Form => formOf({ ...EMPTY, ...change }) as Form
const FORMS: Record<string, Form> = {
  dust: form({ flour: 2 }),
  puddle: form({ water: 2 }),
  batter: form({ flour: 1, water: 3, bubbly: true, rise: 80 }),
  seeds: form({ seeds: true }),
  streaky: form({ flour: 2, water: 2 }),
  shaggy: form({ flour: 2, water: 2, work: 4 }),
  smooth: form({ flour: 3, water: 3, work: 10, bubbly: true, rise: 100, seeds: true }),
}
/** A body that has been pushed about and has a finger on it, so every mark the painter knows is on. */
function pushed(shape: Form): DoughBody {
  const body = new DoughBody()
  body.reshape(shape)
  body.press(-30, 0)
  for (let i = 1; i <= 10; i++) { body.moveTo(-30 + i * 6, i); body.step(1 / 60) }
  return body
}

describe('the stuff painter', () => {
  const real = (globalThis as { Path2D?: unknown }).Path2D
  beforeAll(() => {
    // Node has no Path2D; the painter only builds one and hands it back to fill.
    (globalThis as { Path2D?: unknown }).Path2D = class { moveTo() {} lineTo() {} closePath() {} }
  })
  afterAll(() => { (globalThis as { Path2D?: unknown }).Path2D = real })

  it('draws every form in a few flat fills, and says how many', () => {
    const painter = createStuffPainter(31)
    for (const [name, shape] of Object.entries(FORMS)) {
      const { g, calls } = recorder(), ops = painter.paint(g, pushed(shape), shape, 400, 300, 1.2)
      const fills = calls.filter(([call]) => call === 'fill').length
      expect([name, ops]).toEqual([name, fills])
      expect(ops).toBeGreaterThan(0)
      expect(ops).toBeLessThanOrEqual(8)
      expect(calls.filter(([call]) => call === 'save').length).toBe(calls.filter(([call]) => call === 'restore').length)
      for (const [call, ...args] of calls) for (const arg of args) if (typeof arg === 'number') expect([name, call, Number.isFinite(arg)]).toEqual([name, call, true])
    }
  })

  it('draws nothing for nothing', () => {
    const { g, calls } = recorder(), body = new DoughBody()
    body.reshape(null)
    expect(createStuffPainter(31).paint(g, body, null, 0, 0, 1)).toBe(0)
    expect(calls).toEqual([])
  })

  it('stays a print: the paper and the key block only, no text, stroke, blur, shadow or gradient', () => {
    const painter = createStuffPainter(31), allowed = new Set(['save', 'restore', 'translate', 'scale', 'rotate', 'beginPath', 'moveTo', 'lineTo', 'quadraticCurveTo', 'ellipse', 'closePath', 'fill'])
    for (const shape of Object.values(FORMS)) {
      const { g, calls, inks } = recorder()
      painter.paint(g, pushed(shape), shape, 0, 0, 1)
      for (const [call] of calls) expect(allowed.has(call) ? '' : call).toBe('')
      for (const ink of inks) expect(['#f2e7d0', '#15161d']).toContain(ink)
    }
  })

  it('cuts the same marks for the same seed and the same body, so nothing boils', () => {
    const draw = (seed: number) => { const { g, calls } = recorder(); createStuffPainter(seed).paint(g, pushed(FORMS.shaggy), FORMS.shaggy, 0, 0, 1); return calls }
    expect(draw(31)).toEqual(draw(31))
    expect(draw(31)).not.toEqual(draw(32))
    const painter = createStuffPainter(31), body = pushed(FORMS.smooth), first = recorder(), second = recorder()
    painter.paint(first.g, body, FORMS.smooth, 0, 0, 1); painter.paint(second.g, body, FORMS.smooth, 0, 0, 1)
    expect(second.calls).toEqual(first.calls)
  })

  it('draws every bread that can be baked, live and at rest, and keeps gold for what the oven made', () => {
    const painter = createStuffPainter(31), breads: Bread[] = reachableBreads()
    const inksOf = (shape: Form, live: boolean): { ops: number; fills: number; inks: Set<string>; calls: Call[] } => {
      const { g, calls, inks } = recorder()
      const ops = live ? painter.paint(g, pushed(shape), shape, 100, 80, 1) : painter.still(g, shape, 100, 80, 0.3, 0.2)
      return { ops, fills: calls.filter(([call]) => call === 'fill').length, inks, calls }
    }
    for (const one of breads) for (const live of [true, false]) {
      const name = `${one.crumb} ${one.shape} ${one.crust} ${one.seeds} ${live}`, { ops, fills, inks, calls } = inksOf(formOf(one) as Form, live)
      expect([name, ops]).toEqual([name, fills])
      expect(ops).toBeGreaterThan(0)
      expect(ops).toBeLessThanOrEqual(8)
      expect([name, inks.has('#e3a32e')]).toEqual([name, true])
      for (const ink of inks) expect(['#f2e7d0', '#15161d', '#e3a32e']).toContain(ink)
      for (const [call, ...args] of calls) for (const arg of args) if (typeof arg === 'number') expect([name, call, Number.isFinite(arg)]).toEqual([name, call, true])
    }
    for (const [name, shape] of Object.entries(FORMS)) for (const live of [true, false]) {
      const { ops, inks } = inksOf(shape, live)
      expect(ops).toBeGreaterThan(0)
      expect([name, inks.has('#e3a32e')]).toEqual([name, false])
    }
    expect(painter.still(recorder().g, null, 0, 0, 1)).toBe(0)
  })

  it('draws a form at rest the same way every time, tilted when asked', () => {
    const painter = createStuffPainter(31), loaf = formOf({ raw: false, crumb: 'airy', shape: 'long', crust: 'dark', seeds: true }) as Form
    const first = recorder(), second = recorder(), tilted = recorder()
    painter.still(first.g, loaf, 10, 20, 0.3); painter.still(second.g, loaf, 10, 20, 0.3); painter.still(tilted.g, loaf, 10, 20, 0.3, 0.4)
    expect(second.calls).toEqual(first.calls)
    expect(first.calls.some(([call]) => call === 'rotate')).toBe(false)
    expect(tilted.calls.filter(([call]) => call === 'rotate')).toEqual([['rotate', 0.4]])
  })
})
