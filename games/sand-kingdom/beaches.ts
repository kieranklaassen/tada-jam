import { type Field, cellAt, encode, furrow, groove, heap, makeField, pat, tower } from './field'
import type { Kingdom } from './kingdom'
import { STATE_VERSION } from './state'
import type { SunHome } from './sun'
import { type Things, firstThings } from './things'

// Beaches that are already built, for a grown-up to open the game on:
// `beach=<name>` in the address starts the visit from one of these in place
// of the saved slot, the way `seed=` pins the visit's chance. Stills, the
// intersection audit and the tests of the evening start from them, so each
// state the game can reach can be looked at without playing up to it. The
// child's own beach is never read from here.

type Shape = { field: Field; dug: number[]; things: Things }

/** A groove dug through points, as a finger digs it, begun where its first point is. */
function dig(shape: Shape, points: readonly (readonly [number, number])[]): void {
  shape.dug.push(cellAt(points[0][0], points[0][1]))
  for (let i = 1; i < points.length; i++) groove(shape.field, points[i - 1][0], points[i - 1][1], points[i][0], points[i][1])
}

/** A ring of groove round a point, with a gap of `gap` radians left in it. */
function ring(shape: Shape, x: number, z: number, r: number, gap = 0): void {
  const points: [number, number][] = []
  for (let i = 0; i <= 28; i++) {
    const turn = -Math.PI / 2 + gap / 2 + (i / 28) * (Math.PI * 2 - gap)
    points.push([x + Math.cos(turn) * r, z + Math.sin(turn) * r])
  }
  dig(shape, points)
}

function beach(childAge: number | null, sun: SunHome, build: (shape: Shape) => void): Kingdom {
  const shape: Shape = { field: makeField(), dug: [], things: firstThings(childAge) }
  build(shape)
  return { v: STATE_VERSION, position: 'shore', finished: sun === 'down', sand: encode(shape.field), dug: shape.dug, sun, ...shape.things }
}

/** Where the moat of the built kingdom is, and the wall beside it. */
export const MOAT = { x: 0, z: 3.45, r: 1.0 } as const
export const WALL_Z = 3.6
/** The wall is long enough for three gulls to stand shoulder to shoulder with room between, and ends well short of the crab's bank. */
export const WALL_X = { from: -6.5, to: -4.25 } as const
/** Where the driftwood lies across the channel. */
export const BRIDGE_Z = -0.95

/** A kingdom with something for everyone: a moat with a channel to the sea, a tower of two tiers, a bridge and a patted wall. */
function kingdom(shape: Shape): void {
  dig(shape, [[MOAT.x, -2.6], [MOAT.x, 0], [MOAT.x, MOAT.z - MOAT.r]])
  ring(shape, MOAT.x, MOAT.z, MOAT.r)
  tower(shape.field, MOAT.x, MOAT.z, 0, 1)
  tower(shape.field, MOAT.x, MOAT.z, 0.7, 0.7)
  // The bucket's furrow, and one of its banks patted flat: a wall for three.
  shape.dug.push(cellAt(-5.9, 2.7))
  furrow(shape.field, WALL_X.from, 2.7, WALL_X.to, 2.7)
  for (let x = WALL_X.from + 0.1; x <= WALL_X.to - 0.1; x += 0.3) pat(shape.field, x, WALL_Z)
  const things = shape.things
  things.bucket = { x: 5.4, z: 3.8, holds: 'nothing', shell: false, side: false }
  things.wood[0] = { x: 5.0, z: 2.6, turn: 0.05 }
  // Driftwood across the channel, a little askew as a hand lays it: a dark way through.
  things.wood[1] = { x: MOAT.x, z: BRIDGE_Z, turn: -0.6 }
  things.shells[0] = { x: -1.75, z: 7.4, up: true, state: 'pressed' }
  things.shells[1] = { x: MOAT.x, z: MOAT.z + 0.5, up: true, state: 'tower' }
  things.shells[2] = { x: 2.3, z: 7.4, up: false, state: 'lying' }
}

