import type { Kind } from './kinds'
import { PIECE_SHARE, PIZZA, TOP_SHARE, TUB, onPizza, tubPlace } from './layout'
import { rollsIn } from './pieceMotion'
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

/** A piece on the pizza. `age` is how many seconds ago it came down; a piece found lying there is old. */
export type Piece = { id: number; kind: Kind; x: number; y: number; turn: number; settle: Spring; age: number }

/** The age of a piece that was not just laid. */
export const AT_REST = 9

export type Flight = {
  kind: Kind
  turn: number
  from: { x: number; y: number }
  to: { x: number; y: number }
  /** 0 to 1 through the flight, which takes `lasts` seconds. */
  t: number
  lasts: number
  /** It was lifted off the pizza, so it looks as the pieces on the pizza look: toasted, if the pizza is baked. */
  lifted: boolean
  /** Where it ends: on the pizza at this spot, home in its tub, or off the heap and home. */
  end: { on: 'pizza'; x: number; y: number } | { on: 'tub'; tub: number } | { on: 'bounce'; tub: number; home: { x: number; y: number } } | { on: 'roll'; tub: number } | { on: 'mouth' }
}

export type Hand = { kind: Kind; turn: number; x: number; y: number; tub: number; from: { x: number; y: number } | null; waiting: boolean }

export type TableEvent =
  | { type: 'pop'; kind: Kind }
  | { type: 'plop'; kind: Kind; count: number }
  | { type: 'pip'; kind: Kind; count: number }
  | { type: 'home'; kind: Kind }
  | { type: 'boing'; kind: Kind }
  /** A piece let go off the pizza touched the table, on its way home. */
  | { type: 'bounce'; kind: Kind }
  /** A piece reached a customer's mouth. */
  | { type: 'fed'; kind: Kind }
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

/**
 * How a piece lies on its spot: every spot has its own turn, so a piece is
 * found lying as it was left without its turn being saved. The spot is taken
 * to three places, as a save keeps it. A sock turns less than the others, so
 * that it always lies down and never stands on its toe or its heel.
 */
export function turnAt(x: number, y: number, kind?: Kind): number {
  const rx = Math.round(x * 1000), ry = Math.round(y * 1000)
  const mixed = Math.sin(rx * 12.9898 + ry * 78.233) * 43758.5453
  return lean(kind, mixed - Math.floor(mixed))
}

/** A turn for a piece of a kind from a number from 0 to 1: anywhere in the kind's own range. */
export function lean(kind: Kind | undefined, share: number): number {
  if (kind === 'sock') return SOCK_LEANS[0] + share * (SOCK_LEANS[1] - SOCK_LEANS[0])
  // A wedge of cheese lies on its long side too: stood on its tall end it would be a triangle on its base.
  return kind === 'cheese' ? (share - 0.5) * 0.8 : (share - 0.5) * 1.6
}

/** The turns a sock may lie at, on top of the tip of its own outline (kinds.ts): from 0.2 one way to 0.6 the other in all, so it always lies down. */
export const SOCK_LEANS = [-0.4, 0.4] as const

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
  // No gap big enough as the pieces lie, though the pizza is not full: the ones lying there shuffle up.
  return makeRoom(table, table.rng.range(-0.2, 0.2), table.rng.range(-0.2, 0.2))
}

/** Twelve spots that always fit: three round the middle and nine round the edge. */
function ringSpots(): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = []
  for (let i = 0; i < 3; i++) out.push({ x: Math.cos((i / 3) * Math.PI * 2) * APART * 0.6, y: Math.sin((i / 3) * Math.PI * 2) * APART * 0.6 })
  for (let i = 0; i < 9; i++) out.push({ x: Math.cos((i / 9) * Math.PI * 2 + 0.3) * REACH, y: Math.sin((i / 9) * Math.PI * 2 + 0.3) * REACH })
  return out
}

/**
 * Makes room for one more piece near (x, y) by nudging the pieces that lie
 * there apart, as a hand would. Returns the new piece's spot. The pieces at
 * rest are moved; a piece still in the air keeps the spot it was promised,
 * unless nothing else will make room: then it is sent to another.
 */
