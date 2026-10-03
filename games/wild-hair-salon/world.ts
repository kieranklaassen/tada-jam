import { cellOf, type ActionId, type Cell, type ObjectId } from './grid'
import { MAX_CLIPPINGS, MIN_CLIPPING, MIN_LEN, TAIL_LEN, toLength } from './rules'
import type { CustomerId } from './tastes'

// The salon as a model: who is in it, how long everything is and where the
// loose things lie, and what each touch of the grid does to that. No renderer,
// no clock and no chance: the same salon and the same touch always give the
// same salon back. Every function returns a new salon and leaves the old one
// as it was.

export type Seat = 'beside' | 'across'

export const RIBBON_PLACES = ['peg', 'lock', 'model', 'mane', 'face-chair', 'face-friend', 'floor'] as const
export type RibbonAt = (typeof RIBBON_PLACES)[number]
export type Ribbon = { len: number; at: RibbonAt }

export const CLIPPING_PLACES = ['floor', 'chair', 'friend'] as const
export type ClippingOn = (typeof CLIPPING_PLACES)[number]
/** A cut piece. `x` is its place along the floor, 0 at the door side and 100 at the bench side; on a face it is not used. */
export type Clipping = { len: number; hue: CustomerId | 'ribbon'; on: ClippingOn; x: number }

/** The three things a character shows once. */
export type Shown = { snip: boolean; pull: boolean; ribbon: boolean }

export type Salon = {
  chair: CustomerId
  friend: CustomerId
  waiting: readonly [CustomerId, CustomerId]
  seed: number
  /** The customer's lock and the friend's, in whole steps. */
  lock: number
  model: number
  seat: Seat
  cape: 'on' | 'off'
  mane: readonly number[]
  /** Not in the salon until it has first been shown. */
  ribbon: Ribbon | null
  clippings: readonly Clipping[]
  shown: Shown
}

export type Target =
  | { object: 'lock' }
  | { object: 'model' }
  | { object: 'tuft'; index: number }
  | { object: 'ribbon' }
  | { object: 'clipping'; index: number }
  | { object: 'face'; who: 'chair' | 'friend' }

/** Where a carried clipping is let go. */
export type Drop = { on: 'floor'; x: number } | { on: 'chair' } | { on: 'friend' }

export type Deed =
  /** `to` is the length the free end was drawn out to. For a clipping, `drop` is where it was let go. */
  | { action: 'pull'; to?: number; drop?: Drop }
  /** `at` is how far from the root the scissors crossed. */
  | { action: 'snip'; at: number }
  | { action: 'poke' }
  | { action: 'ruffle' }
  | { action: 'ribbon' }

export type Done = {
  salon: Salon
  /** The cell of the grid that answered, or nothing when the touch met nothing: scissors that passed below a free end, a thing that is not there. */
  cell: Cell | null
  /** The hair is not under the cape, so it sprang back to the length it had. */
  sprangBack: boolean
  /** The length that sets the pitch of this answer, where the cell's voice follows a length. */
  rings: number | null
}

const nothing = (salon: Salon): Done => ({ salon, cell: null, sprangBack: false, rings: null })
const answer = (salon: Salon, object: ObjectId, action: ActionId, rings: number | null = null, sprangBack = false): Done => ({ salon, cell: cellOf(object, action), sprangBack, rings })

/** Where along the floor a piece cut from this thing lands. */
function landsAt(salon: Salon, from: 'lock' | 'model' | 'ribbon'): number {
  const base = from === 'lock' ? 46 : from === 'model' ? (salon.seat === 'beside' ? 56 : 84) : 70
  // Pieces fan out a little, by how many already lie there, so they do not pile on one spot.
  return base + ((salon.clippings.length * 7) % 13) - 6
}

/** Adds a piece. Past the most the salon keeps, the oldest piece on the floor turns to fluff; a face keeps what it wears. */
export function withClipping(salon: Salon, piece: Clipping): Salon {
  const clippings = [...salon.clippings, piece]
  if (clippings.length > MAX_CLIPPINGS) {
    const oldestOnFloor = clippings.findIndex((c) => c.on === 'floor')
    clippings.splice(oldestOnFloor >= 0 ? oldestOnFloor : 0, 1)
  }
  return { ...salon, clippings }
}

