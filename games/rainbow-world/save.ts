import { BARE_MAT_FROM_AGE } from './config'
import { inField, toField } from './layout'
import { PIECES, PIECE_IDS, isPieceId, type PieceId } from './pieces'
import { deserialize as readState, freshState, isReadable, isRecord, serialize as writeState, type GameState } from './state'
import { firstPlaces, type Places } from './thing'

// The whole saved state: the template's fields (state.ts) and the mat as it lies, in the shape the design sheet
// gives, field for field.
//
// Nothing is saved in the air, in the hand or in the middle of a scene: `World.places` gives every thing where
// it rests, and a scene puts its outcome there before its first beat.

export type SavedPiece = {
  at: 'home' | 'mat' | 'basket'
  /** Its foot on the mat, in whole stage units. Read only while `at` is `mat`. */
  x: number
  y: number
  /** What it rests on, or null for the bare mat. */
  on: PieceId | null
  turned: boolean
}

export type Save = GameState & {
  basket: 'upright' | 'tipped'
  pieces: Record<PieceId, SavedPiece>
}

/** Whether a first visit at this age finds the smallest doll already on the mat: the youngest, and a child of no known age. */
export function startsWithADoll(childAge: number | null): boolean {
  return childAge === null || childAge < BARE_MAT_FROM_AGE
}

function savedPieces(places: Places): Record<PieceId, SavedPiece> {
  return Object.fromEntries(PIECE_IDS.map((id) => {
    const rest = places[id], onMat = rest.at === 'mat'
    return [id, { at: rest.at, x: onMat ? Math.round(rest.x) : 0, y: onMat ? Math.round(rest.y) : 0, on: onMat ? rest.on : null, turned: rest.turned }]
  })) as Record<PieceId, SavedPiece>
}

export function freshSave(childAge: number | null): Save {
  return { ...freshState(childAge), basket: 'upright', pieces: savedPieces(firstPlaces(startsWithADoll(childAge))) }
}

function readPiece(raw: unknown, id: PieceId, fresh: SavedPiece): SavedPiece {
  if (!isRecord(raw)) return fresh
  const at = raw.at === 'home' || raw.at === 'mat' || raw.at === 'basket' ? raw.at : fresh.at
  const turned = typeof raw.turned === 'boolean' ? raw.turned : fresh.turned
  if (at !== 'mat') return { at, x: 0, y: 0, on: null, turned }
  // A place on the mat that is damaged or off the field is brought to the nearest place on it.
  const good = typeof raw.x === 'number' && typeof raw.y === 'number' && Number.isFinite(raw.x) && Number.isFinite(raw.y)
  if (!good) return { ...fresh, turned }
  const spot = inField(raw.x as number, raw.y as number) ? { x: raw.x as number, y: raw.y as number } : toField(raw.x as number, raw.y as number)
  return { at, x: Math.round(spot.x), y: Math.round(spot.y), on: isPieceId(raw.on) && raw.on !== id ? raw.on : null, turned }
}

/** Saved state is untrusted: anything unreadable gives a fresh visit, and inside a record each field is repaired by itself. */
export function deserialize(raw: unknown, childAge: number | null = null): Save {
  const fresh = freshSave(childAge)
  if (!isReadable(raw)) return fresh
  const pieces = isRecord(raw.pieces) ? raw.pieces : {}
  return {
    ...readState(raw, childAge),
    // Open play has no cycle to finish, whatever the slot says.
    finished: false,
    basket: raw.basket === 'tipped' ? 'tipped' : 'upright',
    pieces: Object.fromEntries(PIECE_IDS.map((id) => [id, readPiece(pieces[id], id, fresh.pieces[id])])) as Record<PieceId, SavedPiece>,
  }
}

export function serialize(save: Save): Save {
  return { ...writeState(save), basket: save.basket, pieces: Object.fromEntries(PIECE_IDS.map((id) => [id, { ...save.pieces[id] }])) as Record<PieceId, SavedPiece> }
}

/** The mat as the world takes it. What rests on what is checked there (stack.ts): a pair that cannot be stands on the bare mat. */
export function placesOf(save: Save): Places {
  return Object.fromEntries(PIECE_IDS.map((id) => {
    const piece = save.pieces[id]
    return [id, piece.at === 'mat' ? { ...piece } : { at: piece.at, x: PIECES[id].home.x, y: PIECES[id].home.y, on: null, turned: piece.turned }]
  })) as Places
}

/** The save with the mat and the basket as the world now has them at rest. */
export function withPlaces(save: Save, places: Places, basket: 'upright' | 'tipped'): Save {
  return { ...save, basket, pieces: savedPieces(places) }
}
