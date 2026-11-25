import { CARRIERS, type Carrier } from './cast'
import { LENGTH, PLACES } from './garden'

// What goes into ctx.storage: who set the light at each place, the order of
// those at the gate, where the one who carries stands and with what, and
// whether the first showing has begun. Read defensively.

export const SAVE_VERSION = 1

export type Save = {
  v: typeof SAVE_VERSION
  /** By place, in the order of the path: whose apple stands there. */
  set: (Carrier | null)[]
  /** The one who carries comes first, then those who wait. */
  queue: Carrier[]
  /** Where the one who carries stands, in units walked from the gate; whether its candle burns; the place it was sent to. */
  u: number
  lit: boolean
  to: number | null
  shown: boolean
}

export function fresh(): Save {
  return { v: SAVE_VERSION, set: PLACES.map(() => null), queue: [...CARRIERS], u: 0, lit: false, to: null, shown: false }
}

const isCarrier = (value: unknown): value is Carrier => CARRIERS.includes(value as Carrier)
export const allSet = (save: Save) => save.set.every((one) => one !== null)

/** The one in front sets its light at a place and goes to the end of the queue. */
export function setDown(save: Save, place: number): Save {
  const [front, ...rest] = save.queue
  return { ...save, set: save.set.map((one, i) => (i === place ? front : one)), queue: [...rest, front], u: 0, lit: false, to: null }
}

/** Saved state is untrusted: each field is repaired by itself, and a walk that was on its way to set a light is found finished. */
export function deserialize(raw: unknown): Save {
  let out = fresh()
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return out
  const from = raw as Record<string, unknown>
  if (from.v !== SAVE_VERSION) return out
  const set = from.set
  if (Array.isArray(set)) out.set = out.set.map((_, i) => (isCarrier(set[i]) ? set[i] : null))
  if (Array.isArray(from.queue)) {
    const queue = [...new Set(from.queue.filter(isCarrier))]
    out.queue = [...queue, ...CARRIERS.filter((one) => !queue.includes(one))]
  }
  if (typeof from.u === 'number' && Number.isFinite(from.u)) out.u = Math.min(LENGTH, Math.max(0, from.u))
  out.lit = from.lit === true
  if (typeof from.to === 'number' && Number.isInteger(from.to) && from.to >= 0 && from.to < PLACES.length && out.set[from.to] === null) out = setDown(out, from.to)
  if (allSet(out)) { out.u = 0; out.lit = false }
  // A garden with lights in it has been shown.
  out.shown = from.shown === true || out.set.some((one) => one !== null)
  return out
}

export function serialize(save: Save): Save {
  return { v: SAVE_VERSION, set: [...save.set], queue: [...save.queue], u: Math.round(save.u), lit: save.lit, to: save.to, shown: save.shown }
}
