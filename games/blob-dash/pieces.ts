import { BEATS } from './beat'
import { slotOf, standsIn } from './layout'

// The six pieces and the five ways a blob can meet one. Pure: the rules of
// what stands where and what a pipe covers, with no clock and no drawing.

export const KINDS = ['drum', 'chime', 'flip', 'splitter', 'tunnel', 'wall'] as const
export type Kind = (typeof KINDS)[number]

/** A piece on the track, as a save holds it. */
export type Piece = { kind: Kind; beat: number; ceiling: boolean }

/**
 * The five ways a piece is met, which are the columns of the sheet's grid. One meeting is one way: a hushed blob
 * meets everything hushed; else twins meet it as twins; else a blob on the ceiling meets it there; else a blob that
 * comes down on it from a jump has landed on it; else it has run into it.
 */
export const WAYS = ['run', 'landed', 'ceiling', 'twins', 'hushed'] as const
export type Way = (typeof WAYS)[number]

export function wayOf(state: { hushed: boolean; split: boolean; ceiling: boolean; landed: boolean }): Way {
  return state.hushed ? 'hushed' : state.split ? 'twins' : state.ceiling ? 'ceiling' : state.landed ? 'landed' : 'run'
}

export function isKind(value: unknown): value is Kind {
  return typeof value === 'string' && (KINDS as readonly string[]).includes(value)
}

/** The pieces of a list by slot, the later of two on one slot winning, as a drop on a taken beat does. Whatever is not a piece on a place a piece can stand is left out. */
export function bySlot(pieces: readonly Piece[]): Map<number, Kind> {
  const slots = new Map<number, Kind>()
  for (const piece of pieces) if (isKind(piece.kind) && Number.isInteger(piece.beat) && piece.beat >= 0 && piece.beat < BEATS && standsIn(slotOf(piece.beat, piece.ceiling === true))) slots.set(slotOf(piece.beat, piece.ceiling === true), piece.kind)
  return slots
}

/** The slots of a map as a list for a save: by beat, the floor before the ceiling. */
export function listed(slots: ReadonlyMap<number, Kind>): Piece[] {
  return [...slots.entries()].sort((a, b) => a[0] - b[0]).map(([slot, kind]) => ({ kind, beat: slot % BEATS, ceiling: slot >= BEATS }))
}

/** One beat's length of a pipe: from a beat along its surface to the next beat, or across to the other surface where a flip stands. */
export type Span = { beat: number; ceiling: boolean; cross: boolean }

/**
 * The pipe a hushed blob travels from where it is: beat by beat, across to the other surface at every flip, as far
 * as the next mouth. `from` is the beat it has last passed, and a mouth standing there is the one it came in by. A
 * pipe with no mouth ahead goes on until it would cover a span twice, so it is never longer than the course twice
 * round.
 */
export function pipeFrom(pieceIn: (slot: number) => Kind | undefined, from: number, ceiling: boolean): Span[] {
  const spans: Span[] = [], seen = new Set<number>()
  let beat = ((from % BEATS) + BEATS) % BEATS, up = ceiling
  for (let step = 0; step < BEATS * 2; step++) {
    const key = slotOf(beat, up), kind = pieceIn(key)
    if (kind === 'tunnel' && step > 0) break
    if (seen.has(key)) break
    seen.add(key)
    const cross = kind === 'flip'
    spans.push({ beat, ceiling: up, cross })
    if (cross) up = !up
    beat = (beat + 1) % BEATS
  }
  return spans
}
