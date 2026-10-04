import { describe, expect, it } from 'vitest'
import { Bits, fade } from './effects'
import { makeRng } from './rng'

describe('the loose bits a touch throws up', () => {
  it('are the same for the same seed', () => {
    const a = new Bits(makeRng(3)), b = new Bits(makeRng(3))
    a.burst('dust', { x: 100, y: 100 }, 12, 90)
    b.burst('dust', { x: 100, y: 100 }, 12, 90)
    for (let i = 0; i < 20; i++) { a.step(1 / 60); b.step(1 / 60) }
    expect(a.list).toEqual(b.list)
  })

  it('live for a while and are gone: nothing is left on the tar', () => {
    const bits = new Bits(makeRng(1))
    bits.burst('drop', { x: 0, y: 0 }, 20, 200)
    bits.lay('ripple', { x: 0, y: 0 }, 10, 0.8)
    bits.puff('smoke', { x: 0, y: 0 }, -20)
    expect(bits.list.length).toBe(22)
    for (let i = 0; i < 60 * 3; i++) bits.step(1 / 60)
    expect(bits.list).toEqual([])
  })

  it('move each in their own way: drops fall, smoke and seeds rise, a ripple grows where it lies', () => {
    const bits = new Bits(makeRng(2))
    bits.burst('drop', { x: 0, y: 0 }, 1, 0, -1, 2, 2)
    bits.puff('smoke', { x: 0, y: 0 }, 0, 9, 2)
    bits.lay('ripple', { x: 5, y: 5 }, 10, 2)
    for (let i = 0; i < 30; i++) bits.step(1 / 60)
    const [drop, smoke, ripple] = bits.list
    expect(drop.y).toBeGreaterThan(50)
    expect(smoke.y).toBeLessThan(-8)
    expect(smoke.size).toBeGreaterThan(9)
    expect(ripple.x).toBe(5)
    expect(ripple.size).toBeGreaterThan(30)
    expect(fade(ripple)).toBeCloseTo(0.75, 1)
  })

  it('never hold more than the cap, and drop the oldest first', () => {
    const bits = new Bits(makeRng(4), 30)
    bits.lay('print', { x: 1, y: 1 }, 3, 9)
    bits.burst('dust', { x: 0, y: 0 }, 80, 50)
    expect(bits.list.length).toBe(30)
    expect(bits.list.some((b) => b.kind === 'print')).toBe(false)
    // A cheaper tier holds fewer, at once.
    bits.setCap(10)
    expect(bits.list.length).toBe(10)
    bits.burst('dust', { x: 0, y: 0 }, 5, 50)
    expect(bits.list.length).toBe(10)
  })
})
