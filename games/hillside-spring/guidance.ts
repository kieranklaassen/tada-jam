import { solveFlow, type FlowResult } from './flow'
import { buildable, PLOTS } from './layout'
import { normalTurn, turnsOf, type Piece, type PieceKind } from './pieces'
import type { Point } from './input'
import type { GardenState } from './state'

// Wordless guidance for a six-year-old: no text, no voice, no verdicts.
// When the child stops, what can be touched glows, and then a ghost hand
// shows one possible next move chosen from the garden as it is: turn a
// piece that would send water somewhere thirsty, or carry a piece from the
// rack to where the water runs. It shows a move, never the whole answer
// (a carried piece lands unturned). Hints back off and stop after a few,
// and any touch clears them at once.

export type Hint =
  | { kind: 'turn'; c: number; r: number }
  | { kind: 'place'; piece: PieceKind; c: number; r: number }
  | { kind: 'harvest'; plot: number }

const RACK_TRIES: readonly PieceKind[] = ['bend', 'straight', 'split']

function thirsty(state: GardenState, flow: FlowResult): number[] {
  return PLOTS.filter((plot) => flow.plotFlow[plot.id] <= 0 && state.growth[plot.id] < 1).map((plot) => plot.id)
}

function growing(state: GardenState, flow: FlowResult): number[] {
  return PLOTS.filter((plot) => flow.plotFlow[plot.id] > 0 && state.growth[plot.id] < 1).map((plot) => plot.id)
}

/** A move worth showing waters a thirsty plot without taking the water from one that is still growing. */
function helps(pieces: readonly Piece[], dry: readonly number[], drinking: readonly number[]): boolean {
  const result = solveFlow(pieces)
  return dry.some((id) => result.plotFlow[id] > 0) && drinking.every((id) => result.plotFlow[id] > 0)
}

/** Empty cells where water runs along the ground, nearest the spring first. */
function wetGround(state: GardenState, flow: FlowResult): { c: number; r: number }[] {
  const seen = new Set<number>()
  const cells: { c: number; r: number; d: number }[] = []
  for (const segment of flow.segments) {
    if (segment.kind !== 'trickle') continue
    const key = segment.r * 100 + segment.c
    if (seen.has(key) || !buildable(segment.c, segment.r)) continue
    if (state.pieces.some((piece) => piece.c === segment.c && piece.r === segment.r)) continue
    seen.add(key)
    cells.push({ c: segment.c, r: segment.r, d: segment.d0 })
  }
  return cells.sort((a, b) => a.d - b.d)
}

/** The one next move worth demonstrating, given the garden as it is. */
export function chooseHint(state: GardenState, flow: FlowResult): Hint | null {
  const dry = thirsty(state, flow)
  const drinking = growing(state, flow)
  const ground = wetGround(state, flow)
  if (dry.length > 0) {
    for (const piece of state.pieces) {
      if (piece.kind === 'sluice') {
        if (helps(state.pieces.map((p) => (p === piece ? { ...p, open: !p.open } : p)), dry, drinking)) return { kind: 'turn', c: piece.c, r: piece.r }
        continue
      }
      for (let k = 1; k < turnsOf(piece.kind); k++) {
        const turned = { ...piece, turn: normalTurn(piece.kind, piece.turn + k) }
        if (helps(state.pieces.map((p) => (p === piece ? turned : p)), dry, drinking)) return { kind: 'turn', c: piece.c, r: piece.r }
      }
    }
    for (const cell of ground) {
      for (const kind of RACK_TRIES) {
        for (let turn = 0; turn < turnsOf(kind); turn++) {
          if (helps([...state.pieces, { kind, c: cell.c, r: cell.r, turn, open: true }], dry, drinking)) return { kind: 'place', piece: kind, c: cell.c, r: cell.r }
        }
      }
    }
    // Nothing waters a thirsty plot without drying a growing one: let it grow, and show nothing until it blooms.
    if (drinking.length > 0) return null
    return ground[0] ? { kind: 'place', piece: 'bend', c: ground[0].c, r: ground[0].r } : null
  }
  if (!state.pieces.some((piece) => piece.kind === 'wheel') && ground[0]) return { kind: 'place', piece: 'wheel', c: ground[0].c, r: ground[0].r }
  // Only a finished garden is offered a harvest: while other beds still grow it would pull a fresh bloom (and the
  // visitor it brought) away mid-celebration. The first bed, the sunflower, is the one no visitor sits on then.
  return PLOTS.every((plot) => state.growth[plot.id] >= 1) ? { kind: 'harvest', plot: PLOTS[0].id } : null
}

export const IDLE_BEFORE_GLOW = 3
export const IDLE_BEFORE_DEMO = 5
export const DEMO_SECONDS = 3.2
export const MAX_DEMOS = 4
export const FIRST_LEAN_DELAY = 1.5
export const LEAN_SECONDS = 3
export const LEAN_EVERY = 7

/** Where a thirsty plot would reach: toward the nearest running water. */
export type Reach = {
  /** Sideways toward that water: -1 left, 1 right, 0 when it is straight uphill or downhill (the plot only stretches). */
  dir: number
  /** How far it is in cells, Infinity with no water on the hill. */
  cells: number
  /** Path distance from the spring to it, to time a reach to the water's arrival. */
  dist: number
}

