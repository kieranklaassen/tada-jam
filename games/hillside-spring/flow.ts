import { cellIndex, COLS, E, inGrid, N, neighbour, opposite, plotAt, PLOTS, ROWS, S, SPRING_COL, W, type Side } from './layout'
import { openings, opensTo, type Piece } from './pieces'

// Where the water goes, given what the child has built (KTD2).
//
// Water enters a cell from uphill (N: falling from the terrace above, or
// poured out of a pipe) or from a side (a pipe next door). A piece passes it
// from the opening it came in to every other opening except uphill; water
// never climbs. Anything that finds no opening falls to the cell's floor and
// runs downhill, over each terrace wall, until an uphill-facing pipe mouth
// catches it, a plot drinks it, or it reaches the pond. A flow that enters
// from the west can only continue east or down (and the reverse), so the
// whole network is acyclic and one pass per row solves it.

export type SegmentKind = 'channel' | 'pourSide' | 'pourDown' | 'drop' | 'trickle' | 'fall'

/** Centre of a cell, used as a channel anchor. Sides 0..3 are N, E, S, W. */
export const CENTRE = 4

/** Where a sideways pour lands. */
export const LAND_FLOOR = 0
export const LAND_PLOT = 1
export const LAND_OFF = 2

/** Where a fall or downward pour ends. */
export const ONTO_ROW = 0
export const INTO_POND = 1

/** Where a trickle across a cell floor starts. */
export const FROM_EDGE = 0
export const FROM_CENTRE = 1

export type Segment = {
  key: string
  kind: SegmentKind
  c: number
  r: number
  /** channel: entry side or CENTRE; pourSide/pourDown: the pipe side; trickle: FROM_EDGE or FROM_CENTRE. */
  a: number
  /** channel: exit side or CENTRE; pourSide: LAND_*; pourDown and fall: ONTO_ROW or INTO_POND. */
  b: number
  flow: number
  /** Path distance from the spring at the start and end of the segment, in cells. */
  d0: number
  d1: number
}

export type FlowResult = {
  segments: Segment[]
  plotFlow: number[]
  /** Path distance at which water reaches each plot; Infinity when dry. */
  plotDist: number[]
  /** Flow through each waterwheel, by cell index. */
  wheelFlow: Map<number, number>
  wheelDist: Map<number, number>
  pondFlow: number
  offGrid: number
}

export const LENGTH = {
  straight: 1,
  bend: 0.8,
  half: 0.5,
  pourSide: 0.6,
  pourDown: 0.8,
  drop: 0.3,
  trickleEdge: 0.9,
  trickleCentre: 0.5,
  fall: 0.5,
} as const

const EPS = 1e-6

