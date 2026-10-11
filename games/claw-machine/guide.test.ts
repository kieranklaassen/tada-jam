import { PerspectiveCamera, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { aimAt, asideAt, type Ray } from './aim'
import { LADDER } from './config'
import type { Game } from './game'
import { newGame } from './gameScenes'
import { hintFor } from './guide'
import { playCycle, sortAll, tap } from './play'
import { fitCamera } from './view/fit'
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

// The shell lays one round home control over every game: 48 px across, at the top centre, 10 px from the top edge.
const HOME = { top: 10, size: 48 }
// A finger that copies the hand is as wide as a touch target, so the tap has to be this far from the control's middle.
const CLEAR = HOME.size / 2 + 24

/** How far each of the hand's taps lands from the middle of the home control, in px, on a surface of this size. */
function fromHome(game: Game, width: number, height: number): number[] {
  const camera = new PerspectiveCamera()
  fitCamera(camera, width / height)
  return [0, 1, 2, 3].map((nth) => {
    const spot = hintFor(game, nth).tap!
    const seen = new Vector3(spot.x, spot.y, spot.z).project(camera)
    return Math.round(Math.hypot(((seen.x + 1) / 2) * width - width / 2, ((1 - seen.y) / 2) * height - (HOME.top + HOME.size / 2)))
  })
}

describe('the move the ghost hand shows', () => {
  it('is never under the home control at the top centre: the hand taps a crate where a finger that copies it stays clear', () => {
    const clear = (game: Game, label: string) => {
      for (const [width, height] of [[1180, 820], [1024, 768], [900, 820]]) for (const away of fromHome(game, width, height)) expect(away, `${label}, at ${width} by ${height}`).toBeGreaterThanOrEqual(CLEAR)
    }
    for (const age of [null, 4, 5, 6]) clear(newGame(newWorld(age, 7)), `first visit, age ${age}`)
    for (const position of LADDER) {
      const game = begun(position, 7)
      playCycle(game)
      clear(game, `after ${position}`)
    }
  }, 120000)

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
