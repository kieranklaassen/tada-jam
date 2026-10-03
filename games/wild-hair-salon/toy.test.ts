import { describe, expect, it } from 'vitest'
import { BLADES } from './hand'
import type { Gesture } from './input'
import { COLLAR_Y, HEAD, LOCK_X, STEP, tipY } from './layout'
import { floorX, floorY } from './poses'
import { TUFTS } from './rules'
import { deserializeGame, freshGame } from './save'
import { Toy } from './toy'

type P = { x: number; y: number }
const onLock = (steps: number): P => ({ x: LOCK_X, y: COLLAR_Y + steps * STEP })
const air: P = { x: 980, y: 300 }
const opened = (raw: unknown = null, seed = 5): Toy => { const toy = new Toy(seed); toy.open(raw, null); return toy }
const drag = (toy: Toy, points: P[]): void => {
  toy.gesture({ type: 'press', at: points[0] })
  toy.gesture({ type: 'dragStart', from: points[0] })
  for (const at of points.slice(1)) { toy.gesture({ type: 'dragMove', from: points[0], at }); toy.step(1 / 60, false) }
  toy.gesture({ type: 'dragEnd', from: points[0], at: points[points.length - 1] })
}
const tap = (toy: Toy, at: P): void => { toy.gesture({ type: 'press', at }); toy.gesture({ type: 'tap', at }) }
const rest = (toy: Toy, seconds = 8): void => { for (let i = 0; i < seconds * 60; i++) toy.step(1 / 60, true) }
const round = (toy: Toy): unknown => JSON.parse(JSON.stringify(toy.save()))

