import { layOut } from './deal'
import { makeRng, nextSeed, toSeed } from './rng'
import { MAX_CLIPPINGS, MAX_LEN, TAIL_LEN, TUFTS, toLength } from './rules'
import { STATE_VERSION, deserialize, freshState, serialize, type GameState } from './state'
import { CUSTOMERS, isCustomer, type CustomerId } from './tastes'
import { CLIPPING_PLACES, RIBBON_PLACES, type Clipping, type Ribbon, type Salon } from './world'

// Everything the game saves: the template's three fields (state.ts, kept as
// generated) and the salon. It is read defensively, field by field, so an old
// or damaged slot never stops the game from opening and a damaged field takes
// its default while the rest is kept. What is read back is the salon as it
// was left: nothing is replayed and nothing is tidied.

export type Game = GameState & Salon

/** The seed the very first salon is laid out from. */
export const FIRST_SEED = 20261003

/** A salon nobody has touched, with the first pair already in place, laid out for a position. */
function freshAt(base: GameState, seed: number): Game {
  const layout = layOut(base.position, makeRng(seed))
  return {
    ...base,
    chair: 'lion', friend: 'poodle', waiting: ['yak', 'rabbit'], seed: nextSeed(seed),
    lock: layout.lock, model: layout.model, seat: layout.seat, cape: 'on', mane: layout.mane,
    ribbon: null, clippings: [], shown: { snip: false, pull: false, ribbon: false },
  }
}

/** A first visit. `childAge` only chooses where in the order it starts. */
export function freshGame(childAge: number | null): Game {
  return freshAt(freshState(childAge), FIRST_SEED)
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

function readRibbon(raw: unknown): Ribbon | null {
  if (!isRecord(raw) || !isNumber(raw.len)) return null
  const at = RIBBON_PLACES.find((place) => place === raw.at)
  return at ? { len: toLength(raw.len), at } : null
}

function readClippings(raw: unknown): Clipping[] {
  if (!Array.isArray(raw)) return []
  const out: Clipping[] = []
  for (const item of raw) {
    if (!isRecord(item) || !isNumber(item.len) || item.len < 1) continue
    const on = CLIPPING_PLACES.find((place) => place === item.on)
    const hue = item.hue === 'ribbon' ? 'ribbon' : isCustomer(item.hue) ? item.hue : null
    if (!on || !hue) continue
    out.push({ len: Math.min(MAX_LEN, Math.round(item.len)), hue, on, x: isNumber(item.x) ? Math.max(0, Math.min(100, Math.round(item.x))) : 50 })
  }
  // More than the salon keeps: the newest are kept.
  return out.slice(-MAX_CLIPPINGS)
}

/** Saved state is untrusted. Anything that is not this game's record, or is from a newer version, gives a first visit. */
export function deserializeGame(raw: unknown, childAge: number | null = null): Game {
  if (!isRecord(raw) || raw.v !== STATE_VERSION) return freshGame(childAge)
  const base = deserialize(raw, childAge)
  const fallback = freshAt(base, isNumber(raw.seed) ? toSeed(raw.seed) : FIRST_SEED)

  const chair: CustomerId = isCustomer(raw.chair) ? raw.chair : fallback.chair
  const friend: CustomerId = isCustomer(raw.friend) && raw.friend !== chair ? raw.friend : CUSTOMERS.find((who) => who !== chair)!
  const w = raw.waiting
  const waiting: readonly [CustomerId, CustomerId] = Array.isArray(w) && w.length === 2 && isCustomer(w[0]) && isCustomer(w[1]) && w[0] !== w[1] ? [w[0], w[1]] : fallback.waiting
  const m = raw.mane
  const mane = Array.from({ length: TUFTS }, (_, i) => (Array.isArray(m) && isNumber(m[i]) ? toLength(m[i]) : fallback.mane[i]))
  const s = isRecord(raw.shown) ? raw.shown : {}
  let ribbon = readRibbon(raw.ribbon)
  // The ribbon and its mark go together: once shown it is in the salon, and a ribbon in the salon has been shown.
  const shown = { snip: s.snip === true, pull: s.pull === true, ribbon: s.ribbon === true || ribbon !== null }
  if (shown.ribbon && !ribbon) ribbon = { len: TAIL_LEN, at: 'peg' }

  return {
    ...base,
    chair, friend, waiting,
    seed: isNumber(raw.seed) ? toSeed(raw.seed) : fallback.seed,
    lock: isNumber(raw.lock) ? toLength(raw.lock) : fallback.lock,
    model: isNumber(raw.model) ? toLength(raw.model) : fallback.model,
    seat: raw.seat === 'beside' || raw.seat === 'across' ? raw.seat : fallback.seat,
    // The cape is off only in a cycle that has been judged; anything else opens with it on.
    cape: raw.cape === 'off' && base.finished ? 'off' : 'on',
    mane, ribbon, clippings: readClippings(raw.clippings), shown,
  }
}

/** The plain record that goes to storage: these fields and no others. */
export function serializeGame(game: Game): Game {
  return {
    ...serialize(game),
    chair: game.chair, friend: game.friend, waiting: [game.waiting[0], game.waiting[1]], seed: game.seed,
    lock: game.lock, model: game.model, seat: game.seat, cape: game.cape, mane: [...game.mane],
    ribbon: game.ribbon ? { len: game.ribbon.len, at: game.ribbon.at } : null,
    clippings: game.clippings.map((c) => ({ len: c.len, hue: c.hue, on: c.on, x: c.x })),
    shown: { snip: game.shown.snip, pull: game.shown.pull, ribbon: game.shown.ribbon },
  }
}
