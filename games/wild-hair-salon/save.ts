import { layOut } from './deal'
import { makeRng, toSeed } from './rng'
import { MAX_CLIPPINGS, MAX_LEN, MIN_LEN, TAIL_LEN, TUFTS, toLength } from './rules'
import { STATE_VERSION, deserialize, freshState, serialize, type GameState } from './state'
import { isCustomer, type CustomerId } from './tastes'
import { FACE_SPOTS, type Clipping, type Ribbon, type Salon, type Who } from './world'

// Everything the game saves: the template's three fields (state.ts, kept as
// generated) and the salon. It is read defensively, field by field, so an old
// or damaged slot never stops the game from opening and a damaged field takes
// its default while the rest is kept. What is read back is the salon as it
// was left: nothing is replayed and nothing is tidied.

export type Game = GameState & Salon

/** The seed the first pair is laid out from as it comes in. */
export const FIRST_SEED = 20261003

/** The first pair, who wait at the door on a first visit. */
export const FIRST_PAIR: readonly [CustomerId, CustomerId] = ['lion', 'poodle']

/**
 * A first visit: the chair is empty, the first pair waits at the door, and
 * nothing has been shown. `childAge` only chooses where in the order it starts.
 * With nobody in the chair the lengths mean nothing yet: they are laid out as
 * the pair comes in.
 */
export function freshGame(childAge: number | null): Game {
  return {
    ...freshState(childAge),
    chair: null, friend: null, waiting: FIRST_PAIR, seed: FIRST_SEED,
    lock: MIN_LEN, model: MIN_LEN, seat: 'beside', cape: 'off', mane: Array<number>(TUFTS).fill(MIN_LEN),
    ribbon: null, clippings: [], shown: { snip: false, pull: false, ribbon: false },
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const isWho = (value: unknown): value is Who => value === 'chair' || value === 'friend'
const alongFloor = (value: unknown): number => (isNumber(value) ? Math.max(0, Math.min(100, Math.round(value))) : 50)

/** The ribbon as saved. A place that cannot be read, or that needs somebody who is not there, puts it back on its peg. */
function readRibbon(raw: unknown, somebody: boolean): Ribbon | null {
  if (!isRecord(raw) || !isNumber(raw.len)) return null
  const len = toLength(raw.len)
  if (raw.at === 'floor') return { len, at: 'floor', x: alongFloor(raw.x) }
  if (somebody) {
    if (raw.at === 'lock' || raw.at === 'model') return { len, at: raw.at }
    if (raw.at === 'mane' && isNumber(raw.tuft) && Number.isInteger(raw.tuft) && raw.tuft >= 0 && raw.tuft < TUFTS) return { len, at: 'mane', tuft: raw.tuft }
    if (raw.at === 'face' && isWho(raw.who)) return { len, at: 'face', who: raw.who }
  }
  return { len, at: 'peg' }
}

/** The clippings as saved. A piece that cannot be read is left out, and so is a piece on a face nobody is there to wear. */
function readClippings(raw: unknown, somebody: boolean): Clipping[] {
  if (!Array.isArray(raw)) return []
  const out: Clipping[] = []
  for (const item of raw) {
    if (!isRecord(item) || !isNumber(item.len) || item.len < 1) continue
    const hue = item.hue === 'ribbon' ? 'ribbon' : isCustomer(item.hue) ? item.hue : null
    if (!hue) continue
    const len = Math.min(MAX_LEN, Math.round(item.len))
    if (item.on === 'floor') out.push({ len, hue, on: 'floor', x: alongFloor(item.x) })
    else if (item.on === 'face' && somebody && isWho(item.who)) out.push({ len, hue, on: 'face', who: item.who, spot: FACE_SPOTS.find((spot) => spot === item.spot) ?? 'lip' })
  }
  // More than the salon keeps: the newest are kept.
  return out.slice(-MAX_CLIPPINGS)
}

/** Saved state is untrusted. Anything that is not this game's record, or is from a newer version, gives a first visit. */
export function deserializeGame(raw: unknown, childAge: number | null = null): Game {
  if (!isRecord(raw) || raw.v !== STATE_VERSION) return freshGame(childAge)
  const base = deserialize(raw, childAge)
  const fresh = freshGame(childAge)
  const seed = isNumber(raw.seed) ? toSeed(raw.seed) : fresh.seed

  // A pair is two different animals, or nobody. A pair that cannot be read is nobody: the salon opens with the chair empty.
  const pair = isCustomer(raw.chair) && isCustomer(raw.friend) && raw.chair !== raw.friend ? { chair: raw.chair, friend: raw.friend } : null
  const w = raw.waiting
  const waiting: readonly [CustomerId, CustomerId] = Array.isArray(w) && w.length === 2 && isCustomer(w[0]) && isCustomer(w[1]) && w[0] !== w[1] ? [w[0], w[1]] : fresh.waiting

  // With a pair in the salon, a length that cannot be read is laid out again for the position; with nobody, lengths mean nothing.
  const fallback = pair ? layOut(base.position, makeRng(seed)) : { lock: fresh.lock, model: fresh.model, seat: fresh.seat, mane: [...fresh.mane] }
  const m = raw.mane
  const mane = Array.from({ length: TUFTS }, (_, i) => (Array.isArray(m) && isNumber(m[i]) ? toLength(m[i]) : fallback.mane[i]))
  const s = isRecord(raw.shown) ? raw.shown : {}
  let ribbon = readRibbon(raw.ribbon, pair !== null)
  // The ribbon and its mark go together: once shown it is in the salon, and a ribbon in the salon has been shown.
  const shown = { snip: s.snip === true, pull: s.pull === true, ribbon: s.ribbon === true || ribbon !== null }
  if (shown.ribbon && !ribbon) ribbon = { len: TAIL_LEN, at: 'peg' }

  return {
    ...base,
    chair: pair?.chair ?? null, friend: pair?.friend ?? null, waiting, seed,
    lock: isNumber(raw.lock) ? toLength(raw.lock) : fallback.lock,
    model: isNumber(raw.model) ? toLength(raw.model) : fallback.model,
    seat: raw.seat === 'beside' || raw.seat === 'across' ? raw.seat : fallback.seat,
    // The cape is off with nobody in the chair, and in a cycle that has been judged; anything else opens with it on.
    cape: !pair || (raw.cape === 'off' && base.finished) ? 'off' : 'on',
    mane, ribbon, clippings: readClippings(raw.clippings, pair !== null), shown,
  }
}

/** The plain record that goes to storage: these fields and no others. */
export function serializeGame(game: Game): Game {
  const r = game.ribbon
  return {
    ...serialize(game),
    chair: game.chair, friend: game.friend, waiting: [game.waiting[0], game.waiting[1]], seed: game.seed,
    lock: game.lock, model: game.model, seat: game.seat, cape: game.cape, mane: [...game.mane],
    ribbon: !r ? null : r.at === 'mane' ? { len: r.len, at: r.at, tuft: r.tuft } : r.at === 'face' ? { len: r.len, at: r.at, who: r.who } : r.at === 'floor' ? { len: r.len, at: r.at, x: r.x } : { len: r.len, at: r.at },
    clippings: game.clippings.map((c) => (c.on === 'floor' ? { len: c.len, hue: c.hue, on: c.on, x: c.x } : { len: c.len, hue: c.hue, on: c.on, who: c.who, spot: c.spot })),
    shown: { snip: game.shown.snip, pull: game.shown.pull, ribbon: game.shown.ribbon },
  }
}
