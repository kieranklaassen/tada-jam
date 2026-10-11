import { describe, expect, it } from 'vitest'
import { IDLE_BEFORE_DEMO, IDLE_BEFORE_GLOW, IdleLadder, DEMO_SECONDS } from './guidance'
import { GHOST_TO, Hints, PLACES, holdPose } from './hint'
import { CART, SUN, SUN_DOWN_Y } from './ground'
import { stepAt } from './shapes'
import { BELL, PUFF, RED, village } from './testkit'

const free = () => true

describe('what the idle ladder shows in the glade', () => {
  it('shows nothing while the child is busy', () => {
    const ladder = new IdleLadder(0), hints = new Hints()
    expect(hints.update(ladder.update(1), free)).toBeNull()
    expect(hints.update(null, free)).toBeNull()
  })

  it('glows on one free place in the sun first, with no hand yet', () => {
    const ladder = new IdleLadder(0), hints = new Hints()
    const hint = hints.update(ladder.update(IDLE_BEFORE_GLOW + 1.3), free)!
    expect(hint.at).toEqual(PLACES.red[0])
    expect(hint.glow).toBeGreaterThan(0.9)
    expect(hint.hand).toBeNull()
    expect(hint.ghost).toBe(0)
  })

  it('then brings a hand that presses and holds there, with a mushroom swelling under it for as long as it is down', () => {
    const ladder = new IdleLadder(0), hints = new Hints()
    const during = (share: number) => hints.update(ladder.update(IDLE_BEFORE_DEMO + DEMO_SECONDS * share), free)!
    expect(during(0.05).hand!.press).toBe(0)
    const early = during(0.3), late = during(0.7)
    expect(early.hand!.press).toBe(1)
    expect(late.hand!.press).toBe(1)
    expect(late.ghost).toBeGreaterThan(early.ghost)
    expect(late.ghost).toBeLessThanOrEqual(GHOST_TO)
    expect(during(0.95).ghost).toBe(0)
  })

  it('holds for most of the showing: a hold, never a tap', () => {
    let down = 0
    for (let p = 0; p <= 1; p += 0.01) if (holdPose(p).press > 0.9) down += 0.01
    expect(down * DEMO_SECONDS).toBeGreaterThan(1.4)
  })

  it('moves on to the next ground after each showing, and starts again in the sun after a touch', () => {
    const ladder = new IdleLadder(0), hints = new Hints()
    const seen: string[] = []
    for (let t = 0; t < 60; t += 0.25) { const hint = hints.update(ladder.update(t), free); if (hint?.hand && seen[seen.length - 1] !== hint.kind) seen.push(hint.kind) }
    expect(seen.slice(0, 3)).toEqual(['red', 'bell', 'puff'])
    ladder.touch(60)
    expect(hints.update(ladder.update(60.1), free)).toBeNull()
    expect(hints.update(ladder.update(60 + IDLE_BEFORE_GLOW + 1.3), free)!.kind).toBe('red')
  })

  it('skips a place that is taken, and shows nothing when the glade has no room', () => {
    const ladder = new IdleLadder(0)
    const taken = new Hints().update(ladder.update(IDLE_BEFORE_GLOW + 1.3), (x, y) => !(x === PLACES.red[0].x && y === PLACES.red[0].y))!
    expect(taken.at).toEqual(PLACES.red[1])
    expect(new Hints().update(ladder.update(IDLE_BEFORE_GLOW + 1.3), () => false)).toBeNull()
  })
})

describe('the one next act the village has room for', () => {
  const home = { tall: null, sleepy: null, sneezy: null, baker: null }

  it('is a hold on the moss while nothing stands, and before the cart has come', () => {
    expect(village().want()).toEqual({ act: 'grow' })
    expect(village({ mushrooms: [RED], shown: [] }).want()).toEqual({ act: 'grow' })
  })

  it('is a door carried from the cart to the newest mushroom that has none, once the cart is there', () => {
    const want = village({ mushrooms: [RED, BELL] }).want()
    expect(want.act).toBe('door')
    if (want.act !== 'door') return
    expect(want.from.x).toBe(CART.x)
    expect(Math.abs(want.to.x - BELL.x)).toBeLessThan(1)
  })

  it('is a path drawn from the gnome who waits nearest to a door nobody lives behind', () => {
    const want = village({ mushrooms: [{ ...RED, door: true }], homes: { ...home, sleepy: 9 } }).want()
    expect(want.act).toBe('path')
    if (want.act !== 'path') return
    expect(want.from.y).toBeGreaterThan(500)
    expect(want.to).toEqual(stepAt(RED))
  })

  it('is the sun once three mushrooms stand and nobody waits, by day and by night', () => {
    const all = { mushrooms: [{ ...RED, door: true }, { ...BELL, door: true }, { ...PUFF, door: true }, { id: 4, x: 900, y: 500, size: 4, door: true }], homes: { tall: 4, sleepy: 3, sneezy: 1, baker: 2 } }
    expect(village(all).want()).toEqual({ act: 'sun', at: { x: SUN.x, y: SUN.y } })
    const night = village({ ...all, night: true }).want()
    expect(night.act === 'sun' && night.at.y).toBeLessThan(SUN_DOWN_Y)
  })

  it('shows a hand that carries from the one place to the other, and a hand that stays on the sun', () => {
    const ladder = new IdleLadder(0), hints = new Hints()
    const from = { x: 1094, y: 590 }, to = { x: 640, y: 380 }
    const seen: { x: number; y: number }[] = []
    for (let t = IDLE_BEFORE_DEMO; t < IDLE_BEFORE_DEMO + DEMO_SECONDS; t += 1 / 30) {
      const hint = hints.update(ladder.update(t), () => true, { act: 'door', from, to })
      if (hint?.hand) { seen.push({ x: hint.hand.x, y: hint.hand.y }); expect(hint.ghost).toBe(0) }
    }
    expect(seen[0]).toEqual(from)
    expect(seen.some((at) => Math.hypot(at.x - to.x, at.y - to.y) < 2)).toBe(true)
    const still = new Hints(), again = new IdleLadder(0)
    for (let t = IDLE_BEFORE_DEMO; t < IDLE_BEFORE_DEMO + DEMO_SECONDS; t += 1 / 30) {
      const hint = still.update(again.update(t), () => true, { act: 'sun', at: { x: SUN.x, y: SUN.y } })
      if (hint?.hand) expect({ x: hint.hand.x, y: hint.hand.y }).toEqual({ x: SUN.x, y: SUN.y })
    }
  })
})