describe('the toy', () => {
  it('does nothing and saves nothing before the slot has been read', () => {
    const toy = new Toy(1)
    toy.gesture({ type: 'press', at: onLock(20) })
    toy.step(1, true)
    expect(toy.game).toBeNull()
    expect(toy.save()).toBeNull()
    expect(toy.takeNotes()).toEqual([])
    expect(toy.takeDirty()).toBe(false)
  })

  it('opens a first visit with the first customer already under the cape, and wild hair', () => {
    const toy = opened()
    expect(toy.game).toMatchObject({ chair: 'lion', cape: 'on', finished: false, clippings: [], ribbon: null })
    expect(toy.game!.mane).toHaveLength(TUFTS)
    expect(Math.max(...toy.game!.mane) - Math.min(...toy.game!.mane)).toBeGreaterThanOrEqual(50)
  })

  it('answers a press the moment it lands, with a sound', () => {
    const toy = opened()
    toy.gesture({ type: 'press', at: onLock(20) })
    expect(toy.takeNotes().length).toBeGreaterThanOrEqual(1)
    expect(toy.hair.lockStretch.x).toBeLessThan(1)
    const other = opened()
    other.gesture({ type: 'press', at: air })
    expect(other.takeNotes().length).toBe(1)
    expect(other.hair.scissors.inHand).toBe(true)
  })

  it('pulls the lock longer and it stays; snips it and the piece lies on the floor', () => {
    const toy = opened()
    const before = toy.game!.lock
    drag(toy, [onLock(10), onLock(16), onLock(22)].map((p, i) => ({ x: p.x, y: p.y + i })))
    expect(toy.game!.lock).toBeGreaterThan(before)
    expect(toy.takeDirty()).toBe(true)
    const long = toy.game!.lock
    drag(toy, [air, { x: LOCK_X + 90, y: tipY(20) - BLADES.y }, { x: LOCK_X - 90, y: tipY(20) - BLADES.y }])
    expect(toy.game!.lock).toBe(20)
    expect(toy.game!.clippings).toEqual([{ len: long - 20, hue: 'lion', on: 'floor', x: expect.any(Number) }])
    expect(toy.hair.flights.size).toBe(1)
    rest(toy, 3)
    expect(toy.hair.flights.size).toBe(0)
    expect(toy.hair.scissors.inHand).toBe(false)
  })

  it('lets pulling and snipping undo each other for as long as it is funny', () => {
    const toy = opened()
    for (let i = 0; i < 6; i++) {
      drag(toy, [air, { x: LOCK_X + 90, y: tipY(12) - BLADES.y }, { x: LOCK_X - 90, y: tipY(12) - BLADES.y }])
      expect(toy.game!.lock).toBe(12)
      drag(toy, [onLock(8), onLock(40), onLock(70)])
      expect(toy.game!.lock).toBe(74)
    }
    expect(toy.game!.clippings.length).toBeLessThanOrEqual(12)
  })

  it('is found as left: what is saved after any touch opens as the same salon, and nothing replays', () => {
    const toy = opened()
    const touches: (() => void)[] = [
      () => drag(toy, [onLock(10), onLock(30)]),
      () => drag(toy, [air, { x: LOCK_X + 90, y: tipY(30) - BLADES.y }, { x: LOCK_X - 90, y: tipY(30) - BLADES.y }]),
      () => tap(toy, { x: HEAD.x, y: HEAD.y + 24 }),
      () => drag(toy, [{ x: 300, y: 40 }, { x: 520, y: 90 }, { x: 760, y: 130 }]),
      () => { const piece = toy.game!.clippings[0]; if (piece.on === 'floor') drag(toy, [{ x: floorX(piece.x), y: floorY(piece.x) }, { x: 520, y: 500 }, { x: HEAD.x, y: HEAD.y + 42 }]) },
    ]
    for (const touch of touches) {
      touch()
      const again = opened(round(toy))
      expect(again.save()).toEqual(toy.save())
      expect(again.takeNotes()).toEqual([])
      expect(again.puppet.started).toEqual([])
    }
    expect(toy.game!.clippings.some((c) => c.on === 'face')).toBe(true)
  })

  it('saves a held lock at the length it has, in the middle of the pull', () => {
    const toy = opened()
    toy.gesture({ type: 'press', at: onLock(10) })
    toy.gesture({ type: 'dragStart', from: onLock(10) })
    toy.gesture({ type: 'dragMove', from: onLock(10), at: onLock(40) })
    const held = toy.game!.lock
    expect(deserializeGame(round(toy)).lock).toBe(held)
    // Put away under the finger: the press ends, and the lock is as long as it was held.
    toy.gesture({ type: 'dragEnd', from: onLock(10), at: onLock(40) })
    expect(toy.game!.lock).toBe(held)
    expect(toy.hand.held).toBeNull()
  })

  it('carries a piece in the fingers and stores it where it was picked up until it is let go', () => {
    const toy = opened({ ...deserializeGame(null), ...opened().save(), clippings: [{ len: 20, hue: 'lion', on: 'floor', x: 30 }] })
    const from = { x: floorX(30), y: floorY(30) }
    toy.gesture({ type: 'press', at: from })
    toy.gesture({ type: 'dragStart', from })
    toy.gesture({ type: 'dragMove', from, at: { x: 700, y: 400 } })
    expect(toy.hair.carried?.at).toEqual({ x: 700, y: 400 })
    expect(toy.game!.clippings).toEqual([{ len: 20, hue: 'lion', on: 'floor', x: 30 }])
    toy.gesture({ type: 'dragLift', from, at: { x: 700, y: 400 } })
    expect(toy.hair.carried).not.toBeNull()
    toy.gesture({ type: 'dragEnd', from, at: { x: 700, y: 400 } })
    expect(toy.hair.carried).toBeNull()
    expect(toy.game!.clippings[0]).toMatchObject({ on: 'floor' })
  })

  it('makes the lion do something about everything that is done to him', () => {
    const cases: [string, (toy: Toy) => void][] = [
      ['purrs-and-melts', (toy) => drag(toy, [{ x: 470, y: 250 }, ...Array.from({ length: 12 }, (_, i) => ({ x: 470 + (i % 2 ? -22 : 22), y: 250 }))])],
      ['cross-eyed-ducks-and-peeks', (toy) => drag(toy, [{ x: 250, y: 280 }, { x: 330, y: 285 - BLADES.y }, { x: 520, y: 300 - BLADES.y }])],
      ['snort-and-nose-wiggle', (toy) => tap(toy, { x: HEAD.x, y: HEAD.y + 24 })],
      ['cheek-wobbles-back', (toy) => drag(toy, [{ x: 450, y: 290 }, { x: 400, y: 290 }, { x: 340, y: 300 }])],
      ['ear-follows-the-note', (toy) => tap(toy, onLock(10))],
    ]
    for (const [bit, touch] of cases) {
      const toy = opened()
      touch(toy)
      expect(toy.puppet.started, bit).toContain(bit)
    }
  })

  it('does things of his own only while no finger is working, and they need no touch', () => {
    const toy = opened()
    for (let i = 0; i < 20 * 60; i++) toy.step(1 / 60, false)
    expect(toy.puppet.started).toEqual([])
    rest(toy, 20)
    expect(toy.puppet.started.length).toBeGreaterThanOrEqual(3)
    expect(toy.takeDirty()).toBe(false)
    expect(toy.takeNotes()).toEqual([])
  })

  it('never starts more than a few notes at once, however much one stroke cuts', () => {
    const toy = opened({ ...opened().save(), mane: Array(TUFTS).fill(100) })
    toy.gesture({ type: 'press', at: { x: 150, y: 150 } })
    toy.gesture({ type: 'dragStart', from: { x: 150, y: 150 } })
    toy.gesture({ type: 'dragMove', from: { x: 150, y: 150 }, at: { x: 900, y: 150 } })
    expect(toy.takeNotes().length).toBeLessThanOrEqual(4)
    expect(toy.takeNotes()).toEqual([])
  })

  it('answers every random touch and never breaks the salon', () => {
    const toy = opened(null, 3)
    let seed = 11
    const next = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
    for (let i = 0; i < 200; i++) {
      const points = Array.from({ length: 2 + Math.floor(next() * 5) }, () => ({ x: next() * 1180, y: next() * 820 }))
      const gestures: Gesture['type'][] = []
      if (next() < 0.3) { tap(toy, points[0]); gestures.push('tap') } else drag(toy, points)
      expect(toy.takeNotes().length, `touch ${i}`).toBeGreaterThanOrEqual(1)
      toy.step(0.2, false)
      const g = toy.game!
      for (const steps of [g.lock, ...g.mane]) expect(Number.isInteger(steps) && steps >= 4 && steps <= 100).toBe(true)
      expect(g.clippings.length).toBeLessThanOrEqual(12)
      expect(toy.hand.held).toBeNull()
    }
    expect(deserializeGame(round(toy))).toEqual(toy.save())
    expect(freshGame(null).chair).toBeNull()
  })
})
