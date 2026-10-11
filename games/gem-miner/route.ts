import { BLOCKS, COLS, apart, isGrass, stepsFrom } from './layout'
import type { Kind, World } from './world'

// How the mole gets toward the finger. He walks through what is dug and
// along the grass, digs what the pick can dig when that is the shorter way,
// and never goes through granite: the pick is turned aside there.

/** Every node: the 91 blocks and the grass above the columns. */
const NODES = BLOCKS + COLS

/**
 * What a step into a block costs him: a walk, one blow and a step, three blows and a step. A pocket costs more
 * than sandstone, so he goes round one where the way round is short. Granite and a loose boulder have no price.
 */
const COST: Record<Kind, number> = { open: 1, earth: 3, sandstone: 7, water: 9, spout: 9, gas: 9, granite: Infinity, boulder: Infinity }

export type Move =
  /** He is where the finger is, or as near as rock allows with nothing to strike. */
  | { type: 'stay' }
  | { type: 'walk'; to: number }
  /** The block in his way, which he works on from where he stands. */
  | { type: 'strike'; at: number }

const costOf = (world: World, node: number): number => (isGrass(node) ? 1 : world.kinds[node] === 'open' && world.water[node] ? 2 : COST[world.kinds[node]])

/** The next thing the mole does from node `from` to get to node `aim`. */
export function nextMove(world: World, from: number, aim: number): Move {
  if (from === aim) return { type: 'stay' }
  const cost = new Array<number>(NODES).fill(Infinity)
  const back = new Array<number>(NODES).fill(-1)
  const done = new Array<boolean>(NODES).fill(false)
  cost[from] = 0
  for (;;) {
    let at = -1
    for (let i = 0; i < NODES; i++) if (!done[i] && cost[i] < Infinity && (at < 0 || cost[i] < cost[at])) at = i
    if (at < 0) break
    done[at] = true
    for (const next of stepsFrom(at)) {
      const total = cost[at] + costOf(world, next)
      if (total < cost[next]) { cost[next] = total; back[next] = at }
    }
  }
  // The finger is on granite, or behind it: he goes as near as he can get.
  let goal = aim
  if (cost[aim] === Infinity) {
    goal = from
    for (let i = 0; i < NODES; i++) {
      if (cost[i] === Infinity) continue
      if (apart(i, aim) < apart(goal, aim) || (apart(i, aim) === apart(goal, aim) && cost[i] < cost[goal])) goal = i
    }
  }
  if (goal === from) {
    // Nothing nearer can be reached. The block between him and the finger is granite, and he works on it.
    let at = -1
    for (const next of stepsFrom(from)) if (at < 0 || apart(next, aim) < apart(at, aim)) at = next
    return at >= 0 && apart(at, aim) < apart(from, aim) && !isGrass(at) && world.kinds[at] !== 'open' ? { type: 'strike', at } : { type: 'stay' }
  }
  let step = goal
  while (back[step] !== from) step = back[step]
  return isGrass(step) || world.kinds[step] === 'open' ? { type: 'walk', to: step } : { type: 'strike', at: step }
}
