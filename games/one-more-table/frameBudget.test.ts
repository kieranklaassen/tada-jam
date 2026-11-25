import { beforeAll, describe, expect, it } from 'vitest'
import type { Guidance } from './guidance'
import { Hand } from './testing'
import { View } from './view'

// The frame budget, counted and never timed, so it holds on a busy runner.
const PIECES = 260
const count = { made: 0 }
const bad: string[] = []
function canvas(width: number, height: number): HTMLCanvasElement {
  const pen: Record<string, unknown> = { globalAlpha: 1 }
  const c = { width, height, getContext: () => proxy }
  const proxy = new Proxy(pen, { get: (t, k: string) => (k in t ? t[k] : (...a: unknown[]) => { if (a.some((v) => typeof v === 'number' && !Number.isFinite(v))) bad.push(k) }), set: (t, k: string, v) => { if (typeof v === 'number' && !Number.isFinite(v)) bad.push(k); t[k] = v; return true } })
  return c as unknown as HTMLCanvasElement
}
const surface = canvas(2360, 1640).getContext('2d')!
const GUIDE: Guidance = { glow: 1, demo: 0.4, demoIndex: 1 }
let view: View
beforeAll(() => { view = new View((w, h) => { count.made++; return canvas(w, h) }) })

describe('one frame', () => {
  it('stays in the budget at the fullest table, makes no picture and no bad number', () => {
    const h = new Hand()
    const made = count.made
    let most = 0
    const look = () => { most = Math.max(most, view.draw(surface, h.table, 1180, 820, 2, GUIDE, 1 / 60)) }
    for (let i = 0; i < 10; i++) { h.tapAt(h.knob); h.run(2.4, look) }
    h.tapAt(h.face('bear')); h.run(1.2, look)
    h.tapAt(h.bell); h.run(10, look)
    h.dragBy(h.face('bear'), -300, -60, 'hold'); h.run(0.3, look); h.play.up(1, 300, 400); h.run(1, look)
    h.tapAt(h.knob); h.run(4, look)
    expect(count.made).toBe(made)
    expect(bad).toEqual([])
    console.info(`pieces at the most: ${most}`)
    expect(most).toBeLessThanOrEqual(PIECES)
  }, 30_000)
})
