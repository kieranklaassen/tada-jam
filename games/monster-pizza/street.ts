import { bird, clouds } from './ambient'
import { COUNTER_Y, DOOR } from './layout'

// The street through the doorway: a sun, a tree, a house, two clouds and a
// bird. They are drawn as boldly as anything a child can touch, so each has
// a small answer of its own where the finger is: nothing in the job changes
// by it, nothing is saved, and it is over in under a second. Pure: what is
// under a finger at a game time, and where each thing stands.

export type StreetThing = 'sun' | 'tree' | 'house' | 'cloud' | 'bird'

const LEFT = DOOR.x - DOOR.w / 2, RIGHT = DOOR.x + DOOR.w / 2, BOTTOM = DOOR.y + DOOR.h

/** Where the still things stand, in stage units, as the wall is painted (scenery.ts). */
export const STREET = {
  sun: { x: LEFT + 70, y: DOOR.y + 92, r: 34 },
  /** The middle of the tree's crown, and its trunk under it. */
  tree: { x: LEFT + 64, y: BOTTOM - 262, r: 52, trunk: { x: LEFT + 52, y: BOTTOM - 232, w: 20, h: 86 } },
  /** The house: its wall, with the roof over it and one window in it. */
  house: { x: RIGHT - 132, y: BOTTOM - 250, w: 96, wall: 44, h: 122, window: { x: RIGHT - 132 + 54, y: BOTTOM - 250 + 62, w: 30, h: 28 } },
} as const

/** How long an answer lasts, in seconds. */
export const STREET_ANSWER = 0.8

export type StreetHit = { what: StreetThing; x: number; y: number; index: number }

/**
 * What of the street is under a finger at (x, y) at game time `t`, or null.
 * What moves is in front of what stands still: the bird, then the clouds.
 */
export function streetAt(x: number, y: number, t: number): StreetHit | null {
  if (x < LEFT || x > RIGHT || y < DOOR.y || y > COUNTER_Y) return null
  const flying = bird(t)
  if (flying && Math.hypot(x - flying.x, y - flying.y) < 34) return { what: 'bird', x: flying.x, y: flying.y, index: 0 }
  const drifting = clouds(t)
  for (let i = 0; i < drifting.length; i++) {
    const c = drifting[i]
    if (Math.abs(x - c.x) < 52 * c.size && Math.abs(y - c.y + 8 * c.size) < 30 * c.size) return { what: 'cloud', x: c.x, y: c.y, index: i }
  }
  // The tree stands in front of the sun, whose rays show round its crown: the crown is the tree's, the rays are the sun's.
  const sun = STREET.sun, tree = STREET.tree
  if (Math.hypot(x - tree.x, y - tree.y) >= tree.r - 6 && Math.hypot(x - sun.x, y - sun.y) < sun.r + 36) return { what: 'sun', x: sun.x, y: sun.y, index: 0 }
  if (Math.hypot(x - tree.x, y - tree.y) < tree.r - 6 || (x > tree.trunk.x - 10 && x < tree.trunk.x + tree.trunk.w + 10 && y > tree.trunk.y && y < tree.trunk.y + tree.trunk.h)) return { what: 'tree', x, y, index: 0 }
  const house = STREET.house
  if (x > house.x - 12 && x < house.x + house.w + 12 && y > house.y && y < house.y + house.h) return { what: 'house', x, y, index: 0 }
  return null
}
