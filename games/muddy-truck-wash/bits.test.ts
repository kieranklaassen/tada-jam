import { describe, expect, it } from 'vitest'
import { Bits } from './bits'

const run = (bits: Bits, seconds: number): void => {
  for (let t = 0; t < seconds; t += 1 / 60) bits.step(1 / 60)
}

describe('the pieces of the place that move', () => {
  it('turn by themselves: the roller slowly, the pinwheel in a wind that never stops', () => {
    const bits = new Bits()
    let last = bits.pinwheel
    for (let i = 0; i < 40; i++) {
      run(bits, 1)
      expect(bits.pinwheel).toBeGreaterThan(last)
      last = bits.pinwheel
    }
    expect(bits.roller).toBeGreaterThan(20)
    expect(bits.roller).toBeLessThan(40)
  })

  it('spin fast on a touch and come back to their own pace', () => {
    for (const id of ['roller', 'pinwheel'] as const) {
      const still = new Bits(), touched = new Bits()
      expect(touched.poke(id)).toBe(true)
      run(still, 1)
      run(touched, 1)
      expect(touched[id] - still[id]).toBeGreaterThan(5)
      run(still, 12)
      run(touched, 12)
      const a = touched[id], b = still[id]
      run(still, 1)
      run(touched, 1)
      // Twelve seconds on, both go round at the same pace again.
      expect(Math.abs(touched[id] - a - (still[id] - b))).toBeLessThan(0.05)
    }
  })

  it('do not spin faster and faster when touched again and again', () => {
    const once = new Bits(), often = new Bits()
    once.poke('roller')
    for (let i = 0; i < 30; i++) {
      often.poke('roller')
      run(often, 0.1)
    }
    run(once, 3)
    const before = often.roller
    run(often, 1)
    expect(often.roller - before).toBeLessThanOrEqual(15.1)
  })

  it('throws what stands on the shelf up from its board and lands it there again', () => {
    const bits = new Bits()
    expect(bits.poke('shelf')).toBe(true)
    let top = 0
    for (let i = 0; i < 120; i++) {
      bits.step(1 / 60)
      top = Math.max(top, bits.shelf)
      expect(bits.shelf).toBeGreaterThanOrEqual(0)
      // A knock while they are in the air does not throw them higher.
      if (bits.shelf > 0.02) expect(bits.poke('shelf')).toBe(false)
    }
    expect(top).toBeGreaterThan(0.1)
    expect(top).toBeLessThan(0.3)
    expect(bits.shelf).toBe(0)
  })

  it('swings the lamp on its rod when it is knocked, no further for being knocked again and again, and lets it come to rest', () => {
    const bits = new Bits()
    expect(bits.poke('lamp')).toBe(true)
    let widest = 0
    for (let i = 0; i < 60 * 3; i++) {
      if (i % 9 === 0) bits.poke('lamp')
      bits.step(1 / 60)
      widest = Math.max(widest, Math.abs(bits.lamp))
    }
    expect(widest).toBeGreaterThan(0.15)
    expect(widest).toBeLessThanOrEqual(0.45)
    run(bits, 12)
    expect(bits.lamp).toBe(0)
  })
})