export function makeRoom(table: Table, x: number, y: number): { x: number; y: number } | null {
  if (claimed(table).length >= CAPACITY) return null
  const fixed = table.flights.flatMap((f) => (f.end.on === 'pizza' ? [{ x: f.end.x, y: f.end.y }] : []))
  const free = [...table.pieces.map((p) => ({ x: p.x, y: p.y })), { x, y }]
  const hold = (p: { x: number; y: number }): void => {
    const d = Math.hypot(p.x, p.y)
    if (d > REACH) { p.x *= REACH / d; p.y *= REACH / d }
  }
  let settled = false
  for (let pass = 0; pass < 400 && !settled; pass++) {
    settled = true
    for (let i = 0; i < free.length; i++) {
      for (const other of [...free.slice(i + 1), ...fixed]) {
        let dx = free[i].x - other.x, dy = free[i].y - other.y
        let d = Math.hypot(dx, dy)
        if (d >= APART) continue
        settled = false
        if (d < 1e-6) { dx = 0.01 * (i + 1); dy = 0.013; d = Math.hypot(dx, dy) }
        const push = ((APART - d) / d) * 0.52
        const moves = fixed.includes(other) ? 1 : 0.5
        free[i].x += dx * push * moves; free[i].y += dy * push * moves
        if (moves < 1) { other.x -= dx * push * 0.5; other.y -= dy * push * 0.5; hold(other) }
        hold(free[i])
      }
    }
  }
  if (!settled) {
    // Too tangled to nudge apart: everything goes to the spots that always fit, each piece to the nearest one left.
    // The pieces still in the air go first and are sent to one of those spots too, so there is always room for
    // twelve, however fast the taps come.
    const spots = ringSpots()
    const nearest = (p: { x: number; y: number }) => {
      let best = 0
      for (let i = 1; i < spots.length; i++) if (Math.hypot(spots[i].x - p.x, spots[i].y - p.y) < Math.hypot(spots[best].x - p.x, spots[best].y - p.y)) best = i
      return spots.splice(best, 1)[0]
    }
    for (const f of table.flights) {
      if (f.end.on !== 'pizza') continue
      const spot = nearest(f.end)
      f.end = { on: 'pizza', x: spot.x, y: spot.y }
      const at = onPizza(spot.x, spot.y)
      f.to = { x: at.x - rollsIn(f.kind), y: at.y }
    }
    for (const p of free) {
      const spot = nearest(p)
      p.x = spot.x; p.y = spot.y
    }
  }
  table.pieces.forEach((piece, i) => {
    if (piece.x !== free[i].x || piece.y !== free[i].y) kick(piece.settle, 4)
    piece.x = free[i].x
    piece.y = free[i].y
  })
  return free[free.length - 1]
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
  return makeRoom(table, x, y)
}

function fly(table: Table, kind: Kind, turn: number, from: { x: number; y: number }, to: { x: number; y: number }, end: Flight['end'], lifted = false): void {
  const lasts = Math.min(0.4, Math.max(0.18, Math.hypot(to.x - from.x, to.y - from.y) / 1200))
  // An olive comes down a finger-width short of its spot and rolls there (pieceMotion.ts).
  if (end.on === 'pizza') to = { x: to.x - rollsIn(kind), y: to.y }
  table.flights.push({ kind, turn, from, to, lifted, t: 0, lasts: end.on === 'bounce' ? 0.62 : end.on === 'roll' ? 0.6 : lasts, end })
}

/** Touch-down on a tub: it squashes and one piece pops up into the hand. The answer to the touch starts here. */
export function pressTub(table: Table, index: number): void {
  const tub = table.tubs[index]
  const at = tubAt(table, index)
  tub.squash.v -= 7
  table.hand = { kind: tub.kind, turn: tub.kind === 'sock' ? lean('sock', table.rng.next()) : table.rng.range(-0.5, 0.5), x: at.x, y: at.y - TUB.r * 0.9, tub: index, from: null, waiting: false }
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
    fly(table, hand.kind, hand.turn, from, tubAt(table, hand.tub), { on: 'tub', tub: hand.tub }, hand.from !== null)
    table.events.push({ type: 'pip', kind: hand.kind, count: table.pieces.length })
    return
  }
  const spot = freeSpot(table)
  if (spot) fly(table, hand.kind, hand.turn, from, onPizza(spot.x, spot.y), { on: 'pizza', x: spot.x, y: spot.y }, hand.from !== null)
  else fly(table, hand.kind, hand.turn, from, { x: PIZZA.x, y: PIZZA.y - PIZZA.r * 0.3 }, { on: 'bounce', tub: hand.tub, home: tubAt(table, hand.tub) }, hand.from !== null)
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
  if (spot) fly(table, hand.kind, hand.turn, from, onPizza(spot.x, spot.y), { on: 'pizza', x: spot.x, y: spot.y }, hand.from !== null)
  // Let go over a pizza that is full, it bounces off the heap like a tapped one.
  else if (Math.hypot(sx, sy) <= 1.02) fly(table, hand.kind, hand.turn, from, { x: PIZZA.x, y: PIZZA.y - PIZZA.r * 0.3 }, { on: 'bounce', tub: hand.tub, home: tubAt(table, hand.tub) }, hand.from !== null)
  else {
    // Let go anywhere else, it bounces once on the table and rolls back into its tub.
    fly(table, hand.kind, hand.turn, from, tubAt(table, hand.tub), { on: 'roll', tub: hand.tub }, hand.from !== null)
    if (hand.from) table.events.push({ type: 'pip', kind: hand.kind, count: table.pieces.length })
  }
}