/** A strip cut where the scissors crossed. Returns the length left and the length of the piece, or nothing when they passed below the free end. */
function cut(length: number, at: number): { left: number; piece: number } | null {
  if (!Number.isFinite(at) || at >= length) return null
  const left = Math.max(MIN_LEN, Math.round(at))
  return left >= length ? null : { left, piece: length - left }
}

/** One touch of the grid on the salon. */
export function act(salon: Salon, target: Target, deed: Deed): Done {
  switch (target.object) {
    case 'lock': return onLock(salon, deed)
    case 'model': return onModel(salon, deed)
    case 'tuft': return onTuft(salon, target.index, deed)
    case 'ribbon': return onRibbon(salon, deed)
    case 'clipping': return onClipping(salon, target.index, deed)
    case 'face': return onFace(salon, target.who, deed)
  }
}

function hang(salon: Salon, at: RibbonAt): Salon | null {
  return salon.ribbon ? { ...salon, ribbon: { ...salon.ribbon, at } } : null
}

function onLock(salon: Salon, deed: Deed): Done {
  const caped = salon.cape === 'on'
  switch (deed.action) {
    case 'pull': {
      const to = toLength(deed.to ?? salon.lock)
      // Hair that is not under the cape springs back; under it, a pull only ever makes a lock longer.
      if (!caped || to <= salon.lock) return answer(salon, 'lock', 'pull', salon.lock, !caped)
      return answer({ ...salon, lock: to }, 'lock', 'pull', to)
    }
    case 'snip': {
      const made = cut(salon.lock, deed.at)
      if (!made) return nothing(salon)
      const piece: Clipping = { len: made.piece, hue: salon.chair, on: 'floor', x: landsAt(salon, 'lock') }
      if (!caped) return answer(withClipping(salon, piece), 'lock', 'snip', salon.lock, true)
      return answer(withClipping({ ...salon, lock: made.left }, piece), 'lock', 'snip', made.left)
    }
    case 'poke': return answer(salon, 'lock', 'poke', salon.lock)
    case 'ruffle': return answer(salon, 'lock', 'ruffle')
    case 'ribbon': {
      const hung = hang(salon, 'lock')
      return hung ? answer(hung, 'lock', 'ribbon') : nothing(salon)
    }
  }
}

function onModel(salon: Salon, deed: Deed): Done {
  switch (deed.action) {
    // The model is never under the cape: it always springs back to its own length.
    case 'pull': return answer(salon, 'model', 'pull', salon.model, true)
    case 'snip': {
      const made = cut(salon.model, deed.at)
      if (!made) return nothing(salon)
      return answer(withClipping(salon, { len: made.piece, hue: salon.friend, on: 'floor', x: landsAt(salon, 'model') }), 'model', 'snip', salon.model, true)
    }
    case 'poke': return answer(salon, 'model', 'poke', salon.model)
    case 'ruffle': return answer(salon, 'model', 'ruffle')
    case 'ribbon': {
      const hung = hang(salon, 'model')
      return hung ? answer(hung, 'model', 'ribbon') : nothing(salon)
    }
  }
}

function onTuft(salon: Salon, index: number, deed: Deed): Done {
  const length = salon.mane[index]
  if (length === undefined) return nothing(salon)
  const caped = salon.cape === 'on'
  const set = (to: number): Salon => ({ ...salon, mane: salon.mane.map((steps, i) => (i === index ? to : steps)) })
  switch (deed.action) {
    case 'pull': {
      const to = toLength(deed.to ?? length)
      if (!caped || to <= length) return answer(salon, 'tuft', 'pull', length, !caped)
      return answer(set(to), 'tuft', 'pull', to)
    }
    case 'snip': {
      const made = cut(length, deed.at)
      if (!made) return nothing(salon)
      // A snipped tuft gives fluff, which floats off, and no piece for the floor.
      return caped ? answer(set(made.left), 'tuft', 'snip', made.left) : answer(salon, 'tuft', 'snip', length, true)
    }
    case 'poke': return answer(salon, 'tuft', 'poke', length)
    case 'ruffle': return answer(salon, 'tuft', 'ruffle')
    case 'ribbon': {
      const hung = hang(salon, 'mane')
      return hung ? answer(hung, 'tuft', 'ribbon') : nothing(salon)
    }
  }
}

