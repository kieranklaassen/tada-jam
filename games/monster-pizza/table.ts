import type { Kind } from './kinds'
import { PIECE_SHARE, PIZZA, TOP_SHARE, TUB, onPizza, tubPlace } from './layout'
import { makeRng, type Rng } from './rng'
import { spring, stepSpring, type Spring } from './spring'

// The table: the tubs, the pizza and the pieces on it, and whatever is in the
// air or in the hand. This is the toy, and the school skill with it: one
// touch on a tub puts out exactly one piece. Pure and on game time: no
// drawing, no sound, no clock. What happened is left in `events` for the
// Mount to sound.

/** The pizza has room for twelve, so that too many can happen on an order of ten. */
export const CAPACITY = 12
/** Two pieces never lie closer than this, in shares of the pizza's radius. */
export const APART = PIECE_SHARE * 2.12
/** A piece's centre stays within this share of the pizza's radius. */
export const REACH = TOP_SHARE - PIECE_SHARE

export type Piece = { id: number; kind: Kind; x: number; y: number; turn: number; settle: Spring }

export type Flight = {
  kind: Kind
  turn: number
  from: { x: number; y: number }
  to: { x: number; y: number }
  /** 0 to 1 through the flight, which takes `lasts` seconds. */
  t: number
  lasts: number
  /** Where it ends: on the pizza at this spot, home in its tub, or off the heap and home. */
  end: { on: 'pizza'; x: number; y: number } | { on: 'tub'; tub: number } | { on: 'bounce'; tub: number }
}

export type Hand = { kind: Kind; turn: number; x: number; y: number; tub: number; from: { x: number; y: number } | null; waiting: boolean }

export type TableEvent =
  | { type: 'pop'; kind: Kind }
  | { type: 'plop'; kind: Kind; count: number }
  | { type: 'pip'; kind: Kind; count: number }
  | { type: 'home'; kind: Kind }
  | { type: 'boing'; kind: Kind }
  | { type: 'jiggle' }

export type Table = {
  tubs: { kind: Kind; squash: Spring }[]
  pieces: Piece[]
  flights: Flight[]
  hand: Hand | null
  /** The whole pizza's wobble. */
  jiggle: Spring
  events: TableEvent[]
  rng: Rng
  nextId: number
}

export function makeTable(kinds: readonly Kind[], seed: number): Table {
  return { tubs: kinds.map((kind) => ({ kind, squash: spring() })), pieces: [], flights: [], hand: null, jiggle: spring(), events: [], rng: makeRng(seed), nextId: 1 }
}

export function tubAt(table: Table, index: number): { x: number; y: number } {
  return tubPlace(index, table.tubs.length)
}

export function countOf(table: Table, kind: Kind): number {
  return table.pieces.reduce((n, piece) => n + (piece.kind === kind ? 1 : 0), 0)
}

/** Pieces lying on the pizza and pieces on their way to it. */
function claimed(table: Table): { x: number; y: number }[] {
  const spots: { x: number; y: number }[] = table.pieces.map((p) => ({ x: p.x, y: p.y }))
  for (const f of table.flights) if (f.end.on === 'pizza') spots.push({ x: f.end.x, y: f.end.y })
  return spots
}

function clear(spots: { x: number; y: number }[], x: number, y: number): boolean {
  if (Math.hypot(x, y) > REACH) return false
  return spots.every((s) => Math.hypot(s.x - x, s.y - y) >= APART)
}

/** A free spot for a piece that was tapped out: scattered, as toppings are. Null when the pizza is full. */
export function freeSpot(table: Table): { x: number; y: number } | null {
  const spots = claimed(table)
  if (spots.length >= CAPACITY) return null
  for (let i = 0; i < 60; i++) {
    const a = table.rng.range(0, Math.PI * 2), r = REACH * Math.sqrt(table.rng.next())
    const x = Math.cos(a) * r, y = Math.sin(a) * r
    if (clear(spots, x, y)) return { x, y }
  }
  // Crowded: walk a fine grid for any room at all.
  for (let gy = -REACH; gy <= REACH; gy += 0.04) for (let gx = -REACH; gx <= REACH; gx += 0.04) if (clear(spots, gx, gy)) return { x: gx, y: gy }
  return null
}

