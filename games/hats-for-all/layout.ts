import { LADDER } from './config'
import { CREATURE_KINDS, HAT_KINDS, MOST, type CreatureKind, type HatKind } from './kinds'
import type { Change, World } from './rules'

// The designed order (ART.md, "The designed order, and what is stored"): what
// each position lays out for a crew. No renderer and no DOM. The ids are the
// ones in `LADDER` in config.ts; this module says what each one means. A crew
// is laid out from a position and a seed alone, so the crew waiting in the
// arch is the same one after a put-away, and nothing is drawn from a clock.

export type Plan = {
  /** The heads at the start: one of these, by the seed. */
  heads: readonly number[]
  /** The hats in the tile, from the number of heads at the start. */
  hats: (heads: number) => number
  /** The changes of the cycle, in order. Each is one creature, coming or going. */
  changes: readonly Change[]
}

/** One row for every id in `LADDER`, easiest first, one new thing at a time and then known things together. */
export const PLANS: Record<string, Plan> = {
  // As many hats as heads: giving a hat, and it cannot come out uneven.
  'two-heads': { heads: [2], hats: (heads) => heads, changes: [] },
  'three-heads': { heads: [3], hats: (heads) => heads, changes: [] },
  // One fewer: one walks out and its hat is left with no head.
  'one-leaves': { heads: [3], hats: (heads) => heads, changes: ['leave'] },
  // A hat too many: stopping when every head has one.
  'spare-hat': { heads: [2, 3], hats: (heads) => heads + 1, changes: [] },
  // One more: the spare hat now has a head.
  'one-comes': { heads: [2, 3], hats: (heads) => heads + 1, changes: ['come'] },
  // A hat too few: one head waits bare until a hat comes free.
  'one-short': { heads: [3, 4], hats: (heads) => heads - 1, changes: ['leave'] },
  // Known things together.
  'spares-and-one-leaves': { heads: [3, 4], hats: () => MOST, changes: ['leave'] },
  'comes-and-goes': { heads: [3, 4], hats: (heads) => heads + 1, changes: ['leave', 'come'] },
}

/** The plan of a position; a position this build does not know lays out the first one. */
export function planFor(position: string): Plan {
  return PLANS[position] ?? PLANS[LADDER[0]]
}

/** The next state of the seeded stream, and a number from 0 up to 1 drawn from it. */
export function draw(seed: number): { seed: number; value: number } {
  const next = (seed + 0x6d2b79f5) >>> 0
  let t = Math.imul(next ^ (next >>> 15), 1 | next)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return { seed: next, value: ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

/** The seed a first visit starts from. It is fixed, so a first visit is the same on every tablet and in every still. */
export const FIRST_SEED = 20261003

/**
 * Lays out the crew of a position: who stands where, bare, which hats lie in
 * the tile, and what change the cycle holds. Returns the world and the seed
 * to lay out the crew after it.
 */
export function layCrew(position: string, seed: number): { world: World; seed: number } {
  const plan = planFor(position)
  let s = seed
  const pick = (count: number): number => {
    const drawn = draw(s)
    s = drawn.seed
    return Math.min(count - 1, Math.floor(drawn.value * count))
  }
  const heads = plan.heads[pick(plan.heads.length)]
  // Everyone in a crew is a different creature: the five kinds are shuffled and dealt from the top.
  const kinds: CreatureKind[] = [...CREATURE_KINDS]
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = pick(i + 1)
    ;[kinds[i], kinds[j]] = [kinds[j], kinds[i]]
  }
  const comes = plan.changes.includes('come')
  // The row stands in the middle of the five spots, with the spot after it left free for the one who comes.
  const first = Math.floor((MOST - heads - (comes ? 1 : 0)) / 2)
  const crew = kinds.slice(0, heads).map((kind, i) => ({ kind, spot: first + i, hats: [] as number[] }))
  const tile: HatKind[] = []
  // The hats come in turn from a shuffled start, so a tile shows every kind before any kind twice.
  const start = pick(HAT_KINDS.length), turn = pick(2) === 0 ? 1 : 2
  for (let hat = 0; hat < Math.min(MOST, Math.max(1, plan.hats(heads))); hat++) tile.push(HAT_KINDS[(start + hat * turn) % HAT_KINDS.length])
  const leaver = plan.changes.includes('leave') ? crew[pick(heads)].spot : null
  return {
    world: { crew, tile, loose: [], changes: [...plan.changes], guest: comes ? kinds[heads] : null, leaver, slips: 0 },
    seed: s,
  }
}

/**
 * The first crew ever has one creature and one hat more than its position
 * lays out: the first creature of the row takes a hat for itself, once, to
 * show how it is done (ART.md, "The scenes": the first showing). The world
 * returned is the one after the showing, which is what is saved when the
 * scene starts: the leader wears the hat nearest to it, and what is left is
 * the position as designed.
 */
export function layFirstCrew(position: string, seed: number): { world: World; seed: number; leader: number; hat: number } {
  const laid = layCrew(position, seed), world = laid.world
  const shown = world.crew.length < MOST && world.tile.length < MOST
  if (!shown) return { ...laid, leader: -1, hat: -1 }
  const present = world.crew.map((creature) => creature.kind)
  const kind = CREATURE_KINDS.find((candidate) => !present.includes(candidate) && candidate !== world.guest) ?? CREATURE_KINDS[0]
  // The leader stands before the row, and its hat lies before the others in the tile, so the two are nearest each other.
  const spot = world.crew[0].spot - 1
  if (spot < 0) return { ...laid, leader: -1, hat: -1 }
  world.crew = world.crew.map((creature) => ({ ...creature, hats: creature.hats.map((hat) => hat + 1) }))
  world.tile.unshift(HAT_KINDS[world.tile.length % HAT_KINDS.length])
  world.crew.unshift({ kind, spot, hats: [0] })
  return { world, seed: laid.seed, leader: spot, hat: 0 }
}
