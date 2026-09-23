import { buildable, cellIndex, PLOTS } from './layout'
import { normalTurn, PIECE_KINDS, type Piece, type PieceKind } from './pieces'

// The garden's saved shape: what is built where, and how far each plot has
// grown. Small plain JSON, versioned, and read defensively: anything odd is
// dropped piece by piece rather than failing the whole garden.

export const STATE_VERSION = 1

export type GardenState = {
  v: typeof STATE_VERSION
  pieces: Piece[]
  /** Bloom of each plot, 0 (wilted sprout) to 1 (in full bloom), by plot id. */
  growth: number[]
}

/** Age is a dial (R9): the youngest start with one bend by the stream, turned away, so a tap is the first act. */
export function starterPieces(childAge: number | null): Piece[] {
  if (childAge !== null && childAge >= 7) return []
  return [{ kind: 'bend', c: 3, r: 1, turn: 2, open: true }]
}

export function defaultGarden(childAge: number | null): GardenState {
  return { v: STATE_VERSION, pieces: starterPieces(childAge), growth: PLOTS.map(() => 0) }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readPiece(value: unknown): Piece | null {
  if (!isRecord(value)) return null
  const { kind, c, r, turn, open } = value
  if (typeof kind !== 'string' || !(PIECE_KINDS as readonly string[]).includes(kind)) return null
  if (!Number.isInteger(c) || !Number.isInteger(r) || !buildable(c as number, r as number)) return null
  const pieceKind = kind as PieceKind
  return {
    kind: pieceKind,
    c: c as number,
    r: r as number,
    turn: typeof turn === 'number' && Number.isFinite(turn) ? normalTurn(pieceKind, turn) : 0,
    open: open !== false,
  }
}

export function deserialize(saved: unknown, childAge: number | null): GardenState {
  if (!isRecord(saved) || saved.v !== STATE_VERSION) return defaultGarden(childAge)
  const pieces: Piece[] = []
  const taken = new Set<number>()
  if (Array.isArray(saved.pieces)) {
    for (const raw of saved.pieces.slice(0, 64)) {
      const piece = readPiece(raw)
      if (!piece) continue
      const index = cellIndex(piece.c, piece.r)
      if (taken.has(index)) continue
      taken.add(index)
      pieces.push(piece)
    }
  }
  const growth = PLOTS.map((plot) => {
    const value = Array.isArray(saved.growth) ? saved.growth[plot.id] : 0
    return typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
  })
  return { v: STATE_VERSION, pieces, growth }
}

export function serialize(state: GardenState): GardenState {
  return {
    v: STATE_VERSION,
    pieces: state.pieces.map(({ kind, c, r, turn, open }) => ({ kind, c, r, turn, open })),
    growth: state.growth.map((g) => Math.round(g * 1000) / 1000),
  }
}

export function pieceAt(state: GardenState, c: number, r: number): Piece | null {
  for (const piece of state.pieces) if (piece.c === c && piece.r === r) return piece
  return null
}
