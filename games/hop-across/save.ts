import { CLOTH_COL, COLS, HOME_COL, LENGTH, LOOP, ROWS, SHOVED_STEPS, copyLane, copyPawn, faults, hasRails, partAt, type Board, type Lane, type LaneKind, type Mover, type MoverKind, type Pawn, type Ride, type Square } from './board'
import { LADDER } from './config'
import { CROSSING_LANES, THINGS, lay, type Crossing } from './crossing'
import { deserialize as deserializeBase, isReadable, isRecord, serialize as serializeBase, type GameState } from './state'

// The saved state: the fields of state.ts, and the fields the design sheet names beside them.
// Every hop is one whole step, so a save never holds anything in the air: the arc of a hop, a car's roll and
// the fish's spit are views of the step and are not here.
//
//   crossing  the crossing on the board: the position it was laid from, its home bank, its seven lanes
//   next      the crossing after it, in the same shape; its first lane is the one beyond the cloth
//   family    the four pawns in the order of the line, the rabbit first
//   mishaps   the rabbit's mishaps in this crossing, 0 to 9
//   shown     the new things the duck has shown
//   seed      where the stream that lays the crossings stands

export type Saved = GameState & { crossing: Crossing; next: Crossing; family: Pawn[]; mishaps: number; shown: string[]; seed: number }

export const MOST_MISHAPS = 9

/** The ten lanes on the board: the home bank, the crossing, the cloth, and the first lane of the next crossing. */
export function boardOf(saved: Saved): Board {
  return {
    lanes: [{ kind: saved.crossing.home === 'burrow' ? 'bank' : 'cloth', movers: [] }, ...saved.crossing.lanes, { kind: 'cloth', movers: [] }, saved.next.lanes[0]],
    family: saved.family,
  }
}

/** The state with the board a step has left: the lanes go back where `boardOf` took them from. */
export function withBoard(saved: Saved, board: Board): Saved {
  return {
    ...saved,
    crossing: { ...saved.crossing, lanes: board.lanes.slice(HOME_COL + 1, CLOTH_COL) },
    next: { ...saved.next, lanes: [board.lanes[CLOTH_COL + 1], ...saved.next.lanes.slice(1)] },
    family: board.family,
  }
}

/** A first visit: a crossing and the next one laid from where the age starts, and the family in a line on the home bank below the burrow. */
export function freshSave(base: GameState, seed: number): Saved {
  const first = lay(base.position, seed, 'burrow')
  const second = lay(base.position, first.seed)
  return {
    ...base,
    finished: false,
    crossing: first.crossing,
    next: second.crossing,
    family: [2, 3, 4, 5].map((r) => ({ c: HOME_COL, r, flat: false, on: null, dry: { c: HOME_COL, r } })),
    mishaps: 0,
    shown: [],
    seed: second.seed,
  }
}

