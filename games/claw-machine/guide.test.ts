import { describe, expect, it } from 'vitest'
import { aimAt, asideAt, type Ray } from './aim'
import { LADDER } from './config'
import type { Game } from './game'
import { newGame } from './gameScenes'
import { hintFor } from './guide'
import { playCycle, sortAll, tap } from './play'
import { newWorld, startCycle, type World } from './world'

// The ghost hand shows one move. A child who copies it puts a finger where the hand tapped: so what a finger
// there means has to be the move the hand shows, whoever stands in the way.

// The eye of the child: in front of the cabinet and above it, as the camera is.
const EYE = { x: 0, y: 46, z: 58 }
const toward = (x: number, y: number, z: number): Ray => ({ ox: EYE.x, oy: EYE.y, oz: EYE.z, dx: x - EYE.x, dy: y - EYE.y, dz: z - EYE.z })
const SHOWN = { colour: true, kind: true, size: true }
const begun = (position: (typeof LADDER)[number], seed: number): Game => newGame({ ...newWorld(null), shown: SHOWN, position, finished: false, crates: [], cycle: startCycle(position, seed, false) } as World)

/** What a finger put where the hand taps would mean, for each of the moves the hand shows in turn. */
function copied(game: Game): string[] {
  const { crew, stacks } = game.seen()
  return [0, 1, 2, 3].map((nth) => {
    const spot = hintFor(game, nth).tap
    if (!spot) return 'nothing'
    const ray = toward(spot.x, spot.y, spot.z)
    return asideAt(ray, crew, game.held >= 0, stacks)?.on ?? aimAt(ray, crew, game.held >= 0, stacks).target.on
  })
}

describe('the move the ghost hand shows', () => {
  it('is the crate for a finger that copies it, on a first visit and after every cycle, whoever stands at the tray', () => {
    for (const age of [null, 4, 5, 6]) for (const seed of [3, 7, 11]) expect(copied(newGame(newWorld(age, seed))), `first visit, age ${age}, seed ${seed}`).toEqual(['ledge', 'ledge', 'ledge', 'ledge'])
    for (const position of LADDER) for (const seed of [7, 11]) {
      const game = begun(position, seed)
      playCycle(game)
      expect(game.world.finished).toBe(true)
      expect(copied(game), `after ${position}, seed ${seed}`).toEqual(['ledge', 'ledge', 'ledge', 'ledge'])
    }
  }, 120000)

  it('is the gate when the tray is clear and a crew waits, and a toy or a gobbler while a sort is under way', () => {
    for (const position of LADDER) for (const seed of [7, 11]) {
      const game = begun(position, seed)
      expect(copied(game), `${position}: a toy`).toEqual(['place', 'place', 'place', 'place'])
      const first = game.world.cycle.where.findIndex((where) => where.at === 'tray')
      tap(game, { on: 'place', place: (game.world.cycle.where[first] as { place: number }).place }, 2.2)
      expect(copied(game), `${position}: a gobbler`).toEqual(['gobbler', 'gobbler', 'gobbler', 'gobbler'])
      tap(game, { on: 'place', place: (game.world.cycle.where[first] as { place: number }).place }, 2.5)
      for (let sort = 0; sort + 1 < game.world.cycle.crews.length; sort++) {
        sortAll(game)
        game.advance(4)
        expect(copied(game), `${position}, seed ${seed}: the gate after sort ${sort}`).toEqual(['ledge', 'ledge', 'ledge', 'ledge'])
        tap(game, { on: 'ledge', which: 0 }, 2.2)
        for (let i = 0; i < 400 && game.scene; i++) game.advance(0.1)
        game.advance(1.5)
      }
    }
  }, 120000)
})
