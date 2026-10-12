import { COLS, GREEN, PEG_RADIUS, ROWS, WHITE, YELLOW, holeAt, type Colour } from './board'

// The rules of the beam (the design sheet, "The rules of the beam"), as pure
// steps of one beat. A beam is a bar one column wide. It comes in at the left
// edge and steps one column a beat. In each column it meets, every peg
// sounds, and then the colours act in this order: white holds it for a beat
// (and every other beam stands still for that beat), yellow splits a half
// beam off the other way, green turns it round. The
// board is read as it stands on each beat, so a peg pushed in while the
// lever is down counts from the next beat on.
//
// No peg leaves part of the board unplayed for good. A beam that green pegs
// turned back comes in again open: it passes every green peg on that time
// across, and so plays every column. The time after, green pegs turn it
// again. So a green peg turns the beam every other time the beam meets it. A
// beam shut in between green pegs is trapped after eight turns, and is let
// out, open, a little after its show is over.

/** Seconds a beat lasts. */
export const BEAT = 0.32
/** A full beam turned back this many times in a row without leaving the board is trapped. */
export const TRAPPED_AFTER = 8
/** A trapped beam is let out this many beats after it was trapped: just after its show. */
export const FREE_AFTER = 20

export type Beam = {
  col: number
  dir: 1 | -1
  /** A half beam: thin and dim, split off by a yellow peg. It sounds a yellow peg and does not split on it. */
  half: boolean
  /** Beats it still stands on its column, held by a white peg. */
  hold: number
  /** Turns by green pegs since it last came in at the edge. */
  turns: number
  /** The column a half beam was split off in. No two half beams on the board share one. */
  from: number
  /** The row of the yellow peg that split a half beam off: the row its band lies along. -1 for the full beam. */
  row: number
  /** It passes green pegs: on the time across after one on which it was turned, and when it is let out of a trap. */
  open: boolean
  /** Beats since it was trapped, or -1. */
  shut: number
}

/** A peg a beam met on this beat. */
export type Hit = { hole: number; colour: Colour; half: boolean }

export type BeatOutcome = {
  hits: Hit[]
  /** A full beam has now been turned back `TRAPPED_AFTER` times without leaving. */
  trapped: boolean
  /** Whether the full beam took a step, or came in, on this beat. */
  stepped: boolean
}

const fresh = (): Beam => ({ col: 0, dir: 1, half: false, hold: 0, turns: 0, from: -1, row: -1, open: false, shut: -1 })

/** Whether a beam stands on a column. The full beam is off the board for the one beat between leaving at an edge and coming in. */
export function onBoard(beam: Beam): boolean {
  return beam.col >= 0 && beam.col < COLS
}

/** The beam meets the column it stands on: its pegs sound, and then white, yellow and green act, in that order. */
function meet(beams: Beam[], beam: Beam, board: readonly number[], out: BeatOutcome): void {
  let white = false, yellow = false, green = false, yellowRow = -1
  const middle = (ROWS - 1) / 2
  for (let row = 0; row < ROWS; row++) {
    const hole = holeAt(beam.col, row), colour = board[hole] as Colour | 0
    if (colour === 0) continue
    out.hits.push({ hole, colour, half: beam.half })
    white ||= colour === WHITE
    yellow ||= colour === YELLOW
    // Of several yellow pegs in a column, the one nearest the middle row gives the half beam its row.
    if (colour === YELLOW && (yellowRow < 0 || Math.abs(row - middle) < Math.abs(yellowRow - middle))) yellowRow = row
    green ||= colour === GREEN
  }
  if (white) beam.hold = 1
  // A half beam leaves the other way while the beam carries on. A column whose half beam is still on the board does not split again.
  if (yellow && !beam.half && !beams.some((other) => other.half && other.from === beam.col)) {
    beams.push({ col: beam.col, dir: beam.dir === 1 ? -1 : 1, half: true, hold: 0, turns: 0, from: beam.col, row: yellowRow, open: beam.open, shut: -1 })
  }
  if (green && !beam.open) {
    beam.dir = beam.dir === 1 ? -1 : 1
    beam.turns += 1
    if (beam.half) {
      // A half beam shut in is let out at once, and again if a new green peg has shut it in since.
      if (beam.turns >= TRAPPED_AFTER) beam.open = true
    } else if (beam.turns === TRAPPED_AFTER) {
      // The full beam is let out after its show.
      out.trapped = true
      beam.shut = 0
    }
  }
}

/** The lever goes down: one beam comes in at the left edge and meets the first column at once. */
export function enter(beams: Beam[], board: readonly number[]): BeatOutcome {
  const out: BeatOutcome = { hits: [], trapped: false, stepped: true }
  beams.length = 0
  beams.push(fresh())
  meet(beams, beams[0], board, out)
  return out
}

/** One beat: every beam steps a column and meets it, unless a white peg holds one of them, and then none moves. A half beam split off on this beat waits for the next. */
export function beat(beams: Beam[], board: readonly number[]): BeatOutcome {
  const out: BeatOutcome = { hits: [], trapped: false, stepped: false }
  const now = beams.slice()
  // A white peg's beat of quiet is the whole board's: while it holds one beam on its column, every other beam and
  // half beam stands where it is. So all of them keep in step, and none sounds a column the beat after another did.
  const rest = now.some((beam) => beam.hold > 0)
  for (const beam of now) {
    if (beam.shut >= 0 && (beam.shut += 1) >= FREE_AFTER) beam.open = true
    if (rest) {
      beam.hold = 0
      continue
    }
    beam.col += beam.dir
    if (beam.col < 0 || beam.col >= COLS) {
      // A half beam that leaves is gone.
      if (beam.half) {
        beams.splice(beams.indexOf(beam), 1)
        continue
      }
      // The beam is off the board for this beat and comes in at the left edge on the next, so that no column sounds
      // on two beats running. It comes in open if it was turned on the way, and able to be turned again if it was open.
      beam.open = !beam.open && beam.turns > 0
      beam.col = -1
      beam.dir = 1
      beam.turns = 0
      beam.shut = -1
      continue
    }
    if (!beam.half) out.stepped = true
    meet(beams, beam, board, out)
  }
  return out
}

/** A peg's cap is this far across, in stage units: a half beam is never taller. */
export const CAP_ACROSS = (PEG_RADIUS - 2) * 2
/**
 * How a half beam is drawn: a soft dim band lying along the row of the yellow peg that split it, its height and
 * its length given by the column it was split off in. No band is taller than a peg's cap, and none reaches the
 * cap of a peg in the next cell, so drawn behind a peg it shows beside the cap and never above it, below it or
 * across its face. Every band is plump, at least a third as tall as it is long: a blob of light, never a dash.
 * No two columns share a height, and neighbours differ most.
 */
const HALF_TALL = [34, 28, 40, 32, 38, 30, 36, 29, 39, 31, 37] as const
export function halfShape(from: number): { tall: number; reach: number } {
  const column = Math.max(0, Math.min(COLS - 1, from))
  return { tall: HALF_TALL[column], reach: 32 + ((column * 3) % 5) * 2 }
}

/** The full beam of a list, or null when the lever is up. */
export function fullBeam(beams: readonly Beam[]): Beam | null {
  return beams.find((beam) => !beam.half) ?? null
}