/** The clear spot nearest to where a carried piece was let go, or null when there is none close by. */
export function spotNear(table: Table, x: number, y: number): { x: number; y: number } | null {
  const spots = claimed(table)
  if (spots.length >= CAPACITY) return null
  const d = Math.hypot(x, y)
  if (d > REACH) { x *= REACH / d; y *= REACH / d }
  if (clear(spots, x, y)) return { x, y }
  for (let ring = 1; ring <= 14; ring++) {
    const r = ring * 0.05
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r
      if (clear(spots, px, py)) return { x: px, y: py }
    }
  }
  return null
}

function fly(table: Table, kind: Kind, turn: number, from: { x: number; y: number }, to: { x: number; y: number }, end: Flight['end']): void {
  const lasts = Math.min(0.4, Math.max(0.18, Math.hypot(to.x - from.x, to.y - from.y) / 1200))
  table.flights.push({ kind, turn, from, to, t: 0, lasts: end.on === 'bounce' ? 0.62 : lasts, end })
}

/** Touch-down on a tub: it squashes and one piece pops up into the hand. The answer to the touch starts here. */
export function pressTub(table: Table, index: number): void {
  const tub = table.tubs[index]
  const at = tubAt(table, index)
  tub.squash.v -= 7
  table.hand = { kind: tub.kind, turn: table.rng.range(-0.5, 0.5), x: at.x, y: at.y - TUB.r * 0.9, tub: index, from: null, waiting: false }
  table.events.push({ type: 'pop', kind: tub.kind })
}

/** Touch-down on a piece that lies on the pizza: it comes up into the hand, and its spot is remembered. */
export function pressPiece(table: Table, id: number): void {
  const i = table.pieces.findIndex((p) => p.id === id)
  if (i < 0) return
  const [piece] = table.pieces.splice(i, 1)
  const at = onPizza(piece.x, piece.y)
  const tub = Math.max(0, table.tubs.findIndex((t) => t.kind === piece.kind))
  table.hand = { kind: piece.kind, turn: piece.turn, x: at.x, y: at.y - 10, tub, from: { x: piece.x, y: piece.y }, waiting: false }
  table.events.push({ type: 'pop', kind: piece.kind })
}

/** The finger lifted where it landed. A piece from a tub flies to a free spot; a piece from the pizza hops home. */
export function tapHand(table: Table): void {
  const hand = table.hand
  if (!hand) return
  table.hand = null
  const from = { x: hand.x, y: hand.y }
  if (hand.from) {
    fly(table, hand.kind, hand.turn, from, tubAt(table, hand.tub), { on: 'tub', tub: hand.tub })
    table.events.push({ type: 'pip', kind: hand.kind, count: countOf(table, hand.kind) })
    return
  }
  const spot = freeSpot(table)
  if (spot) fly(table, hand.kind, hand.turn, from, onPizza(spot.x, spot.y), { on: 'pizza', x: spot.x, y: spot.y })
  else fly(table, hand.kind, hand.turn, from, { x: PIZZA.x, y: PIZZA.y - PIZZA.r * 0.3 }, { on: 'bounce', tub: hand.tub })
}

/** The finger moved: the piece in the hand goes with it. */
export function carry(table: Table, x: number, y: number): void {
  if (!table.hand) return
  table.hand.x = x
  table.hand.y = y
  table.hand.waiting = false
}

/** The finger let go mid-carry and may come back: the piece waits where it is. */
export function waitHand(table: Table): void {
  if (table.hand) table.hand.waiting = true
}

/** The carry is over. On the pizza the piece is laid where it was let go, or as near as there is room; anywhere else it rolls home. */
export function dropHand(table: Table): void {
  const hand = table.hand
  if (!hand) return
  table.hand = null
  const sx = (hand.x - PIZZA.x) / PIZZA.r, sy = (hand.y - PIZZA.y) / PIZZA.r
  const spot = Math.hypot(sx, sy) <= 1.02 ? spotNear(table, sx, sy) : null
  const from = { x: hand.x, y: hand.y }
  if (spot) fly(table, hand.kind, hand.turn, from, onPizza(spot.x, spot.y), { on: 'pizza', x: spot.x, y: spot.y })
  else {
    fly(table, hand.kind, hand.turn, from, tubAt(table, hand.tub), { on: 'tub', tub: hand.tub })
    if (hand.from) table.events.push({ type: 'pip', kind: hand.kind, count: countOf(table, hand.kind) })
  }
}

/** The press ended without a tap or a carry: the piece goes back where it came from, and nothing has changed. */
export function releaseHand(table: Table): void {
  const hand = table.hand
  if (!hand) return
  table.hand = null
  if (hand.from) table.pieces.push({ id: table.nextId++, kind: hand.kind, x: hand.from.x, y: hand.from.y, turn: hand.turn, settle: spring() })
}