/** A carried piece with no pizza to lie on: from where it was let go it drops to the table, bounces once and rolls back into its tub. */
export function sendHome(table: Table): void {
  const hand = table.hand
  if (!hand) return
  table.hand = null
  fly(table, hand.kind, hand.turn, { x: hand.x, y: hand.y }, tubAt(table, hand.tub), { on: 'roll', tub: hand.tub }, hand.from !== null)
  if (hand.from) table.events.push({ type: 'pip', kind: hand.kind, count: table.pieces.length })
}

/** Whether the piece in the hand came out of a tub and is still at that tub: a tap that slid a little, and not a carry. */
export function stillAtTub(table: Table): boolean {
  const hand = table.hand
  if (!hand || hand.from) return false
  const tub = tubAt(table, hand.tub)
  return Math.hypot(hand.x - tub.x, hand.y - tub.y) <= TUB.r * 1.7
}

/** Whether a piece is on its way to the customer's mouth. */
export function feeding(table: Table): boolean {
  return table.flights.some((f) => f.end.on === 'mouth')
}

/** The press ended without a tap or a carry: the piece goes back where it came from, and nothing has changed. */
export function releaseHand(table: Table): void {
  const hand = table.hand
  if (!hand) return
  table.hand = null
  if (hand.from) table.pieces.push({ id: table.nextId++, kind: hand.kind, x: hand.from.x, y: hand.from.y, turn: turnAt(hand.from.x, hand.from.y, hand.kind), settle: spring(), age: AT_REST })
}

/** Kicks a spring, and never past `most`: a storm of taps makes things bob as hard as one good knock, not harder with every tap. */
function kick(s: Spring, by: number, most = 10): void {
  s.v = Math.max(-most, Math.min(most, s.v + by))
}

/** A tap on the pizza itself: everything on it wobbles. */
export function jigglePizza(table: Table, by = 5): void {
  kick(table.jiggle, by, 5)
  for (const piece of table.pieces) kick(piece.settle, table.rng.range(7, 11))
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
  for (const piece of table.pieces) {
    stepSpring(piece.settle, 0, dt, 300, 13)
    piece.age += dt
  }
  for (let i = table.flights.length - 1; i >= 0; i--) {
    const f = table.flights[i]
    const before = f.t
    f.t += dt / f.lasts
    // The moment it comes off the heap, or touches the table: heard as it happens.
    if (f.end.on === 'bounce' && before < BOUNCE_AT && f.t >= BOUNCE_AT) table.events.push({ type: 'boing', kind: f.kind })
    if (f.end.on === 'roll' && before < ROLL_AT && f.t >= ROLL_AT) table.events.push({ type: 'bounce', kind: f.kind })
    if (f.t < 1) continue
    table.flights.splice(i, 1)
    if (f.end.on === 'pizza') {
      const settle = spring()
      settle.v = 9
      table.pieces.push({ id: table.nextId++, kind: f.kind, x: f.end.x, y: f.end.y, turn: turnAt(f.end.x, f.end.y, f.kind), settle, age: 0 })
      kick(table.jiggle, 3.2, 5)
      // The pieces already lying there bob, enough to be seen.
      for (const piece of table.pieces) kick(piece.settle, 7.5)
      // The note follows how many lie on the pizza, of every kind together.
      table.events.push({ type: 'plop', kind: f.kind, count: table.pieces.length })
    } else if (f.end.on === 'mouth') table.events.push({ type: 'fed', kind: f.kind })
    else {
      table.tubs[f.end.tub].squash.v -= 4
      table.events.push({ type: 'home', kind: f.kind })
    }
  }
}

/** The piece in the hand flies to a mouth at `to`, in stage units, and is eaten there. */
export function feedHand(table: Table, to: { x: number; y: number }): void {
  const hand = table.hand
  if (!hand) return
  table.hand = null
  if (hand.from) table.events.push({ type: 'pip', kind: hand.kind, count: table.pieces.length })
  fly(table, hand.kind, hand.turn, { x: hand.x, y: hand.y }, to, { on: 'mouth' }, hand.from !== null)
}

/** A piece comes flying out of a mouth at `from` and lands back in its tub. */
export function spitHome(table: Table, kind: Kind, from: { x: number; y: number }): void {
  const tub = table.tubs.findIndex((t) => t.kind === kind)
  if (tub >= 0) fly(table, kind, 0, from, tubAt(table, tub), { on: 'tub', tub })
}

