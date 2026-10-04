import { LADDER } from './config'
import { type Form, placeOf } from './places'
import { FAMILIES, KINDS, type Family, type Kind, familyOf } from './voices'

// Laying out a clutch: which kinds hide in the row, in what order, and who
// comes to ask in what order. Everything is drawn from one seeded stream
// whose state is a single number in the save, so the same save always lays
// out the same next clutch and a test can replay any game.

// --- The seeded stream -------------------------------------------------------

/** The stream a first visit starts from. Every child's first clutch is the same one. */
export const FIRST_SEED = 0x51ed270b

/** One step of the stream (mulberry32): a number from 0 up to but not 1, and the state to carry on from. */
export function draw(rng: number): { value: number; rng: number } {
  const state = (rng + 0x6d2b79f5) >>> 0
  let t = state
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, rng: state }
}

/** Mixes something the child did into the stream, so two children who play differently meet different clutches. */
export function stir(rng: number, with_: number): number {
  return (Math.imul(rng ^ (with_ + 0x9e3779b9), 0x85ebca6b) ^ (rng >>> 13)) >>> 0
}

function pick<T>(list: readonly T[], rng: number): { item: T; rng: number } {
  const next = draw(rng)
  return { item: list[Math.floor(next.value * list.length)], rng: next.rng }
}

function shuffle<T>(list: readonly T[], rng: number): { list: T[]; rng: number } {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const next = draw(rng)
    rng = next.rng
    const j = Math.floor(next.value * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return { list: out, rng }
}

// --- A clutch ----------------------------------------------------------------

/** One spot of the row: not yet heard, heard (the next tap on it is the attempt), or done. */
export type Slot = 'fresh' | 'heard' | 'done'

export type Clutch = {
  form: Form
  /** The place it was laid out from: an id of the ladder. It says whether the hides are eggs or leaf piles. */
  place: string
  /** The kind at each spot of the row, left to right: the hidden ones, or in `who` the grown ones who stand there. */
  kinds: Kind[]
  slots: Slot[]
  /** The kinds still to come and ask, in order. Always empty in `alike`. */
  queue: Kind[]
  /** The kind that asks at the stone now, or null while the next one waits at the edge. */
  asker: Kind | null
  /** The wrong attempts in this clutch, counted up to `WRONG_MAX`. It decides how the cycle went and is never shown. */
  wrong: number
}

export const WRONG_MAX = 3

const kindsOf = (family: Family, avoid: Kind | null) => KINDS.filter((kind) => familyOf(kind) === family && kind !== avoid)

/**
 * The clutch a place lays out. `avoid` is the kind inside the egg in the basket: it is never in the clutch, so
 * that tipping it in always adds a new voice.
 */
export function layClutch(placeId: string, rng: number, avoid: Kind | null = null): { clutch: Clutch; rng: number } {
  const id = LADDER.includes(placeId) ? placeId : LADDER[0]
  const place = placeOf(id)
  const families = shuffle(FAMILIES, rng)
  rng = families.rng
  let kinds: Kind[] = []
  if (place.form === 'alike') {
    // Two kinds of two families, two of each.
    for (const family of families.list.slice(0, 2)) {
      const one = pick(kindsOf(family, avoid), rng)
      rng = one.rng
      kinds.push(one.item, one.item)
    }
  } else if (place.voices === 'near') {
    // Both kinds of one family, which cannot be the family of the egg in the basket, and one of another.
    const whole = families.list.find((family) => avoid === null || familyOf(avoid) !== family)!
    kinds.push(...kindsOf(whole, null))
    const other = pick(families.list.filter((family) => family !== whole).flatMap((family) => kindsOf(family, avoid)), rng)
    rng = other.rng
    kinds.push(other.item)
  } else {
    for (const family of families.list.slice(0, place.row)) {
      const one = pick(kindsOf(family, avoid), rng)
      rng = one.rng
      kinds.push(one.item)
    }
  }
  const row = shuffle(kinds, rng)
  rng = row.rng
  kinds = row.list
  let queue: Kind[] = []
  if (place.form !== 'alike') {
    const order = shuffle(kinds, rng)
    rng = order.rng
    queue = order.list
  }
  return { clutch: { form: place.form, place: id, kinds, slots: kinds.map(() => 'fresh'), queue, asker: null, wrong: 0 }, rng }
}

/** A kind for the egg in the basket, or for the pair that shows a new way of asking: one that is not in `taken`. */
export function layOther(taken: readonly (Kind | null)[], rng: number): { kind: Kind; rng: number } {
  const free = KINDS.filter((kind) => !taken.includes(kind))
  const one = pick(free.length > 0 ? free : KINDS, rng)
  return { kind: one.item, rng: one.rng }
}

/** Whether a clutch is one this build could have laid out and played: the test a saved one has to pass. */
export function isSound(clutch: Clutch): boolean {
  const { form, kinds, slots, queue, asker, wrong } = clutch
  if (!LADDER.includes(clutch.place)) return false
  if (kinds.length < 2 || kinds.length > 4 || slots.length !== kinds.length) return false
  if (!Number.isInteger(wrong) || wrong < 0 || wrong > WRONG_MAX) return false
  const distinct = new Set(kinds)
  if (form === 'alike') {
    // Two pairs, nobody waiting to ask, and the one who asks has its twin still hidden.
    if (kinds.length !== 4 || distinct.size !== 2 || queue.length !== 0) return false
    for (const kind of distinct) if (kinds.filter((other) => other === kind).length !== 2) return false
    if (asker !== null && kinds.filter((kind, i) => kind === asker && slots[i] === 'done').length !== 1) return false
    return true
  }
  if (distinct.size !== kinds.length) return false
  // Everyone who asks, or will, is a kind of the row, once; and whoever asks now has its own still to find.
  const asking = asker === null ? queue : [asker, ...queue]
  if (new Set(asking).size !== asking.length || asking.some((kind) => !distinct.has(kind))) return false
  if (asker !== null && slots[kinds.indexOf(asker)] === 'done') return false
  // In `who` a grown one leaves the row only with its own egg, so no done spot is still waiting to ask.
  if (form === 'who' && asking.some((kind) => slots[kinds.indexOf(kind)] === 'done')) return false
  if (form === 'who' && kinds.some((kind, i) => slots[i] !== 'done' && !asking.includes(kind))) return false
  // In `seek` a hide that is still shut has its grown one still to come.
  if (form === 'seek' && kinds.some((kind, i) => slots[i] !== 'done' && !asking.includes(kind))) return false
  return true
}

/** Nothing left in the row, nobody asking and nobody still to come: the cycle is over. */
export function isOver(clutch: Clutch): boolean {
  return clutch.slots.every((slot) => slot === 'done') && clutch.asker === null && clutch.queue.length === 0
}
