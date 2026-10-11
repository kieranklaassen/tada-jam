import { KINDS, cleanMud, decodeMud, encodeMud, muddied, type Kind } from './cloth'
import { FRIEND_KINDS, onLawn, type FriendKind } from './layout'
import { makeRng } from './rng'
import { deserialize as readBase, freshState, isReadable, isRecord, serialize as writeBase, type GameState } from './state'
import { decodeHide, encodeHide, muddyHide, wearsOf, type Wear } from './taste'

// What the game saves, round the template's fields (state.ts). Small plain
// JSON, read field by field: a damaged field takes its default and the rest
// is kept. Everything in it is at rest: nothing is saved in the air, in a
// hand or in the middle of a scene.

export const FRIENDS = 3
export const PEGS = 6

/** Where a friend is. */
export type Where = 'gate' | 'yard' | 'tub'
const WHERES: readonly Where[] = ['gate', 'yard', 'tub']

export type SavedFriend = {
  kind: FriendKind
  /** Which of its kind's two colourways. */
  colour: 0 | 1
  where: Where
  /** The mud on its hide, one digit a cell (taste.ts). */
  hide: string
  /** How wet it is, in tenths. */
  wet: number
  /** Which garment it wears, by its place in `garments`, or -1. */
  wears: number
  /** Where on its body it wears it. */
  on: Wear
}

/** Where a garment is. `n` is the place on the line or the friend; `x`, `y` are the spot on the grass or in the puddle. */
export type At = 'held' | 'tub' | 'board' | 'rail' | 'line' | 'friend' | 'grass' | 'puddle'
const ATS: readonly At[] = ['held', 'tub', 'board', 'rail', 'line', 'friend', 'grass', 'puddle']

export type SavedGarment = {
  kind: Kind
  /** Whose it is: the place of its friend in `friends`. */
  owner: number
  at: At
  n: number
  x: number
  y: number
  /** One digit a cell (cloth.ts). */
  mud: string
  /** How wet and how soapy, in tenths. */
  wet: number
  suds: number
  /** Which of its two pegs are on. */
  pegs: [boolean, boolean]
}

export type SavedCat = { at: 'fence' | 'board' | 'rail' | 'line'; n: number; wet: number; fluff: number }
export type SavedSoap = { at: 'dish' | 'tub' | 'grass'; n: number }
/** One who walked off, as it was dressed. */
export type SavedLeaver = { kind: FriendKind; colour: 0 | 1; garment: Kind; on: Wear; mud: string; wet: number; suds: number }

export type Save = GameState & {
  /** Where the stream of chance stands. */
  seed: number
  friends: SavedFriend[]
  garments: SavedGarment[]
  /** The tub: how cloudy and how full, in tenths. */
  water: { cloud: number; level: number }
  cat: SavedCat
  soap: SavedSoap
  /** Which of the loose pegs are washed shiny. */
  pegs: boolean[]
  /** The last three who walked off, the oldest first. */
  hill: SavedLeaver[]
}

/**
 * The three who come up the lane and what they hold. The garments are dealt, never drawn by luck: `kinds` are the
 * three to hold (the three that were not held in the cycle before), and the stream says only which friend holds
 * which and where the mud lies. Returns where the stream stands afterwards.
 */
export function deal(kinds: readonly Kind[], colour: 0 | 1, seed: number): { friends: SavedFriend[]; garments: SavedGarment[]; seed: number } {
  const rng = makeRng(seed)
  const order = [...kinds]
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  const friends = FRIEND_KINDS.map((kind): SavedFriend => ({ kind, colour, where: 'gate', hide: encodeHide(muddyHide(rng)), wet: 0, wears: -1, on: 'torso' }))
  const garments = order.map((kind, owner): SavedGarment => ({ kind, owner, at: 'held', n: 0, x: 0, y: 0, mud: encodeMud(muddied(kind, rng)), wet: 0, suds: 0, pegs: [false, false] }))
  return { friends, garments, seed: rng.state }
}

/** The three garments that are not among `held`: the three of the next cycle. */
export function theOtherThree(held: readonly Kind[]): Kind[] {
  const others = KINDS.filter((kind) => !held.includes(kind))
  return others.length === FRIENDS ? others : KINDS.slice(0, FRIENDS)
}

