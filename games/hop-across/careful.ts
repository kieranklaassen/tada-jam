import { CLOTH_COL, type Hop } from './board'
import { THINGS } from './crossing'
import { hop, type Turn } from './play'
import { freshSave, type Saved } from './save'
import { STATE_VERSION } from './state'

// For the tests only: a player that crosses with care, so a test can reach the picnic, the tip and the slide by
// playing, and a first visit at any position. Nothing in the game imports this.

export const STAY: Hop = { dc: 0, dr: 0 }
export const RIGHT: Hop = { dc: 1, dr: 0 }
export const LEFT: Hop = { dc: -1, dr: 0 }
export const UP: Hop = { dc: 0, dr: -1 }
export const DOWN: Hop = { dc: 0, dr: 1 }
export const HOPS: readonly Hop[] = [STAY, RIGHT, LEFT, UP, DOWN]

/** A first visit at `position`, with every new thing shown already unless `unshown`. */
export function visitAt(position: string, seed: number, unshown = false): Saved {
  const fresh = freshSave({ v: STATE_VERSION, position, finished: false }, seed)
  return unshown ? fresh : { ...fresh, shown: [...THINGS] }
}

const mishap = (turn: Turn): boolean => turn.events.some((event) => event.type === 'flatten' || event.type === 'spit')

/**
 * Hops on from `saved`, each time the first of right, wait, down and up that ends in no mishap (along the cloth:
 * down, up, wait), until `stop` holds for a turn. Gives that turn and the state it was made from, or null when
 * `most` hops did not get there.
 */
export function playUntil(saved: Saved, stop: (turn: Turn) => boolean, most = 300): { turn: Turn; before: Saved } | null {
  let now = saved
  for (let n = 0; n < most; n++) {
    const order = now.family[0].c === CLOTH_COL ? [DOWN, UP, STAY] : [RIGHT, STAY, DOWN, UP]
    let took = hop(now, order[0])
    for (const asked of order) {
      const turn = hop(now, asked)
      if (!mishap(turn)) { took = turn; break }
    }
    if (stop(took)) return { turn: took, before: now }
    now = took.saved
  }
  return null
}