/** Where the open moat of the wrong beach is: clear of the starfish's rock, so the crab can walk its whole bank with the starfish on its back. */
export const WRONG_MOAT = { x: -0.2, z: 3.7 } as const
/** Where the open groove of the wrong beach runs down to the sea. */
export const WRONG_GROOVE_X = 1.6

/** A beach where each thing built is a little wrong: an open moat the water cannot reach, a lumpy wall, no tower, a groove with nothing across. */
function wrong(shape: Shape): void {
  ring(shape, WRONG_MOAT.x, WRONG_MOAT.z, 1.0, 1.1)
  dig(shape, [[WRONG_GROOVE_X, -2.6], [WRONG_GROOVE_X, 0], [WRONG_GROOVE_X, 1.0]])
  shape.dug.push(cellAt(WALL_X.from, 2.7))
  furrow(shape.field, WALL_X.from - 0.25, 2.7, WALL_X.to - 0.25, 2.7)
  const things = shape.things
  things.bucket = { x: 5.4, z: 3.8, holds: 'sand', shell: false, side: false }
  things.wood[0] = { x: 5.0, z: 2.6, turn: 0.05 }
  things.wood[1] = { x: 2.45, z: -0.2, turn: 1.5 }
  things.shells[0] = { x: -1.9, z: 7.4, up: true, state: 'lying' }
  // One shell lies on the crab's line: the one it wears as it goes by.
  things.shells[1] = { x: WRONG_MOAT.x, z: WRONG_MOAT.z + 2.0, up: true, state: 'lying' }
  things.shells[2] = { x: 2.3, z: 7.4, up: false, state: 'lying' }
}

/** A wide channel from the sea, as two strokes side by side dig it, with a piece of driftwood lying along it: the evening water floats the wood up the channel. */
export const CHANNEL = { x: 1.85, from: -2.5, to: 4 } as const
function channel(shape: Shape): void {
  dig(shape, [[CHANNEL.x - 0.25, CHANNEL.from], [CHANNEL.x - 0.25, CHANNEL.to]])
  for (let z = CHANNEL.from; z < CHANNEL.to; z += 0.25) groove(shape.field, CHANNEL.x + 0.25, z, CHANNEL.x + 0.25, z + 0.25)
  const things = shape.things
  things.bucket = { x: -4.4, z: 3.6, holds: 'nothing', shell: false, side: false }
  things.wood[0] = { x: CHANNEL.x, z: 1.2, turn: Math.PI / 2 }
  things.wood[1] = { x: -0.1, z: 5.5, turn: 0.1 }
}

/** Where the long wall of the walled channel stands: across the crab's way between its day place and the channel. */
export const LONG_WALL_X = -2.0
/** The channel with a wall of heaped sand from the sea to the top of the beach: the crab has no way round it, and walks up and over. */
function walled(shape: Shape): void {
  channel(shape)
  for (let z = -4; z <= 14; z += 0.3) heap(shape.field, LONG_WALL_X, z, 0.55, 0.75)
}

export const BEACHES: Record<string, (childAge: number | null) => Kingdom> = {
  kingdom: (childAge) => beach(childAge, 'up', kingdom),
  evening: (childAge) => beach(childAge, 'down', kingdom),
  wrong: (childAge) => beach(childAge, 'up', wrong),
  'wrong-evening': (childAge) => beach(childAge, 'down', wrong),
  /** Nothing built for anyone, at evening: the bored small crabs come. */
  bare: (childAge) => beach(childAge, 'down', () => {}),
  /** By day, with driftwood lying in a channel the evening water will run up. */
  channel: (childAge) => beach(childAge, 'up', channel),
  /** The same by day, with a long wall of heaped sand between the crab's day place and the channel. */
  'walled-channel': (childAge) => beach(childAge, 'up', walled),
  /** A first visit, as a child who has never played finds the beach: nothing built, each thing where it first lies. */
  first: (childAge) => beach(childAge, 'up', () => {}),
}

/** The beach `beach=<name>` in the address asks for, or null. */
export function beachOf(search: string): ((childAge: number | null) => Kingdom) | null {
  const name = new URLSearchParams(search).get('beach')
  return name !== null && Object.hasOwn(BEACHES, name) ? BEACHES[name] : null
}
