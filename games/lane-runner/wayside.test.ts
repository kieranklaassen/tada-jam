import { describe, expect, it } from 'vitest'
import { beadCount } from './beads'
import { HEDGEHOG } from './figures'
import { Game, type Sink } from './game'
import { NEIGHBOURS, NEIGHBOUR_NAMES, OBSTACLE_AT, OBSTACLE_FIGURES, laidOut, type Fixed } from './props'
import { LOOSE_SIZE } from './spray'
import { LENGTH, OBSTACLES, PLACES, TRAIL_HALF, ZONES, offset } from './trail'

// The trail is full and alive: every obstacle is large and has someone at it
// who moves by itself, and in every stretch between two obstacles somebody
// lives beside the trail. Nothing here waits for the child to be funny.

const quiet: Sink = { play: () => {}, hush: () => {}, save: () => {} }

/** The plaques of one thing as they stand: which plaque each is, and where its middle and its two sides are. */
function shape(game: Game, key: string): { tiles: string; at: number[] } {
  const item = game.stage.items.find((one) => one.key === key)!
  const tiles: string[] = [], at: number[] = []
  for (let i = item.from; i < item.to; i++) {
    const quad = game.stage.quads[i]
    tiles.push(`${quad.tile.w}x${quad.tile.h}:${Array.from(quad.tile.cells).join('')}`)
    at.push(quad.x, quad.y, quad.ax, quad.ay, quad.bx, quad.by)
  }
  return { tiles: tiles.join(' '), at }
}

/** How far a thing has moved from a shape it had, in pegs: the furthest any plaque of it has gone. A plaque that came, went or changed (an eye that shut) counts as a move of two pegs. */
function movedFrom(base: { tiles: string; at: number[] }, now: { tiles: string; at: number[] }): number {
  if (base.tiles !== now.tiles) return 2
  let most = 0
  for (let i = 0; i < base.at.length; i++) most = Math.max(most, Math.abs(base.at[i] - now.at[i]))
  return most
}

/** How far a thing moves by itself in `seconds`, with nobody touching and the fox standing at `at`. */
function movesAlone(key: string, at: number, seconds: number): number {
  const game = new Game({ v: 1, position: 'pond', finished: false, at, lane: 1 }, () => null, 1, 48, quiet)
  const base = shape(game, key)
  let clock = 0, most = 0
  for (let i = 0; i < seconds * 30; i++) {
    clock += 1 / 30
    game.frame(1 / 30, clock)
    most = Math.max(most, movedFrom(base, shape(game, key)))
  }
  return most
}

describe('who lives beside the trail', () => {
  it('has a neighbour in every stretch between two obstacles, on the verge and never on the trail', () => {
    const edges = [PLACES.shelf, ...OBSTACLES.map((name) => ZONES[name].mid), PLACES.handOver]
    for (let i = 1; i < edges.length; i++) {
      const here = NEIGHBOUR_NAMES.filter((name) => NEIGHBOURS[name].s > edges[i - 1] + 40 && NEIGHBOURS[name].s < edges[i] - 40)
      expect(here.length, `between ${edges[i - 1]} and ${edges[i]}`).toBeGreaterThanOrEqual(1)
    }
    for (const name of NEIGHBOUR_NAMES) expect(Math.abs(NEIGHBOURS[name].x), name).toBeGreaterThan(TRAIL_HALF + 8)
    // No stretch of trail longer than a few seconds' run is without an obstacle or a neighbour.
    const places = [...OBSTACLES.map((name) => ZONES[name].mid), ...NEIGHBOUR_NAMES.map((name) => NEIGHBOURS[name].s), 0, LENGTH].sort((a, b) => a - b)
    for (let i = 1; i < places.length; i++) expect(places[i] - places[i - 1], `after ${places[i - 1]}`).toBeLessThanOrEqual(160)
  })

  it('gives each neighbour a look of its own, large enough to be seen from the trail', () => {
    const looks = new Set<string>()
    for (const name of NEIGHBOUR_NAMES) {
      const beads = NEIGHBOURS[name].figure.parts.reduce((sum, part) => sum + beadCount(part.plaque), 0)
      expect(beads, name).toBeGreaterThan(60)
      looks.add(NEIGHBOURS[name].figure.parts.map((part) => `${part.plaque.w}x${part.plaque.h}`).join('+'))
    }
    expect(looks.size).toBe(NEIGHBOUR_NAMES.length)
  })

  it('moves every neighbour by itself, each in its own time, with the fox standing by and nobody touching', () => {
    for (const name of NEIGHBOUR_NAMES) expect(movesAlone(name, NEIGHBOURS[name].s - 60, 20), name).toBeGreaterThanOrEqual(1)
  })
})