export function solveFlow(pieces: readonly Piece[], springFlow = 1): FlowResult {
  const size = COLS * ROWS
  const grid: (Piece | null)[] = new Array(size).fill(null)
  for (const piece of pieces) if (inGrid(piece.c, piece.r)) grid[cellIndex(piece.c, piece.r)] = piece

  const inN = new Float64Array(size)
  const inW = new Float64Array(size)
  const inE = new Float64Array(size)
  const dN = new Float64Array(size).fill(Infinity)
  const dW = new Float64Array(size).fill(Infinity)
  const dE = new Float64Array(size).fill(Infinity)

  const segments = new Map<string, Segment>()
  const plotFlow = PLOTS.map(() => 0)
  const plotDist = PLOTS.map(() => Infinity)
  const wheelFlow = new Map<number, number>()
  const wheelDist = new Map<number, number>()
  let pondFlow = 0
  let offGrid = 0

  const add = (kind: SegmentKind, c: number, r: number, a: number, b: number, flow: number, d: number, length: number): number => {
    const key = `${kind}:${c},${r}:${a}>${b}`
    const existing = segments.get(key)
    if (existing) {
      existing.flow += flow
      if (d < existing.d0) {
        existing.d0 = d
        existing.d1 = d + length
      }
      return existing.d1
    }
    segments.set(key, { key, kind, c, r, a, b, flow, d0: d, d1: d + length })
    return d + length
  }

  const water = (plotId: number, flow: number, d: number) => {
    plotFlow[plotId] += flow
    plotDist[plotId] = Math.min(plotDist[plotId], d)
  }

  const arriveN = (c: number, r: number, flow: number, d: number) => {
    const i = cellIndex(c, r)
    inN[i] += flow
    dN[i] = Math.min(dN[i], d)
  }

  const fallFrom = (c: number, r: number, flow: number, d: number) => {
    if (r + 1 >= ROWS) {
      add('fall', c, r, 0, INTO_POND, flow, d, LENGTH.fall)
      pondFlow += flow
      return
    }
    arriveN(c, r + 1, flow, add('fall', c, r, 0, ONTO_ROW, flow, d, LENGTH.fall))
  }

  const trickle = (c: number, r: number, from: number, flow: number, d: number) => {
    fallFrom(c, r, flow, add('trickle', c, r, from, 0, flow, d, from === FROM_EDGE ? LENGTH.trickleEdge : LENGTH.trickleCentre))
  }

  const drop = (c: number, r: number, flow: number, d: number) => {
    trickle(c, r, FROM_CENTRE, flow, add('drop', c, r, CENTRE, 0, flow, d, LENGTH.drop))
  }

  const emitDown = (c: number, r: number, flow: number, d: number) => {
    if (r + 1 >= ROWS) {
      add('pourDown', c, r, S, INTO_POND, flow, d, LENGTH.pourDown)
      pondFlow += flow
      return
    }
    arriveN(c, r + 1, flow, add('pourDown', c, r, S, ONTO_ROW, flow, d, LENGTH.pourDown))
  }

  const emitSide = (c: number, r: number, side: Side, flow: number, d: number) => {
    const next = neighbour(c, r, side)
    if (!inGrid(next.c, next.r)) {
      add('pourSide', c, r, side, LAND_OFF, flow, d, LENGTH.pourSide)
      offGrid += flow
      return
    }
    const plot = plotAt(next.c, next.r)
    if (plot) {
      water(plot.id, flow, add('pourSide', c, r, side, LAND_PLOT, flow, d, LENGTH.pourSide))
      return
    }
    const piece = grid[cellIndex(next.c, next.r)]
    if (piece && opensTo(piece, opposite(side))) {
      const i = cellIndex(next.c, next.r)
      if (side === E) {
        inW[i] += flow
        dW[i] = Math.min(dW[i], d)
      } else {
        inE[i] += flow
        dE[i] = Math.min(dE[i], d)
      }
      return
    }
    trickle(next.c, next.r, FROM_CENTRE, flow, add('pourSide', c, r, side, LAND_FLOOR, flow, d, LENGTH.pourSide))
  }

  const emit = (c: number, r: number, side: Side, flow: number, d: number) => {
    if (side === S) emitDown(c, r, flow, d)
    else emitSide(c, r, side, flow, d)
  }

  const pass = (piece: Piece, entry: Side, flow: number, d: number) => {
    const { c, r } = piece
    if (piece.kind === 'wheel') {
      const at = add('channel', c, r, entry, CENTRE, flow, d, LENGTH.half)
      const i = cellIndex(c, r)
      wheelFlow.set(i, (wheelFlow.get(i) ?? 0) + flow)
      wheelDist.set(i, Math.min(wheelDist.get(i) ?? Infinity, at))
      drop(c, r, flow, at)
      return
    }
    const exits = piece.kind === 'sluice' && !piece.open ? [] : openings(piece).filter((side) => side !== entry && side !== N)
    if (exits.length === 0) {
      drop(c, r, flow, add('channel', c, r, entry, CENTRE, flow, d, LENGTH.half))
      return
    }
    if (piece.kind === 'split') {
      const centre = add('channel', c, r, entry, CENTRE, flow, d, LENGTH.half)
      const share = flow / exits.length
      for (const exit of exits) emit(c, r, exit, share, add('channel', c, r, CENTRE, exit, share, centre, LENGTH.half))
      return
    }
    const exit = exits[0]
    emit(c, r, exit, flow, add('channel', c, r, entry, exit, flow, d, exit === opposite(entry) ? LENGTH.straight : LENGTH.bend))
  }

  arriveN(SPRING_COL, 0, springFlow, 0)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = cellIndex(c, r)
      if (inN[i] <= EPS) continue
      const plot = plotAt(c, r)
      const piece = grid[i]
      if (plot) water(plot.id, inN[i], dN[i])
      else if (piece && opensTo(piece, N)) pass(piece, N, inN[i], dN[i])
      else trickle(c, r, FROM_EDGE, inN[i], dN[i])
    }
    for (let c = 0; c < COLS; c++) {
      const i = cellIndex(c, r)
      const piece = grid[i]
      if (inW[i] > EPS && piece) pass(piece, W, inW[i], dW[i])
    }
    for (let c = COLS - 1; c >= 0; c--) {
      const i = cellIndex(c, r)
      const piece = grid[i]
      if (inE[i] > EPS && piece) pass(piece, E, inE[i], dE[i])
    }
  }

  return { segments: [...segments.values()], plotFlow, plotDist, wheelFlow, wheelDist, pondFlow, offGrid }
}

/** The side a dropped sluice should lie along: the side water reaches it from, if any. */
export function incomingSide(result: FlowResult, c: number, r: number): Side | null {
  if (r === 0 && c === SPRING_COL) return N
  for (const segment of result.segments) {
    if (segment.kind === 'fall' && segment.b === ONTO_ROW && segment.c === c && segment.r === r - 1) return N
    if (segment.kind === 'pourDown' && segment.b === ONTO_ROW && segment.c === c && segment.r === r - 1) return N
    if (segment.kind === 'channel' && segment.r === r && (segment.b === E || segment.b === W)) {
      const next = neighbour(segment.c, segment.r, segment.b as Side)
      if (next.c === c) return opposite(segment.b as Side)
    }
  }
  return null
}