/**
 * The piece at this spot of the pizza, or on its way there, goes back into its tub: the customer takes back the piece
 * it showed with. No note sounds for it, so the child's own first piece lands on the first step. True if there was one.
 */
export function takeBack(table: Table, spot: { x: number; y: number }): boolean {
  const near = (x: number, y: number) => Math.hypot(x - spot.x, y - spot.y) < 1e-6
  const i = table.pieces.findIndex((p) => near(p.x, p.y))
  if (i >= 0) {
    const [piece] = table.pieces.splice(i, 1)
    const tub = table.tubs.findIndex((t) => t.kind === piece.kind)
    if (tub >= 0) fly(table, piece.kind, piece.turn, onPizza(piece.x, piece.y), tubAt(table, tub), { on: 'tub', tub }, true)
    return true
  }
  const f = table.flights.find((flight) => flight.end.on === 'pizza' && near(flight.end.x, flight.end.y))
  if (!f) return false
  const tub = table.tubs.findIndex((t) => t.kind === f.kind)
  if (tub < 0) return false
  const at = flightAt(f)
  f.from = { x: at.x, y: at.y }
  f.to = tubAt(table, tub)
  f.t = 0
  f.end = { on: 'tub', tub }
  return true
}

/** One piece hops out of a tub by itself and flies to a spot on the pizza: the customer poked the tub. */
export function hopFromTub(table: Table, index: number, spot: { x: number; y: number }): void {
  const tub = table.tubs[index]
  if (!tub) return
  const at = tubAt(table, index)
  tub.squash.v -= 7
  table.events.push({ type: 'pop', kind: tub.kind })
  fly(table, tub.kind, table.rng.range(-0.5, 0.5), { x: at.x, y: at.y - TUB.r * 0.9 }, onPizza(spot.x, spot.y), { on: 'pizza', x: spot.x, y: spot.y })
}

/** Everything in the air comes down at once, and the hand is emptied: the pizza is about to leave the board. */
export function landNow(table: Table): void {
  releaseHand(table)
  for (const f of table.flights) f.t = 1
  stepTable(table, 0)
}

/** How far through its flight a piece comes off a full pizza, and how far through a piece let go off the pizza touches the table. */
export const BOUNCE_AT = 0.45
export const ROLL_AT = 0.3

/** Where a flight is now, in stage units, with the arc it flies and how far it has turned. */
export function flightAt(f: Flight): { x: number; y: number; turn: number } {
  const t = Math.min(1, f.t)
  if (f.end.on === 'bounce') {
    // Out to the heap, off it, and home: two arcs.
    const out = t < BOUNCE_AT
    const k = out ? t / BOUNCE_AT : (t - BOUNCE_AT) / (1 - BOUNCE_AT)
    // Home is its tub, wherever it was thrown or let go from.
    const a = out ? f.from : f.to, b = out ? f.to : f.end.home
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * (out ? 120 : 170), turn: f.turn + t * 9 }
  }
  if (f.end.on === 'roll') {
    // Down onto the table under where it was let go, one bounce, and home.
    const ground = { x: f.from.x, y: f.from.y + 44 }
    if (t < ROLL_AT) {
      const k = t / ROLL_AT
      return { x: f.from.x, y: f.from.y + (ground.y - f.from.y) * k * k, turn: f.turn + t * 3 }
    }
    const k = (t - ROLL_AT) / (1 - ROLL_AT)
    return { x: ground.x + (f.to.x - ground.x) * k, y: ground.y + (f.to.y - ground.y) * k - Math.sin(k * Math.PI) * 90, turn: f.turn + t * 7 }
  }
  const arc = f.end.on === 'mouth' ? 60 : Math.min(150, Math.max(26, Math.hypot(f.to.x - f.from.x, f.to.y - f.from.y) * 0.32))
  return { x: f.from.x + (f.to.x - f.from.x) * t, y: f.from.y + (f.to.y - f.from.y) * t - Math.sin(t * Math.PI) * arc, turn: f.turn + (1 - t) * (f.end.on === 'pizza' ? 2.4 : -3) }
}

/**
 * The pieces as a save holds them: nothing is saved in the air. A piece on
 * its way to the pizza is saved where it will land; a piece in the hand is
 * saved on the spot it was picked up from, or not at all if it came from a tub.
 */
export function restingPieces(table: Table): { kind: Kind; x: number; y: number }[] {
  const out = table.pieces.map((p) => ({ kind: p.kind, x: p.x, y: p.y }))
  for (const f of table.flights) if (f.end.on === 'pizza') out.push({ kind: f.kind, x: f.end.x, y: f.end.y })
  if (table.hand?.from) out.push({ kind: table.hand.kind, x: table.hand.from.x, y: table.hand.from.y })
  return out
}
