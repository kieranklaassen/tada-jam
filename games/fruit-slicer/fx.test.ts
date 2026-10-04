import { describe, expect, it } from 'vitest'
import { MOST_FX, MOST_SPATTERS, MOUTH, flight, newFx, offsetOf, settled, spawn, step, whoosh, type FxState } from './fx'
import { BOARD, COUNTER, RAIL_BOX, SHELF_BOX, WALL, inside } from './stage'
import type { GameEvent } from './moves'

const CUT: GameEvent = { kind: 'cut', left: 1, right: 2, fruit: 'long', length: 2400, x: 400, y: 412, h: 48, voice: 'thwack' }
/** Plays a state forward at 60 frames a second. */
function play(state: FxState, seconds: number, each?: (state: FxState) => void): FxState {
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    state = step(state, 1 / 60)
    each?.(state)
  }
  return state
}

describe('what the grid promises to the eye', () => {
  it('has every drop that sets off for the wall spatter the wall, wherever the cut was made: the near lane, or the bottom row of the shelf', () => {
    for (const y of [412, BOARD.y + BOARD.h - 30, SHELF_BOX.y + 30, SHELF_BOX.y + SHELF_BOX.h - 30]) {
      for (const seed of [11, 7, 23, 42, 5]) {
        const cut = spawn(newFx(seed), { ...CUT, y } as GameEvent)
        const bound = cut.fx.filter((one) => one.kind === 'drop' && one.wall).length
        expect(bound).toBeGreaterThanOrEqual(4)
        const after = play(cut, 1.4)
        expect(after.fx.filter((one) => one.kind === 'drop')).toHaveLength(0)
        const onWall = after.fx.filter((one) => one.kind === 'spatter' && inside({ x: one.x, y: one.y }, WALL))
        expect(onWall.length, `cut at ${y}, seed ${seed}`).toBe(bound)
      }
    }
  })

  const kinds = (state: FxState) => state.fx.map((one) => one.kind)
  it('snaps the open tin\'s jaw at a poke, and only rattles a shut one', () => {
    expect(kinds(spawn(newFx(1), { kind: 'tinPoke', open: true, voice: 'castanet' }))).toEqual(['jaw'])
    const shut = spawn(newFx(1), { kind: 'tinPoke', open: false, voice: 'rattle' })
    expect(kinds(shut)).toEqual([])
    expect(shut.joltSpeed).toBeGreaterThan(0)
  })

  it('springs the tin open for the first piece: a jolt and the jaw; a later piece only slides in', () => {
    const from = { x: 100, y: 500, w: 60, h: 48 }
    const first = spawn(newFx(1), { kind: 'given', id: 3, from, opened: true, firstShowing: null, length: 600, voice: 'spring' })
    expect(kinds(first)).toEqual(['jaw'])
    expect(first.joltSpeed).toBeGreaterThan(0)
    const later = spawn(newFx(1), { kind: 'given', id: 3, from, opened: false, firstShowing: null, length: 600, voice: 'lay' })
    expect(kinds(later)).toEqual([])
    expect(later.joltSpeed).toBe(0)
  })

  it('splits a slat of the crate at a slice, and the slat has mended by the time the fruit has landed', () => {
    const split = spawn(newFx(1), { kind: 'spill', voice: 'split' })
    expect(kinds(split)).toContain('slat')
    expect(kinds(play(split, 0.5))).not.toContain('slat')
  })

  it('shivers the whole fruit a flung piece bounced off', () => {
    const hit = spawn(newFx(1), { kind: 'bounce', id: 4, off: 'fruit', x: 300, y: 500, length: 600, voice: 'boing', struck: 9 })
    expect(hit.shakes.map((shake) => [shake.id, shake.kind])).toEqual([[9, 'quiver']])
    expect(spawn(newFx(1), { kind: 'bounce', id: 4, off: 'tin', x: 300, y: 300, length: 600, voice: 'bong' }).shakes).toEqual([])
  })

  it('has the ruled parts answer the roller one by one on an open tin, and nothing answer on a shut one', () => {
    const open = spawn(newFx(1), { kind: 'rolled', on: 'tin', whom: null, parts: 4, x: 200, y: 330, voice: 'rule' })
    expect(open.fx.find((one) => one.kind === 'answer')).toMatchObject({ parts: 4 })
    expect(kinds(spawn(newFx(1), { kind: 'rolled', on: 'tin', whom: null, parts: 0, x: 200, y: 330, voice: 'drum' }))).not.toContain('answer')
  })
})