function onRibbon(salon: Salon, deed: Deed): Done {
  const ribbon = salon.ribbon
  if (!ribbon) return nothing(salon)
  switch (deed.action) {
    case 'pull': {
      const to = toLength(deed.to ?? ribbon.len)
      if (to <= ribbon.len) return answer(salon, 'ribbon', 'pull', ribbon.len)
      return answer({ ...salon, ribbon: { ...ribbon, len: to } }, 'ribbon', 'pull', to)
    }
    case 'snip': {
      const made = cut(ribbon.len, deed.at)
      if (!made) return nothing(salon)
      const piece: Clipping = { len: made.piece, hue: 'ribbon', on: 'floor', x: landsAt(salon, 'ribbon') }
      return answer(withClipping({ ...salon, ribbon: { ...ribbon, len: made.left } }, piece), 'ribbon', 'snip', made.left)
    }
    case 'poke': return answer(salon, 'ribbon', 'poke', ribbon.len)
    case 'ruffle': return answer(salon, 'ribbon', 'ruffle')
    case 'ribbon': return answer({ ...salon, ribbon: { ...ribbon, at: 'peg' } }, 'ribbon', 'ribbon')
  }
}

function onClipping(salon: Salon, index: number, deed: Deed): Done {
  const piece = salon.clippings[index]
  if (!piece) return nothing(salon)
  const others = (): Clipping[] => salon.clippings.filter((_, i) => i !== index)
  const swap = (next: Clipping): Salon => ({ ...salon, clippings: salon.clippings.map((c, i) => (i === index ? next : c)) })
  const onFloor = (x: number): number => Math.max(0, Math.min(100, Math.round(x)))
  switch (deed.action) {
    case 'pull': {
      const drop = deed.drop
      if (!drop) return answer(salon, 'clipping', 'pull')
      return answer(swap(drop.on === 'floor' ? { ...piece, on: 'floor', x: onFloor(drop.x) } : { ...piece, on: drop.on }), 'clipping', 'pull')
    }
    case 'snip': {
      // Too small to cut in two: it turns to fluff and blows away.
      if (piece.len < MIN_CLIPPING * 2) return answer({ ...salon, clippings: others() }, 'clipping', 'snip')
      const half = Math.floor(piece.len / 2)
      const halves: Clipping[] = [{ ...piece, on: 'floor', len: half, x: onFloor(piece.x - 4) }, { ...piece, on: 'floor', len: piece.len - half, x: onFloor(piece.x + 4) }]
      let next: Salon = { ...salon, clippings: others() }
      for (const part of halves) next = withClipping(next, part)
      return answer(next, 'clipping', 'snip')
    }
    // A poke makes it hop; one that was stuck on a face hops off to the floor.
    case 'poke': return answer(swap({ ...piece, on: 'floor', x: onFloor(piece.x + (index % 2 === 0 ? 6 : -6)) }), 'clipping', 'poke')
    case 'ruffle': return answer({ ...salon, clippings: others() }, 'clipping', 'ruffle')
    case 'ribbon': {
      const hung = hang(salon, 'floor')
      return hung ? answer(hung, 'clipping', 'ribbon') : nothing(salon)
    }
  }
}

function onFace(salon: Salon, who: 'chair' | 'friend', deed: Deed): Done {
  if (deed.action !== 'ribbon') return answer(salon, 'face', deed.action)
  const hung = hang(salon, who === 'chair' ? 'face-chair' : 'face-friend')
  return hung ? answer(hung, 'face', 'ribbon') : nothing(salon)
}

/** The child sent the friend to the other seat. Whatever hangs beside the model goes with it. */
export function seatFriend(salon: Salon, seat: Seat): Salon {
  return salon.seat === seat ? salon : { ...salon, seat }
}

/** The ribbon arrives in the salon, on its peg, as long as a tail. It arrives once. */
export function withRibbon(salon: Salon): Salon {
  return salon.ribbon ? salon : { ...salon, ribbon: { len: TAIL_LEN, at: 'peg' } }
}
