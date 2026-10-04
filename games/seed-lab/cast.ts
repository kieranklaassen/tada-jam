import { ANT } from './castAnt'
import { BEE } from './castBee'
import { LADYBIRD } from './castLadybird'
import { MOTH } from './castMoth'
import { SNAIL } from './castSnail'
import { AT_REST, poseOf, type Actor, type Channels } from './motion'
import type { VisitorId } from './visitors'

// How the five visitors move: each its own tempo, weight, funniest part and
// actions, as plain numbers, played by the same `poseOf` as the beetle and the
// worm. One file a visitor; cast.test.ts holds them all to the same rules.
//
// A visitor uses only these channels; flip, sneeze, loupe and rise stay at 0.
// Heavy visitors swing a little past a pose, so a part may read a tenth past
// its end (a stalk at 1.1, a lift a hair below 0): the view clamps or shows it.

export const CAST: Record<VisitorId, Actor> = { snail: SNAIL, bee: BEE, moth: MOTH, ladybird: LADYBIRD, ant: ANT }

export const VISITOR_CHANNELS: readonly (keyof Channels)[] = ['lean', 'look', 'breath', 'shift', 'legs', 'lift', 'turn', 'climb', 'part', 'part2']

/** The channels that carry each visitor's funniest part. The moth's feelers have none of their own: they sweep with `look`. */
export const FUNNIEST: Record<VisitorId, readonly (keyof Channels)[]> = { snail: ['part', 'part2'], bee: ['part'], moth: ['look'], ladybird: ['part'], ant: ['part', 'part2'] }

/** Which misses in height each visitor has: `miss-height-higher` where a plant can stand higher than it likes, `miss-height-lower` where it can stand lower. */
export const HEIGHT_MISSES: Record<VisitorId, ('higher' | 'lower')[]> = { snail: ['higher', 'lower'], bee: ['lower'], moth: ['lower'], ladybird: ['higher', 'lower'], ant: ['higher'] }

/** A visitor's pose `t` seconds into one of its actions. An unknown name is rest. */
export function castPose(who: VisitorId, name: string, t: number, out: Channels = { ...AT_REST }): Channels {
  return poseOf(CAST[who], name, t, out)
}
