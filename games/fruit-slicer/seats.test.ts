import { describe, expect, it } from 'vitest'
import type { Customer } from './orders'
import { AT_WINDOW, IN_QUEUE, SNOUT_REACH, TWINS_APART, fitOf, headOf, standsAt } from './seats'
import { QUEUE, WALL, WINDOW } from './stage'

const twins: Customer = { who: 'twins', fruit: 'long', shares: [{ num: 1, den: 2 }], carries: 'written', written: true, lined: true }

describe('where the customers stand', () => {
  it('keeps the twins\' snouts apart, nose to nose, in every seat: two that crossed would read as a sign', () => {
    // Each tip stops short of the middle of the pair, so there is paper between them.
    expect(TWINS_APART - SNOUT_REACH).toBeGreaterThanOrEqual(4)
    for (const seat of ['window', 0, 1] as const) {
      const s = fitOf(twins, seat).s
      expect(2 * (TWINS_APART - SNOUT_REACH) * s).toBeGreaterThanOrEqual(8)
    }
  })

  it('stands the pair inside its own panel at that distance apart', () => {
    // A twin's back is 40 units behind its own middle.
    const reach = TWINS_APART + 40
    expect(standsAt('twins', 'window').x - reach * AT_WINDOW.twins).toBeGreaterThanOrEqual(WALL.x)
    for (const seat of [0, 1] as const) {
      const x = standsAt('twins', seat).x
      expect(x - reach * IN_QUEUE.twins).toBeGreaterThanOrEqual(WINDOW.x + WINDOW.w)
      expect(x + reach * IN_QUEUE.twins).toBeLessThanOrEqual(QUEUE[seat].x + QUEUE[seat].w + 12)
    }
    // And the face a mark is drawn round is the middle of the pair.
    expect(headOf(twins, 'window').x).toBe(standsAt('twins', 'window').x)
  })
})
