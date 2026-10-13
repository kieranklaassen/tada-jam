import { describe, expect, it } from 'vitest'
import { ISLAND_TAP, guideOf, type Guide } from './guide'
import { IdleLadder } from './guidance'
import { KINDS, LAND_R, RIM_IN, RIM_OUT, TRAY_Z, slotOf } from './toys'

const blank = (): Guide => ({ glow: 0, rings: [], hand: null })
const at = (idle: number) => new IdleLadder(0).update(idle)

describe('what an idle island shows', () => {
  it('shows nothing before the ladder has anything to show', () => {
    const guide = guideOf(null, KINDS, null, 9, blank())
    expect(guide.glow).toBe(0)
    expect(guide.rings).toHaveLength(0)
    expect(guide.hand).toBeNull()
    expect(guideOf(at(1), KINDS, null, 9, blank()).rings).toHaveLength(0)
  })

  it('first lights a ring under each toy that waits in the tray', () => {
    const guide = guideOf(at(4.5), ['boat', 'tree'], null, 9, blank())
    expect(guide.glow).toBeGreaterThan(0.9)
    expect(guide.rings.map((ring) => ring.x)).toEqual([slotOf('boat').x, slotOf('tree').x])
    expect(guide.rings.every((ring) => ring.z === TRAY_Z)).toBe(true)
    expect(guide.hand).toBeNull()
  })

  it('lights the island, and not the tray, while a toy hangs in the hand', () => {
    const guide = guideOf(at(4.5), KINDS, 'house', 9, blank())
    expect(guide.rings).toHaveLength(1)
    expect(Math.hypot(guide.rings[0].x, guide.rings[0].z)).toBe(0)
  })

  it('lights the island from the touch that took the toy, with no wait and no ladder', () => {
    // In the frame the finger lands the ring is already there, and a fifth of a second later it is full.
    const first = guideOf(at(0), KINDS, 'sheep', 0.02, blank())
    expect(first.rings).toHaveLength(1)
    expect(first.glow).toBeGreaterThan(0)
    expect(guideOf(at(0.2), KINDS, 'sheep', 0.2, blank()).glow).toBe(1)
    expect(guideOf(null, KINDS, 'sheep', 1, blank()).glow).toBe(1)
    // And it shows no hand yet: the hand is the ladder's, later.
    expect(guideOf(at(0.2), KINDS, 'sheep', 0.2, blank()).hand).toBeNull()
  })

  it('then shows one move: a tap on a toy, and a tap on the island', () => {
    const start = guideOf(at(5 + 3 * 0.22), KINDS, null, 9, blank()).hand!
    expect(start.x).toBe(slotOf(KINDS[0]).x)
    expect(start.z).toBe(TRAY_Z)
    expect(start.press).toBeGreaterThan(0.8)
    const end = guideOf(at(5 + 3 * 0.75), KINDS, null, 9, blank()).hand!
    expect(end.x).toBeCloseTo(ISLAND_TAP.x, 5)
    expect(end.z).toBeCloseTo(ISLAND_TAP.z, 5)
    expect(end.press).toBeGreaterThan(0.8)
    expect(Math.hypot(ISLAND_TAP.x, ISLAND_TAP.z)).toBeLessThan(LAND_R)
    // Between the two it is lifted.
    expect(guideOf(at(5 + 3 * 0.5), KINDS, null, 9, blank()).hand!.press).toBeCloseTo(0, 6)
  })

  it('comes and goes: the hand is not there at either end of its move', () => {
    expect(guideOf(at(5.001), KINDS, null, 9, blank()).hand!.there).toBeLessThan(0.05)
    expect(guideOf(at(7.999), KINDS, null, 9, blank()).hand!.there).toBeLessThan(0.05)
    expect(guideOf(at(6.5), KINDS, null, 9, blank()).hand!.there).toBe(1)
  })

  it('shows another toy the next time, so that none is the right one', () => {
    const first = guideOf(at(5 + 3 * 0.22), KINDS, null, 9, blank()).hand!
    // The second demonstration starts after a gap twice the first wait.
    const second = guideOf(at(5 + 3 + 10 + 3 * 0.22), KINDS, null, 9, blank()).hand!
    expect(second.x).not.toBe(first.x)
  })

  it('only taps the island when a toy is already in the hand', () => {
    for (const p of [0.2, 0.5, 0.8]) {
      const hand = guideOf(at(5 + 3 * p), KINDS, 'boat', 9, blank()).hand!
      expect(hand.x).toBe(ISLAND_TAP.x)
      expect(hand.z).toBe(ISLAND_TAP.z)
    }
  })

  it('slides along the rim when every toy is out', () => {
    const from = guideOf(at(5 + 3 * 0.2), [], null, 9, blank()).hand!
    const to = guideOf(at(5 + 3 * 0.75), [], null, 9, blank()).hand!
    for (const hand of [from, to]) {
      expect(Math.hypot(hand.x, hand.z)).toBeGreaterThan(RIM_IN)
      expect(Math.hypot(hand.x, hand.z)).toBeLessThan(RIM_OUT)
      expect(hand.press).toBeCloseTo(1, 6)
    }
    expect(Math.abs(to.x - from.x)).toBeGreaterThan(3)
  })

  it('is cleared by a touch', () => {
    const ladder = new IdleLadder(0)
    ladder.update(6)
    ladder.touch(6)
    const guide = guideOf(ladder.update(6.1), KINDS, null, 9, blank())
    expect(guide.glow).toBe(0)
    expect(guide.hand).toBeNull()
  })
})
