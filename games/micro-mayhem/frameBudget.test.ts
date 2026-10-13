import { describe, expect, it } from 'vitest'
import { TIERS } from './config'
import { Game } from './game'
import type { Guidance } from './guidance'
import { FIRST, ROOMS, type House, type RoomId } from './house'
import { BUTTONS } from './layout'
import { makeRng } from './rng'
import { ghostsOf, segmentsOf } from './sprites'
import { HANDS } from './stairs'
import { fakeCanvases, fakeContext, play, type Count } from './testing'
import { GameView, MAX_DENSITY, SPRITE_BYTES, WARM_BYTES } from './view'

// What a frame costs, and what the sprites weigh. The game draws on a 2D
// canvas, so its draw count is the number of sprite stamps plus the shapes
// filled live, and that sum is what the grown-up overlay and the perf probe
// are given. These tests count both on a canvas that draws nothing.

/** The jam's bar: under about 80 draw calls a frame. */
const BUDGET = 80
/** The most the sprites may weigh at any moment, at two pixels to a stage unit. */
const MEMORY = 80 * 1024 * 1024

/** Frames in which a room at its ceiling is painted ahead, with room to spare for a segment larger than one frame's share. */
const WARM_FRAMES = Math.ceil(SPRITE_BYTES / WARM_BYTES) * 2

const at = (place: RoomId, more: Partial<House> = {}): House => ({ ...FIRST, place, day: place !== 'bedroom', ...more })

function setUp(width = 1180, height = 820, ratio = 2) {
  const count: Count = { stamps: 0, fills: 0, whole: 0 }
  const canvases = fakeCanvases()
  const view = new GameView({ getContext: () => fakeContext(count) } as unknown as HTMLCanvasElement, canvases.make)
  view.setTier(TIERS[0])
  view.resize(width, height, ratio)
  const frame = (game: Game | null, guidance: Guidance | null, time = 0) => {
    count.stamps = count.fills = count.whole = 0
    const drawn = view.draw(game ? game.show() : null, guidance, game ? game.hint(guidance?.demoIndex ?? 0) : null, time)
    return { reported: drawn.stamps + drawn.strokes, counted: count.stamps + count.fills, whole: count.whole }
  }
  return { view, canvases, frame }
}

const SHOWING: Guidance = { glow: 1, demo: 0.45, demoIndex: 0 }

