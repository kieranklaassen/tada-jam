import { describe, expect, it } from 'vitest'
import { SHADOW_BLOBS, drawCalls, shadowCount } from './budget'
import { LADDER } from './config'
import { carry, pickUp, putDown } from './hands'
import { nextSitting, openGame, tick, type Game } from './host'
import { CLOTH } from './layout'
import { nextSeed, partyFor } from './order'
import { MOST_THINGS, freshTeaState, serializeTea, type TeaState } from './save'
import { PUDDLE_COLS, PUDDLE_ROWS } from './world'

// The frame budget, counted and never timed (a shared runner cannot hold a
// timing): the draw calls of the fullest table the game can lay, the shadows
// it needs against the room the view has for them, and the work one step of
// the rules does, as counts that do not grow with play.

const at = (position: string, seed: number): Game => {
  const tea: TeaState = { ...freshTeaState(null), position, seed, finished: true, tools: { sponge: true, bowl: true } }
  const game = openGame(JSON.parse(JSON.stringify(serializeTea(tea))), null)
  nextSitting(game)
  return game
}

describe('the draw calls of a frame', () => {
  it('stay under the jam\'s budget of about 80 on the fullest table of every position, with a party of four at the gate', () => {
    let fullest = 0, fullestAt = ''
    for (const position of LADDER) {
      let seed = 3
      for (let turn = 0; turn < 30; turn++) {
        seed = nextSeed(seed)
        const game = at(position, seed)
        // The fullest gate: the largest party any position lays out.
        const waiting = partyFor('full-table', seed).party.guests.map((guest) => guest.who)
        const draws = drawCalls(game.world.things, game.tea.guests.map((guest) => guest.who), waiting)
        if (draws > fullest) {
          fullest = draws
          fullestAt = position
        }
        expect(draws, `${position}, seed ${seed}`).toBeLessThanOrEqual(80)
        expect(shadowCount(game.world.things, game.tea.guests.length + waiting.length)).toBeLessThanOrEqual(SHADOW_BLOBS)
        expect(game.world.things.length).toBeLessThanOrEqual(MOST_THINGS)
      }
    }
    // The heavy table was really laid: four guests, their cups and saucers, the tools, and four more at the gate.
    expect(fullestAt).toBe('full-table')
    expect(fullest).toBeGreaterThan(65)
  })

  it('never grow with play: four hundred picks and puts leave as many things as were laid', () => {
    const game = at('full-table', 77)
    const laid = game.world.things.length
    const before = drawCalls(game.world.things, [], [])
    let seed = 5
    const draw = () => ((seed = nextSeed(seed)) % 100000) / 100000
    for (let turn = 0; turn < 400; turn++) {
      const pool = game.world.things.filter((thing) => thing.kind !== 'pot')
      const thing = pool[Math.floor(draw() * pool.length)]
      const to = { x: CLOTH.minX + draw() * (CLOTH.maxX - CLOTH.minX), z: CLOTH.minZ + draw() * (CLOTH.maxZ - CLOTH.minZ) }
      if (pickUp(game, thing.id) === null) continue
      carry(game, to)
      putDown(game, to, null)
      for (let i = 0; i < 3; i++) tick(game, 1 / 60)
    }
    expect(game.world.things.length).toBe(laid)
    expect(drawCalls(game.world.things, [], [])).toBe(before)
  })
})

describe('the work of one step of the rules', () => {
  it('is bounded by the table, not by how long the child has played', () => {
    // One step looks at each thing, each guest and each cell of cloth a fixed number of times; none of the three can grow.
    const game = at('full-table', 77)
    expect(game.tea.guests.length).toBeLessThanOrEqual(4)
    expect(game.world.things.length).toBeLessThanOrEqual(MOST_THINGS)
    expect(game.world.puddles.length).toBe(PUDDLE_COLS * PUDDLE_ROWS)
    for (let i = 0; i < 3000; i++) tick(game, 1 / 60)
    expect(game.world.puddles.length).toBe(PUDDLE_COLS * PUDDLE_ROWS)
    expect(Object.keys(game.still).length).toBeLessThanOrEqual(game.world.things.length)
    expect(Object.keys(game.seen).length).toBeLessThanOrEqual(game.tea.guests.length)
  })
})
