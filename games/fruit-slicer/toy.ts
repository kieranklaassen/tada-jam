import type { Game } from './cycle'
import { FRUITS, WHOLE, type Fruit } from './measure'
import { CRATE, DOG, PX, boxOf, shown, under, type Box, type Point } from './stage'
import { pick } from './stream'
import type { VoiceId } from './voices'
import { cut, landFruit, pieceOf, type Piece, type World } from './world'

// The toy: what a stroke and a tap do, with nobody asking for anything. A
// stroke that crosses the middle line of a fruit or a piece cuts it square at
// that place; a tap pokes whatever is under it. Each move returns the new game
// and what happened, in order, for the view to act out and the sound to play.
// Pure: points are in stage units, and nothing here draws or reads a clock.
//
// It holds the cells of the grid that need no customer: slice and poke, on
// the fruit, a piece, the crate and the dog. The rest come with the game.

export type ToyEvent =
  /** A piece was cut in two at (x, y). `length` is the length of the piece before the cut: the shorter, the higher it sounds. */
  | { kind: 'cut'; left: number; right: number; fruit: Fruit; length: number; x: number; y: number; h: number; voice: VoiceId }
  /** The stroke was too near an end to make a piece: a curl of peel comes off for the dog. */
  | { kind: 'curl'; id: number; fruit: Fruit; length: number; x: number; y: number; voice: VoiceId }
  | { kind: 'poke'; id: number; fruit: Fruit; length: number; voice: VoiceId }
  /** A fresh fruit lands on the board from the crate. */
  | { kind: 'land'; id: number; fruit: Fruit; length: number; voice: VoiceId }
  /** These pieces were shoved off the far lane onto the shelf; each was at `from`. */
  | { kind: 'swept'; ids: number[]; from: Box[] }
  /** A piece dropped off the old end of the shelf to the dog, from `from`. It is gone from the world. */
  | { kind: 'fell'; piece: Piece; from: Box; voice: VoiceId }
  | { kind: 'spill'; voice: VoiceId }
  | { kind: 'snap'; x: number; y: number; voice: VoiceId }
  | { kind: 'bark'; voice: VoiceId }
  /** A tap on something bare: the board, the shelf, the counter or the wall. */
  | { kind: 'knock'; x: number; y: number; on: 'board' | 'shelf' | 'counter' | 'wall'; voice: VoiceId }

/** What one stroke has done so far, so that it cuts each piece once and bothers the crate and the dog once. */
export type Stroke = { made: number[]; crate: boolean; dog: boolean; cuts: number; travelled: number }
export const newStroke = (): Stroke => ({ made: [], crate: false, dog: false, cuts: 0, travelled: 0 })

/** Whether the segment from a to b touches a box (Liang and Barsky). */
export function touches(a: Point, b: Point, box: Box): boolean {
  let t0 = 0, t1 = 1
  const dx = b.x - a.x, dy = b.y - a.y
  for (const [p, q] of [[-dx, a.x - box.x], [dx, box.x + box.w - a.x], [-dy, a.y - box.y], [dy, box.y + box.h - a.y]]) {
    if (p === 0) {
      if (q < 0) return false
      continue
    }
    const r = q / p
    if (p < 0) t0 = Math.max(t0, r)
    else t1 = Math.min(t1, r)
    if (t0 > t1) return false
  }
  return true
}

/** The pieces that left the world between two states of it, as they were, with where each was drawn. */
function gone(before: World, ids: readonly number[]): { piece: Piece; from: Box }[] {
  return ids.flatMap((id) => {
    const piece = pieceOf(before, id)
    const from = piece && boxOf(piece)
    return piece && from ? [{ piece, from }] : []
  })
}

function fellEvents(before: World, ids: readonly number[]): ToyEvent[] {
  return gone(before, ids).map(({ piece, from }) => ({ kind: 'fell', piece, from, voice: 'munch' }))
}

/** A fresh fruit lands: on an empty lane, or on the far lane, shoving what lay there onto the shelf and the shelf's oldest to the dog. */
function land(game: Game, fruit: Fruit): { game: Game; events: ToyEvent[] } {
  const landed = landFruit(game.world, fruit)
  const swept = gone(game.world, landed.swept)
  const events: ToyEvent[] = []
  if (swept.length > 0) events.push({ kind: 'swept', ids: swept.map(({ piece }) => piece.id), from: swept.map(({ from }) => from) })
  events.push(...fellEvents(game.world, landed.fell))
  events.push({ kind: 'land', id: landed.id, fruit, length: pieceOf(landed.world, landed.id)!.length, voice: 'thump' })
  return { game: { ...game, world: landed.world }, events }
}

