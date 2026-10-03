import { cellOf, type ActionId, type Cell, type ObjectId } from './grid'
import { MAX_CLIPPINGS, MIN_CLIPPING, MIN_LEN, TAIL_LEN, toLength } from './rules'
import type { CustomerId } from './tastes'

// The salon as a model: who is in it, how long everything is and where the
// loose things lie, and what each touch of the grid does to that. No renderer,
// no clock and no chance: the same salon and the same touch always give the
// same salon back. Every function returns a new salon and leaves the old one
// as it was.

export type Seat = 'beside' | 'across'
/** One of the two in the salon: the customer in the chair, or its friend. */
export type Who = 'chair' | 'friend'

/** Where the ribbon is, exactly enough to find it there again. */
export type RibbonPlace =
  | { at: 'peg' }
  | { at: 'lock' }
  | { at: 'model' }
  /** Tied as a bow on one of the tufts of the mane. */
  | { at: 'mane'; tuft: number }
  /** Round a face as a blindfold. */
  | { at: 'face'; who: Who }
  /** Lying on the floor, at a place along it. */
  | { at: 'floor'; x: number }
export const RIBBON_PLACES = ['peg', 'lock', 'model', 'mane', 'face', 'floor'] as const
export type Ribbon = { len: number } & RibbonPlace

/** The spots on a face a clipping sticks to. */
export const FACE_SPOTS = ['brow', 'lip', 'chin'] as const
export type FaceSpot = (typeof FACE_SPOTS)[number]

/** Where a cut piece lies: at a place along the floor (0 at the door side, 100 at the bench side), or stuck on a face. */
export type ClippingPlace = { on: 'floor'; x: number } | { on: 'face'; who: Who; spot: FaceSpot }
/** A cut piece of hair or of ribbon. */
export type Clipping = { len: number; hue: CustomerId | 'ribbon' } & ClippingPlace

/** The three things a character shows once. */
export type Shown = { snip: boolean; pull: boolean; ribbon: boolean }

export type Salon = {
  /** Who is in the chair and who is the model. Nobody for both on a first visit, before the first pair has come in. */
  chair: CustomerId | null
  friend: CustomerId | null
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
  | { object: 'face'; who: Who }

export type Deed =
  /** `to` is the length the free end was drawn out to. For a clipping, `drop` is where it was let go. */
  | { action: 'pull'; to?: number; drop?: ClippingPlace }
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
const alongFloor = (x: number): number => (Number.isFinite(x) ? Math.max(0, Math.min(100, Math.round(x))) : 50)

/** Where along the floor the things of the salon stand, for what falls from them. */
export function floorUnder(salon: Salon, thing: 'lock' | 'model' | 'ribbon' | Who): number {
  if (thing === 'lock' || thing === 'chair') return 46
  if (thing === 'ribbon') return 70
  return salon.seat === 'beside' ? 56 : 84
}

/** Where a piece cut from this thing lands. Pieces fan out a little, by how many already lie there, so they do not pile on one spot. */
function landsAt(salon: Salon, from: 'lock' | 'model' | 'ribbon'): number {
  return floorUnder(salon, from) + ((salon.clippings.length * 7) % 13) - 6
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

/** One touch of the grid on the salon. With nobody in the chair there is no lock, no model, no mane and no face to touch. */
export function act(salon: Salon, target: Target, deed: Deed): Done {
  const pair = salon.chair !== null && salon.friend !== null ? { chair: salon.chair, friend: salon.friend } : null
  switch (target.object) {
    case 'lock': return pair ? onLock(salon, pair.chair, deed) : nothing(salon)
    case 'model': return pair ? onModel(salon, pair.friend, deed) : nothing(salon)
    case 'tuft': return pair ? onTuft(salon, target.index, deed) : nothing(salon)
    case 'ribbon': return onRibbon(salon, deed)
    case 'clipping': return onClipping(salon, target.index, deed)
    case 'face': return pair ? onFace(salon, target.who, deed) : nothing(salon)
  }
}

function hang(salon: Salon, place: RibbonPlace): Salon | null {
  return salon.ribbon ? { ...salon, ribbon: { len: salon.ribbon.len, ...place } } : null
}

function onLock(salon: Salon, chair: CustomerId, deed: Deed): Done {
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
      const piece: Clipping = { len: made.piece, hue: chair, on: 'floor', x: landsAt(salon, 'lock') }
      if (!caped) return answer(withClipping(salon, piece), 'lock', 'snip', salon.lock, true)
      return answer(withClipping({ ...salon, lock: made.left }, piece), 'lock', 'snip', made.left)
    }
    case 'poke': return answer(salon, 'lock', 'poke', salon.lock)
    case 'ruffle': return answer(salon, 'lock', 'ruffle')
    case 'ribbon': {
      const hung = hang(salon, { at: 'lock' })
      return hung ? answer(hung, 'lock', 'ribbon') : nothing(salon)
    }
  }
}

