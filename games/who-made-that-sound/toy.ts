import { FIRST_SEED, type Slot, draw, stir } from './layout'
import { STATE_VERSION } from './state'
import { KINDS, type Kind, isKind } from './voices'

// The toy (ART.md, "The toy"): a row of plain eggs, each with someone inside,
// and nothing to find. The first tap on an egg lets the one inside be heard,
// the second lets it out, and whoever is out calls again when tapped. It is
// judged alone, before the listening game is built on it, so it has no asker,
// no order and no judging: only what the finger does most.
//
// Like the model of the game (world.ts) it has no renderer, no sound and no
// clock. `play` takes the toy and one tap and returns the toy after it with
// what happened. Everything a tap changes is in the toy before anything shows
// it, so a put-away at any instant finds it saved and nothing replays on load.

/** A row of the toy holds this many eggs. */
export const ROW = 3
/** The hill shows the last few the child let out, each in a place of its own. */
export const HILL_PLACES = 4

/** One who stands on the hill, and in which of its places. */
export type Standing = { kind: Kind; place: number }

export type Toy = {
  /** The state of the seeded stream that fills the nest. */
  rng: number
  /** The kind inside each egg of the row, left to right. */
  kinds: Kind[]
  /** Each egg: not yet heard, heard, or open. */
  slots: Slot[]
  /** Who stands on the hill, oldest first, never two of one kind. */
  hill: Standing[]
  /** The eggs in the nest that waits at the edge, once every egg of the row is open; otherwise empty. */
  nest: Kind[]
}

export type Tap = { on: 'egg'; slot: number } | { on: 'nest' } | { on: 'hill'; place: number } | { on: 'page' }

export type Happened =
  /** A first tap: the one inside calls, softer through the shell, and the egg cracks. */
  | { type: 'wakes'; slot: number; kind: Kind }
  /** A second tap: the egg bursts and the one inside comes out. */
  | { type: 'bursts'; slot: number; kind: Kind }
  /** It goes up the hill to a place of its own. */
  | { type: 'settles'; kind: Kind; place: number; from: number }
  /** Someone on the hill makes way: one of the same kind, or the oldest when the hill is full. */
  | { type: 'leaves'; kind: Kind; place: number }
  /** The row is empty: a nest with new eggs appears at the edge and waits. */
  | { type: 'nestWaits' }
  /** A tap on the nest: its eggs tumble into the row. */
  | { type: 'tips'; kinds: Kind[] }
  /** A tap on someone who is out: it calls and does a trick. */
  | { type: 'calls'; place: number; kind: Kind }
  /** The finger landed where nothing is. The view still answers it. */
  | { type: 'nothing' }

/** Three eggs of three kinds: first the kinds that are not on the hill, so that new faces come. */
function fill(hill: readonly Standing[], rng: number): { kinds: Kind[]; rng: number } {
  const out = (kind: Kind) => hill.some((one) => one.kind === kind)
  const order: Kind[] = []
  for (const pool of [KINDS.filter((kind) => !out(kind)), KINDS.filter(out)]) {
    const left = [...pool]
    while (left.length > 0) {
      const next = draw(rng)
      rng = next.rng
      order.push(...left.splice(Math.floor(next.value * left.length), 1))
    }
  }
  return { kinds: order.slice(0, ROW), rng }
}

/** A fresh toy: three eggs in the row, nobody on the hill. */
export function freshToy(seed: number = FIRST_SEED): Toy {
  const laid = fill([], seed)
  return { rng: laid.rng, kinds: laid.kinds, slots: laid.kinds.map(() => 'fresh'), hill: [], nest: [] }
}

/** What a tap on the page would touch now: for the glow and for the ghost hand. */
export function nextToTouch(toy: Toy): Tap | null {
  if (toy.nest.length > 0) return { on: 'nest' }
  // The egg furthest along first: one that has been heard wants its second tap.
  const heard = toy.slots.indexOf('heard'), fresh = toy.slots.indexOf('fresh')
  return heard >= 0 ? { on: 'egg', slot: heard } : fresh >= 0 ? { on: 'egg', slot: fresh } : null
}

function settle(toy: Toy, kind: Kind, from: number, happened: Happened[]): void {
  // One of the same kind who stood there makes way, and then the oldest: the newcomer takes a free place.
  const same = toy.hill.findIndex((one) => one.kind === kind)
  if (same >= 0) happened.push({ type: 'leaves', ...toy.hill.splice(same, 1)[0] })
  while (toy.hill.length >= HILL_PLACES) happened.push({ type: 'leaves', ...toy.hill.shift()! })
  // The free place nearest above the egg it came out of, so it does not cross the whole page.
  const free = Array.from({ length: HILL_PLACES }, (_, place) => place).filter((place) => !toy.hill.some((one) => one.place === place))
  const near = ((from + 0.5) / Math.max(1, toy.kinds.length)) * HILL_PLACES - 0.5
  const place = free.sort((a, b) => Math.abs(a - near) - Math.abs(b - near))[0]
  toy.hill.push({ kind, place })
  happened.push({ type: 'settles', kind, place, from })
}

