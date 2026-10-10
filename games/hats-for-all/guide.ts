import { waitingLead } from './cycle'
import type { Target } from './game'
import { waits } from './game'
import { bareSpots, hatsInTile, type World } from './rules'
import { worldOf, type Saved } from './save'
import { holeX, spotX } from './stage'

// What the idle ladder shows (the guide's step 5, and the wordless-clarity
// convention): a glow on what can be touched now, and then one move by the
// ghost hand. Pure: it reads the save and names things; the view draws them.
// It never shows a solution, only one next touch, and it shows nothing while
// there is nothing to do but wait. A game opened again starts nothing by
// itself, so there the crew is shown as what to touch.

export type Hint = {
  /** What glows: the things a touch would move on now. */
  glow: Target[]
  /** What the ghost hand taps, once. */
  hand: Target | null
}

const hat = (index: number): Target => ({ type: 'hat', hat: index })

/**
 * `asleep` is true when the game was opened again with a change or a parade held and the child has not yet touched a
 * hat or a creature: nothing comes by itself then, so the crew is what to touch.
 */
export function hint(saved: Saved, asleep = false): Hint {
  const world: World = worldOf(saved)
  // A tower first: its top hat is the one a finger can lift.
  const towers = world.crew.filter((creature) => creature.hats.length > 1).map((creature) => hat(creature.hats[creature.hats.length - 1]))
  if (towers.length > 0) return { glow: towers, hand: towers[0] }
  // Then a hat with nobody under it.
  if (world.loose.length > 0) return { glow: world.loose.map((entry) => hat(entry.hat)), hand: hat(world.loose[0].hat) }
  // Then, while a head is bare, the hats still in the tile; the hand taps the one nearest that head.
  const bare = bareSpots(world), inTile = hatsInTile(world)
  if (bare.length > 0 && inTile.length > 0) {
    const nearest = inTile.reduce((best, one) => (Math.abs(holeX(one, world.tile.length) - spotX(bare[0])) < Math.abs(holeX(best, world.tile.length) - spotX(bare[0])) ? one : best))
    return { glow: inTile.map(hat), hand: hat(nearest) }
  }
  // Every head has one and the crew has paraded: the one who waits in the arch.
  if (saved.finished && bare.length === 0) {
    const who: Target = { type: 'creature', who: waits(waitingLead(saved)) }
    return { glow: [who], hand: who }
  }
  // Opened again with something held: any creature of the crew wakes the game, and the hand taps the first.
  if (asleep && world.crew.length > 0) {
    const crew = world.crew.map((creature): Target => ({ type: 'creature', who: creature.kind }))
    return { glow: crew, hand: crew[0] }
  }
  // Nothing to touch: a change or the parade is on its way, or a bare head waits for a hat to come free.
  return { glow: [], hand: null }
}
