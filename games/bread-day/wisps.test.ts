import { describe, expect, it } from 'vitest'
import { MOST_WISPS, WISP, Wisps, wispNow, type WispKind } from './wisps'

const KINDS: WispKind[] = ['steam', 'shimmer', 'cloud', 'smoke', 'seed', 'sheen', 'frost']

describe('what rises for a moment and is gone', () => {
  it('lasts its own short time and no longer, whatever the frame length', () => {
    for (const kind of KINDS) {
      const slow = new Wisps(), fast = new Wisps()
      slow.add(kind, 100, 100, 1, 0.5); fast.add(kind, 100, 100, 1, 0.5)
      slow.step(WISP[kind].life * 0.5)
      for (let i = 0; i < 30; i++) fast.step((WISP[kind].life * 0.5) / 30)
      expect(wispNow(slow.list[0]).y).toBeCloseTo(wispNow(fast.list[0]).y, 6)
      slow.step(WISP[kind].life * 0.51)
      expect(slow.list.length, kind).toBe(0)
      expect(WISP[kind].life).toBeLessThanOrEqual(2)
    }
  })

  it('rises and thins away without ever growing past full: nothing fades, it shrinks', () => {
    for (const kind of ['steam', 'cloud', 'smoke'] as const) {
      const wisps = new Wisps()
      wisps.add(kind, 0, 0, 1, -0.3)
      let last = 0, peak = 0
      for (let i = 0; i < 100 && wisps.list.length > 0; i++) {
        const now = wispNow(wisps.list[0])
        expect(now.y).toBeLessThanOrEqual(last + 1e-9)
        expect(now.full).toBeGreaterThanOrEqual(0); expect(now.full).toBeLessThanOrEqual(1)
        last = now.y; peak = Math.max(peak, now.full)
        wisps.step(WISP[kind].life / 99)
      }
      expect(peak).toBeGreaterThan(0.9)
      expect(-last).toBeGreaterThan(WISP[kind].rise * 0.9)
    }
  })

  it('rolls one seed a little way and lays it down again', () => {
    const wisps = new Wisps()
    wisps.add('seed', 50, 80, 1, 1)
    wisps.step(0.25)
    const mid = wispNow(wisps.list[0])
    expect(mid.x).toBeGreaterThan(50); expect(mid.y).toBeLessThan(80)
    wisps.step(0.3)
    const end = wispNow(wisps.list[0])
    expect(end.y).toBeCloseTo(80, 6); expect(end.x - 50).toBeCloseTo(22, 6)
  })

  it('never holds more than its cap, and can be cleared', () => {
    const wisps = new Wisps()
    for (let i = 0; i < 40; i++) wisps.add('steam', i, 0, 1, 0)
    expect(wisps.list.length).toBe(MOST_WISPS)
    expect(wisps.list[0].x, 'the oldest gave way').toBe(40 - MOST_WISPS)
    wisps.clear()
    expect(wisps.list.length).toBe(0)
  })
})