describe('the six obstacles', () => {
  it('are each large, and already alive at rest: something of each moves with nobody touching', () => {
    for (const name of Object.keys(OBSTACLE_FIGURES) as Fixed[]) {
      // The water and the mud themselves lie on the trail.
      const lies = name === 'stream' ? beadCount(laidOut().stream.plaque) : name === 'mud' ? beadCount(laidOut().mud.plaque) : 0
      const beads = lies + OBSTACLE_FIGURES[name].parts.filter((part) => !part.hidden).reduce((sum, part) => sum + beadCount(part.plaque), 0)
      expect(beads, name).toBeGreaterThan(300)
      expect(movesAlone(name, OBSTACLE_AT[name] - 80, 24), name).toBeGreaterThanOrEqual(1)
    }
    expect(movesAlone('goose', PLACES.goose - 80, 24)).toBeGreaterThanOrEqual(1)
  })

  it('each have a face of their own or somebody with one: the fish, the bird, the pig, the scowling thorns, the goose, the squirrel', () => {
    const faces: Record<Fixed, string> = { stream: 'fish', branch: 'bird', mud: 'pig', brambles: 'arch0', log: 'squirrel' }
    for (const name of Object.keys(faces) as Fixed[]) expect(OBSTACLE_FIGURES[name].parts.some((part) => part.name === faces[name]), `${name}: ${faces[name]}`).toBe(true)
  })

  it('make themselves known three steps before the fox is at them, by a motion of their own', () => {
    for (const name of Object.keys(OBSTACLE_FIGURES) as Fixed[]) {
      const game = new Game({ v: 1, position: 'pond', finished: false, at: ZONES[name].from - 100, lane: 1 }, () => null, 1, 48, quiet)
      const told: number[] = []
      const on = game.stage.on.bind(game.stage)
      game.stage.on = (event, lap) => {
        if (event.type === 'near' && event.obstacle === name) told.push(offset(lap.s, ZONES[name].from))
        on(event, lap)
      }
      game.press(600, 640, 1180, 820, 0)
      let clock = 0
      let before = shape(game, name)
      for (let i = 0; i < 50 && told.length === 0; i++) {
        before = shape(game, name)
        clock += 1 / 60
        game.frame(1 / 60, clock)
      }
      expect(told.length, name).toBe(1)
      expect(told[0], name).toBeGreaterThan(50)
      // From that frame on it does something large enough to be seen from three steps off: a move of a peg and a half or more.
      let most = movedFrom(before, shape(game, name))
      game.lift()
      for (let i = 0; i < 30; i++) {
        clock += 1 / 60
        game.frame(1 / 60, clock)
        most = Math.max(most, movedFrom(before, shape(game, name)))
      }
      expect(most, name).toBeGreaterThanOrEqual(1.5)
    }
  })
})

describe('what was hard to read', () => {
  it('draws the hedgehog as a hedgehog: spines standing up along its back and a snout out in front, low', () => {
    const body = HEDGEHOG.parts.find((part) => part.name === 'body')!.plaque
    const top = Array.from({ length: body.w }, (_, x) => Array.from({ length: body.h }, (_, y) => body.cells[y * body.w + x]).findIndex((cell) => cell !== 0))
    // Spines: along its back the outline goes up and down, a tip and then a dip, again and again.
    let dips = 0
    for (let x = 2; x < body.w - 2; x++) if (top[x] > top[x - 1] && top[x] >= top[x + 1] && top[x - 1] >= 0) dips += 1
    expect(dips).toBeGreaterThanOrEqual(4)
    // The snout: low down it reaches further forward than its spines do.
    const leftmost = (y: number): number => Array.from({ length: body.w }, (_, x) => body.cells[y * body.w + x]).findIndex((cell) => cell !== 0)
    const low = Math.min(...Array.from({ length: 4 }, (_, i) => leftmost(Math.round(body.h * 0.6) + i)))
    const high = Math.min(...Array.from({ length: 3 }, (_, i) => leftmost(1 + i)))
    expect(low).toBeLessThan(high - 2)
    expect(body.w).toBeGreaterThan(body.h * 1.5)
  })

  it('makes a loose bead more than two pegs across', () => {
    expect(LOOSE_SIZE).toBeGreaterThanOrEqual(2.4)
  })
})