function onModel(salon: Salon, friend: CustomerId, deed: Deed): Done {
  switch (deed.action) {
    // The model is never under the cape: it always springs back to its own length.
    case 'pull': return answer(salon, 'model', 'pull', salon.model, true)
    case 'snip': {
      const made = cut(salon.model, deed.at)
      if (!made) return nothing(salon)
      return answer(withClipping(salon, { len: made.piece, hue: friend, on: 'floor', x: landsAt(salon, 'model') }), 'model', 'snip', salon.model, true)
    }
    case 'poke': return answer(salon, 'model', 'poke', salon.model)
    case 'ruffle': return answer(salon, 'model', 'ruffle')
    case 'ribbon': {
      const hung = hang(salon, { at: 'model' })
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
      const hung = hang(salon, { at: 'mane', tuft: index })
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
      // The offcut lands under the ribbon: where the ribbon lies if it is on the floor, and under its peg otherwise.
      const x = ribbon.at === 'floor' ? ribbon.x : landsAt(salon, 'ribbon')
      const piece: Clipping = { len: made.piece, hue: 'ribbon', on: 'floor', x: alongFloor(x) }
      return answer(withClipping({ ...salon, ribbon: { ...ribbon, len: made.left } }, piece), 'ribbon', 'snip', made.left)
    }
    case 'poke': return answer(salon, 'ribbon', 'poke', ribbon.len)
    case 'ruffle': return answer(salon, 'ribbon', 'ruffle')
    case 'ribbon': return answer({ ...salon, ribbon: { len: ribbon.len, at: 'peg' } }, 'ribbon', 'ribbon')
  }
}

function onClipping(salon: Salon, index: number, deed: Deed): Done {
  const piece = salon.clippings[index]
  if (!piece) return nothing(salon)
  const others = (): Clipping[] => salon.clippings.filter((_, i) => i !== index)
  const swap = (next: Clipping): Salon => ({ ...salon, clippings: salon.clippings.map((c, i) => (i === index ? next : c)) })
  const bare = { len: piece.len, hue: piece.hue }
  // Where it is on the floor, or where it would fall to from the face it is on.
  const x = piece.on === 'floor' ? piece.x : floorUnder(salon, piece.who)
  switch (deed.action) {
    case 'pull': {
      const drop = deed.drop
      if (!drop) return answer(salon, 'clipping', 'pull')
      // A piece can be stuck on a face only while somebody is there to wear it.
      if (drop.on === 'face') return salon.chair === null ? answer(salon, 'clipping', 'pull') : answer(swap({ ...bare, on: 'face', who: drop.who, spot: drop.spot }), 'clipping', 'pull')
      return answer(swap({ ...bare, on: 'floor', x: alongFloor(drop.x) }), 'clipping', 'pull')
    }
    case 'snip': {
      // Too small to cut in two: it turns to fluff and blows away.
      if (piece.len < MIN_CLIPPING * 2) return answer({ ...salon, clippings: others() }, 'clipping', 'snip')
      const half = Math.floor(piece.len / 2)
      let next: Salon = { ...salon, clippings: others() }
      next = withClipping(next, { hue: piece.hue, len: half, on: 'floor', x: alongFloor(x - 4) })
      next = withClipping(next, { hue: piece.hue, len: piece.len - half, on: 'floor', x: alongFloor(x + 4) })
      return answer(next, 'clipping', 'snip')
    }
    // A poke makes it hop; one that was stuck on a face hops off to the floor.
    case 'poke': return answer(swap({ ...bare, on: 'floor', x: alongFloor(x + (index % 2 === 0 ? 6 : -6)) }), 'clipping', 'poke')
    case 'ruffle': return answer({ ...salon, clippings: others() }, 'clipping', 'ruffle')
    case 'ribbon': {
      // The ribbon lies down beside a piece on the floor; brought to a piece on a face, it goes round that face.
      const hung = hang(salon, piece.on === 'floor' ? { at: 'floor', x: piece.x } : { at: 'face', who: piece.who })
      return hung ? answer(hung, 'clipping', 'ribbon') : nothing(salon)
    }
  }
}

function onFace(salon: Salon, who: Who, deed: Deed): Done {
  if (deed.action !== 'ribbon') return answer(salon, 'face', deed.action)
  const hung = hang(salon, { at: 'face', who })
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
