import { describe, expect, it } from 'vitest'
import { MOST_FX, MOST_SPATTERS, MOUTH, flight, newFx, offsetOf, settled, spawn, step, whoosh, type FxState } from './fx'
import { COUNTER, WALL } from './stage'
import type { ToyEvent } from './toy'

const CUT: ToyEvent = { kind: 'cut', left: 1, right: 2, fruit: 'long', length: 2400, x: 400, y: 412, h: 48, voice: 'thwack' }
/** Plays a state forward at 60 frames a second. */
function play(state: FxState, seconds: number, each?: (state: FxState) => void): FxState {
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    state = step(state, 1 / 60)
    each?.(state)
  }
  return state
}

describe('a cut', () => {
  const after = spawn(newFx(7), CUT)

  it('sets off more than the touch: a burst, the blade lines, drops, and both pieces hopping apart', () => {
    expect(after.fx.filter((one) => one.kind === 'burst')).toHaveLength(1)
    expect(after.fx.filter((one) => one.kind === 'lines')).toHaveLength(1)
    expect(after.fx.filter((one) => one.kind === 'drop').length).toBeGreaterThanOrEqual(4)
    expect(after.shakes.map((shake) => [shake.id, shake.kind, shake.dir])).toEqual([[1, 'hop', -1], [2, 'hop', 1]])
  })

  it('throws drops that spatter the wall and stay inside it', () => {
    const later = play(after, 1.2)
    const spatters = later.fx.filter((one) => one.kind === 'spatter')
    expect(spatters.length).toBeGreaterThan(0)
    for (const one of spatters) {
      expect(one.x).toBeGreaterThan(WALL.x)
      expect(one.x).toBeLessThan(WALL.x + WALL.w)
      expect(one.y).toBeGreaterThan(WALL.y)
      expect(one.y).toBeLessThan(WALL.y + WALL.h)
    }
  })

  it('never lets a drop leave the page, and everything but the spatter is over within a second', () => {
    const later = play(after, 1, (state) => {
      for (const one of state.fx) if (one.kind === 'drop') expect(one.y).toBeLessThanOrEqual(COUNTER.y + COUNTER.h)
    })
    expect(later.fx.every((one) => one.kind === 'spatter')).toBe(true)
    expect(later.shakes).toEqual([])
    expect(settled(later)).toBe(true)
    expect(settled(after)).toBe(false)
  })

  it('makes a bigger burst for a longer fruit, and is the same every time from the same seed', () => {
    const small = spawn(newFx(7), { ...CUT, length: 300 })
    const size = (state: FxState) => state.fx.find((one) => one.kind === 'burst' && true)!
    expect((size(after) as { size: number }).size).toBeGreaterThan((size(small) as { size: number }).size)
    expect(spawn(newFx(7), CUT)).toEqual(after)
    expect(spawn(newFx(8), CUT)).not.toEqual(after)
  })

  it('dries off the wall in time: a spatter is short-lived', () => {
    expect(play(after, 16).fx).toEqual([])
  })
})

describe('how a piece moves for a moment', () => {
  const box = { x: 100, y: 400, w: 200, h: 48 }

  it('hops apart from the one it was cut from, lands with a squash, and ends exactly where it lies', () => {
    let state = spawn(newFx(1), CUT)
    let highest = 0, squashed = 0
    state = play(state, 0.4, (now) => {
      const left = offsetOf(now, 1, box), right = offsetOf(now, 2, box)
      highest = Math.min(highest, left.dy)
      squashed = Math.max(squashed, left.squash)
      expect(left.dx).toBeLessThanOrEqual(0)
      expect(right.dx).toBeGreaterThanOrEqual(0)
    })
    expect(highest).toBeLessThan(-10)
    expect(squashed).toBeGreaterThan(0.05)
    expect(offsetOf(state, 1, box)).toEqual({ dx: 0, dy: 0, squash: 0 })
  })

  it('quivers when poked, drops in from above when it lands, and slides from where it was to the shelf', () => {
    const poked = step(spawn(newFx(1), { kind: 'poke', id: 5, fruit: 'long', length: 600, voice: 'pluck' }), 0.05)
    expect(offsetOf(poked, 5, box).dy).not.toBe(0)
    const landed = spawn(newFx(1), { kind: 'land', id: 6, fruit: 'short', length: 1440, voice: 'thump' })
    expect(offsetOf(landed, 6, box).dy).toBeLessThan(-100)
    expect(offsetOf(play(landed, 0.5), 6, box)).toEqual({ dx: 0, dy: 0, squash: 0 })
    const from = { x: 96, y: 316, w: 200, h: 48 }
    const swept = spawn(newFx(1), { kind: 'swept', ids: [9], from: [from] })
    expect(offsetOf(swept, 9, box)).toEqual({ dx: from.x - box.x, dy: from.y - box.y, squash: 0 })
    expect(offsetOf(play(swept, 0.35), 9, box)).toEqual({ dx: 0, dy: 0, squash: 0 })
    expect(offsetOf(swept, 404, box)).toEqual({ dx: 0, dy: 0, squash: 0 })
  })

  it('gives a piece one movement at a time: the newest replaces the one before', () => {
    let state = spawn(newFx(1), CUT)
    state = spawn(state, { kind: 'poke', id: 1, fruit: 'long', length: 600, voice: 'pluck' })
    expect(state.shakes.filter((shake) => shake.id === 1).map((shake) => shake.kind)).toEqual(['quiver'])
  })
})