/**
 * One step of a stroke, from a to b. Every fruit or piece whose middle line the step crosses is cut square
 * where it crosses, in the order the blade meets them; a piece this stroke made is not cut again by it. A
 * step through the crate splits a slat and one fruit of each kind tumbles out; a step past the dog makes it snap.
 */
export function slice(game: Game, a: Point, b: Point, stroke: Stroke): { game: Game; stroke: Stroke; events: ToyEvent[] } {
  const events: ToyEvent[] = []
  const next: Stroke = { ...stroke, made: [...stroke.made], travelled: stroke.travelled + Math.hypot(b.x - a.x, b.y - a.y) }
  const met: { t: number; id: number; x: number; y: number; h: number; at: number }[] = []
  for (const { piece, box } of shown(game.world)) {
    const mid = box.y + box.h / 2
    if ((a.y - mid) * (b.y - mid) >= 0) continue
    const t = (mid - a.y) / (b.y - a.y)
    const x = a.x + t * (b.x - a.x)
    if (x >= box.x && x <= box.x + box.w) met.push({ t, id: piece.id, x, y: mid, h: box.h, at: (x - box.x) / PX })
  }
  let world = game.world
  for (const hit of met.sort((p, q) => p.t - q.t)) {
    if (next.made.includes(hit.id)) continue
    const piece = pieceOf(world, hit.id)
    if (!piece) continue
    const whole = piece.length
    const result = cut(world, hit.id, hit.at)
    if (result.kind === 'curl') {
      next.made.push(hit.id)
      events.push({ kind: 'curl', id: hit.id, fruit: piece.fruit, length: whole, x: hit.x, y: hit.y, voice: 'curl' })
    } else if (result.kind === 'cut') {
      next.made.push(result.left, result.right)
      next.cuts += 1
      events.push({ kind: 'cut', left: result.left, right: result.right, fruit: piece.fruit, length: whole, x: hit.x, y: hit.y, h: hit.h, voice: piece.place.on === 'board' && whole === WHOLE[piece.fruit] ? 'thwack' : 'snick' })
      // What dropped off the shelf is gone from the new world, so it is read from the one before. When the
      // piece that dropped is the left part of this very cut, it dropped at its new length.
      const before: World = { ...world, pieces: world.pieces.map((other) => (other.id === hit.id ? { ...other, length: Math.round(hit.at) } : other)) }
      events.push(...fellEvents(before, result.fell))
      world = result.world
    }
  }
  let now: Game = { ...game, world }
  if (!next.crate && touches(a, b, CRATE)) {
    next.crate = true
    events.push({ kind: 'spill', voice: 'split' })
    for (const fruit of FRUITS) {
      const landed = land(now, fruit)
      now = landed.game
      events.push(...landed.events)
    }
  }
  if (!next.dog && touches(a, b, DOG)) {
    next.dog = true
    events.push({ kind: 'snap', x: b.x, y: b.y, voice: 'chomp' })
  }
  return { game: now, stroke: next, events }
}

/**
 * A tap. A fruit quivers and gives its low note; a piece rings, higher the shorter it is; the crate drops a
 * fresh fruit on the board, of a kind drawn from the seeded stream while nobody has ordered; the dog barks.
 * Anything bare answers with a knock, so no tap lands in silence.
 */
export function poke(game: Game, p: Point): { game: Game; events: ToyEvent[] } {
  const hit = under(game.world, p)
  switch (hit.thing) {
    case 'fruit':
    case 'piece':
      return { game, events: [{ kind: 'poke', id: hit.piece.id, fruit: hit.piece.fruit, length: hit.piece.length, voice: hit.thing === 'fruit' ? 'quiver' : 'pluck' }] }
    case 'crate': {
      const kind = pick(game.seed, FRUITS)
      return land({ ...game, seed: kind.state }, game.window?.fruit ?? kind.value)
    }
    case 'dog':
      return { game, events: [{ kind: 'bark', voice: 'bark' }] }
    case 'nothing':
      return { game, events: [] }
    default:
      return { game, events: [{ kind: 'knock', x: p.x, y: p.y, on: hit.thing, voice: 'tickEnd' }] }
  }
}
