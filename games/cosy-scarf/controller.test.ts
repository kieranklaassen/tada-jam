import { describe, expect, it } from 'vitest'
import { DANCE_SECONDS, DANCE_START, PAINT_DWELL_S, POWDER_PUFF, ScarfController, silentSound, type Projector } from './controller'
import type { Point } from './input'
import { CELL_H, HILL_SPOTS, LOOM_SPOT, SCARF, cellCentre, groundY, needlesY } from './layout'
import { suggestColour } from './pattern'
import { ANIMALS, initialState, WIDTH, type GameState, type Row } from './state'

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

const screenOf = (x: number, y: number): Point => ({ x: (x + 70) * PPU, y: (80 - y) * PPU })
const row = (colour: number): Row => new Array<number>(WIDTH).fill(colour)

let clock = 0

function setup(state: GameState = initialState(), age: number | null = 5) {
  const saves: GameState[] = []
  const game = new ScarfController(state, { save: (saved) => saves.push(saved), sound: silentSound, childAge: age })
  game.setProjector(projector)
  return { game, saves }
}

function run(game: ScarfController, seconds: number): void {
  for (let i = 0; i < Math.round(seconds * 60); i++) game.step(1 / 60)
}

function tap(game: ScarfController, at: Point, id = 1): void {
  game.pointerDown(id, at, clock)
  clock += 80
  game.pointerUp(id, at, clock)
  clock += 300
}

/** Press, glide to `to` over a few frames, hold there `hold` seconds, then lift (or not). */
function carry(game: ScarfController, from: Point, to: Point, hold = 0, lift = true, id = 1): void {
  game.pointerDown(id, from, clock)
  for (let i = 1; i <= 8; i++) {
    clock += 16
    game.pointerMove(id, { x: from.x + ((to.x - from.x) * i) / 8, y: from.y + ((to.y - from.y) * i) / 8 }, clock)
    game.step(1 / 60)
  }
  for (let i = 0; i < Math.round(hold * 60); i++) {
    clock += 16
    game.step(1 / 60)
  }
  if (lift) game.pointerUp(id, to, clock)
  clock += 300
}

const ballAt = (game: ScarfController, index: number): Point => screenOf(game.balls[index].rest.x, game.balls[index].rest.y)

