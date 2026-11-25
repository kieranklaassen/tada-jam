import { THINGS, type ThingId } from './things'

/** Everything a foot can find: nothing, one thing, or two. */
export const FINDS: ThingId[][] = [[], ...THINGS.map((a) => [a]), ...THINGS.flatMap((a, i) => THINGS.slice(i + 1).map((b) => [a, b]))]