/** A first visit: an empty yard, and three muddy friends behind the gate, each with a garment. Which three garments come first is the seed's. */
export function freshSave(childAge: number | null, seed: number): Save {
  const rng = makeRng(seed)
  const kinds: Kind[] = [...KINDS]
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1))
    ;[kinds[i], kinds[j]] = [kinds[j], kinds[i]]
  }
  const dealt = deal(kinds.slice(0, FRIENDS), 0, rng.state)
  return {
    ...freshState(childAge),
    seed: dealt.seed,
    friends: dealt.friends,
    garments: dealt.garments,
    water: { cloud: 0, level: 10 },
    cat: { at: 'fence', n: 0, wet: 0, fluff: 0 },
    soap: { at: 'dish', n: 0 },
    pegs: new Array<boolean>(PEGS).fill(false),
    hill: [],
  }
}

function tenths(raw: unknown, fallback = 0): number {
  return typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, Math.min(10, Math.round(raw))) : fallback
}

function place(raw: unknown): number {
  return typeof raw === 'number' && Number.isInteger(raw) && raw >= 0 && raw < FRIENDS ? raw : 0
}

function colourOf(raw: unknown): 0 | 1 {
  return raw === 1 ? 1 : 0
}

function wearOf(raw: unknown, friend: FriendKind, garment: Kind): Wear {
  const fits = wearsOf(friend, garment)
  return fits.includes(raw as Wear) ? (raw as Wear) : fits[0]
}

/** Saved state is untrusted. `seed` is the seed of this visit, used only where the slot gives none. */
export function deserialize(raw: unknown, childAge: number | null, seed: number): Save {
  if (!isReadable(raw)) return freshSave(childAge, seed)
  const base = readBase(raw, childAge)
  const fresh = freshSave(childAge, seed)

  // The friends and the garments are read together: three of each, or the cycle cannot be put back and a fresh
  // one is laid out at the same position.
  const friendList = Array.isArray(raw.friends) ? raw.friends : [], garmentList = Array.isArray(raw.garments) ? raw.garments : []
  const whole = friendList.length === FRIENDS && garmentList.length === FRIENDS
    && friendList.every((saved, i) => isRecord(saved) && saved.kind === FRIEND_KINDS[i])
    && garmentList.every((saved) => isRecord(saved) && KINDS.includes(saved.kind as Kind))
    && new Set(garmentList.map((saved) => (saved as Record<string, unknown>).kind)).size === FRIENDS
  let friends = fresh.friends, garments = fresh.garments
  let finished = base.finished
  if (whole) {
    garments = (garmentList as Record<string, unknown>[]).map((saved, owner): SavedGarment => {
      const kind = saved.kind as Kind
      const at: At = ATS.includes(saved.at as At) ? (saved.at as At) : 'held'
      const spot = onLawn(typeof saved.x === 'number' && Number.isFinite(saved.x) ? saved.x : 0, typeof saved.y === 'number' && Number.isFinite(saved.y) ? saved.y : 0)
      const loose = at === 'grass' || at === 'puddle'
      const pegs = Array.isArray(saved.pegs) ? saved.pegs : []
      return { kind, owner, at, n: place(saved.n), x: loose ? spot.x : 0, y: loose ? spot.y : 0, mud: encodeMud(decodeMud(saved.mud, kind) ?? cleanMud()), wet: tenths(saved.wet), suds: tenths(saved.suds), pegs: [at === 'line' && pegs[0] === true, at === 'line' && pegs[1] === true] }
    })
    friends = (friendList as Record<string, unknown>[]).map((saved, i): SavedFriend => ({
      kind: FRIEND_KINDS[i],
      colour: colourOf(saved.colour),
      where: WHERES.includes(saved.where as Where) ? (saved.where as Where) : 'gate',
      hide: encodeHide(decodeHide(saved.hide) ?? decodeHide(fresh.friends[i].hide)!),
      wet: tenths(saved.wet),
      wears: -1,
      on: 'torso',
    }))
    repair(friends, garments, friendList as Record<string, unknown>[])
  } else {
    finished = false
  }
  // A finished cycle is one whose friends have all walked off: the next three wait at the gate and none is in the yard.
  if (friends.some((friend) => friend.where !== 'gate')) finished = false

  const water = isRecord(raw.water) ? { cloud: tenths(raw.water.cloud), level: Math.max(2, tenths(raw.water.level, 10)) } : { cloud: tenths(raw.water), level: 10 }
  const cat: SavedCat = isRecord(raw.cat) && ['fence', 'board', 'rail', 'line'].includes(raw.cat.at as string)
    ? { at: raw.cat.at as SavedCat['at'], n: place(raw.cat.n), wet: tenths(raw.cat.wet), fluff: tenths(raw.cat.fluff) }
    : { ...fresh.cat }
  const soap: SavedSoap = isRecord(raw.soap) && ['dish', 'tub', 'grass'].includes(raw.soap.at as string) ? { at: raw.soap.at as SavedSoap['at'], n: place(raw.soap.n) } : { ...fresh.soap }
  // One thing lies on the board, hangs on the rail or hangs at each place of the line: the garments were read first, and the cat gives way.
  const taken = (at: At, n: number) => garments.some((garment) => garment.at === at && (at !== 'line' || garment.n === n))
  if ((cat.at === 'board' && taken('board', 0)) || (cat.at === 'rail' && taken('rail', 0)) || (cat.at === 'line' && taken('line', cat.n))) cat.at = 'fence'

  const pegList = Array.isArray(raw.pegs) ? raw.pegs : []
  const hillList = Array.isArray(raw.hill) ? raw.hill : []
  const hill: SavedLeaver[] = []
  for (const saved of hillList) {
    if (!isRecord(saved) || !FRIEND_KINDS.includes(saved.kind as FriendKind) || !KINDS.includes(saved.garment as Kind)) continue
    const kind = saved.kind as FriendKind, garment = saved.garment as Kind
    hill.push({ kind, colour: colourOf(saved.colour), garment, on: wearOf(saved.on, kind, garment), mud: encodeMud(decodeMud(saved.mud, garment) ?? cleanMud()), wet: tenths(saved.wet), suds: tenths(saved.suds) })
  }

  return {
    ...base,
    finished,
    seed: typeof raw.seed === 'number' && Number.isFinite(raw.seed) ? raw.seed >>> 0 : fresh.seed,
    friends,
    garments,
    water,
    cat,
    soap,
    pegs: Array.from({ length: PEGS }, (_, i) => pegList[i] === true),
    hill: hill.slice(-FRIENDS),
  }
}

