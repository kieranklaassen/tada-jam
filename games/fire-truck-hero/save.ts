// The saved state of the game: what state.ts holds (the version, the position
// in the designed order, and whether the yard on screen is finished) and the
// yard itself, so it is found as it was left (ART.md, "Every field of the
// saved state"). No renderer and no DOM.
//
// It wraps state.ts as that file's header says: `deserialize` reads its three
// fields, and this module reads the same raw record again for its own, each
// repaired by itself. A damaged field takes its default and the rest is kept.
//
// Not saved, because each is a view of what is: water in the air, steam,
// ripples, the wheel's spin and the gate's latch. No clock is read.

import { decode, dryGround, encode } from './ground'
import { SPOTS } from './layout'
import { STATE_VERSION, beginCycle, deserialize, finishCycle, freshState, serialize, type GameState } from './state'
import { THINGS, isKind, type Kind } from './things'
import { rest, type Thing, type Yard } from './world'
import { TURNS, arrangementsOf, isYardSpec, judge, layOut, nextTurn, nextYardSpec, type YardSpec } from './yards'

/** Where a saved thing is: a spot, the truck's roof, or still in the thing its arrangement put it in. */
export type SavedSpot = number | 'roof' | 'in'

export type SavedThing = { readonly gulps: number; readonly spot: SavedSpot }

export type Save = GameState & {
  /** The yard on screen, as the id of its place and the number of its arrangement. */
  readonly yard: YardSpec
  /** One entry for each thing of the yard, in the order of its arrangement. */
  readonly things: readonly SavedThing[]
  /** The ground, as ground.ts encodes it: one character a cell. */
  readonly wet: string
  /** The yard that waits beyond the gate. */
  readonly next: YardSpec
  /** Picks which arrangement comes next. It wraps round and is never shown. */
  readonly turn: number
  /** The kinds of thing whose first showing has been given. */
  readonly seen: readonly Kind[]
}

/** The yard that waits beyond the gate: the position's arrangement for this turn, and never the one on screen again. */
function waiting(position: string, turn: number, onScreen: YardSpec): YardSpec {
  const spec = nextYardSpec(position, turn)
  const same = spec.place === onScreen.place && spec.arrangement === onScreen.arrangement
  return same ? nextYardSpec(position, nextTurn(turn)) : spec
}

/** The yard, and what waits behind it, written down. The wheel's spin is left out. */
export function toSave(state: GameState, yard: Yard, next: YardSpec, turn: number, seen: readonly Kind[]): Save {
  return {
    ...serialize(state),
    yard: { place: yard.place, arrangement: yard.arrangement },
    things: rest(yard).yard.things.map((thing) => ({ gulps: thing.gulps, spot: thing.in === undefined ? thing.spot : 'in' })),
    wet: encode(yard.ground),
    next: { place: next.place, arrangement: next.arrangement },
    turn,
    seen: [...seen],
  }
}

/** A first visit: the first yard of the position for this age, laid out fresh, with the next one chosen. */
export function freshSave(childAge: number | null): Save {
  const state = freshState(childAge)
  const first = nextYardSpec(state.position, 0)
  return toSave(state, layOut(first.place, first.arrangement), waiting(state.position, 1, first), 2, [])
}

/** What goes into storage: the fields above and no others, as plain JSON. */
export function serializeSave(save: Save): Save {
  return {
    ...serialize(save),
    yard: { place: save.yard.place, arrangement: save.yard.arrangement },
    things: save.things.map((thing) => ({ gulps: thing.gulps, spot: thing.spot })),
    wet: save.wet,
    next: { place: save.next.place, arrangement: save.next.arrangement },
    turn: save.turn,
    seen: [...save.seen],
  }
}

// --- Reading a saved record ---------------------------------------------------

function isWhole(value: unknown, from: number, to: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= from && value <= to
}

function readSpec(raw: unknown): YardSpec | null {
  if (typeof raw !== 'object' || raw === null) return null
  const { place, arrangement } = raw as Record<string, unknown>
  return isYardSpec(place, arrangement) ? { place: place as string, arrangement: arrangement as number } : null
}

/**
 * The things of a yard, repaired one by one against its arrangement. A missing
 * entry is a thing as it was laid out, and one too many is dropped. Gulps out
 * of range are none. A place a thing cannot be is the place it was laid out:
 * only the cat walks to another spot or sits on the roof, and only onto a spot
 * nothing else stands on, and the boat is in its pool or aground beside it.
 */
