import { PLACES } from './beat'
import { FIRST_TEMPO, TEMPO } from './config'
import { bySlot, listed, type Piece } from './pieces'
import { deserialize as readPosition, isReadable, isRecord, serialize as writePosition, type GameState } from './state'

// What Blob Dash saves on top of the template's fields: the tempo, the
// springs and the pieces on the track. The template's `position` and `finished` are kept as they are: the
// game has one place in its order and no cycle that ends, so they never move.
// Each field is repaired by itself, as state.ts repairs its own.
//
// The run is not here. Where the blob is in its lap, whether it is in the
// air, on the ceiling, split or hushed, the paint bursts and the cast's poses
// are views of the loop: on load the blob starts its lap on the floor, single
// and loud, and the loop plays from there as the pieces on the track make it.

export type Save = GameState & {
  /** Beats a minute, a whole number between the dial's ends. */
  tempo: number
  /** The places that hold a spring, ascending, none twice: 0 to 31 on the floor, 32 to 63 on the ceiling. */
  springs: number[]
  /** The pieces on the track, by beat, the floor before the ceiling: at most one for each beat of the floor and for each second beat of the ceiling. One read on any other beat of the ceiling is dropped. */
  pieces: Piece[]
}

/** The tempo a first visit starts at. Younger than the first row, or no age, takes the first row; older than the last takes the last. */
export function firstTempo(childAge: number | null): number {
  let tempo = FIRST_TEMPO[0].tempo
  if (childAge !== null) for (const row of FIRST_TEMPO) if (childAge >= row.fromAge) tempo = row.tempo
  return tempo
}

function readTempo(raw: unknown, fallback: number): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return fallback
  return Math.round(Math.min(TEMPO.fastest, Math.max(TEMPO.slowest, raw)))
}

function readSprings(raw: unknown): number[] {
  if (!Array.isArray(raw)) return []
  const places = new Set<number>()
  for (const item of raw) if (Number.isInteger(item) && item >= 0 && item < PLACES * 2) places.add(item)
  return [...places].sort((a, b) => a - b)
}

function readPieces(raw: unknown): Piece[] {
  if (!Array.isArray(raw)) return []
  const pieces: Piece[] = []
  for (const item of raw) if (isRecord(item) && typeof item.beat === 'number' && typeof item.ceiling === 'boolean') pieces.push({ kind: item.kind as Piece['kind'], beat: item.beat, ceiling: item.ceiling })
  // Whatever is not one of the six on a beat there is drops out here, and of two on one place the later stays.
  return listed(bySlot(pieces))
}

/** Saved state is untrusted: anything that is not this game's record gives a first visit, and inside a record each field is repaired by itself. */
export function deserialize(raw: unknown, childAge: number | null = null): Save {
  const base = readPosition(raw, childAge)
  // Open play has no cycle that ends, so `finished` is false whatever the slot says.
  if (!isReadable(raw)) return { ...base, finished: false, tempo: firstTempo(childAge), springs: [], pieces: [] }
  return { ...base, finished: false, tempo: readTempo(raw.tempo, firstTempo(childAge)), springs: readSprings(raw.springs), pieces: readPieces(raw.pieces) }
}

export function serialize(save: Save): Save {
  return { ...writePosition(save), finished: false, tempo: readTempo(save.tempo, FIRST_TEMPO[0].tempo), springs: readSprings(save.springs), pieces: readPieces(save.pieces) }
}
