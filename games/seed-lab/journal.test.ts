import { describe, expect, it } from 'vitest'
import type { Ctx } from './ink'
import { drawPage, type MakeSheet } from './journal'
import { REFERENCE, layoutOf } from './layout'
import { spikePage } from './spikePage'

type Call = [name: string, ...args: unknown[]]

/** A 2D context that draws nothing and writes down every call made on it. */
function recorder(ratio = 2): { ctx: Ctx; calls: Call[] } {
  const calls: Call[] = [], held: Record<string, unknown> = {}
  const gradient = { addColorStop: () => {} }
  const ctx = new Proxy(held, {
    get(target, name: string) {
      if (name in target) return target[name]
      if (name === 'getTransform') return () => ({ a: ratio })
      if (name === 'createLinearGradient' || name === 'createRadialGradient') return () => gradient
      return (...args: unknown[]) => { calls.push([name, ...args]) }
    },
    set(target, name: string, value) {
      target[name] = value
      return true
    },
  }) as unknown as Ctx
  return { ctx, calls }
}

/** A sheet factory that hands out recorders, and keeps them to be looked at. */
function sheets(): { make: MakeSheet; made: { canvas: { sheet: number; width: number; height: number }; calls: Call[] }[] } {
  const made: { canvas: { sheet: number; width: number; height: number }; calls: Call[] }[] = []
  const make: MakeSheet = (width, height) => {
    const { ctx, calls } = recorder()
    const canvas = { sheet: made.length, width, height }
    made.push({ canvas, calls })
    return { canvas: canvas as unknown as CanvasImageSource, ctx }
  }
  return { make, made }
}

const names = (calls: Call[]) => calls.map(([name]) => name)

describe('the journal page', () => {
  const view = spikePage(), layout = layoutOf(REFERENCE.w, REFERENCE.h)

  it('never draws text, on the surface or on any sheet', () => {
    const { make, made } = sheets(), surface = recorder()
    drawPage(surface.ctx, view, layout, 1.5, 0, make)
    for (const calls of [surface.calls, ...made.map((sheet) => sheet.calls)]) {
      expect(names(calls)).not.toContain('fillText')
      expect(names(calls)).not.toContain('strokeText')
      expect(names(calls)).not.toContain('measureText')
    }
    expect(made.length).toBeGreaterThan(10)
  })

  it('makes its sheets once: a second frame makes none and lays down fewer than 80 things', () => {
    const { make, made } = sheets()
    drawPage(recorder().ctx, view, layout, 0, 0, make)
    const after = made.length, surface = recorder()
    const draws = drawPage(surface.ctx, view, layout, 0.5, 0, make)
    expect(made.length).toBe(after)
    expect(draws).toBeGreaterThan(20)
    expect(draws).toBeLessThan(80)
    const images = surface.calls.filter(([name]) => name === 'drawImage')
    expect(images.length).toBeGreaterThan(20)
    expect(images.length).toBeLessThanOrEqual(draws)
  })

  it('draws the same calls for the same view and time', () => {
    const { make } = sheets()
    drawPage(recorder().ctx, view, layout, 3.25, 0, make)
    const first = recorder(), second = recorder()
    expect(drawPage(first.ctx, view, layout, 3.25, 0, make)).toBe(drawPage(second.ctx, spikePage(), layoutOf(REFERENCE.w, REFERENCE.h), 3.25, 0, make))
    expect(JSON.stringify(second.calls)).toBe(JSON.stringify(first.calls))
    const cold = sheets(), again = recorder()
    drawPage(again.ctx, view, layout, 3.25, 0, cold.make)
    expect(JSON.stringify(names(again.calls))).toBe(JSON.stringify(names(first.calls)))
  })

  it('paints each sheet the same way every time', () => {
    const a = sheets(), b = sheets()
    drawPage(recorder().ctx, view, layout, 0, 0, a.make)
    drawPage(recorder().ctx, view, layout, 9, 0, b.make)
    expect(b.made.length).toBe(a.made.length)
    a.made.forEach((sheet, at) => {
      expect(b.made[at].canvas).toEqual(sheet.canvas)
      expect(JSON.stringify(b.made[at].calls)).toBe(JSON.stringify(sheet.calls))
    })
  })

  it('is alive at idle, and keeps every plant still', () => {
    const { make, made } = sheets()
    drawPage(recorder().ctx, view, layout, 0, 0, make)
    const early = recorder(), late = recorder()
    drawPage(early.ctx, view, layout, 1, 0, make)
    drawPage(late.ctx, view, layout, 2.3, 0, make)
    expect(JSON.stringify(late.calls)).not.toBe(JSON.stringify(early.calls))
    // The ground, the packets, the kept drawings, the pots, the plants and the pods are laid down first:
    // the same sheets at the same places both times.
    const count = 1 + view.packets.length + view.kept.length + 12 + view.plants.length + view.pods.length
    const still = (calls: Call[]) => calls.filter(([name]) => name === 'drawImage').slice(0, count)
    expect(still(early.calls)).toHaveLength(count)
    expect(JSON.stringify(still(late.calls))).toBe(JSON.stringify(still(early.calls)))
    // No transform is applied before the last of them, so those places are the places on the page.
    const lastPlant = early.calls.indexOf(still(early.calls)[count - 1])
    expect(names(early.calls.slice(0, lastPlant)).filter((name) => ['translate', 'rotate', 'scale', 'transform', 'setTransform'].includes(name))).toEqual([])
    expect(made.length).toBeGreaterThan(count - 20)
  })

  it('keeps one set of sheets per size and makes new ones when the surface changes', () => {
    const { make, made } = sheets()
    drawPage(recorder().ctx, view, layout, 0, 0, make)
    const before = made.length
    drawPage(recorder().ctx, view, layoutOf(1024, 768), 0, 0, make)
    expect(made.length).toBeGreaterThan(before)
    const ground = made[before]
    expect(Math.max(...made.slice(before).map((sheet) => sheet.canvas.width))).toBe(2048)
    expect(ground.canvas.width).toBeLessThanOrEqual(2048)
  })

  it('sheds the lifted tape end on the lower tiers and nothing else', () => {
    const { make } = sheets()
    drawPage(recorder().ctx, view, layout, 0, 0, make)
    const full = drawPage(recorder().ctx, view, layout, 1, 0, make), lean = drawPage(recorder().ctx, view, layout, 1, 3, make)
    expect(full - lean).toBe(1)
  })

  it('draws an empty page and a page with no time', () => {
    const { make } = sheets()
    const bare = { ...view, plants: [], packets: [], pods: [], visitor: null, waiting: null, kept: [], worm: null }
    expect(drawPage(recorder().ctx, bare, layout, Number.NaN, 0, make)).toBeGreaterThan(12)
  })
})
