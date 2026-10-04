import type { Game } from './game'
import { rimHeight } from './gobblerBuild'
import { shapeOf } from './gobblers'
import { CRATE_STANDS, crateTop, headTop, type Spot } from './layout'
import { GATE } from './places'
import { trayIsClear } from './world'

// What the idle ladder shows, chosen from the state of play: a glow on what
// can be touched now, and one move the ghost hand could show. The hand shows
// a move and never a solution: where a toy can be picked up, that a toy can
// go to a gobbler (a different one each time it shows), that the ones who
// wait can be fetched. Nothing here says which gobbler a toy belongs to.

export type Mark = Spot & { r: number }

export type Hint = {
  /** Where the glow goes: one ring for each thing that can be touched now. */
  marks: Mark[]
  /** Where the hand taps this time, or null when there is nothing to show. */
  tap: Spot | null
}

export function hintFor(game: Game, showing: number): Hint {
  const world = game.world, nth = Math.max(0, showing)
  if (game.scene) return { marks: [], tap: null }
  // A cycle has ended, or none has begun: the crates wait for the claw.
  if (world.finished) {
    // The ring lies round the top of the crate, over its load and its riders, where it shows above whoever
    // stands at the tray. The hand taps the ledge in front of the crate, where it is wholly in sight: a touch
    // anywhere on the ledge on that side means that crate.
    const marks = game.crates.map((crate) => ({ x: crate.x, y: CRATE_STANDS + crateTop(crate.which, crate.crews.length) - 1.6, z: crate.z, r: 5.4 }))
    const taps = game.crates.map((crate) => ({ x: crate.x, y: GATE.top + 0.5, z: GATE.z + 0.6 }))
    return { marks, tap: taps.length > 0 ? taps[nth % taps.length] : null }
  }
  // A toy is in the jaws: it can go to any gobbler, and the hand shows another one each time.
  if (game.held >= 0) {
    const marks = game.crew.map((actor) => ({ x: actor.x, y: actor.y + rimHeight(shapeOf(actor.id)) + 0.3, z: actor.z, r: shapeOf(actor.id).width / 2 - 0.6 }))
    return { marks, tap: marks.length > 0 ? marks[nth % marks.length] : null }
  }
  // Toys stand on the tray: any of them can be picked up.
  const standing = game.tray().map((stack, place) => ({ stack, place })).filter(({ stack }) => stack.length > 0)
  if (standing.length > 0) {
    const marks = standing.map(({ stack, place }) => {
      const top = game.bodies[stack[stack.length - 1]]
      return { x: top.x, y: game.stackTop(place) + 0.15, z: top.z, r: top.heavy > 1 ? 3 : 2 }
    })
    return { marks, tap: marks[nth % marks.length] }
  }
  // The tray is clear and another crew waits: the gate brings it in. A ring lies over the head of each one
  // who waits, since a touch anywhere on the ledge fetches them, and the hand taps the gate. (A ring round the
  // gate itself, with the gate bar across it, would be a road sign.)
  if (trayIsClear(world.cycle) && game.someoneWaits()) {
    // Each ring lies over the top of a head, where it shows above the crew that stands in front.
    const marks = game.waiting.map((actor) => ({ x: actor.x, y: actor.y + headTop(actor.id) + 0.3, z: actor.z, r: shapeOf(actor.id).width / 2 - 0.6 }))
    return { marks, tap: { x: GATE.x, y: GATE.top + 0.3, z: GATE.z } }
  }
  return { marks: [], tap: null }
}
