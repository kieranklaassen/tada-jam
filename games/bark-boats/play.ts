import { newProp, type Act, type Who } from './acts'
import type { BrookAct } from './brookActs'
import { MAKINGS, type Kind } from './build'
import { type Spot } from './layout'
import { OPINIONS } from './pokeActs'
import { mastTop, seatOf, slotOf, type Piece } from './pieces'
import { opinionOf } from './traits'
import { anchorsOf, buildNow, emit, type Running, type World } from './world'
import type { SoundName } from './voices'

// Acts on the world: starting one, stepping all of them on the game's clock,
// and what happens to the thing an act had when the act is over. And the two
// ways a making travels by itself: a flight and its landing.

const FLY = { seat: 0.14, lie: 0.1, toss: 0.45 } as const
export { FLY }

/** Queues the cues of `run` whose time lies in (`before`, `after`]. */
function cues(w: World, run: Running, before: number, after: number): void {
  for (const [at, name, rate] of run.act.cues) if (at > before && at <= after) emit(w, name, rate ?? 1)
}

/** Sends a making on a flight to where it rests: its place on the bank, or its seat on the boat. */
export function fly(piece: Piece, flight: number, arc = 0): void {
  piece.mode = 'fly'
  piece.fromX = piece.x; piece.fromY = piece.y
  piece.flight = flight; piece.t = 0; piece.arc = arc
  piece.rot = 0; piece.scale = 1; piece.alpha = 1; piece.behind = false
}

/** What an act had goes where it rests: thrown in an arc, or floating along the shore. */
function letLeave(run: Running): void {
  const piece = run.piece
  if (!piece || piece.mode !== 'act') return
  if (piece.place.on !== 'bank') {
    // A thing of the boat's goes back to its seat.
    piece.mode = 'rest'
    piece.rot = 0; piece.scale = 1; piece.alpha = 1; piece.behind = false
    return
  }
  if (run.act.leaves === 'float') {
    piece.mode = 'float'
    piece.rot = 0; piece.scale = 1; piece.alpha = 1; piece.behind = false
    return
  }
  piece.lands = run.act.lands ?? null
  fly(piece, FLY.toss, 90)
}

/** Ends every act that keeps one of `who` busy, or has `piece`: its thing leaves at once and its later sounds are never heard. */
export function cutActs(w: World, who: readonly Who[], piece: Piece | null = null): void {
  for (let i = w.acts.length - 1; i >= 0; i--) {
    const run = w.acts[i]
    if ((piece && run.piece === piece) || run.act.who.some((one) => who.includes(one))) {
      letLeave(run)
      w.acts.splice(i, 1)
    }
  }
}

/**
 * Starts an act. Whatever it has is drawn where the act says from now on. The cues at its very start are
 * queued in this call, so the touch that causes an act is answered in the same handler.
 */
export function startAct(w: World, act: Act, piece: Piece | null = null, drop: Spot = { x: 0, y: 0 }, brook = false): Running {
  cutActs(w, act.who, piece)
  const run: Running = { act, t: 0, piece, prop: newProp(), drop, brook }
  if (piece) {
    piece.mode = 'act'
    piece.x = drop.x; piece.y = drop.y
  }
  w.acts.push(run)
  cues(w, run, -1, 0)
  return run
}

/** The piece of the boat a brook act moves about, when the boat has one. */
export function pieceUsed(w: World, act: BrookAct): Piece | null {
  if (!act.uses) return null
  return w.pieces.find((piece) => piece.kind === act.uses && piece.place.on !== 'bank') ?? null
}

/** The seat of what a brook act uses, from the keel point; the stern mast's top for an act that uses nothing. */
export function homeOf(w: World, run: Running): Spot {
  if (run.piece && run.brook) return seatOf(run.piece, w.pieces)
  if (run.brook) return mastTop(buildNow(w), 1)
  const place = run.piece?.place
  return place?.on === 'bank' ? { x: place.x, y: place.y } : { x: 0, y: 0 }
}

