import type { Left } from './game'
import { whoDoes } from './grid'
import type { Point } from './input'
import { isCatch, type Catch } from './motion'
import { BAITS, CREATURE_IDS, HOOK_REST, ROD_TIP, TUB_HOLDS, clampHook, type Bait, type CreatureId } from './sea'
import { deserialize, isReadable, isRecord, serialize, type GameState } from './state'

// What the game keeps in ctx.storage: the template's fields (state.ts) and the
// game's own, read a second time from the same record and each repaired by
// itself (ART.md, "The designed order, and what is stored"). A record from
// before the game had these fields reads as a bare hook, nobody hooked or
// following, and an empty tub.

export type Saved = GameState & {
  /** What is on the hook. */
  bait: Bait
  /** Where the hook hangs at rest, in whole stage units. While a finger draws the line this is still where the line was taken up. */
  hook: Point
  /** Who is on the hook, or nobody. */
  hooked: CreatureId | null
  /** Who follows the hook, in order from the nearest. */
  following: CreatureId[]
  /** Who is in the tub, up to four, in the order they landed. */
  tub: Catch[]
}

/**
 * Where a first visit hangs the worm for the younger children: straight down from the rod's tip, in the sunlit
 * water, clear of everyone's stretch but for the far end of the turtle's, whose nose comes to it within a few
 * seconds of the game opening (game.ts, `OPENS_AT` and `notice`).
 */
export const UNDER_THE_ROD: Point = { x: ROD_TIP.x, y: 284 }
/** From this age a first visit starts with a bare hook under the boat. Younger, or with no age, the worm is already on. */
export const BARE_HOOK_FROM_AGE = 9

/**
 * How a first visit is laid out. Age is a hint and never a gate: it sets what is on the hook and where the hook
 * hangs, both of which the child changes with one touch, and the whole sea is open either way. No age takes the
 * youngest layout, and both ends are open: any age below 9 and any age from 9 up.
 */
export function firstVisit(childAge: number | null): Pick<Saved, 'bait' | 'hook' | 'hooked' | 'following' | 'tub'> {
  const older = childAge !== null && childAge >= BARE_HOOK_FROM_AGE
  return { bait: older ? 'none' : 'worm', hook: older ? { ...HOOK_REST } : { ...UNDER_THE_ROD }, hooked: null, following: [], tub: [] }
}

/** A saved hook is put back inside the sea if it lies outside it, and anything that is not two numbers gives the resting place. */
function readHook(raw: unknown): Point {
  if (!isRecord(raw) || typeof raw.x !== 'number' || typeof raw.y !== 'number' || !Number.isFinite(raw.x) || !Number.isFinite(raw.y)) return { ...HOOK_REST }
  const hook = clampHook({ x: raw.x, y: raw.y })
  return { x: Math.round(hook.x), y: Math.round(hook.y) }
}

const isCreature = (value: unknown): value is CreatureId => typeof value === 'string' && (CREATURE_IDS as readonly string[]).includes(value)
/** The creatures in a saved list, each once, in their order; anything else in it is dropped. */
function readList(raw: unknown): CreatureId[] {
  const list: CreatureId[] = []
  if (Array.isArray(raw)) for (const each of raw) if (isCreature(each) && !list.includes(each)) list.push(each)
  return list
}
/** Everyone who bites some bait: only they can be on the hook. */
const BITERS = (['worm', 'spoon', 'glow', 'cheese', 'boot'] as const).flatMap((bait) => whoDoes('bites', bait, CREATURE_IDS))

export function load(raw: unknown, childAge: number | null): Saved {
  const base = deserialize(raw, childAge)
  if (!isReadable(raw)) return { ...base, ...firstVisit(childAge) }
  // Each field is repaired by itself, and then the fields are made to agree: nobody is in two places, a catch on
  // the hook leaves no room for a bait or a train, and only those who follow the bait that is on follow.
  let bait: Bait = typeof raw.bait === 'string' && (BAITS as readonly string[]).includes(raw.bait) ? (raw.bait as Bait) : 'none'
  const tub = readList(raw.tub).filter(isCatch).slice(0, TUB_HOLDS)
  const hooked = isCreature(raw.hooked) && BITERS.includes(raw.hooked) && !tub.includes(raw.hooked as Catch) ? raw.hooked : null
  if (hooked !== null) bait = 'none'
  const followers = whoDoes('follows', bait, CREATURE_IDS)
  const following = hooked !== null ? [] : readList(raw.following).filter((id) => followers.includes(id) && !tub.includes(id as Catch))
  // A trip is over only with an empty tub, an empty hook and nobody following: what is on screen wins over the flag.
  const finished = base.finished && tub.length === 0 && hooked === null && following.length === 0
  return { ...base, finished, bait, hook: readHook(raw.hook), hooked, following, tub }
}

export function store(state: Saved): Saved {
  return { ...serialize(state), bait: state.bait, hook: { x: Math.round(state.hook.x), y: Math.round(state.hook.y) }, hooked: state.hooked, following: [...state.following], tub: [...state.tub] }
}

/** What the game is set up from. */
export function leftOf(state: Saved): Left {
  return { bait: state.bait, hook: state.hook, hooked: state.hooked, following: state.following, tub: state.tub, finished: state.finished }
}
