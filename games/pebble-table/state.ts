import { inBowl, plateOf } from './feeding'
import { readParts, type Part } from './parts'
import { panOf } from './scale'
import {
  BAG_MOUTH,
  clampToTable,
  FEEDING,
  MAT_CENTER,
  MAT_KEYS,
  RADIUS_BY_QUARTERS,
  type MatKey,
  type Quarters,
} from './layout'

// The table's saved shape (KTD4). Every stone is always in exactly one
// place — the bag, the table, or parked with a put-away mat — and amounts
// are counted in quarter-stones so knife cuts stay exact.

export const STATE_VERSION = 1
export const SEAT_COUNT = FEEDING.seats.length

export type Piece = { id: number; q: Quarters; x: number; y: number }

export type TableState = {
  v: typeof STATE_VERSION
  total: number
  bag: number
  pieces: Piece[]
  liveMat: MatKey
  shelf: MatKey[]
  parked: Record<MatKey, Piece[]>
  seats: boolean[]
  nextId: number
  /** Loose parts out of their jars; only while the scale is out. */
  parts: Part[]
}

export function bagStonesForAge(childAge: number | null): number {
  return childAge !== null && childAge <= 3 ? 5 : 10
}

export function defaultMatForAge(childAge: number | null): MatKey {
  return childAge !== null && childAge >= 5 ? 'scale' : 'feeding'
}

export function defaultTable(childAge: number | null): TableState {
  const total = bagStonesForAge(childAge) * 4
  const liveMat = defaultMatForAge(childAge)
  return {
    v: STATE_VERSION,
    total,
    bag: total,
    pieces: [],
    liveMat,
    shelf: [liveMat, ...MAT_KEYS.filter((key) => key !== liveMat)],
    parked: { feeding: [], scale: [], door: [] },
    seats: FEEDING.seats.map((_, index) => index === 1 || index === 4),
    nextId: 1,
    parts: [],
  }
}

export function piecesTotal(pieces: readonly Piece[]): number {
  return pieces.reduce((sum, piece) => sum + piece.q, 0)
}