/**
 * Puts three friends and three garments back into a state the game can be in: one thing on the board, on the rail
 * and at each place of the line; a garment is held only by its own friend, and only while that friend has not
 * handed it over; a friend wears one garment at most and only in the yard. What does not fit goes into the tub,
 * which always has room.
 */
function repair(friends: SavedFriend[], garments: SavedGarment[], rawFriends: readonly Record<string, unknown>[]): void {
  // Friends who walk off are never saved as such: when they set off, the next three are saved in their place. The tub
  // holds one friend.
  let tubbed = false
  for (const friend of friends) {
    if (friend.where === 'tub') { if (tubbed) friend.where = 'yard'; tubbed = true }
  }
  let board = false, rail = false
  const line = [false, false, false], worn = [false, false, false]
  garments.forEach((garment, i) => {
    const owner = friends[garment.owner]
    if (garment.at === 'held' && owner.where === 'tub') garment.at = 'tub'
    if (garment.at !== 'held' && owner.where === 'gate') garment.at = 'held'
    if (garment.at === 'board') { if (board) garment.at = 'tub'; board = true }
    if (garment.at === 'rail') { if (rail) garment.at = 'tub'; rail = true }
    if (garment.at === 'line') { if (line[garment.n]) garment.at = 'tub'; else line[garment.n] = true }
    if (garment.at === 'friend') {
      const wearer = friends[garment.n]
      if (worn[garment.n] || wearer.where !== 'yard') garment.at = 'tub'
      else {
        worn[garment.n] = true
        wearer.wears = i
        wearer.on = wearOf(rawFriends[garment.n].on, wearer.kind, garment.kind)
      }
    }
    if (garment.at !== 'line') garment.pegs = [false, false]
    if (garment.at === 'tub' || garment.at === 'board') garment.wet = 10
  })
}

export function serialize(save: Save): Save {
  return {
    ...writeBase(save),
    seed: save.seed >>> 0,
    friends: save.friends.map((friend) => ({ kind: friend.kind, colour: friend.colour, where: friend.where, hide: friend.hide, wet: tenths(friend.wet), wears: friend.wears, on: friend.on })),
    garments: save.garments.map((garment) => ({ kind: garment.kind, owner: garment.owner, at: garment.at, n: garment.n, x: garment.x, y: garment.y, mud: garment.mud, wet: tenths(garment.wet), suds: tenths(garment.suds), pegs: [garment.pegs[0], garment.pegs[1]] })),
    water: { cloud: tenths(save.water.cloud), level: tenths(save.water.level, 10) },
    cat: { ...save.cat },
    soap: { ...save.soap },
    pegs: save.pegs.slice(0, PEGS),
    hill: save.hill.map((leaver) => ({ ...leaver })),
  }
}
