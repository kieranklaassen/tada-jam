import { giveOf, shareLength } from './measure'
import { layOut, wanted, type Customer } from './orders'
import { cut, emptyWorld, giveToTin, landFruit, setOnBoard, setOnShelf, type World } from './world'

// The one scene the look spike shows, built with the game's own rules from a
// fixed seed, so the still is the game's real scene and the same every time.
// Nothing here is playable: it is a moment after a first cut that came out a
// little short. The toy replaces it.

/** The state of the seeded stream the spike starts from. */
export const SPIKE_SEED = 12858
/** The position whose customers the spike lays out: the first where the fraction is written. */
export const SPIKE_POSITION = 'written'

export type SpikeScene = {
  window: Customer
  queue: [Customer, Customer]
  world: World
  /** Where on the near lane the last stroke fell, in points from the board's left end. */
  cutAt: number
}

export function spikeScene(seed = SPIKE_SEED): SpikeScene {
  const first = layOut(SPIKE_POSITION, 'new', seed)
  const second = layOut(SPIKE_POSITION, 'new', first.seed)
  const third = layOut(SPIKE_POSITION, 'known', second.seed)
  const atWindow = first.customer

  // Leftovers from earlier customers: a quarter of a middle fruit on the far lane, and two pieces on the shelf.
  let world = emptyWorld()
  const middle = landFruit(world, 'middle')
  const quarter = cut(middle.world, middle.id, shareLength('middle', { num: 1, den: 4 }))
  world = quarter.world
  if (quarter.kind === 'cut') {
    const rest = cut(world, quarter.right, shareLength('middle', { num: 1, den: 4 }))
    world = setOnBoard(rest.world, quarter.left, 1, 0).world
    world = setOnShelf(world, quarter.right).world
    if (rest.kind === 'cut') world = setOnShelf(world, rest.right).world
  }

  // The fruit that was ordered, cut by eye a little short of the share, and the piece laid in the tin.
  const fruit = landFruit(world, atWindow.fruit)
  const cutAt = shareLength(atWindow.fruit, wanted(atWindow)) - Math.round(1.5 * giveOf(atWindow.fruit))
  const sliced = cut(fruit.world, fruit.id, cutAt)
  world = sliced.kind === 'cut' ? giveToTin(sliced.world, sliced.left, 0) : sliced.world
  return { window: atWindow, queue: [second.customer, third.customer], world, cutAt }
}
