import type { Picture, Wanted } from './card'
import { isCustomer, type Customer } from './customers'
import { isKind, type Kind } from './kinds'
import { deserialize as baseDeserialize, serialize as baseSerialize, type GameState } from './state'
import { APART, CAPACITY, REACH } from './table'

// What Monster Pizza keeps in ctx.storage beside the template's own fields
// (state.ts: the version, the position, and whether the cycle is finished).
// The template's deserialize reads its fields; this module reads the same raw
// record again for the game's own, each repaired by itself, so an old or
// damaged save never stops the kitchen from opening. Nothing is saved in the
// air: the Mount hands over pieces at rest (table.ts, restingPieces).

export type SavedPiece = { kind: Kind; x: number; y: number; turn: number }
export type SavedOrder = { wanted: Wanted[]; picture: Picture; seed: number }
/** The new ideas a character shows once ever. */
export const SHOWINGS = ['tap-a-tub', 'to-the-oven'] as const
export type Showing = (typeof SHOWINGS)[number]

export type Save = GameState & {
  /** Which customer is at the counter, or none before the first one steps up. */
  customer: Customer | null
  /** The card it holds. */
  order: SavedOrder | null
  /** The kinds on the table, in their places. */
  tubs: Kind[]
  /** This customer was called in with the big roll. */
  bigRoll: boolean
  pizza: { pieces: SavedPiece[]; baked: boolean }
  /** How many pizzas this customer has pushed back, kept only up to two. */
  pushedBack: number
  /** The two at the door: who holds the small roll and who the big one. */
  waiting: { small: Customer; big: Customer } | null
  shown: Showing[]
}

/** An order holds one to three kinds, each at least once, and ten pieces at most in all. */
export const MOST_KINDS = 3
export const MOST_PIECES = 10
export const MOST_TUBS = 4

function round(n: number): number {
  return Math.round(n * 1000) / 1000
}

function readPieces(raw: unknown): SavedPiece[] {
  if (!Array.isArray(raw)) return []
  const out: SavedPiece[] = []
  for (const item of raw) {
    if (out.length >= CAPACITY) break
    if (typeof item !== 'object' || item === null) continue
    const r = item as Record<string, unknown>
    if (!isKind(r.kind) || typeof r.x !== 'number' || typeof r.y !== 'number' || !Number.isFinite(r.x) || !Number.isFinite(r.y)) continue
    // A piece off the pizza, or lying on another, was never laid by a child: it is left out.
    if (Math.hypot(r.x, r.y) > REACH + 0.004) continue
    // Positions are saved to three places, so two pieces may read as a hair closer than they lay.
    if (out.some((p) => Math.hypot(p.x - (r.x as number), p.y - (r.y as number)) < APART - 0.004)) continue
    out.push({ kind: r.kind, x: r.x, y: r.y, turn: typeof r.turn === 'number' && Number.isFinite(r.turn) ? r.turn : 0 })
  }
  return out
}

function readOrder(raw: unknown): SavedOrder | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (!Array.isArray(r.wanted) || r.wanted.length < 1 || r.wanted.length > MOST_KINDS) return null
  const wanted: Wanted[] = []
  let total = 0
  for (const item of r.wanted) {
    if (typeof item !== 'object' || item === null) return null
    const w = item as Record<string, unknown>
    if (!isKind(w.kind) || typeof w.count !== 'number' || !Number.isInteger(w.count) || w.count < 1) return null
    if (wanted.some((have) => have.kind === w.kind)) return null
    wanted.push({ kind: w.kind, count: w.count })
    total += w.count
  }
  if (total > MOST_PIECES) return null
  return { wanted, picture: r.picture === 'scattered' ? 'scattered' : 'rows', seed: typeof r.seed === 'number' && Number.isFinite(r.seed) ? r.seed >>> 0 : 1 }
}

function readTubs(raw: unknown): Kind[] {
  if (!Array.isArray(raw)) return []
  const out: Kind[] = []
  for (const item of raw) if (isKind(item) && !out.includes(item) && out.length < MOST_TUBS) out.push(item)
  return out
}

/** The game's own fields of a fresh save: nobody at the counter yet. */
function freshOwn(): Omit<Save, keyof GameState> {
  return { customer: null, order: null, tubs: [], bigRoll: false, pizza: { pieces: [], baked: false }, pushedBack: 0, waiting: null, shown: [] }
}

export function freshSave(childAge: number | null): Save {
  return { ...baseDeserialize(null, childAge), ...freshOwn() }
}

/** Saved state is untrusted: anything that is not this game's record gives a fresh save, and inside a record each field is repaired by itself. */
export function deserialize(raw: unknown, childAge: number | null = null): Save {
  const base = baseDeserialize(raw, childAge)
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw) || (raw as Record<string, unknown>).v !== base.v) return { ...base, ...freshOwn() }
  const r = raw as Record<string, unknown>
  const customer = isCustomer(r.customer) ? r.customer : null
  const order = customer ? readOrder(r.order) : null
  const pizza = typeof r.pizza === 'object' && r.pizza !== null ? (r.pizza as Record<string, unknown>) : {}
  const w = typeof r.waiting === 'object' && r.waiting !== null ? (r.waiting as Record<string, unknown>) : {}
  const waiting = isCustomer(w.small) && isCustomer(w.big) && w.small !== w.big && w.small !== customer && w.big !== customer ? { small: w.small, big: w.big } : null
  // A customer with no readable card cannot be served, so the counter is cleared and the game sets the next one up.
  if (!customer || !order) return { ...base, finished: false, ...freshOwn(), waiting, shown: readShown(r.shown) }
  const tubs = readTubs(r.tubs)
  for (const want of order.wanted) if (!tubs.includes(want.kind) && tubs.length < MOST_TUBS) tubs.push(want.kind)
  return {
    ...base,
    customer,
    order,
    tubs,
    bigRoll: r.bigRoll === true,
    pizza: { pieces: readPieces(pizza.pieces), baked: pizza.baked === true },
    pushedBack: typeof r.pushedBack === 'number' && Number.isFinite(r.pushedBack) ? Math.max(0, Math.min(2, Math.floor(r.pushedBack))) : 0,
    waiting,
    shown: readShown(r.shown),
  }
}

function readShown(raw: unknown): Showing[] {
  return Array.isArray(raw) ? SHOWINGS.filter((id) => raw.includes(id)) : []
}

export function serialize(save: Save): Save {
  return {
    ...baseSerialize(save),
    customer: save.customer,
    order: save.order && { wanted: save.order.wanted.map((w) => ({ kind: w.kind, count: w.count })), picture: save.order.picture, seed: save.order.seed },
    tubs: [...save.tubs],
    bigRoll: save.bigRoll,
    pizza: { pieces: save.pizza.pieces.map((p) => ({ kind: p.kind, x: round(p.x), y: round(p.y), turn: round(p.turn) })), baked: save.pizza.baked },
    pushedBack: save.pushedBack,
    waiting: save.waiting && { small: save.waiting.small, big: save.waiting.big },
    shown: [...save.shown],
  }
}