describe('ScarfController', () => {
  it('knits a row in the colour of a tapped ball, stitch by stitch', () => {
    const { game, saves } = setup()
    tap(game, ballAt(game, 2))
    expect(game.state.loom).toEqual([row(2)])
    expect(saves.at(-1)?.loom).toEqual([row(2)])
    expect(game.loom.reveal).toBeLessThan(WIDTH)
    run(game, 1)
    expect(game.loom.reveal).toBe(WIDTH)
  })

  it('tells the waiting animal each time a row is finished for it, so it can answer every row', () => {
    const { game } = setup()
    run(game, 4)
    expect(game.state.atLoom).toBe('bunny')
    expect(game.actors.bunny.rowAt).toBe(-Infinity)
    tap(game, ballAt(game, 0))
    run(game, 1.2)
    const first = game.actors.bunny.rowAt
    expect(first).toBeGreaterThan(0)
    tap(game, ballAt(game, 1))
    run(game, 1.2)
    expect(game.actors.bunny.rowAt).toBeGreaterThan(first)
  })

  it('answers a tap on a warm animal without starting a dance (its director plays a pet instead)', () => {
    const state = initialState()
    state.scarves.bunny = [[row(0), row(1)]]
    const { game } = setup(state)
    run(game, 1)
    const bunny = game.actors.bunny
    expect(bunny.warm).toBe(1)
    tap(game, screenOf(bunny.x, groundY(bunny.x, bunny.z) + 8))
    expect(bunny.tapAt).toBeCloseTo(game.t, 1)
    expect(bunny.danceAt).toBe(-Infinity)
  })

  it('answers a tap on the empty loom with a hop from the ball it would like next, and knits nothing', () => {
    const { game } = setup()
    run(game, 0.5)
    const wanted = suggestColour([], game.balls.length)
    const frame = cellCentre(4, 1)
    tap(game, screenOf(frame.x, frame.y))
    run(game, 0.3)
    expect(game.balls[wanted].hopY).toBeGreaterThan(0)
    for (const [i, ball] of game.balls.entries()) if (i !== wanted) expect(ball.hopY).toBe(0)
    expect(game.state.loom).toEqual([])
  })

  it('puffs snow where a touch meets the slope, and flurries in the sky above the hill', () => {
    const { game } = setup()
    tap(game, screenOf(-60, 5))
    const [onSlope, ...spray] = game.puffs.filter((puff) => puff.t0 === game.t)
    expect(onSlope.z).toBeLessThan(-16)
    expect(spray).toHaveLength(2)
    expect([onSlope, ...spray].every((puff) => puff.colour === POWDER_PUFF)).toBe(true)
    expect(onSlope.y - onSlope.size * 0.6).toBeCloseTo(groundY(onSlope.x, onSlope.z), 1)
    expect(groundY(onSlope.x, onSlope.z)).toBeCloseTo(5, 0)
    tap(game, screenOf(-60, 40))
    const inSky = game.puffs.filter((puff) => puff.t0 === game.t && puff !== onSlope && !spray.includes(puff))
    expect(inSky).toHaveLength(1)
    expect(inSky[0].y).toBeCloseTo(40)
    expect(inSky[0].z).toBeLessThan(-250)
  })

  it('knits when a ball is carried to the loom and let go', () => {
    const { game } = setup()
    const loom = cellCentre(2, 2)
    carry(game, ballAt(game, 1), screenOf(loom.x, loom.y))
    expect(game.state.loom).toEqual([row(1)])
  })

  it('paints the stitch a ball rests on, mirrored while the butterfly is open, and knits nothing then', () => {
    const state = initialState()
    state.loom = [row(0), row(0)]
    state.mirror = true
    const { game, saves } = setup(state)
    const stitch = cellCentre(0, 1)
    carry(game, ballAt(game, 3), screenOf(stitch.x, stitch.y), PAINT_DWELL_S + 0.15)
    expect(game.state.loom).toEqual([[0, 3, 0, 3, 0], row(0)])
    expect(saves.at(-1)?.loom[0]).toEqual([0, 3, 0, 3, 0])
  })

  it('still knits when a ball rests on a stitch of its own colour, where painting changes nothing', () => {
    const state = initialState()
    state.loom = [row(0), row(3)]
    const { game } = setup(state)
    const stitch = cellCentre(1, 2)
    carry(game, ballAt(game, 3), screenOf(stitch.x, stitch.y), PAINT_DWELL_S + 0.3)
    expect(game.state.loom).toEqual([row(0), row(3), row(3)])
  })

  it('does not paint on the way past: a quick carry over the scarf only knits', () => {
    const state = initialState()
    state.loom = [row(0), row(0)]
    const { game } = setup(state)
    const stitch = cellCentre(1, 1)
    carry(game, ballAt(game, 2), screenOf(stitch.x, stitch.y), 0.1)
    expect(game.state.loom).toEqual([row(0), row(0), row(2)])
  })

  it('unravels one row for every row height the needles are pulled up', () => {
    const state = initialState()
    state.loom = [row(0), row(1), row(2)]
    const { game, saves } = setup(state)
    const needles = screenOf(SCARF.x, needlesY(3))
    carry(game, needles, { x: needles.x, y: needles.y - CELL_H * PPU * 2 - 4 })
    expect(game.state.loom).toEqual([row(0)])
    expect(saves.at(-1)?.loom).toEqual([row(0)])
  })

  it('gives a long enough scarf to the waiting animal, who warms, dances and walks home while the next one waddles in', () => {
    const state = initialState()
    state.loom = Array.from({ length: 8 }, (_, i) => row(i % 2))
    const { game, saves } = setup(state, 5)
    run(game, 4)
    expect(game.actors.bunny.x).toBeCloseTo(LOOM_SPOT.x)
    expect(game.offered).toBe(true)
    const middle = cellCentre(4, 2)
    tap(game, screenOf(middle.x, middle.y))
    expect(game.state.scarves.bunny).toHaveLength(1)
    expect(game.state.loom).toEqual([])
    expect(game.state.atLoom).toBe('penguin')
    expect(saves.at(-1)?.scarves.bunny).toHaveLength(1)
    run(game, DANCE_START + 0.1)
    expect(game.actors.bunny.warm).toBeGreaterThan(0)
    expect(game.actors.bunny.danceAt).toBeLessThanOrEqual(game.t)
    expect(game.actors.bunny.danceLength).toBe(DANCE_SECONDS.bunny)
    run(game, DANCE_SECONDS.bunny + 12)
    expect(game.actors.bunny.x).toBeCloseTo(HILL_SPOTS.bunny.x)
    expect(game.actors.bunny.warm).toBe(1)
    expect(game.actors.penguin.x).toBeCloseTo(LOOM_SPOT.x)
    expect(game.worn[0].wrap).toBe(1)
  })

  it('does not give a scarf that is still short', () => {
    const state = initialState()
    state.loom = [row(0), row(1)]
    const { game } = setup(state, 5)
    run(game, 4)
    expect(game.offered).toBe(false)
    const middle = cellCentre(1, 2)
    tap(game, screenOf(middle.x, middle.y))
    expect(game.state.scarves.bunny).toHaveLength(0)
    expect(game.state.loom).toHaveLength(2)
  })

  it('cancels every carry when a fourth finger lands, and knits nothing', () => {
    const { game } = setup(initialState(), 8)
    for (let id = 1; id <= 3; id++) {
      game.pointerDown(id, ballAt(game, id), clock)
      game.pointerMove(id, { x: ballAt(game, id).x - 60, y: ballAt(game, id).y - 60 }, (clock += 16))
    }
    game.pointerDown(4, ballAt(game, 0), clock)
    const loom = screenOf(SCARF.x, SCARF.top - 10)
    for (let id = 1; id <= 4; id++) game.pointerUp(id, loom, (clock += 16))
    run(game, 1)
    expect(game.state.loom).toEqual([])
    expect(game.balls.every((ball) => ball.held === null)).toBe(true)
  })

  it('shows a ghost hand on the suggested ball after five idle seconds, and any touch clears it', () => {
    const { game } = setup()
    run(game, 5.4)
    expect(game.guidance.hint).toEqual({ kind: 'knit', colour: 0 })
    expect(game.guidance.handVisible).toBe(true)
    expect(game.guidance.hand.x).toBeCloseTo(game.balls[0].rest.x)
    game.pointerDown(9, screenOf(-60, 70), clock)
    game.step(1 / 60)
    expect(game.guidance.handVisible).toBe(false)
    expect(game.guidance.frame.glow).toBe(0)
  })

  it('keeps a stroke of painting when the game is put away mid-carry', () => {
    const state = initialState()
    state.loom = [row(0)]
    const { game, saves } = setup(state)
    const stitch = cellCentre(0, 0)
    carry(game, ballAt(game, 2), screenOf(stitch.x, stitch.y), PAINT_DWELL_S + 0.15, false)
    game.setRunning(false)
    expect(saves.at(-1)?.loom).toEqual([[2, 0, 0, 0, 0]])
    expect(game.balls[2].held).toBeNull()
    expect(game.state.loom).toHaveLength(1)
  })

  it('calls a cosy animal down to the loom when everyone is wrapped and a new scarf is long enough', () => {
    const state = initialState()
    for (const animal of ANIMALS) state.scarves[animal] = [[row(0), row(1)]]
    state.scarves.bunny.push([row(2), row(3)])
    state.atLoom = null
    state.loom = Array.from({ length: 7 }, () => row(1))
    const { game } = setup(state, 5)
    run(game, 1)
    expect(game.state.atLoom).toBeNull()
    tap(game, ballAt(game, 0))
    expect(game.state.atLoom).toBe('penguin')
    expect(game.actors.penguin.destination).toBe('loom')
    run(game, 8)
    expect(game.actors.penguin.x).toBeCloseTo(LOOM_SPOT.x)
    expect(game.offered).toBe(true)
  })
})