/** For each plot, the nearest running water, so thirsty plants can reach for it and reach again as it comes closer. */
export function nearestWater(flow: FlowResult): Reach[] {
  return PLOTS.map((plot) => {
    const best: Reach = { dir: 0, cells: Infinity, dist: 0 }
    for (const segment of flow.segments) {
      if (segment.flow <= 0) continue
      const cells = Math.abs(segment.c - plot.c) + Math.abs(segment.r - plot.r)
      if (cells > best.cells || (cells === best.cells && segment.d1 >= best.dist)) continue
      best.dir = Math.sign(segment.c - plot.c)
      best.cells = cells
      best.dist = segment.d1
    }
    return best
  })
}

export type GuidanceState = {
  /** 0..1 progress through the current demonstration, or null. */
  demo: number | null
  /** 0..1 breathing glow on what can be touched now. */
  glow: number
  /** 0..1 progress of an idle reach (thirsty plots lean toward the nearest water), or null. From the first moments, and again with the glow whenever the child stops. */
  lean: number | null
}

/** When to show guidance. Seconds of attended play; any touch restarts the idle clock. */
export class HintClock {
  private idleSince: number
  private touched = false
  private readonly openedAt: number

  constructor(now: number) {
    this.idleSince = now
    this.openedAt = now
  }

  touch(now: number): void {
    this.idleSince = now
    this.touched = true
  }

  /** The garden did something worth watching (a bloom): demonstrations wait a fresh idle stretch after it. */
  wait(now: number): void {
    this.idleSince = Math.max(this.idleSince, now)
  }

  /** Demonstrations start 5 s into an idle stretch, then after gaps of 10, 20 and 40 s. */
  demoStart(index: number): number {
    let at = this.idleSince + IDLE_BEFORE_DEMO
    let gap = IDLE_BEFORE_DEMO * 2
    for (let i = 0; i < index; i++) {
      at += DEMO_SECONDS + gap
      gap *= 2
    }
    return at
  }

  /** Fills `out` (the caller's, reused every frame) and returns it. */
  state(now: number, out: GuidanceState = { demo: null, glow: 0, lean: null }): GuidanceState {
    const idle = now - this.idleSince
    const glow = idle < IDLE_BEFORE_GLOW ? 0 : Math.min(1, (idle - IDLE_BEFORE_GLOW) / 1.5) * (0.6 + 0.4 * Math.sin(now * 2.4))
    let demo: number | null = null
    for (let i = 0; i < MAX_DEMOS; i++) {
      const start = this.demoStart(i)
      if (now >= start && now < start + DEMO_SECONDS) demo = (now - start) / DEMO_SECONDS
    }
    let lean: number | null = null
    const since = now - (this.touched ? this.idleSince + IDLE_BEFORE_GLOW : this.openedAt + FIRST_LEAN_DELAY)
    if (since >= 0) {
      const within = since % LEAN_EVERY
      if (within < LEAN_SECONDS) lean = within / LEAN_SECONDS
    }
    out.demo = demo
    out.glow = Math.max(0, glow)
    out.lean = lean
    return out
  }
}

export type HandPose = { at: Point; press: number; opacity: number }

function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t
}

function span(t: number, start: number, end: number): number {
  return clamp01((t - start) / (end - start))
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t)
}

function tap(t: number, start: number, end: number): number {
  return Math.sin(span(t, start, end) * Math.PI)
}

/** The ghost hand through one demonstration, written into `out` (no allocation). */
export function handPose(from: Point, to: Point | null, progress: number, out: HandPose): HandPose {
  out.opacity = Math.min(span(progress, 0, 0.1), 1 - span(progress, 0.88, 1))
  if (!to) {
    out.at.x = from.x
    out.at.y = from.y
    out.press = Math.max(tap(progress, 0.18, 0.38), tap(progress, 0.5, 0.7))
    return out
  }
  out.press = progress < 0.14 ? 0 : progress < 0.22 ? span(progress, 0.14, 0.22) : progress < 0.76 ? 1 : 1 - span(progress, 0.76, 0.84)
  const travel = smooth(span(progress, 0.24, 0.72))
  const lift = Math.sin(travel * Math.PI) * 40
  out.at.x = from.x + (to.x - from.x) * travel
  out.at.y = from.y + (to.y - from.y) * travel - lift
  return out
}

/**
 * An idle reach in two beats, each 0..1: the thirsty sprouts stand up out of their droop (`stand`), first open their
 * leaves toward the child like empty hands held out (`ask`), and only then lean toward their water (`point`). The ask
 * has let go before the point begins, so the two beats never blur into one.
 */
export type ReachPose = { stand: number; ask: number; point: number }

/** The idle reach at `progress` through it, written into `out` (no allocation). */
export function reachPose(progress: number, out: ReachPose): ReachPose {
  const settle = 1 - smooth(span(progress, 0.82, 1))
  out.stand = smooth(span(progress, 0, 0.18)) * settle
  out.ask = smooth(span(progress, 0.06, 0.26)) * (1 - smooth(span(progress, 0.38, 0.5)))
  out.point = smooth(span(progress, 0.5, 0.68)) * settle
  return out
}
