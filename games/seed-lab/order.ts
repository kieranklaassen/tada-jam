import { STREAM, draws, pick } from './chance'
import { LADDER, type PositionId } from './config'
import { PACKET_IDS, isLookCode, type PacketId, type Trait } from './plant'
import type { CycleOutcome } from './state'
import { isVisitorId, type VisitorId } from './visitors'

// The designed order: what each position brings to the page, who visits
// there and what a wish asks. One new thing at a time, then combinations
// (ART.md, "The designed order, and what is stored"). The ids are in
// `LADDER` in config.ts; this module says what each one means.
//
// Nothing here is shown to the child: no number, no label, no map. A position
// only decides how the next visitor is laid out.

/** Things that arrive on the page and stay: the four packets, the runner bud on every plant, and the can with its blotter. */
export type KitId = PacketId | 'runner' | 'water'
export const KIT_IDS: readonly KitId[] = [...PACKET_IDS, 'runner', 'water']

export function isKitId(value: unknown): value is KitId {
  return typeof value === 'string' && (KIT_IDS as readonly string[]).includes(value)
}

export type Step = {
  /** What the first visitor laid out here carries in. */
  brings: readonly KitId[]
  /** Who can visit here: only visitors whose likes make a wish that has to be bred. */
  visitors: readonly VisitorId[]
  /** The traits a wish asks about here. */
  asks: readonly Trait[]
  /** How many plants alike a wish can ask for here. */
  counts: readonly (1 | 2 | 3)[]
  /** A wish met within this many pods, counted from the visitor's arrival, is a cycle that went well. The game's own number. */
  podsForWell: number
}

const FOUR: readonly VisitorId[] = ['snail', 'bee', 'moth', 'ladybird']

export const STEPS: Record<PositionId, Step> = {
  // Two parents, young that take after both and differ; both colour factors show.
  colour: { brings: ['pink'], visitors: FOUR, asks: ['colour'], counts: [1], podsForWell: 3 },
  // A factor that hides.
  short: { brings: ['short'], visitors: ['snail', 'ladybird'], asks: ['height'], counts: [1], podsForWell: 4 },
  // Two traits at once.
  'colour-short': { brings: [], visitors: FOUR, asks: ['colour', 'height'], counts: [1], podsForWell: 6 },
  // One parent gives a copy.
  runner: { brings: ['runner'], visitors: FOUR, asks: ['colour', 'height'], counts: [2], podsForWell: 6 },
  // A second hidden factor.
  jagged: { brings: ['jagged'], visitors: ['moth', 'ladybird'], asks: ['leaf'], counts: [1], podsForWell: 4 },
  // Three traits at once.
  'three-traits': { brings: [], visitors: FOUR, asks: ['colour', 'height', 'leaf'], counts: [1, 2], podsForWell: 8 },
  // A third hidden factor.
  spots: { brings: ['spots'], visitors: ['bee', 'ladybird'], asks: ['petals'], counts: [1], podsForWell: 4 },
  // Surroundings shape growth and are not passed on.
  dry: { brings: ['water'], visitors: ['ant'], asks: ['height'], counts: [1], podsForWell: 4 },
  // Everything together.
  'whole-plant': { brings: [], visitors: [...FOUR, 'ant'], asks: ['colour', 'height', 'leaf', 'petals'], counts: [1, 2, 3], podsForWell: 10 },
}

export function isPositionId(value: unknown): value is PositionId {
  return typeof value === 'string' && (LADDER as readonly string[]).includes(value)
}

/** Everything that has arrived by this position: what it brings and what every position before it brought. */
export function kitAt(position: PositionId): KitId[] {
  const kit: KitId[] = []
  for (const id of LADDER.slice(0, LADDER.indexOf(position) + 1)) for (const thing of STEPS[id].brings) if (!kit.includes(thing)) kit.push(thing)
  return kit
}

/** The traits that can differ on a page with this kit: colour always, and each other trait once its packet or tool is there. */
export function traitsOnPage(kit: readonly KitId[]): Trait[] {
  const traits: Trait[] = ['colour']
  if (kit.includes('short') || kit.includes('water')) traits.push('height')
  if (kit.includes('jagged')) traits.push('leaf')
  if (kit.includes('spots')) traits.push('petals')
  return traits
}

// --- A visit -------------------------------------------------------------------

/** One visitor and its wish, as laid out. A save stores it in this shape. */
export type Visit = {
  who: VisitorId
  /** The position it was laid out at. The wish asks what that position asks. */
  at: PositionId
  /** How many plants alike it asks for. */
  count: 1 | 2 | 3
  /** The child unrolled its larger sketch. */
  big: boolean
  /** The looks of the plants it has kept so far, as codes. */
  given: number[]
  /** Pods set since it came in. */
  pods: number
}

/**
 * Lays out the next visitor for a position: which animal and how many plants
 * alike. The draw depends only on the page's seed and on how many visitors
 * were laid out before, and the same animal never comes twice running where
 * the position has more than one.
 */
export function layVisit(seed: number, visitsLaid: number, position: PositionId, before: VisitorId | null): Visit {
  const step = STEPS[position]
  const next = draws(seed, STREAM.visit, visitsLaid)
  const pool = step.visitors.length > 1 ? step.visitors.filter((who) => who !== before) : step.visitors
  const who = pool[pick(next, pool.length)]
  const count = step.counts[pick(next, step.counts.length)]
  return { who, at: position, count, big: false, given: [], pods: 0 }
}

/** The traits a visit's small sketch asks about. */
export function asksOf(visit: Visit): readonly Trait[] {
  return STEPS[visit.at].asks
}

/**
 * The traits its larger sketch shows: its likes for every trait now on the
 * page. There is a larger sketch only when that is more than the small one
 * asks; it is the harder option, it looks harder, and the child picks it.
 */
export function bigAsksOf(visit: Visit, kit: readonly KitId[]): Trait[] | null {
  const small = asksOf(visit)
  const all = traitsOnPage(kit)
  return all.length > small.length || all.some((trait) => !small.includes(trait)) ? [...new Set([...small, ...all])] : null
}

/** The traits the visitor answers: those of whichever sketch is open. Either sketch is met by a plant that meets the small one. */
export function shownAsksOf(visit: Visit, kit: readonly KitId[]): readonly Trait[] {
  return (visit.big ? bigAsksOf(visit, kit) : null) ?? asksOf(visit)
}

/**
 * How a visit went, judged when the visitor leaves. Well: it has every plant
 * it asked for, within its position's number of pods. Mixed: it has them
 * after more pods, or it has some and not all. Badly: it leaves with nothing.
 */
export function judge(visit: Visit): CycleOutcome {
  if (visit.given.length >= visit.count) return visit.pods <= STEPS[visit.at].podsForWell ? 'well' : 'mixed'
  return visit.given.length > 0 ? 'mixed' : 'badly'
}

/** Reads a saved visit, or gives none when it is not one. */
export function readVisit(raw: unknown): Visit | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const record = raw as Record<string, unknown>
  if (!isVisitorId(record.who) || !isPositionId(record.at)) return null
  const step = STEPS[record.at]
  if (!step.visitors.includes(record.who)) return null
  const count = step.counts.find((one) => one === record.count) ?? step.counts[0]
  const given = Array.isArray(record.given) ? record.given.filter(isLookCode).slice(0, count) : []
  const pods = typeof record.pods === 'number' && Number.isInteger(record.pods) && record.pods >= 0 ? record.pods : 0
  return { who: record.who, at: record.at, count, big: record.big === true, given, pods }
}
