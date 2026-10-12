import { STARTER_STRIP_UP_TO_AGE } from './config'
import { FIELD, HOME_PLACE, OUT_PLACE, ROAD, STARTER, TOY_IDS, TOY_SIZE, type Kind, type Pose, type ToyId } from './layout'
import { deserialize, isReadable, isRecord, serialize, type GameState } from './state'
import { MAX_STRIPS, angleOf, readStrip, type Strip } from './tape'

// What Tape Town keeps in ctx.storage, round the template's own record
// (state.ts): the strips on the floor in the order they were laid, the roll
// in use, whether the shoebox is tipped, where every toy stands, and which
// peg rides the bus. Each field is repaired by itself, so one damaged field
// never costs the child the rest of the town.
//
// The game has one place and no judged cycle: `position` is always `town`
// and `finished` always false. The age sets one thing, on a first visit
// only: whether a first road already lies on the floor.

export const PEGS = ['pegA', 'pegB', 'pegC'] as const
export type PegId = (typeof PEGS)[number]

export type TownState = GameState & {
  strips: Strip[]
  roll: Kind
  /** The shoebox is tipped and the toys are out of it. */
  out: boolean
  /** Where each toy stands, in whole stage units, and which way it faces, in whole degrees. */
  toys: Record<ToyId, Pose>
  riding: Record<PegId, boolean>
  /**
   * Which toys travel their tape tail first: the train on its run back, a toy backing away to turn. Written with the
   * toy's place, as `back`, and read from there; the town fills it as it saves and empties it when every toy has
   * taken up its tape.
   */
  tail: Partial<Record<ToyId, true>>
}

const places = (from: Record<ToyId, Pose>): Record<ToyId, Pose> => Object.fromEntries(TOY_IDS.map((id) => [id, { ...from[id] }])) as Record<ToyId, Pose>
const nobodyRiding = (): Record<PegId, boolean> => ({ pegA: false, pegB: false, pegC: false })

/** A first visit: the box tipped and every toy out. A youngest child, or one of no known age, finds one road down with the car on it. */
export function freshTown(childAge: number | null): TownState {
  const town: TownState = { ...deserialize(null, childAge), finished: false, strips: [], roll: ROAD, out: true, toys: places(OUT_PLACE), riding: nobodyRiding(), tail: {} }
  if (childAge === null || childAge <= STARTER_STRIP_UP_TO_AGE) {
    const strip: Strip = { kind: ROAD, ...STARTER }
    town.strips.push(strip)
    const a = angleOf(strip)
    town.toys.car = { x: Math.round(strip.ax + Math.cos(a) * 70), y: Math.round(strip.ay + Math.sin(a) * 70), a }
  }
  return town
}

function readPose(raw: unknown, id: ToyId): Pose | null {
  if (!isRecord(raw)) return null
  const { x, y, a } = raw
  if (typeof x !== 'number' || typeof y !== 'number' || typeof a !== 'number' || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(a)) return null
  const r = TOY_SIZE[id].r * 0.5
  if (x < FIELD.x0 + r || x > FIELD.x1 - r || y < FIELD.y0 + r || y > FIELD.y1 - r) return null
  return { x, y, a: (a * Math.PI) / 180 }
}

/** Saved state is untrusted: anything that is not this game's record gives a first visit, and inside a record each field is repaired by itself. */
export function deserializeTown(raw: unknown, childAge: number | null): TownState {
  if (!isReadable(raw)) return freshTown(childAge)
  const base = deserialize(raw, childAge)
  const strips = Array.isArray(raw.strips) ? raw.strips.map(readStrip).filter((strip): strip is Strip => strip !== null).slice(-MAX_STRIPS) : []
  const roll: Kind = raw.roll === 1 || raw.roll === 2 || raw.roll === 3 ? raw.roll : ROAD
  // A record with no word on the box opens as a first visit does: tipped.
  const out = raw.out !== false
  const saved = isRecord(raw.toys) ? raw.toys : {}
  // In the box every toy lies in its own place there. Out of it, a toy whose place cannot be read stands where it would have landed.
  const toys = places(out ? OUT_PLACE : HOME_PLACE)
  const tail: TownState['tail'] = {}
  if (out) for (const id of TOY_IDS) {
    const pose = readPose(saved[id], id)
    if (!pose) continue
    toys[id] = pose
    const one = saved[id]
    if (isRecord(one) && one.back === true) tail[id] = true
  }
  const riding = nobodyRiding()
  if (out && isRecord(raw.riding)) for (const peg of PEGS) riding[peg] = raw.riding[peg] === true
  return { ...base, finished: false, strips, roll, out, toys, riding, tail }
}

/** The record as it goes to storage: plain JSON, whole numbers. */
export function serializeTown(state: TownState): Record<string, unknown> {
  return {
    ...serialize(state),
    strips: state.strips.map(({ kind, ax, ay, bx, by }) => ({ kind, ax, ay, bx, by })),
    roll: state.roll,
    out: state.out,
    toys: Object.fromEntries(TOY_IDS.map((id) => [id, { x: Math.round(state.toys[id].x) + 0, y: Math.round(state.toys[id].y) + 0, a: Math.round((state.toys[id].a * 180) / Math.PI) + 0, ...(state.tail[id] ? { back: true } : {}) }])),
    riding: { ...state.riding },
  }
}
