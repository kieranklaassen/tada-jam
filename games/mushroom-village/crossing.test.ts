import { describe, expect, it } from 'vitest'
import { HOPS, HOP_HIGH, HOP_REACH, STRIDE, crossing, hopLift } from './crossing'
import { GNOMES, inWater } from './ground'

// A way straight across the stream, from the sunny moss on one side to the
// moss on the other, and what each gnome makes of it.
const OVER = [{ x: 480, y: 500 }, { x: 1000, y: 500 }]
const wetAt = (x: number): boolean => inWater(x, 500)

describe('how a gnome crosses ground with no pebbles on it', () => {
  it('has water on the way, with moss on both sides of it', () => {
    expect(wetAt(480)).toBe(false)
    expect(wetAt(1000)).toBe(false)
    expect([...Array(52).keys()].some((i) => wetAt(480 + i * 10))).toBe(true)
  })

  it.each(GNOMES)('gives the %s gnome a sound at every stride, in the order he comes to them', (who) => {
    const plan = crossing(who, OVER)
    expect(plan.total).toBe(520)
    for (let i = 1; i < plan.cues.length; i++) expect(plan.cues[i].d).toBeGreaterThanOrEqual(plan.cues[i - 1].d)
    // No stretch of the way longer than a stride and a hop passes unheard.
    const heard = [0, ...plan.cues.map((cue) => cue.d), plan.total]
    for (let i = 1; i < heard.length; i++) expect(heard[i] - heard[i - 1]).toBeLessThanOrEqual(Math.max(STRIDE[who], HOP_REACH) + 12)
    expect(plan.cues.filter((cue) => cue.what === 'step').length).toBeGreaterThanOrEqual(3)
  })

  it('has the tall and the sleepy one wade the water, a step in it at every stride, and never leave the ground', () => {
    for (const who of ['tall', 'sleepy'] as const) {
      const plan = crossing(who, OVER)
      expect(HOPS[who]).toBe(false)
      expect(plan.hops.length).toBe(0)
      const wades = plan.cues.filter((cue) => cue.what === 'wade')
      expect(wades.length).toBeGreaterThan(0)
      for (let d = 0; d <= plan.total; d += 5) expect(hopLift(plan, d)).toBe(0)
    }
  })

  it('has the baker and the sneezy one hop it: up at the bank, down on the far side, no hop longer than he can make, and a step in no water', () => {
    for (const who of ['baker', 'sneezy'] as const) {
      const plan = crossing(who, OVER)
      expect(plan.hops.length).toBeGreaterThan(0)
      for (const [from, to] of plan.hops) {
        expect(to - from).toBeLessThanOrEqual(HOP_REACH)
        expect(hopLift(plan, (from + to) / 2)).toBeCloseTo(HOP_HIGH, 6)
        expect(hopLift(plan, from - 1)).toBe(0)
      }
      expect(plan.cues.filter((cue) => cue.what === 'hup').length).toBe(plan.hops.length)
      expect(plan.cues.filter((cue) => cue.what === 'down').length).toBeGreaterThanOrEqual(1)
      for (const cue of plan.cues) if (cue.what === 'step') expect(wetAt(cue.at.x)).toBe(false)
    }
  })

  it('walks a stretch from pebble to pebble dry and unheard but for a stepping stone, which sounds as he lands on it', () => {
    const stones = [OVER[0]]
    for (let x = 500; x <= 1000; x += 20) stones.push({ x, y: 500 })
    for (const who of GNOMES) {
      const plan = crossing(who, stones, (i) => i >= 2)
      expect(plan.hops.length).toBe(0)
      expect(plan.cues.filter((cue) => cue.what === 'wade' || cue.what === 'hup' || cue.what === 'down').length).toBe(0)
      const sounded = plan.cues.filter((cue) => cue.what === 'stone')
      expect(sounded.length).toBe(stones.filter((p, i) => i >= 2 && wetAt(p.x)).length)
      expect(sounded.length).toBeGreaterThan(0)
      // The one stretch that is not from pebble to pebble is the first, and it is too short for a stride of most.
      expect(plan.cues.filter((cue) => cue.what === 'step').every((cue) => cue.d <= 20)).toBe(true)
    }
  })

  it('plans nothing for a way with no length', () => {
    expect(crossing('tall', [OVER[0]]).cues.length).toBe(0)
    expect(crossing('baker', [OVER[0], OVER[0]]).total).toBe(0)
  })
})
