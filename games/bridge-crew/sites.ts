import { LADDER } from './config'
import { key, type KitCount, type Point } from './kit'

// The sheets: for each position of the designed order, the gap, the kit and
// the vehicle whose job it is to cross (ART.md, "The designed order"). Pure
// data, in grid cells. A position comes back in three variants, taken in turn.

export const COLS = 24
export const ROWS = 14
export const VARIANTS = 3

export type VehicleId = 'post-van' | 'jelly-truck' | 'piano-mover' | 'giraffe-bus' | 'caterpillar-bus'

/** The one new thing a sheet brings, whose neat way the crew chief shows once (order.ts). */
export type Idea = 'profile' | 'prop' | 'triangle' | 'row' | 'tube' | 'thread' | 'wide-base' | 'arch'

export type Site = {
  id: string
  variant: number
  /** Height of the solid ground in each column, 0 to COLS: the banks, the river bed and any rock. */
  ground: readonly number[]
  /** Footings on the cliffs behind the road, which the road passes in front of. */
  anchors: readonly Point[]
  /** Where the roadway must begin and end: the lip of each bank. */
  left: Point
  right: Point
  /** The columns a barge needs clear below the deck, on a sheet where one passes. */
  channel: readonly [from: number, to: number] | null
  kit: KitCount
  job: VehicleId
  /** The vehicle that waits after the job vehicle has crossed: the harder run the child may choose. */
  extra: VehicleId
  /** The new idea of this sheet, or null when what is new is a vehicle, a limit or a place. */
  idea: Idea | null
}

type Plan = {
  gap: readonly [number, number, number]
  deck?: number
  /** A rock: how far from the left lip, for each variant, and how high it stands. */
  rock?: { from: readonly [number, number, number]; top: number }
  /** Cliffs behind both banks, with footings this far above the deck. */
  cliffs?: number
  /** Gorge walls that step down from each lip by two cells a column, for this many columns. */
  steps?: number
  channel?: readonly [number, number]
  kit: readonly [plank: number, stick: number, tube: number, thread: number]
  job: VehicleId
  extra: VehicleId
  idea: Idea | null
}

const PLANS: Readonly<Record<string, Plan>> = {
  'plank-gap': { gap: [4, 3, 4], kit: [3, 0, 0, 0], job: 'post-van', extra: 'jelly-truck', idea: 'profile' },
  'rock-prop': { gap: [7, 8, 7], rock: { from: [4, 4, 3], top: 3 }, kit: [3, 4, 0, 0], job: 'post-van', extra: 'jelly-truck', idea: 'prop' },
  'first-triangle': { gap: [6, 7, 6], kit: [3, 6, 0, 0], job: 'post-van', extra: 'jelly-truck', idea: 'triangle' },
  'jelly-run': { gap: [7, 8, 7], kit: [3, 8, 0, 0], job: 'jelly-truck', extra: 'caterpillar-bus', idea: null },
  'truss-span': { gap: [10, 11, 10], kit: [4, 14, 0, 0], job: 'jelly-truck', extra: 'caterpillar-bus', idea: 'row' },
  'tube-post': { gap: [10, 9, 10], deck: 8, rock: { from: [5, 4, 6], top: 3 }, kit: [4, 6, 2, 0], job: 'jelly-truck', extra: 'piano-mover', idea: 'tube' },
  'piano-day': { gap: [8, 9, 8], rock: { from: [4, 5, 3], top: 3 }, kit: [4, 10, 1, 0], job: 'piano-mover', extra: 'caterpillar-bus', idea: null },
  'high-thread': { gap: [8, 9, 8], cliffs: 4, kit: [3, 2, 0, 6], job: 'piano-mover', extra: 'caterpillar-bus', idea: 'thread' },
  'tall-bus': { gap: [8, 7, 9], cliffs: 4, kit: [3, 10, 0, 6], job: 'giraffe-bus', extra: 'piano-mover', idea: null },
  'mast-and-stay': { gap: [10, 11, 10], kit: [4, 8, 2, 8], job: 'piano-mover', extra: 'caterpillar-bus', idea: 'wide-base' },
  'arch-gorge': { gap: [10, 10, 11], deck: 8, steps: 2, kit: [4, 12, 0, 0], job: 'giraffe-bus', extra: 'piano-mover', idea: 'arch' },
  'barge-below': { gap: [10, 11, 10], rock: { from: [3, 3, 2], top: 3 }, channel: [5, 8], kit: [4, 12, 2, 4], job: 'jelly-truck', extra: 'giraffe-bus', idea: null },
  'thin-kit': { gap: [8, 9, 8], kit: [3, 5, 0, 2], job: 'piano-mover', extra: 'caterpillar-bus', idea: null },
  'long-haul': { gap: [14, 13, 14], cliffs: 5, rock: { from: [9, 4, 5], top: 2 }, kit: [5, 16, 4, 8], job: 'piano-mover', extra: 'caterpillar-bus', idea: null },
  'open-yard': { gap: [12, 12, 12], cliffs: 5, rock: { from: [4, 8, 6], top: 3 }, kit: [5, 16, 4, 8], job: 'post-van', extra: 'caterpillar-bus', idea: null },
}

const DECK = 6

/** The sheet a position lays out, in one of its variants. An id the game does not know gives the first position's sheet. */
export function site(id: string, variant: number): Site {
  const known = id in PLANS ? id : LADDER[0], plan = PLANS[known]
  const v = ((Math.trunc(variant) % VARIANTS) + VARIANTS) % VARIANTS
  const gap = plan.gap[v], deck = plan.deck ?? DECK
  const lip = Math.floor((COLS - gap) / 2), far = lip + gap
  const ground: number[] = []
  for (let x = 0; x <= COLS; x++) {
    let height = x <= lip || x >= far ? deck : 0
    if (plan.steps) {
      const inward = Math.min(x - lip, far - x)
      if (inward > 0 && inward <= plan.steps) height = deck - 2 * inward
    }
    if (plan.rock && x === lip + plan.rock.from[v]) height = plan.rock.top
    ground.push(height)
  }
  const anchors: Point[] = plan.cliffs ? [[lip - 1, deck + plan.cliffs], [far + 1, deck + plan.cliffs]] : []
  const [plank, stick, tube, thread] = plan.kit
  return {
    id: known, variant: v, ground, anchors, left: [lip, deck], right: [far, deck],
    channel: plan.channel ? [lip + plan.channel[0], lip + plan.channel[1]] : null,
    kit: { plank, stick, tube, thread }, job: plan.job, extra: plan.extra, idea: plan.idea,
  }
}

const inSheet = (p: Point) => Number.isInteger(p[0]) && Number.isInteger(p[1]) && p[0] >= 0 && p[0] <= COLS && p[1] >= 0 && p[1] <= ROWS

/** A point that holds a pin fast: on or in the ground, or on a cliff. */
export const isFooting = (at: Site) => {
  const cliffs = new Set(at.anchors.map(key))
  return (p: Point): boolean => inSheet(p) && (p[1] <= at.ground[p[0]] || cliffs.has(key(p)))
}

/** A point where a pin may go: on the sheet and not buried, so that it can be seen and reached. */
export function canPin(at: Site, p: Point): boolean {
  if (!inSheet(p)) return false
  const beside = (x: number) => (x < 0 || x > COLS ? at.ground[p[0]] : at.ground[x])
  return !(p[1] < at.ground[p[0]] && p[1] < beside(p[0] - 1) && p[1] < beside(p[0] + 1))
}