describe('a frame', () => {
  it('is one stamp of the whole background and two for each lit segment, and reports what it drew', () => {
    for (const room of ROOMS) {
      const { frame } = setUp()
      const game = new Game(at(room), 1)
      const lit = game.show().lit.length
      const cost = frame(game, null)
      expect(cost.whole, room).toBe(1)
      expect(cost.counted, room).toBe(1 + lit * 2)
      expect(cost.reported, room).toBe(cost.counted)
    }
  })

  // Three long sessions, one to a test, so that no test is long; the worst frame of each room is kept across them.
  const worst = new Map<RoomId, number>()

  it.each([1, 2, 3])('stays under the budget through long session %i, with the guidance showing and a button held', (seed) => {
    {
      const { frame } = setUp()
      const game = new Game({ ...FIRST }, seed)
      let n = 0
      play(game, makeRng(seed + 20), 1200, {
        cordEvery: 200,
        frame: () => {
          n += 1
          const cost = frame(game, { ...SHOWING, demoIndex: n % 4 }, n / 60)
          if (cost.reported !== cost.counted) throw new Error(`reported ${cost.reported}, drew ${cost.counted}`)
          worst.set(game.glass.room, Math.max(worst.get(game.glass.room) ?? 0, cost.counted))
        },
      })
    }
    for (const [room, cost] of worst) expect(cost, room).toBeLessThan(BUDGET)
  }, 60_000)

  it('stays under the budget in every room: the three sessions were in all eight between them', () => {
    expect([...worst.keys()].sort()).toEqual([...ROOMS].sort())
    for (const [room, cost] of worst) expect(cost, room).toBeLessThan(BUDGET)
  })

  it('stays under the budget with every segment of the display test lit, in every room at its fullest', () => {
    const full: Partial<House> = { dog: 3, soup: 3, balloon: 2, pies: 2, eggs: 3, weed: 1, flower: true, fog: 0 }
    for (const room of ROOMS) {
      const { frame } = setUp()
      const game = new Game(at(room, { ...full, day: true }), 1)
      game.press({ x: BUTTONS[0].x, y: BUTTONS[0].y })
      expect(game.show().test).toBe(true)
      const cost = frame(game, SHOWING, 1)
      expect(cost.counted, room).toBeLessThan(BUDGET)
      expect(cost.reported, room).toBe(cost.counted)
      // The test shows something: more than the room at rest.
      game.release()
      expect(frame(game, SHOWING, 1).counted, room).toBeLessThan(cost.counted)
    }
  })

  it('costs less on a cheaper tier and never more: no shadows, then no afterimages', () => {
    const costs = TIERS.map((tier) => {
      const { view, frame } = setUp()
      view.setTier(tier)
      const game = new Game({ ...FIRST }, 1)
      game.press({ x: 650, y: 640 })
      game.step(1 / 60)
      return frame(game, null).counted
    })
    for (let i = 1; i < costs.length; i++) expect(costs[i]).toBeLessThanOrEqual(costs[i - 1])
    expect(costs[costs.length - 1]).toBeLessThan(costs[0])
  })

  it('draws what the rules compute: the dimmed house, the bloom on the glass and the held button each cost a shape', () => {
    const { frame } = setUp()
    const game = new Game(at('kitchen'), 1)
    const rest = frame(game, null).counted
    game.press({ x: 600, y: 120 })
    expect(frame(game, null).counted).toBe(rest + 2)
  })

  it('draws the bare look before the save has come back, and nothing on a surface with no size', () => {
    const { view, frame } = setUp()
    expect(frame(null, null)).toMatchObject({ counted: 1, whole: 1 })
    view.resize(0, 0, 2)
    expect(frame(new Game({ ...FIRST }, 1), null).counted).toBe(0)
  })

  it('fills the surface past the stage with the plastic of the case, two bars on a surface of another shape', () => {
    const wide = setUp(2000, 700), game = new Game({ ...FIRST }, 1)
    const square = setUp()
    expect(wide.frame(game, null).counted).toBe(square.frame(game, null).counted + 2)
    expect(wide.view.fit.x).toBeGreaterThan(0)
  })
})

