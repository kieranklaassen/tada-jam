import { BARE_ISLAND_FROM_AGE } from './config'
import { BOAT_LANE_R, CAT_SEATS, KINDS, LAND_R, SEA_LANE_R, type Kind, type Toy, type Where } from './toys'
import { deserialize as readPosition, isReadable, serialize as writePosition, type GameState } from './state'

// What Tiny Island keeps, round the template's position (state.ts): how far
// the island is turned, where each of the five toys is, and which seat the cat
// has. Everything else on screen is rebuilt from these (the gull's place) or
// is short-lived and gone on load (a toy in the hand, the spin, smoke, the
// tree's eaten leaves). The slot is untrusted: each field is repaired by itself.

export type Saved = GameState & {
  /** How far the island is turned, in radians, from 0 up to a whole turn. */
  turn: number
  /** The five toys in the order of `KINDS`. */
  toys: Toy[]
  /**
   * The seat the cat has, by its number in `SEATS` of place.ts: it keeps a seat while it is free, so its seat
   * cannot be worked out from the toys alone. Absent until the cat has moved, and in a record written before
   * the cat kept its seat: the seat is then worked out from the toys and the turn.
   */
  cat?: number
}

const WHOLE = Math.PI * 2
const WHERES: readonly Where[] = ['tray', 'land', 'sea', 'boat']

export const inTray = (kind: Kind): Toy => ({ kind, where: 'tray', x: 0, z: 0 })

/**
 * How a first visit is laid out. Age is a hint and never a gate: the youngest, and a child whose age is not
 * known, find the house already standing and puffing, so the island shows what a toy does when it is set down;
 * from four up the island is bare and every toy waits in the tray. Either child can make the other's island.
 */
export function firstToys(childAge: number | null): Toy[] {
  const bare = childAge !== null && childAge >= BARE_ISLAND_FROM_AGE
  return KINDS.map((kind) => (kind === 'house' && !bare ? { kind, where: 'land', x: 0.9, z: -0.7 } : inTray(kind)))
}

export function fresh(childAge: number | null): Saved {
  return { ...readPosition(null, childAge), turn: 0, toys: firstToys(childAge) }
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

/** One toy's record, or its slot in the tray when the record cannot be believed. */
function readToy(kind: Kind, raw: unknown): Toy {
  if (typeof raw !== 'object' || raw === null) return inTray(kind)
  const record = raw as Record<string, unknown>
  const where = WHERES.find((w) => w === record.where)
  if (record.kind !== kind || !where || where === 'tray') return inTray(kind)
  if (where === 'boat') return kind === 'sheep' ? { kind, where, x: 0, z: 0 } : inTray(kind)
  if (!finite(record.x) || !finite(record.z)) return inTray(kind)
  const r = Math.hypot(record.x, record.z)
  // A place that is off the land, or off the sea inside the rim, is not a place a toy was ever set down.
  if (where === 'land' ? r > LAND_R : r < SEA_LANE_R - 0.5 || r > BOAT_LANE_R + 0.5) return inTray(kind)
  return { kind, where, x: record.x, z: record.z }
}

export function deserialize(raw: unknown, childAge: number | null): Saved {
  if (!isReadable(raw)) return fresh(childAge)
  const list = Array.isArray(raw.toys) ? raw.toys : []
  const toys = KINDS.map((kind, index) => readToy(kind, list[index]))
  // The sheep rides only a boat that is out.
  const boat = toys[KINDS.indexOf('boat')], sheep = KINDS.indexOf('sheep')
  if (toys[sheep].where === 'boat' && boat.where === 'tray') toys[sheep] = inTray('sheep')
  const saved: Saved = { ...readPosition(raw, childAge), turn: finite(raw.turn) ? ((raw.turn % WHOLE) + WHOLE) % WHOLE : 0, toys }
  // A seat that is no seat is left out. Whether the cat can sit there among these toys is for the island to say.
  if (Number.isInteger(raw.cat) && (raw.cat as number) >= 0 && (raw.cat as number) < CAT_SEATS) saved.cat = raw.cat as number
  return saved
}

export function serialize(state: Saved): Saved {
  return {
    ...writePosition(state),
    turn: Math.round((((state.turn % WHOLE) + WHOLE) % WHOLE) * 1000) / 1000,
    toys: state.toys.map((toy) => ({ kind: toy.kind, where: toy.where, x: Math.round(toy.x * 100) / 100, z: Math.round(toy.z * 100) / 100 })),
    ...(state.cat === undefined ? {} : { cat: state.cat }),
  }
}