const whole = (value: unknown, from: number, below: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= from && value < below
const CROSSING_KINDS: readonly LaneKind[] = ['grass', 'road', 'river', 'rails', 'railroad']
const MOVERS_OF: Record<string, readonly MoverKind[]> = { grass: [], road: ['car', 'lorry'], river: ['log', 'turtle'], rails: [], railroad: ['car', 'lorry'] }

function readMover(raw: unknown, allowed: readonly MoverKind[]): Mover | null {
  if (!isRecord(raw) || !allowed.includes(raw.kind as MoverKind) || !whole(raw.at, 0, LOOP) || (raw.dir !== 1 && raw.dir !== -1)) return null
  if (raw.kind === 'lorry' && raw.count !== undefined) {
    // A lorry in the tunnel the train shoved it into: both its squares are out of sight.
    return whole(raw.count, 1, SHOVED_STEPS + 1) && raw.at === (raw.dir === 1 ? ROWS + 1 : ROWS) ? { kind: 'lorry', at: raw.at, dir: raw.dir, count: raw.count } : null
  }
  if (raw.kind !== 'turtle') return { kind: raw.kind as MoverKind, at: raw.at, dir: raw.dir }
  return raw.at < ROWS && whole(raw.count, 0, 3) ? { kind: 'turtle', at: raw.at, dir: raw.dir, count: raw.count } : null
}

function readLane(raw: unknown): Lane | null {
  if (!isRecord(raw) || !CROSSING_KINDS.includes(raw.kind as LaneKind) || !Array.isArray(raw.movers) || raw.movers.length > LOOP) return null
  const kind = raw.kind as LaneKind
  const movers: Mover[] = []
  for (const one of raw.movers) {
    const mover = readMover(one, MOVERS_OF[kind])
    if (!mover) return null
    movers.push(mover)
  }
  // Two movers never stand on one square of a lane, but for a log that lies over a turtle.
  for (const turtles of [true, false]) {
    const taken = movers.filter((mover) => (mover.kind === 'turtle') === turtles).flatMap((mover) => Array.from({ length: LENGTH[mover.kind] }, (_, part) => partAt(mover, part)))
    if (new Set(taken).size !== taken.length) return null
  }
  if (!hasRails(kind)) return raw.train === undefined && raw.bell === undefined ? { kind, movers } : null
  const train = raw.train, bell = raw.bell
  if (!isRecord(train) || (train.arch !== 'far' && train.arch !== 'near') || typeof train.awake !== 'boolean') return null
  if (!isRecord(bell) || (bell.dc !== -1 && bell.dc !== 0) || !whole(bell.r, 0, ROWS)) return null
  return { kind, movers, train: { arch: train.arch, awake: train.awake }, bell: { dc: bell.dc, r: bell.r } }
}

function readCrossing(raw: unknown): Crossing | null {
  if (!isRecord(raw) || typeof raw.from !== 'string' || !LADDER.includes(raw.from) || (raw.home !== 'burrow' && raw.home !== 'cloth')) return null
  if (!Array.isArray(raw.lanes) || raw.lanes.length !== CROSSING_LANES) return null
  const lanes: Lane[] = []
  for (const item of raw.lanes) {
    const lane = readLane(item)
    if (!lane) return null
    lanes.push(lane)
  }
  // The first lane has no rails: its bell plate would lie on the bank or the cloth before it.
  return hasRails(lanes[0].kind) ? null : { from: raw.from, home: raw.home, lanes }
}

function readSquare(raw: unknown): Square | null {
  return isRecord(raw) && whole(raw.c, 0, COLS) && whole(raw.r, 0, ROWS) ? { c: raw.c, r: raw.r } : null
}

function readFamily(raw: unknown): Pawn[] | null {
  if (!Array.isArray(raw) || raw.length !== 4) return null
  const family: Pawn[] = []
  for (const item of raw) {
    if (!isRecord(item)) return null
    const at = readSquare(item), dry = readSquare(item.dry)
    if (!at || !dry) return null
    let on: Ride | null = null
    if (item.on !== null && item.on !== undefined) {
      if (!isRecord(item.on) || !whole(item.on.index, 0, LOOP) || !whole(item.on.part, 0, 2)) return null
      on = { index: item.on.index, part: item.on.part }
    }
    family.push({ c: at.c, r: at.r, flat: item.flat === true, on, dry })
  }
  return family
}

/**
 * Saved state is untrusted. The fields of state.ts are repaired one by one there, and so are `mishaps`, `shown`
 * and `seed` here. The board is one thing: its lanes and the family on them only mean something together, so a
 * board with a damaged part, or one no step could have left (two on a square, a pawn on open water, a rider on
 * nothing), is laid anew from the position, which is kept, as is what the duck has shown. `seed` is the seed of
 * this visit, for a state that holds none.
 */
export function deserialize(raw: unknown, childAge: number | null, seed: number): Saved {
  const base = deserializeBase(raw, childAge)
  if (!isReadable(raw)) return freshSave(base, seed)
  const shown = Array.isArray(raw.shown) ? THINGS.filter((thing) => (raw.shown as unknown[]).includes(thing)) : []
  const stream = whole(raw.seed, 0, 4294967296) ? raw.seed : seed
  const crossing = readCrossing(raw.crossing), next = readCrossing(raw.next), family = readFamily(raw.family)
  if (!crossing || !next || !family || next.home !== 'cloth') return { ...freshSave(base, stream), shown }
  const saved: Saved = { ...base, crossing, next, family, mishaps: whole(raw.mishaps, 0, MOST_MISHAPS + 1) ? raw.mishaps : 0, shown, seed: stream }
  return faults(boardOf(saved)).length === 0 ? saved : { ...freshSave(base, stream), shown }
}

export function serialize(saved: Saved): Saved {
  const crossing = (one: Crossing): Crossing => ({ from: one.from, home: one.home, lanes: one.lanes.map(copyLane) })
  return {
    ...serializeBase(saved),
    crossing: crossing(saved.crossing),
    next: crossing(saved.next),
    family: saved.family.map(copyPawn),
    mishaps: saved.mishaps,
    shown: [...saved.shown],
    seed: saved.seed,
  }
}
