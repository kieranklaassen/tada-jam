import { perchIndex, startPerch } from './perches'
import { clampX, PIECES, SHAPES } from './pieces'

// The playroom's saved shape (R10). Each piece is either in the tray or on
// the build plane with its pose, and the kite has a perch. A kite in flight
// is already saved at its destination, so put-away mid-flight loses nothing.
// Read defensively: any older, partial, or corrupt shape falls back piece by
// piece instead of throwing.

export const STATE_VERSION = 1
export const MAX_Y = 14

export type SavedPiece = { id: number; tray: true } | { id: number; tray: false; x: number; y: number; a: number }

export type KiteState = {
  v: typeof STATE_VERSION
  pieces: SavedPiece[]
  perch: number
}

export function defaultState(childAge: number | null): KiteState {
  return { v: STATE_VERSION, pieces: PIECES.map((p) => ({ id: p.id, tray: true })), perch: startPerch(childAge) }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function readPiece(raw: unknown): SavedPiece | null {
  if (!isRecord(raw) || !Number.isInteger(raw.id) || (raw.id as number) < 0 || (raw.id as number) >= PIECES.length) return null
  const id = raw.id as number
  if (raw.tray === true) return { id, tray: true }
  if (!finite(raw.x) || !finite(raw.y) || !finite(raw.a)) return { id, tray: true }
  const shape = SHAPES[PIECES[id].kind]
  const reach = Math.max(shape.half.x, shape.half.y)
  return {
    id,
    tray: false,
    x: clampX(raw.x, reach),
    y: Math.min(MAX_Y, Math.max(0, raw.y)),
    a: raw.a % (Math.PI * 2),
  }
}

export function deserialize(raw: unknown, childAge: number | null): KiteState {
  const fallback = defaultState(childAge)
  if (!isRecord(raw) || raw.v !== STATE_VERSION) return fallback
  const found = new Map<number, SavedPiece>()
  if (Array.isArray(raw.pieces)) {
    for (const item of raw.pieces) {
      const piece = readPiece(item)
      if (piece && !found.has(piece.id)) found.set(piece.id, piece)
    }
  }
  return {
    v: STATE_VERSION,
    pieces: PIECES.map((p) => found.get(p.id) ?? { id: p.id, tray: true }),
    perch: raw.perch === undefined ? fallback.perch : perchIndex(raw.perch),
  }
}

export function serialize(state: KiteState): KiteState {
  return {
    v: STATE_VERSION,
    perch: state.perch,
    pieces: state.pieces.map((p) =>
      p.tray ? { id: p.id, tray: true } : { id: p.id, tray: false, x: round(p.x), y: round(p.y), a: round(p.a) },
    ),
  }
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}