function readThings(yard: YardSpec, raw: unknown): SavedThing[] {
  const plan = arrangementsOf(yard.place)[yard.arrangement]
  const list: readonly unknown[] = Array.isArray(raw) ? raw : []
  const taken = new Set(plan.things.filter((placed) => placed.in === undefined && placed.kind !== 'cat').map((placed) => placed.spot))
  return plan.things.map((placed, index) => {
    const entry = list[index]
    const { gulps, spot } = (typeof entry === 'object' && entry !== null ? entry : {}) as Record<string, unknown>
    const laidOut: SavedSpot = placed.in === undefined ? placed.spot : 'in'
    const catCan = placed.kind === 'cat' && (spot === 'roof' || (isWhole(spot, 0, SPOTS.length - 1) && !taken.has(spot)))
    const boatCan = placed.kind === 'boat' && spot === placed.spot
    return {
      // The wheel keeps no water, so it is still on every load.
      gulps: placed.kind !== 'wheel' && isWhole(gulps, 0, THINGS[placed.kind].most) ? gulps : 0,
      spot: spot === laidOut || catCan || boatCan ? (spot as SavedSpot) : laidOut,
    }
  })
}

function readSeen(raw: unknown): Kind[] {
  const seen: Kind[] = []
  for (const kind of Array.isArray(raw) ? (raw as unknown[]) : []) if (isKind(kind) && !seen.includes(kind)) seen.push(kind)
  return seen
}

/**
 * Saved state is untrusted. Anything that is not this game's record, or is of
 * a version above this one, gives a first visit. Inside a record each field is
 * repaired by itself. A yard that is not a known place and arrangement gives
 * a yard freshly laid out at the position: dry, nothing watered, not finished.
 */
export function deserializeSave(raw: unknown, childAge: number | null = null): Save {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return freshSave(childAge)
  const record = raw as Record<string, unknown>
  if (record.v !== STATE_VERSION) return freshSave(childAge)
  const state = deserialize(raw, childAge)
  const turn = isWhole(record.turn, 0, TURNS - 1) ? record.turn : 0
  const saved = readSpec(record.yard)
  const yard = saved ?? nextYardSpec(state.position, turn)
  return {
    ...state,
    finished: saved !== null && state.finished,
    yard,
    things: readThings(yard, saved ? record.things : null),
    wet: encode(saved ? decode(record.wet) : dryGround()),
    next: readSpec(record.next) ?? waiting(state.position, turn, yard),
    turn,
    seen: readSeen(record.seen),
  }
}

/** The yard of a save, as world.ts plays it. Its want counts as met when the save says the yard is finished, so it is not said again. */
export function yardOf(save: Save): Yard {
  const fresh = layOut(save.yard.place, save.yard.arrangement)
  const things = fresh.things.map((thing, index): Thing => {
    const saved = save.things[index]
    if (!saved) return thing
    if (saved.spot === 'in') return { ...thing, gulps: saved.gulps }
    return { kind: thing.kind, spot: saved.spot, gulps: saved.gulps }
  })
  return { ...fresh, things, ground: decode(save.wet), met: save.finished }
}

/**
 * The yard changed and the save follows it. The gulp that met its want
 * finishes the cycle as one that went well, at once, so a put-away during the
 * ending loses nothing. The position moves once however often this is called.
 */
export function withYard(save: Save, yard: Yard): Save {
  const state = yard.met ? finishCycle(serialize(save), 'well') : serialize(save)
  return toSave(state, yard, save.next, save.turn, save.seen)
}

/**
 * The gate opened and the truck rolls on. The yard it leaves is judged here if
 * its want was never met, and the next cycle begins in the same call, as the
 * header of state.ts asks. The yard that waited is laid out fresh, and the one
 * to wait behind it is chosen from the position as it now stands, so a moved
 * position shows in the yard after next.
 */
export function driveOn(save: Save, left: Yard, busy = false): Save {
  const state = beginCycle(finishCycle(serialize(save), judge(left, busy)))
  const yard = layOut(save.next.place, save.next.arrangement)
  return toSave(state, yard, waiting(state.position, save.turn, yard), nextTurn(save.turn), save.seen)
}