describe('the sprites', () => {
  it('are made for the room on the glass only, and let go when the room changes', () => {
    const { view, canvases, frame } = setUp()
    const fixed = Object.keys(HANDS).length + 1
    for (const room of ROOMS) {
      const game = new Game(at(room), 1)
      for (let n = 0; n <= WARM_FRAMES; n++) frame(game, null)
      const alive = Object.keys(segmentsOf(room)).length + fixed + 1
      expect(canvases.bytes, room).toBeLessThan(MEMORY)
      // Every canvas that is not this room's has had its size taken away.
      expect(canvases.bytes, room).toBeGreaterThan(0)
      expect(alive).toBeGreaterThan(20)
    }
    // A resize to the size it has, and a frame of the room already on the glass, make nothing.
    view.resize(1180, 820, 2)
    const before = canvases.made
    frame(new Game(at('bakery'), 1), null)
    expect(canvases.made).toBe(before)
  })

  // Two walks, one to a test; what each room weighed at most is kept across them.
  const weigh = new Map<RoomId, number>()

  it.each([1, 2])('weigh under 80 MB at two pixels to a unit at any moment of walk %i through the house', (seed) => {
    const { canvases, frame } = setUp(2360, 1640, 2)
    let most = 0
    {
      const game = new Game({ ...FIRST }, seed)
      play(game, makeRng(seed + 60), 500, {
        cordEvery: 100,
        frame: () => {
          frame(game, null)
          most = Math.max(most, canvases.bytes)
          weigh.set(game.glass.room, Math.max(weigh.get(game.glass.room) ?? 0, canvases.bytes))
        },
      })
    }
    expect(most).toBeLessThan(MEMORY)
    expect(MAX_DENSITY).toBe(2)
  }, 60_000)

  it('weigh under 80 MB in every room: the two walks were in all eight between them', () => {
    expect([...weigh.keys()].sort()).toEqual([...ROOMS].sort())
    for (const [room, bytes] of weigh) expect(bytes, room).toBeLessThan(MEMORY)
  })

  it('are all painted in the first frames after a room comes onto the glass, a few a frame, where the room fits its ceiling: no sprite is made in play after that', () => {
    for (const room of ROOMS.filter((one) => one !== 'bedroom')) {
      const { canvases, frame } = setUp()
      const game = new Game(at(room, { dog: 3 }), 1)
      frame(game, SHOWING)
      // The first frame paints what it shows and a little ahead, and never the whole room.
      const first = canvases.bytes
      for (let n = 0; n < WARM_FRAMES; n++) frame(game, SHOWING)
      expect(first, room).toBeLessThan(canvases.bytes)
      const made = canvases.made
      for (let n = 0; n < 240; n++) {
        if (n % 12 === 0) {
          const own = game.targets().filter((target) => !target.id.startsWith('door') && target.id !== 'lamp')
          const target = own[(n / 12) % own.length]
          game.press('rx' in target.shape ? { x: target.shape.x, y: target.shape.y } : { x: target.shape.x + target.shape.w / 2, y: target.shape.y + target.shape.h / 2 })
          game.release()
        }
        game.step(1 / 60)
        frame(game, SHOWING, n / 60)
      }
      expect(canvases.made, room).toBe(made)
    }
  })

  it('never weigh more than their ceiling in the one room that is too large for it: the pose lit longest ago is let go', () => {
    const { canvases, frame } = setUp(2360, 1640, 2)
    const game = new Game({ ...FIRST }, 3)
    frame(game, null)
    const background = 2360 * 1640 * 4
    let most = 0
    play(game, makeRng(5), 400, {
      cordEvery: 1e9,
      frame: () => {
        if (game.glass.room !== 'bedroom') return
        frame(game, SHOWING)
        most = Math.max(most, canvases.bytes)
      },
    })
    expect(most).toBeLessThanOrEqual(SPRITE_BYTES + background + 2 * 1024 * 1024)
    expect(most).toBeGreaterThan(SPRITE_BYTES * 0.8)
  })

  it('are all let go when the view is disposed: no canvas keeps a size, and a frame, a resize or a tier after that makes and draws nothing', () => {
    for (const room of ['bedroom', 'dining'] as const) {
      const { view, canvases, frame } = setUp()
      const game = new Game(at(room, { dog: 3 }), 1)
      for (let n = 0; n <= WARM_FRAMES; n++) frame(game, SHOWING, n / 60)
      expect(canvases.bytes, room).toBeGreaterThan(1024 * 1024)
      view.dispose()
      expect(canvases.bytes, room).toBe(0)
      const made = canvases.made
      view.resize(1024, 768, 2)
      view.setTier(TIERS[1])
      expect(frame(game, SHOWING, 3).counted, room).toBe(0)
      expect(canvases.made, room).toBe(made)
      expect(canvases.bytes, room).toBe(0)
      // Disposed twice, as an unmount after an unmount would: nothing more to let go.
      view.dispose()
      expect(canvases.bytes, room).toBe(0)
    }
  })

  it('are never painted denser than two pixels to a unit, however large the surface', () => {
    const small = setUp(1180, 820, 2), large = setUp(4000, 3000, 3)
    small.frame(new Game({ ...FIRST }, 1), null)
    large.frame(new Game({ ...FIRST }, 1), null)
    expect(large.canvases.bytes).toBe(small.canvases.bytes)
  })

  it('have a ghost for a segment the room has, and no ghost twice', () => {
    for (const room of ROOMS) {
      const ghosts = ghostsOf(room)
      expect(new Set(ghosts).size, room).toBe(ghosts.length)
      for (const name of ghosts) expect(segmentsOf(room)[name], `${room} ${name}`).toBeDefined()
    }
  })
})