describe('the other things a touch sets off', () => {
  it('a curl of peel and a dropped piece fly to the dog along an arc that ends at its mouth', () => {
    const curl = spawn(newFx(1), { kind: 'curl', id: 1, fruit: 'long', length: 2400, x: 300, y: 412, voice: 'curl' })
    expect(curl.fx.map((one) => one.kind)).toEqual(['curl'])
    const fell = spawn(newFx(1), { kind: 'fell', piece: { id: 3, fruit: 'short', length: 300, place: { on: 'shelf', slot: 0 }, blind: true, ruled: 0 }, from: { x: 96, y: 496, w: 90, h: 44 }, voice: 'munch' })
    expect(fell.fx.map((one) => one.kind)).toEqual(['fly'])
    expect(flight(300, 412, 0)).toEqual({ x: 300, y: 412 })
    expect(flight(300, 412, 1).x).toBeCloseTo(MOUTH.x)
    expect(flight(300, 412, 1).y).toBeCloseTo(MOUTH.y)
    expect(flight(300, 500, 0.5).y).toBeLessThan(500)
  })

  it('a stroke that crossed nothing flaps the awning, which swings back and comes to rest', () => {
    let state = whoosh(newFx(1), 500, 300, 0.4)
    expect(state.fx.map((one) => one.kind)).toEqual(['lines'])
    let furthest = 0
    state = play(state, 6, (now) => (furthest = Math.max(furthest, Math.abs(now.flap))))
    expect(furthest).toBeGreaterThan(0.2)
    expect(furthest).toBeLessThan(2)
    expect(Math.abs(state.flap)).toBeLessThan(0.01)
    expect(settled(state)).toBe(true)
  })

  it('a fruit thumping down rocks the crate, which is heavier and stops sooner', () => {
    let state = spawn(newFx(1), { kind: 'land', id: 6, fruit: 'short', length: 1440, voice: 'thump' })
    let furthest = 0
    state = play(state, 2, (now) => (furthest = Math.max(furthest, Math.abs(now.rock))))
    expect(furthest).toBeGreaterThan(0.05)
    expect(Math.abs(state.rock)).toBeLessThan(0.005)
  })

  it('a knock, a bark and a snap each leave their own mark or none', () => {
    expect(spawn(newFx(1), { kind: 'knock', x: 1, y: 2, on: 'board', voice: 'tickEnd' }).fx.map((one) => one.kind)).toEqual(['knock'])
    expect(spawn(newFx(1), { kind: 'snap', x: 1, y: 2, voice: 'chomp' }).fx.map((one) => one.kind)).toEqual(['lines'])
    expect(spawn(newFx(1), { kind: 'bark', voice: 'bark' }).fx).toEqual([])
  })
})

describe('the budget', () => {
  it('holds however fast a child slices: never more than the cap alive, nor more spatters than the wall keeps', () => {
    let state = newFx(3)
    for (let i = 0; i < 400; i++) {
      state = spawn(state, { ...CUT, x: 100 + (i * 37) % 800 })
      state = step(state, 1 / 60)
      expect(state.fx.length).toBeLessThanOrEqual(MOST_FX)
      expect(state.fx.filter((one) => one.kind === 'spatter').length).toBeLessThanOrEqual(MOST_SPATTERS)
    }
  })
})