/** A tap on the pizza itself: everything on it wobbles. */
export function jigglePizza(table: Table, by = 5): void {
  table.jiggle.v += by
  for (const piece of table.pieces) piece.settle.v += table.rng.range(1.5, 3.5)
  table.events.push({ type: 'jiggle' })
}

/** What a touch at this point of the stage lands on. Pieces are over the pizza, and the pizza over nothing. */
export function whatIsAt(table: Table, x: number, y: number): { what: 'tub'; index: number } | { what: 'piece'; id: number } | { what: 'pizza' } | null {
  for (let i = 0; i < table.tubs.length; i++) {
    const at = tubAt(table, i)
    if (Math.hypot(x - at.x, y - at.y) <= TUB.r * 1.22) return { what: 'tub', index: i }
  }
  const sx = (x - PIZZA.x) / PIZZA.r, sy = (y - PIZZA.y) / PIZZA.r
  let best: Piece | null = null, bestD = PIECE_SHARE * 1.5
  for (const piece of table.pieces) {
    const d = Math.hypot(piece.x - sx, piece.y - sy)
    if (d < bestD) { best = piece; bestD = d }
  }
  if (best) return { what: 'piece', id: best.id }
  if (Math.hypot(sx, sy) <= 1.06) return { what: 'pizza' }
  return null
}

/** Plays `dt` seconds of game time. */
export function stepTable(table: Table, dt: number): void {
  for (const tub of table.tubs) stepSpring(tub.squash, 0, dt, 320, 14)
  stepSpring(table.jiggle, 0, dt, 180, 9)
  for (const piece of table.pieces) stepSpring(piece.settle, 0, dt, 300, 13)
  for (let i = table.flights.length - 1; i >= 0; i--) {
    const f = table.flights[i]
    f.t += dt / f.lasts
    if (f.t < 1) continue
    table.flights.splice(i, 1)
    if (f.end.on === 'pizza') {
      const settle = spring()
      settle.v = 9
      table.pieces.push({ id: table.nextId++, kind: f.kind, x: f.end.x, y: f.end.y, turn: f.turn, settle })
      table.jiggle.v += 3.2
      for (const piece of table.pieces) piece.settle.v += 1.4
      table.events.push({ type: 'plop', kind: f.kind, count: countOf(table, f.kind) })
    } else {
      table.tubs[f.end.tub].squash.v -= 4
      table.events.push({ type: 'home', kind: f.kind })
    }
  }
}

/** Where a flight is now, in stage units, with the arc it flies and how far it has turned. */
export function flightAt(f: Flight): { x: number; y: number; turn: number } {
  const t = Math.min(1, f.t)
  if (f.end.on === 'bounce') {
    // Out to the heap, off it, and home: two arcs.
    const out = t < 0.45
    const k = out ? t / 0.45 : (t - 0.45) / 0.55
    const tubHome = { x: f.from.x, y: f.from.y + TUB.r * 0.9 }
    const a = out ? f.from : f.to, b = out ? f.to : tubHome
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * (out ? 120 : 170), turn: f.turn + t * 9 }
  }
  const arc = Math.min(150, Math.max(26, Math.hypot(f.to.x - f.from.x, f.to.y - f.from.y) * 0.32))
  return { x: f.from.x + (f.to.x - f.from.x) * t, y: f.from.y + (f.to.y - f.from.y) * t - Math.sin(t * Math.PI) * arc, turn: f.turn + (1 - t) * (f.end.on === 'pizza' ? 2.4 : -3) }
}

/**
 * The pieces as a save holds them: nothing is saved in the air. A piece on
 * its way to the pizza is saved where it will land; a piece in the hand is
 * saved on the spot it was picked up from, or not at all if it came from a tub.
 */
export function restingPieces(table: Table): { kind: Kind; x: number; y: number; turn: number }[] {
  const out = table.pieces.map((p) => ({ kind: p.kind, x: p.x, y: p.y, turn: p.turn }))
  for (const f of table.flights) if (f.end.on === 'pizza') out.push({ kind: f.kind, x: f.end.x, y: f.end.y, turn: f.turn })
  if (table.hand?.from) out.push({ kind: table.hand.kind, x: table.hand.from.x, y: table.hand.from.y, turn: table.hand.turn })
  return out
}