/** The toy after one tap, and what happened. The toy passed in is not changed. */
export function play(before: Toy, tap: Tap): { toy: Toy; happened: Happened[] } {
  const toy: Toy = { rng: before.rng, kinds: [...before.kinds], slots: [...before.slots], hill: before.hill.map((one) => ({ ...one })), nest: [...before.nest] }
  const happened: Happened[] = []
  if (tap.on === 'egg' && Number.isInteger(tap.slot) && tap.slot >= 0 && tap.slot < toy.slots.length && toy.slots[tap.slot] !== 'done') {
    const kind = toy.kinds[tap.slot]
    if (toy.slots[tap.slot] === 'fresh') {
      toy.slots[tap.slot] = 'heard'
      happened.push({ type: 'wakes', slot: tap.slot, kind })
    } else {
      toy.slots[tap.slot] = 'done'
      toy.rng = stir(toy.rng, tap.slot)
      happened.push({ type: 'bursts', slot: tap.slot, kind })
      settle(toy, kind, tap.slot, happened)
      if (toy.slots.every((slot) => slot === 'done')) {
        // The next eggs are chosen now and wait in the nest, so the same nest is there after a put-away.
        const laid = fill(toy.hill, toy.rng)
        toy.nest = laid.kinds
        toy.rng = laid.rng
        happened.push({ type: 'nestWaits' })
      }
    }
  } else if (tap.on === 'nest' && toy.nest.length > 0) {
    toy.kinds = toy.nest
    toy.slots = toy.kinds.map(() => 'fresh')
    toy.nest = []
    happened.push({ type: 'tips', kinds: [...toy.kinds] })
  } else if (tap.on === 'hill') {
    const one = toy.hill.find((standing) => standing.place === tap.place)
    if (one) happened.push({ type: 'calls', place: one.place, kind: one.kind })
  }
  if (happened.length === 0) happened.push({ type: 'nothing' })
  return { toy, happened }
}

// --- Saved ---------------------------------------------------------------------

const SLOTS: readonly Slot[] = ['fresh', 'heard', 'done']
const isRecord = (raw: unknown): raw is Record<string, unknown> => typeof raw === 'object' && raw !== null && !Array.isArray(raw)

/** The plain record that is saved: the version beside the toy, so that the game built on it can tell the two apart. */
export function serializeToy(toy: Toy): { v: number; toy: Toy } {
  return { v: STATE_VERSION, toy: { rng: toy.rng, kinds: [...toy.kinds], slots: [...toy.slots], hill: toy.hill.map((one) => ({ kind: one.kind, place: one.place })), nest: [...toy.nest] } }
}

/**
 * Saved state is untrusted. Anything that is not a toy of this version gives a fresh one. Inside a toy each
 * field is repaired by itself, and then the whole is made to agree: a row and its slots fit, nobody stands
 * twice on the hill or two in one place, and a nest waits exactly when the row is empty.
 */
export function deserializeToy(raw: unknown, seed: number = FIRST_SEED): Toy {
  if (!isRecord(raw) || raw.v !== STATE_VERSION || !isRecord(raw.toy)) return freshToy(seed)
  const saved = raw.toy
  let rng = typeof saved.rng === 'number' && Number.isInteger(saved.rng) && saved.rng >= 0 && saved.rng < 2 ** 32 ? saved.rng : seed
  const hill: Standing[] = []
  for (const one of Array.isArray(saved.hill) ? saved.hill : []) {
    if (!isRecord(one) || !isKind(one.kind) || typeof one.place !== 'number' || !Number.isInteger(one.place) || one.place < 0 || one.place >= HILL_PLACES) continue
    if (hill.some((other) => other.kind === one.kind || other.place === one.place)) continue
    hill.push({ kind: one.kind, place: one.place })
  }
  const kindsOk = (list: unknown): list is Kind[] => Array.isArray(list) && list.length === ROW && list.every(isKind) && new Set(list).size === ROW
  let kinds: Kind[] = kindsOk(saved.kinds) ? [...saved.kinds] : []
  let slots: Slot[] = Array.isArray(saved.slots) && saved.slots.length === kinds.length && saved.slots.every((slot) => SLOTS.includes(slot as Slot)) ? ([...saved.slots] as Slot[]) : kinds.map(() => 'fresh')
  let nest: Kind[] = kindsOk(saved.nest) ? [...saved.nest] : []
  const empty = slots.every((slot) => slot === 'done')
  if (!empty) nest = []
  else if (nest.length === 0) {
    if (kinds.length === 0) {
      // No row that can be read: three eggs stand in the row, as in a fresh toy.
      const laid = fill(hill, rng)
      kinds = laid.kinds; slots = kinds.map(() => 'fresh'); rng = laid.rng
    } else {
      const laid = fill(hill, rng)
      nest = laid.kinds; rng = laid.rng
    }
  }
  return { rng, kinds, slots, hill, nest }
}