export function accountedTotal(state: TableState): number {
  return state.bag + piecesTotal(state.pieces) + MAT_KEYS.reduce((sum, key) => sum + piecesTotal(state.parked[key]), 0)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function readPieces(raw: unknown, seen: Set<number>): Piece[] {
  if (!Array.isArray(raw)) return []
  const pieces: Piece[] = []
  for (const item of raw) {
    if (!isRecord(item)) continue
    const id = item.id
    const q = item.q
    if (typeof id !== 'number' || !Number.isInteger(id) || id < 1 || seen.has(id)) continue
    if (q !== 1 && q !== 2 && q !== 4) continue
    const margin = RADIUS_BY_QUARTERS[q]
    const at = clampToTable({ x: finite(item.x, MAT_CENTER.x), y: finite(item.y, MAT_CENTER.y) }, margin)
    seen.add(id)
    pieces.push({ id, q, x: Math.round(at.x), y: Math.round(at.y) })
  }
  return pieces
}

/** Saved state is untrusted: repair what can be repaired, default the rest. */
export function deserialize(raw: unknown, childAge: number | null): TableState {
  const fallback = defaultTable(childAge)
  if (!isRecord(raw) || raw.v !== STATE_VERSION) return fallback

  const total = finite(raw.total, fallback.total)
  if (!Number.isInteger(total) || total < 4 || total > 80 || total % 4 !== 0) return fallback

  const seen = new Set<number>()
  const pieces = readPieces(raw.pieces, seen)
  const parkedRaw = isRecord(raw.parked) ? raw.parked : {}
  const parked = { feeding: readPieces(parkedRaw.feeding, seen), scale: readPieces(parkedRaw.scale, seen), door: readPieces(parkedRaw.door, seen) }

  const liveMat = (MAT_KEYS as readonly unknown[]).includes(raw.liveMat) ? (raw.liveMat as MatKey) : fallback.liveMat
  const shelfRaw = Array.isArray(raw.shelf) ? raw.shelf.filter((key): key is MatKey => (MAT_KEYS as readonly unknown[]).includes(key)) : []
  const shelf = [...new Set([...shelfRaw, ...fallback.shelf])]
  const seats = FEEDING.seats.map((_, index) => (Array.isArray(raw.seats) ? raw.seats[index] === true : fallback.seats[index]))

  const state: TableState = {
    v: STATE_VERSION,
    total,
    bag: 0,
    pieces,
    liveMat,
    shelf,
    parked,
    seats,
    nextId: 1,
    parts: [],
  }
  if (parked[liveMat].length > 0) {
    state.pieces.push(...parked[liveMat])
    parked[liveMat] = []
  }
  repairTotal(state)
  const maxId = Math.max(0, ...allPieces(state).map((piece) => piece.id))
  const savedNext = Math.floor(finite(raw.nextId, 1))
  state.nextId = Math.max(savedNext > 0 && savedNext < 1_000_000_000 ? savedNext : 1, maxId + 1)
  state.parts = liveMat === 'scale' ? readParts(raw.parts, () => state.nextId++) : []
  return state
}

export function allPieces(state: TableState): Piece[] {
  return [...state.pieces, ...MAT_KEYS.flatMap((key) => state.parked[key])]
}

/** Keep bag + table + parked equal to the total: drop extras, refill the bag. */
export function repairTotal(state: TableState): void {
  let placed = piecesTotal(state.pieces) + MAT_KEYS.reduce((sum, key) => sum + piecesTotal(state.parked[key]), 0)
  while (placed > state.total) {
    const from = MAT_KEYS.find((key) => state.parked[key].length > 0)
    const removed = from ? state.parked[from].pop() : state.pieces.pop()
    if (!removed) break
    placed -= removed.q
  }
  state.bag = state.total - placed
}

export function serialize(state: TableState): TableState {
  const round = (pieces: Piece[]) => pieces.map((p) => ({ id: p.id, q: p.q, x: Math.round(p.x), y: Math.round(p.y) }))
  return {
    ...state,
    pieces: round(state.pieces),
    parked: { feeding: round(state.parked.feeding), scale: round(state.parked.scale), door: round(state.parked.door) },
    shelf: [...state.shelf],
    seats: [...state.seats],
    parts: state.parts.map((part) => ({ id: part.id, kind: part.kind, x: Math.round(part.x), y: Math.round(part.y) })),
  }
}

function newPiece(state: TableState, q: Quarters, x: number, y: number): Piece {
  const piece = { id: state.nextId, q, x, y }
  state.nextId += 1
  return piece
}

function largestAvailable(amount: number): Quarters | null {
  if (amount >= 4) return 4
  if (amount >= 2) return 2
  if (amount >= 1) return 1
  return null
}

/** Everything in the bag comes out at the mouth; whole stones first. */
export function tipBag(state: TableState): Piece[] {
  const spilled: Piece[] = []
  let q = largestAvailable(state.bag)
  while (q !== null) {
    const piece = newPiece(state, q, BAG_MOUTH.x, BAG_MOUTH.y)
    state.bag -= q
    state.pieces.push(piece)
    spilled.push(piece)
    q = largestAvailable(state.bag)
  }
  return spilled
}

/** One piece out of the bag into the child's fingers. */
export function pullFromBag(state: TableState, at: { x: number; y: number }): Piece | null {
  const q = largestAvailable(state.bag)
  if (q === null) return null
  const piece = newPiece(state, q, at.x, at.y)
  state.bag -= q
  state.pieces.push(piece)
  return piece
}

export function returnToBag(state: TableState, id: number): boolean {
  const index = state.pieces.findIndex((piece) => piece.id === id)
  if (index < 0) return false
  const [piece] = state.pieces.splice(index, 1)
  state.bag += piece.q
  return true
}

/** Whole → two halves, half → two quarters, side by side at the same spot. */
export function cutPiece(state: TableState, id: number): Piece[] {
  const index = state.pieces.findIndex((piece) => piece.id === id)
  if (index < 0) return []
  const piece = state.pieces[index]
  if (piece.q === 1) return []
  const q = (piece.q / 2) as Quarters
  const offset = RADIUS_BY_QUARTERS[q] + 2
  const halves = [newPiece(state, q, piece.x - offset, piece.y), newPiece(state, q, piece.x + offset, piece.y)]
  state.pieces.splice(index, 1, ...halves)
  return halves
}

/** Whether a piece is part of a mat's arrangement: on a pan, or on a plate or in the bowl. */
export function onMatParts(mat: MatKey, piece: Piece): boolean {
  switch (mat) {
    case 'scale':
      return panOf(piece) !== null
    case 'feeding':
      return inBowl(piece) || plateOf(piece) !== null
    case 'door':
      return false
    default: {
      const unknown: never = mat
      return unknown
    }
  }
}

/** Put the live mat away with its arrangement, and bring `next` out with its own. Loose stones stay on the table. */
export function swapMat(state: TableState, next: MatKey): void {
  if (next === state.liveMat) return
  const outgoing = state.liveMat
  if (outgoing === 'scale') state.parts = []
  const staying: Piece[] = []
  for (const piece of state.pieces) {
    if (onMatParts(outgoing, piece)) state.parked[outgoing].push(piece)
    else staying.push(piece)
  }
  state.pieces = [...staying, ...state.parked[next]]
  state.parked[next] = []
  state.liveMat = next
}