describe('a cut', () => {
  const after = spawn(newFx(7), CUT)

  it('sets off more than the touch: a burst, the blade lines, drops, and both pieces hopping apart', () => {
    expect(after.fx.filter((one) => one.kind === 'burst')).toHaveLength(1)
    expect(after.fx.filter((one) => one.kind === 'lines')).toHaveLength(1)
    expect(after.fx.filter((one) => one.kind === 'drop').length).toBeGreaterThanOrEqual(4)
    expect(after.shakes.map((shake) => [shake.id, shake.kind, shake.dir])).toEqual([[1, 'hop', -1], [2, 'hop', 1]])
  })

  it('throws drops that spatter the wall and stay inside it; one that falls short marks only bare wood', () => {
    const later = play(after, 1.2)
    const spatters = later.fx.filter((one) => one.kind === 'spatter')
    const onWall = spatters.filter((one) => one.y < COUNTER.y)
    expect(onWall.length).toBeGreaterThan(0)
    for (const one of onWall) {
      expect(one.x).toBeGreaterThan(WALL.x)
      expect(one.x).toBeLessThan(WALL.x + WALL.w)
      expect(one.y).toBeGreaterThan(WALL.y)
      expect(one.y).toBeLessThan(WALL.y + WALL.h)
    }
    // The board, the shelf and the rail stay clean: they are what the child measures on.
    for (const one of spatters.filter((other) => other.y >= COUNTER.y)) for (const slab of [BOARD, SHELF_BOX, RAIL_BOX]) expect(inside({ x: one.x, y: one.y }, slab)).toBe(false)
  })

  it('says where juice came down on the stall, for one step only', () => {
    let seen = 0
    const later = play(after, 1.2, (state) => {
      seen += state.hits.length
      for (const hit of state.hits) expect(hit.y).toBeLessThan(WALL.y + WALL.h)
    })
    expect(seen).toBeGreaterThan(0)
    expect(step(later, 1 / 60).hits).toEqual([])
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

  it('quivers when poked, comes out of the crate when it lands, and slides from where it was to the shelf', () => {
    const poked = step(spawn(newFx(1), { kind: 'poke', id: 5, fruit: 'long', length: 600, voice: 'pluck' }), 0.05)
    expect(offsetOf(poked, 5, box).dy).not.toBe(0)
    const landed = spawn(newFx(1), { kind: 'land', id: 6, fruit: 'short', length: 1440, voice: 'thump' })
    // It comes out of the crate: from the crate's side of the counter, and down onto its lane.
    expect(offsetOf(landed, 6, box).dx).toBeGreaterThan(100)
    expect(offsetOf(play(landed, 0.2), 6, box).dx).toBeLessThan(offsetOf(landed, 6, box).dx)
    expect(offsetOf(play(landed, 0.5), 6, box)).toEqual({ dx: 0, dy: 0, squash: 0 })
    const from = { x: 96, y: 316, w: 200, h: 48 }
    const swept = spawn(newFx(1), { kind: 'swept', ids: [9], from: [from] })
    expect(offsetOf(swept, 9, box)).toEqual({ dx: from.x - box.x, dy: from.y - box.y, squash: 0 })
    expect(offsetOf(play(swept, 0.35), 9, box)).toEqual({ dx: 0, dy: 0, squash: 0 })
    // Shoved by something that is still on its way, it waits where it lay until that arrives, and only then goes.
    const waiting = spawn(newFx(1), { kind: 'swept', ids: [9], from: [from], after: 0.23 })
    expect(offsetOf(play(waiting, 0.2), 9, box)).toEqual({ dx: from.x - box.x, dy: from.y - box.y, squash: 0 })
    expect(Math.abs(offsetOf(play(waiting, 0.35), 9, box).dx)).toBeLessThan(Math.abs(from.x - box.x))
    expect(offsetOf(play(waiting, 0.6), 9, box)).toEqual({ dx: 0, dy: 0, squash: 0 })
    const knocked = spawn(newFx(1), { kind: 'knocked', id: 9, from, length: 600, voice: 'clack', after: 0.22 })
    expect(offsetOf(play(knocked, 0.2), 9, box)).toEqual({ dx: from.x - box.x, dy: from.y - box.y, squash: 0 })
    expect(offsetOf(play(knocked, 0.6), 9, box)).toEqual({ dx: 0, dy: 0, squash: 0 })
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
    const fell = spawn(newFx(1), { kind: 'fell', piece: { id: 3, fruit: 'short', length: 300, place: { on: 'shelf', slot: 0 }, blind: true, ruled: 0, mark: 0 }, from: { x: 96, y: 496, w: 90, h: 44 }, voice: 'munch' })
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

describe('a misfit laid in the tin', () => {
  const box = { x: 100, y: 260, w: 200, h: 42 }

  it('brings the lid down on what sticks out, where it bounces, and jolts the tin', () => {
    let state = spawn(newFx(1), { kind: 'misfit', id: 4, how: 'over', by: 300, length: 900, voice: 'clang', gap: 0 })
    expect(state.fx.map((one) => one.kind)).toEqual(['lid'])
    expect(state.shakes).toEqual([])
    let furthest = 0
    state = play(state, 1.2, (now) => (furthest = Math.max(furthest, Math.abs(now.jolt))))
    expect(furthest).toBeGreaterThan(0.01)
    expect(state.fx).toEqual([])
    expect(settled(play(state, 2))).toBe(true)
  })

  it('lets a piece that is too short slide and rattle in the gap, further the wider the gap, and come to rest where it lies', () => {
    const narrow = step(spawn(newFx(1), { kind: 'misfit', id: 4, how: 'under', by: -40, length: 500, voice: 'slide', gap: 40 }), 0.1)
    const wide = step(spawn(newFx(1), { kind: 'misfit', id: 4, how: 'under', by: -400, length: 500, voice: 'slide', gap: 400 }), 0.1)
    expect(offsetOf(wide, 4, box).dx).toBeGreaterThan(offsetOf(narrow, 4, box).dx)
    expect(offsetOf(narrow, 4, box).dx).toBeGreaterThan(0)
    // In the twins' tin a piece that fills its own side lies still, though the other side is short and the lid comes down on that.
    const filled = step(spawn(newFx(1), { kind: 'misfit', id: 4, how: 'under', by: -600, length: 600, voice: 'slide', gap: 0 }), 0.1)
    expect(filled.shakes).toEqual([])
    expect(filled.fx.map((one) => one.kind)).toEqual(['lid'])
    expect(offsetOf(play(wide, 1), 4, box)).toEqual({ dx: 0, dy: 0, squash: 0 })
  })

  it('jolts the tin when it is poked or struck, and rocks the crate when it burps', () => {
    expect(spawn(newFx(1), { kind: 'tinPoke', open: true, voice: 'castanet' }).joltSpeed).toBeGreaterThan(0)
    expect(spawn(newFx(1), { kind: 'skid', x: 1, y: 2, length: 600, voice: 'skid' }).joltSpeed).toBeGreaterThan(0)
    const piece = { id: 3, fruit: 'short' as const, length: 300, place: { on: 'shelf' as const, slot: 0 }, blind: true, ruled: 0, mark: 0 }
    expect(spawn(newFx(1), { kind: 'burp', piece, from: box, voice: 'burp' }).rockSpeed).toBeGreaterThan(0)
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
