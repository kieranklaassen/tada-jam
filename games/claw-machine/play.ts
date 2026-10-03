import type { Aim } from './aim'
import type { Target } from './deeds'
import type { GameEvent } from './events'
import type { Game } from './game'
import { BELL, GATE, RAIL, WAIT_Z, placeAt } from './places'
import { homeOf } from './world'

// A hand for the tests: it taps things in a game the way a finger would, and
// lets game time pass. It is used by the tests of the game and by the frame
// budget; nothing in the game itself imports it.

/** The aim a finger has when it is on a thing. */
export function aimOn(game: Game, target: Target): Aim {
  if (target.on === 'place') return { target, ...placeAt(target.place) }
  if (target.on === 'gobbler') { const actor = game.crew[target.slot]; return { target, x: actor ? actor.x : 0, z: actor ? actor.z : -4.5 } }
  if (target.on === 'rail-end') return { target, x: target.side * RAIL.maxX, z: BELL.z }
  return { target, x: target.which === 0 ? -5 : 5, z: WAIT_Z }
}

/** A tap: the finger lands on a thing and lifts at once. Game time then runs for `seconds`. */
export function tap(game: Game, target: Target, seconds = 3): GameEvent[] {
  game.point(aimOn(game, target), true)
  game.lift()
  game.advance(seconds)
  return game.takeEvents()
}

/** Lets a scene that is playing run to its end. */
export function watch(game: Game, most = 20): GameEvent[] {
  for (let t = 0; t < most && game.scene; t += 0.1) game.advance(0.1)
  game.advance(1.5)
  return game.takeEvents()
}

/** Picks a toy up and gives it to a gobbler: the one that takes it, or with `wrong` the next one along. */
export function feed(game: Game, toy: number, wrong = false): GameEvent[] {
  const where = game.world.cycle.where[toy]
  if (where.at !== 'tray') return []
  const events = tap(game, { on: 'place', place: where.place }, 2.2)
  const home = homeOf(game.world, toy)
  const slot = wrong ? (home + 1) % game.crew.length : home
  return [...events, ...tap(game, { on: 'gobbler', slot }, wrong ? 5 : 3.2)]
}

/** Sorts everything on the tray into the gobblers that take it. */
export function sortAll(game: Game): void {
  for (let guard = 0; guard < 40; guard++) {
    const toy = game.world.cycle.where.findIndex((where) => where.at === 'tray')
    if (toy < 0) return
    feed(game, toy)
  }
}

/** Plays a whole cycle: every sort of the load, with the gate hooked between them, and the ending watched. */
export function playCycle(game: Game): void {
  for (let guard = 0; guard < 4; guard++) {
    sortAll(game)
    if (game.world.finished) break
    tap(game, { on: 'ledge', which: 0 }, 1.5)
    watch(game)
  }
  watch(game)
}

export const GATE_AIM: Aim = { target: { on: 'ledge', which: 0 }, x: GATE.x, z: GATE.z }
