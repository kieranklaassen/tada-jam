import { describe, expect, it } from 'vitest'
import { ScarfController, type Projector } from './controller'
import { cellCentre } from './layout'
import { initialState, WIDTH, type Row } from './state'

// Frame budget for the controller's CPU side. The busiest moment the game
// simulates is a scarf being given: the warmed animal dances and walks home
// while the next one waddles in, and here the child is also carrying a ball
// around the loom. A busy CI runner stalls random frames, not the same frame
// in every replay, so each frame's minimum across replays is its real cost.

const FRAME = 1 / 60
const REPLAYS = 7
const FRAMES = 240
const PPU = 10

const projector: Projector = {
  toScreen(p, out) {
    out.x = (p.x + 70) * PPU
    out.y = (80 - p.y) * PPU
    return true
  },
  toPlaneZ(s, z, out) {
    out.x = s.x / PPU - 70
    out.y = 80 - s.y / PPU
    out.z = z
    return true
  },
  toPlaneY(s, y, out) {
    out.x = s.x / PPU - 70
    out.y = y
    out.z = 0
    return true
  },
  pixelsPerUnit: () => PPU,
}

const screenOf = (x: number, y: number) => ({ x: (x + 70) * PPU, y: (80 - y) * PPU })
const row = (colour: number): Row => new Array<number>(WIDTH).fill(colour)

function giftFrames(): { times: number[]; danced: boolean; carried: boolean } {
  const state = initialState()
  state.loom = Array.from({ length: 8 }, (_, i) => row(i % 2))
  const game = new ScarfController(state, { save: () => {}, childAge: 5 })
  game.setProjector(projector)
  for (let i = 0; i < 240; i++) game.step(FRAME)
  const middle = cellCentre(4, 2)
  const at = screenOf(middle.x, middle.y)
  game.pointerDown(1, at, 0)
  game.pointerUp(1, at, 80)
  const ball = game.balls[0]
  const from = screenOf(ball.rest.x, ball.rest.y)
  game.pointerDown(2, from, 400)
  const times: number[] = []
  let carried = false
  for (let i = 0; i < FRAMES; i++) {
    game.pointerMove(2, { x: from.x + 200 + Math.cos(i / 22) * 150, y: from.y - 150 + Math.sin(i / 29) * 90 }, 416 + i * 16)
    const start = performance.now()
    game.step(FRAME)
    times.push(performance.now() - start)
    if (game.balls.some((b) => b.held)) carried = true
  }
  return { times, danced: game.actors.bunny.danceAt <= game.t, carried }
}

describe('frame budget', () => {
  it('a scarf given while a ball is carried costs the controller under 0.1 ms a frame on average and never 1 ms', () => {
    giftFrames()
    const runs = Array.from({ length: REPLAYS }, giftFrames)
    for (const run of runs) {
      expect(run.times, 'replays line up frame for frame').toHaveLength(FRAMES)
      expect(run.danced, 'the warmed animal danced').toBe(true)
      expect(run.carried, 'a ball was carried').toBe(true)
    }
    const perFrame = runs[0].times.map((_, i) => Math.min(...runs.map((run) => run.times[i])))
    const average = perFrame.reduce((a, b) => a + b, 0) / perFrame.length
    const worst = Math.max(...perFrame)
    console.log(`gift: average of per-frame minimums ${average.toFixed(3)} ms, worst ${worst.toFixed(3)} ms`)
    expect(average).toBeLessThan(0.1)
    expect(worst).toBeLessThan(1)
  })
})
