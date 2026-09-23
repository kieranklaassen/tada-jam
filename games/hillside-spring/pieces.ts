import { E, N, S, W, type Side } from './layout'

// The bamboo kit. Each piece has openings on some sides of its cell; a
// quarter turn rotates them clockwise. The waterwheel takes water from any
// side but uphill and pours it out beneath itself, so it has no turn.

export const PIECE_KINDS = ['bend', 'straight', 'split', 'sluice', 'wheel'] as const
export type PieceKind = (typeof PIECE_KINDS)[number]

export type Piece = { kind: PieceKind; c: number; r: number; turn: number; open: boolean }

const BASE: Record<PieceKind, readonly Side[]> = {
  straight: [N, S],
  bend: [N, E],
  split: [N, E, W],
  sluice: [N, S],
  wheel: [N, E, W],
}

/** How heavy a piece feels, a split being 1: how slowly it lifts, how hard it lands, how low it sounds. */
export const PIECE_WEIGHT: Record<PieceKind, number> = { straight: 0.75, bend: 0.8, split: 1, sluice: 1.15, wheel: 1.6 }

/** How many distinct turns a piece has (a straight looks the same after a half turn). */
export function turnsOf(kind: PieceKind): number {
  switch (kind) {
    case 'straight':
    case 'sluice':
      return 2
    case 'bend':
    case 'split':
      return 4
    case 'wheel':
      return 1
    default: {
      const never: never = kind
      return never
    }
  }
}

export function normalTurn(kind: PieceKind, turn: number): number {
  const n = turnsOf(kind)
  return ((Math.round(turn) % n) + n) % n
}

export function rotate(side: Side, turn: number): Side {
  return ((side + turn) % 4) as Side
}

/** A piece's openings before any turn (shared, never mutate). */
export function baseOpenings(kind: PieceKind): readonly Side[] {
  return BASE[kind]
}

export function openings(piece: Pick<Piece, 'kind' | 'turn'>): Side[] {
  return BASE[piece.kind].map((side) => rotate(side, piece.kind === 'wheel' ? 0 : piece.turn))
}

export function opensTo(piece: Pick<Piece, 'kind' | 'turn'>, side: Side): boolean {
  return openings(piece).includes(side)
}

/** A tap turns bamboo; the sluice opens or shuts instead and the wheel just spins. */
export function tapTurns(kind: PieceKind): boolean {
  return kind !== 'sluice' && kind !== 'wheel'
}

/** The sluice lies along the water it meets: across the slope if water comes from a side, down it otherwise. */
export function sluiceTurnFor(fromSide: Side | null): number {
  return fromSide === E || fromSide === W ? 1 : 0
}