/** Steps every act by `dt` and queues the sounds of this step. Returns the acts that ended on it. */
export function stepActs(w: World, dt: number): Running[] {
  const ended: Running[] = []
  for (let i = 0; i < w.acts.length; i++) {
    const run = w.acts[i]
    const before = run.t
    run.t = Math.min(run.act.length, run.t + dt)
    cues(w, run, before, run.t)
    if (run.t >= run.act.length) ended.push(run)
  }
  for (const run of ended) {
    w.acts.splice(w.acts.indexOf(run), 1)
    letLeave(run)
  }
  return ended
}

/** Writes the poses of the acts that are playing over the stage, and puts each act's thing where it says. */
export function poseActs(w: World): void {
  for (const run of w.acts) {
    const at = anchorsOf(w, run.drop, homeOf(w, run))
    run.act.pose(run.t / run.act.length, run.t, w.stage, run.prop, at)
    const piece = run.piece
    if (piece && piece.mode === 'act') {
      piece.x = run.prop.x; piece.y = run.prop.y
      piece.rot = run.prop.rot; piece.scale = run.prop.scale; piece.alpha = run.prop.alpha; piece.behind = !run.prop.front
    }
  }
}

const LIE: Partial<Record<string, SoundName>> = { stalk: 'lie-twig', stem: 'lie-twig', feather: 'lie-birch', cap: 'lie-berry', bark: 'lie-hull', walnut: 'lie-hull', pod: 'lie-hull' }
/** The sound a making makes laid on the bank, and how far its pitch is bent for its size. */
export function lieSound(kind: string): [SoundName, number] {
  const name = LIE[kind] ?? (`lie-${kind}` as SoundName)
  const rate = kind === 'stalk' ? 0.8 : kind === 'stem' ? 1.25 : kind === 'feather' ? 1.5 : kind === 'cap' ? 0.7 : kind === 'walnut' ? 1.3 : kind === 'pod' ? 1.6 : 1
  return [name, rate]
}

/** A flight ends: the thing is where it was going, and sounds as what it is on what it landed on. */
export function land(w: World, piece: Piece): void {
  piece.mode = 'rest'
  piece.squash = 0.6
  const boat = w.boat
  if (piece.place.on === 'bank') {
    piece.x = piece.place.x; piece.y = piece.place.y
    if (piece.lands) emit(w, piece.lands)
    else emit(w, ...lieSound(piece.kind))
    piece.lands = null
    return
  }
  if (piece.place.on === 'hull') {
    // A hull set on the stone: a boat can be made on it.
    boat.mode = 'stone'
    boat.squashV += 5
    emit(w, 'thock', piece.kind === 'bark' ? 1 : piece.kind === 'walnut' ? 1.3 : 1.5)
    return
  }
  const kind = piece.kind as Kind
  const on = piece.place.on
  if (on === 'mast') emit(w, 'snap', kind === 'stalk' ? 0.8 : kind === 'stem' ? 1.25 : 1)
  else if (on === 'sail') {
    if (kind === 'feather') { emit(w, 'shimmer'); piece.swingV += 5 }
    else emit(w, 'zip', kind === 'maple' ? 0.85 : 1.1)
  } else if (kind === 'berry') { piece.roll = 1; emit(w, 'pip') }
  else if (kind === 'pebble') { boat.groan = true; emit(w, 'clunk') }
  else if (kind === 'cap') emit(w, 'tok')
  else emit(w, 'flump', kind === 'feather' ? 1.4 : kind === 'birch' ? 1.15 : 1)
  const heavy = MAKINGS[kind].weight
  boat.leanV += (seatOf(piece, w.pieces).x > 0 ? 1 : -1) * (0.5 + heavy * 0.25)
  boat.dipV += 30 + heavy * 22
  boat.squashV += 1.5 + heavy * 0.9
  // The gnome answers the exact thing, once he is aboard to answer; a thing put back where it was is no news.
  if (!piece.back && w.gnomeAt === 'aboard' && slotOf(piece, w.pieces)) startAct(w, OPINIONS[opinionOf(kind, on)])
  piece.back = false
}
