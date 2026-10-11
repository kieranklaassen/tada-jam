import { CLOTH_COL, COLS, ROWS, hasRails, isSeat, type Lane, type LaneKind } from './board'
import type { Crossing } from './crossing'
import { below, makeRng } from './rng'
import { boardOf, type Saved } from './save'

// What stands still in the frame, as plain data: the ten columns in view, and for each the small things printed
// on its squares and what stands at its two ends on the table. All of it comes from the lanes themselves, by a
// seed made from what never changes in a crossing (its lane kinds, its movers' kinds and directions, its bell
// plates), so a column looks the same on every load and the same when the board has slid and it has become
// another column. Pure: the painter (backdrop.ts) only draws what this says.

/** A small thing printed in a corner of a square. `dx` and `dy` are from the square's middle, in shares of a half square. */
export type Print = { r: number; what: PrintKind; dx: number; dy: number; turn: number }
export type PrintKind =
  | 'molehill' | 'mushrooms' | 'flowers' | 'stone' | 'clover'
  | 'puddle' | 'manhole' | 'patch' | 'skid' | 'leaf'
  | 'lily' | 'rushes' | 'ring' | 'pebbles'
  | 'plate' | 'sandwich' | 'apple' | 'cup' | 'jam' | 'grapes'
  | 'carrot' | 'prints'
  | 'gravel'

/** What stands on the table at the far end of a column, and what lies at its near end. */
export type FarEnd = 'arch' | 'reeds' | 'tunnel' | 'teddy' | 'robot' | 'giraffe' | 'doll' | 'tree' | 'hamper' | 'burrow'
export type NearEnd = 'arch' | 'reeds' | 'tunnel' | 'toys' | 'marbles' | 'spare' | 'crayons' | 'blocks' | 'lid' | 'none'

export type Column = {
  kind: LaneKind
  seed: number
  /** The row of the bell plate that lies in this column, or -1, and whether its rails are this column's own or the next one's. */
  plate: number
  plateOwn: boolean
  /** A zebra crossing is printed across this row of a road, or -1. */
  zebra: number
  prints: Print[]
  far: FarEnd
  near: NearEnd
}

export type Scenery = { columns: Column[] }

const PRINTS: Record<LaneKind, readonly PrintKind[]> = {
  bank: ['carrot', 'prints', 'flowers', 'clover', 'stone'],
  cloth: ['plate', 'sandwich', 'apple', 'cup', 'jam', 'grapes'],
  grass: ['molehill', 'mushrooms', 'flowers', 'stone', 'clover'],
  road: ['puddle', 'manhole', 'patch', 'skid', 'leaf'],
  river: ['lily', 'rushes', 'ring', 'pebbles'],
  rails: ['gravel', 'clover', 'stone'],
  railroad: ['gravel', 'patch', 'leaf'],
}
const ONLOOKERS: readonly FarEnd[] = ['teddy', 'robot', 'giraffe', 'doll', 'tree']
const LOOSE: readonly NearEnd[] = ['toys', 'marbles', 'spare', 'crayons', 'blocks']

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

/** What never changes in a crossing, as one number. */
export function signature(crossing: Crossing): number {
  return hash(crossing.lanes.map((lane) => `${lane.kind}${lane.bell ? `${lane.bell.dc}${lane.bell.r}` : ''}${lane.movers.map((mover) => mover.kind[0] + mover.dir).join('')}`).join('|'))
}

/** One column: its prints and its two ends, from its lane and its seed. */
function column(lane: Lane, seed: number, c: number, plate: number, plateOwn: boolean, home: boolean, nth: number): Column {
  const rng = makeRng(seed)
  const kind = lane.kind
  const prints: Print[] = []
  const zebra = kind === 'road' && rng.next() < 0.45 ? 1 + below(rng, ROWS - 2) : -1
  for (let r = 0; r < ROWS; r++) {
    // The seat holds whoever sits there, the plate's square holds the plate, and a zebra's row is full already.
    const skip = isSeat(c, r) && (kind === 'cloth' || kind === 'bank')
    const count = skip || r === plate || r === zebra ? 0 : rng.next() < 0.82 ? (rng.next() < 0.38 ? 2 : 1) : 0
    const corner = below(rng, 4)
    for (let n = 0; n < 2; n++) {
      const what = PRINTS[kind][below(rng, PRINTS[kind].length)], jitter = rng.next() * 0.12, turn = rng.next() * 2 - 1
      if (n >= count) continue
      // Two prints in one square take opposite corners, so the middle stays plain under a pawn.
      const at = n === 0 ? corner : 3 - corner
      prints.push({ r, what, dx: (at % 2 === 0 ? -1 : 1) * (0.62 + jitter), dy: (at < 2 ? -1 : 1) * (0.62 + jitter * 0.5), turn })
    }
  }
  // Neighbours in one crossing never get the same onlooker: each lane takes the next one along.
  const far: FarEnd = kind === 'road' ? 'arch' : kind === 'river' ? 'reeds' : hasRails(kind) ? 'tunnel' : kind === 'cloth' ? 'hamper' : kind === 'bank' ? 'burrow' : ONLOOKERS[nth % ONLOOKERS.length]
  const near: NearEnd = kind === 'road' ? 'arch' : kind === 'river' ? 'reeds' : hasRails(kind) ? 'tunnel' : kind === 'cloth' ? 'lid' : kind === 'bank' || home ? 'none' : LOOSE[(nth * 3 + 1) % LOOSE.length]
  return { kind, seed, plate, plateOwn, zebra, prints, far, near }
}

/** The ten columns of a saved state. The cloth and the lane beyond it take their seeds from the next crossing, of which they are the home bank and the first lane. */
export function sceneryOf(saved: Saved): Scenery {
  const lanes = boardOf(saved).lanes
  const own = signature(saved.crossing), next = signature(saved.next)
  const columns: Column[] = []
  for (let c = 0; c < COLS; c++) {
    const seed = c === 0 ? own ^ 0x51ed : c < CLOTH_COL ? own + c * 7919 : c === CLOTH_COL ? next ^ 0x51ed : next + 7919
    // The lane after the last one in view is the second lane of the next crossing.
    const bell = lanes[c].bell, after = c + 1 < COLS ? lanes[c + 1].bell : saved.next.lanes[1].bell
    const mine = bell && bell.dc === 0 ? bell.r : -1
    const ahead = after && after.dc === -1 ? after.r : -1
    // A lane's place in its own crossing, with the crossing's own offset, which is the same before and after a slide.
    const nth = c === 0 || c === CLOTH_COL ? 0 : c < CLOTH_COL ? (own % 5) + c - 1 : next % 5
    columns.push(column(lanes[c], seed >>> 0, c, mine >= 0 ? mine : ahead, mine >= 0, c === 0, nth))
  }
  return { columns }
}

/** The share of the sixty squares that hold nothing printed of their own and nothing standing: no print, no plate, no zebra, no seat, and neither a pawn nor a mover. */
export function emptyShare(scenery: Scenery, taken: (c: number, r: number) => boolean): number {
  let empty = 0
  scenery.columns.forEach((one, c) => {
    for (let r = 0; r < ROWS; r++) {
      const printed = one.prints.some((print) => print.r === r) || one.plate === r || one.zebra === r || (isSeat(c, r) && (one.kind === 'cloth' || one.kind === 'bank'))
      if (!printed && !taken(c, r)) empty += 1
    }
  })
  return empty / (COLS * ROWS)
}
