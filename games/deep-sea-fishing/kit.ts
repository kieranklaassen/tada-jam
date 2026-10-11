import { Game, type Left } from './game'
import type { Point } from './input'
import { makeRng } from './rng'
import { HOOK_REST, type Bait, type CreatureId } from './sea'
import type { Cue } from './voices'

// What the tests of the rules share: a game set up as wanted, time played in
// frames, and a hook brought to a creature the way a finger brings it. Nothing
// in the game itself reads this module.

export const FRAME = 1 / 60

/** Which way from a creature the hook starts, so that it comes to that creature without passing anyone else. */
const FROM: Record<CreatureId, Point> = {
  shoal: { x: 1, y: 0 },
  puffer: { x: 0, y: 1 },
  turtle: { x: 1, y: 0 },
  squid: { x: 1, y: 0 },
  jelly: { x: 1, y: 0 },
  shark: { x: 0, y: -1 },
  angler: { x: 1, y: 0 },
  octopus: { x: 1, y: 0 },
  blobfish: { x: -1, y: 0 },
}

export function make(left: Partial<Left> = {}, seed = 7): Game {
  return new Game({ bait: 'none', hook: { ...HOOK_REST }, hooked: null, following: [], tub: [], finished: false, ...left }, makeRng(seed))
}

/** Plays `seconds` of the game in frames. `each` sees the sounds of every frame before they are emptied. */
export function run(game: Game, seconds: number, each?: (cues: readonly Cue[]) => void): Cue[] {
  const heard: Cue[] = []
  for (let left = seconds; left > 1e-9; left -= FRAME) {
    game.step(FRAME)
    each?.(game.cues)
    heard.push(...game.cues)
    game.cues.length = 0
  }
  return heard
}

/** A game with a bait on the hook and the hook hanging beside a creature, just out of its reach, in open water. */
export function beside(id: CreatureId, bait: Bait, left: Partial<Left> = {}, seed = 7): Game {
  const probe = make({ bait, ...left }, seed), at = probe.touchPoint(id), away = probe.reachOf(id) * 1.7
  // The turtle with nothing on the hook is met at its shell, from under the keel on its left.
  const from = id === 'turtle' && bait === 'none' ? { x: -1, y: 0 } : FROM[id]
  return make({ bait, hook: { x: at.x + from.x * away, y: at.y + from.y * away }, ...left }, seed)
}

/** A finger takes the line and draws the hook to a creature, following it for `seconds`. The finger stays down. */
export function bring(game: Game, id: CreatureId, seconds = 0.7, each?: (cues: readonly Cue[]) => void): Cue[] {
  game.press(game.touchPoint(id))
  const heard = [...game.cues]
  each?.(game.cues)
  game.cues.length = 0
  for (let left = seconds; left > 1e-9; left -= FRAME) {
    // While something has not yet answered the finger keeps on it; once it answers the finger holds still.
    if (game.creatures[id].cell === null && game.creatures[id].mode === 'home') game.drag(game.touchPoint(id))
    heard.push(...run(game, FRAME, each))
  }
  return heard
}

/** The finger draws the hook to a place and holds it there. */
export function draw(game: Game, to: Point, seconds: number, each?: (cues: readonly Cue[]) => void): Cue[] {
  if (game.held) game.drag(to)
  else game.press(to)
  const heard = [...game.cues]
  game.cues.length = 0
  heard.push(...run(game, seconds, each))
  return heard
}
