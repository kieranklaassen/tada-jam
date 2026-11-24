import { FIRST_VISIT, LADDER, type PositionId } from './config'
import { BODIES, PARTS, PLACES, bare, copy, fillSacks, make, type Monster, type Part } from './monster'
import { makeRng } from './rng'

// What goes into ctx.storage: the board as it stands when nobody touches it.
// A meeting or a sack in flight is saved as over, a magnet in a hand where it
// came from (play.ts does that before it calls serialize), and nothing in the
// record plays anything on load.

export const SAVE_VERSION = 1
export const PAIRS = 3

export type World = {
  a: Monster
  b: Monster
  open: boolean
  /** The one behind the curtain is the child's own. */
  own: boolean
  place: PositionId
  /** The two who wait, once a pair has met. Open without them, the first kind of round is on: both in view, and not met yet. */
  sacks: [Monster, Monster] | null
  worn: { ostrich: Part | null; mole: Part | null }
  /** The last pairs as they met, newest last. */
  pairs: [Monster, Monster][]
  shown: boolean
  /** Where the stream of chance stands. */
  n: number
}

export function firstPlace(childAge: number | null): PositionId {
  let at: PositionId = FIRST_VISIT[0].position
  if (childAge !== null) for (const row of FIRST_VISIT) if (childAge >= row.fromAge) at = row.position
  return at
}

export function freshWorld(childAge: number | null, seed: number): World {
  const rng = makeRng(seed), place = firstPlace(childAge)
  const a = make(place, rng)
  return { a, b: bare(), open: place === 'in-view', own: false, place, sacks: null, worn: { ostrich: null, mole: null }, pairs: [], shown: false, n: rng.state }
}

/** Draws with the world's own stream, and puts back where it stands. */
export function refill(world: World): void {
  const rng = makeRng(world.n)
  world.sacks = fillSacks(world.place, rng)
  world.n = rng.state
}

type Code = string
/** A monster as one short string: its body, then a part number and a size, or a dash, for each place. */
function encode(m: Monster): Code {
  return `${BODIES.indexOf(m.body)}${PLACES.map((place) => { const s = m.on[place]; return s ? `${PARTS.indexOf(s.part)}${s.large ? 'l' : 's'}` : '--' }).join('')}`
}
function decode(raw: unknown): Monster | null {
  if (typeof raw !== 'string' || !/^[0-2](?:[0-6][ls]|--){6}$/.test(raw)) return null
  const m = bare(BODIES[Number(raw[0])])
  PLACES.forEach((place, i) => {
    const code = raw.slice(1 + i * 2, 3 + i * 2)
    m.on[place] = code === '--' ? null : { part: PARTS[Number(code[0])], large: code[1] === 'l' }
  })
  return m
}

export function serialize(w: World): Record<string, unknown> {
  return {
    v: SAVE_VERSION, a: encode(w.a), b: encode(w.b), open: w.open, own: w.own, place: w.place,
    sacks: w.sacks && w.sacks.map(encode), worn: { ...w.worn }, pairs: w.pairs.map((pair) => pair.map(encode)), shown: w.shown, n: w.n,
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const part = (value: unknown): Part | null => PARTS.find((one) => one === value) ?? null

/** Saved state is untrusted: each damaged field gets its own default, and what comes out could have been reached by play. */
export function deserialize(raw: unknown, childAge: number | null, seed: number): World {
  const world = freshWorld(childAge, seed)
  if (!isRecord(raw) || raw.v !== SAVE_VERSION) return world
  const at = LADDER.find((one) => one === raw.place)
  if (at && at !== world.place) {
    const rng = makeRng(world.n)
    world.place = at
    world.a = make(at, rng)
    world.open = at === 'in-view'
    world.n = rng.state
  }
  if (typeof raw.n === 'number' && Number.isFinite(raw.n)) world.n = raw.n >>> 0
  const a = decode(raw.a)
  if (a) world.a = a
  world.b = decode(raw.b) ?? world.b
  // A game's own monster always stands for something; what could not be read is no child's.
  world.own = a !== null && raw.own === true
  if (a) world.open = raw.open === true
  const worn = isRecord(raw.worn) ? raw.worn : {}
  world.worn = { ostrich: part(worn.ostrich), mole: part(worn.mole) }
  if (Array.isArray(raw.pairs)) for (const pair of raw.pairs.slice(-PAIRS)) {
    if (!Array.isArray(pair)) continue
    const p = decode(pair[0]), q = decode(pair[1])
    if (p && q) world.pairs.push([p, q])
  }
  world.shown = raw.shown === true
  if (world.open && a === null) return world
  if (world.open) {
    const sacks = Array.isArray(raw.sacks) ? raw.sacks.map(decode) : []
    if (sacks.length === 2 && sacks[0] && sacks[1]) world.sacks = [sacks[0], sacks[1]]
    // Nothing waits before the pair in view has met; a child's own never stands so.
    else if (raw.sacks !== null || world.own || world.place !== 'in-view') refill(world)
  }
  return world
}

export function copyWorld(w: World): World {
  return { ...w, a: copy(w.a), b: copy(w.b), sacks: w.sacks && [copy(w.sacks[0]), copy(w.sacks[1])], worn: { ...w.worn }, pairs: w.pairs.map(([p, q]) => [copy(p), copy(q)]) }
}
