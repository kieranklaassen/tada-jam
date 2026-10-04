import { call, crate, sendOff, settle, type Ending, type Game } from './cycle'
import { FRUITS, WHOLE, shareLength, type Fruit } from './measure'
import { tinParts, wanted } from './orders'
import { served } from './serve'
import { CRATE, DOG, PX, QUEUE, WINDOW, shown, tinShape, under, type Box, type Point, type TinShape, type Under } from './stage'
import type { VoiceId } from './voices'
import { cut, landFruit, pieceOf, type Piece, type World } from './world'

// What a stroke and a tap do: the slice and the poke, on every thing of the
// grid. A stroke that crosses the middle line of a fruit or a piece cuts it
// square at that place; a tap pokes whatever is under it, and a tap on a
// customer is also the call and the send-off. Each move returns the new game
// and what happened, in order, for the view to act out and the sound to play.
// Pure: points are in stage units, and nothing here draws or reads a clock.
// Carrying, flinging and the roller are in carry.ts.

/** Which customer something happened to: the one at the window, or one of the two who wait. */
export type Whom = 'window' | 0 | 1

export type GameEvent =
  /** A piece was cut in two at (x, y). `length` is the length of the piece before the cut: the shorter, the higher it sounds. */
  | { kind: 'cut'; left: number; right: number; fruit: Fruit; length: number; x: number; y: number; h: number; voice: VoiceId }
  /** The stroke was too near an end to make a piece: a curl of peel comes off for the dog. */
  | { kind: 'curl'; id: number; fruit: Fruit; length: number; x: number; y: number; voice: VoiceId }
  | { kind: 'poke'; id: number; fruit: Fruit; length: number; voice: VoiceId }
  /** A fresh fruit lands on the board from the crate. */
  | { kind: 'land'; id: number; fruit: Fruit; length: number; voice: VoiceId }
  /** These pieces were shoved off the far lane onto the shelf; each was at `from`. */
  | { kind: 'swept'; ids: number[]; from: Box[] }
  /** A piece left the counter for the dog, from `from`: dropped off the shelf, given, flung, or burped across by the crate, which chews it for `after` seconds first. */
  | { kind: 'fell'; piece: Piece; from: Box; voice: VoiceId; after?: number }
  | { kind: 'spill'; voice: VoiceId }
  | { kind: 'snap'; x: number; y: number; voice: VoiceId }
  | { kind: 'bark'; voice: VoiceId }
  /** A tap on something bare: the board, the shelf, the counter, the wall, or the roller on its hook. */
  | { kind: 'knock'; x: number; y: number; on: 'board' | 'shelf' | 'counter' | 'wall' | 'roller'; voice: VoiceId }
  /** The blade skidded off the tin with sparks, and the tin rings at the pitch of its length. */
  | { kind: 'skid'; x: number; y: number; length: number; voice: VoiceId }
  /** The tin was poked: its jaw snaps when it is open, and it rattles when it is shut. */
  | { kind: 'tinPoke'; open: boolean; voice: VoiceId }
  /** A tuft, a feather tip or a whisker end came off, and pops back. */
  | { kind: 'snip'; whom: Whom; voice: VoiceId }
  | { kind: 'flinch'; whom: Whom; voice: VoiceId }
  /** One who waited stepped up, or changed places with the one at the window. */
  | { kind: 'called'; index: 0 | 1; did: 'stepped' | 'swapped' }
  /** The cycle at the window ended: the serve starts. `how` is what ended it. */
  | { kind: 'ending'; ending: Ending; how: 'shut' | 'sentOff' | 'fed' }
  /** Pieces were set down on the board or the shelf, each from `from`: alongside a fruit, butted end to end against a piece, or just put there. */
  | { kind: 'setDown'; ids: number[]; from: Box[]; how: 'put' | 'beside' | 'butted'; voice: VoiceId }
  /** A piece was laid in the tin. `opened` says the tin sprang open for it, and `firstShowing` names the idea shown now, once. */
  | { kind: 'given'; id: number; from: Box; opened: boolean; firstShowing: string | null; length: number; voice: VoiceId }
  /** What lies in the tin does not fit: it sticks out past the jaw, or leaves a gap, by so many points. `gap` is the gap in the compartment this piece was laid in, in points, or nothing when that compartment is not short: only there does the piece rattle. */
  | { kind: 'misfit'; id: number; how: 'over' | 'under'; by: number; length: number; voice: VoiceId; gap: number }
  /** A customer ate a piece from the hand with nothing judged: one who waits, or one already served. */
  | { kind: 'ate'; whom: Whom; piece: Piece; from: Box; voice: VoiceId }
  /** A waiting pelican left as the glider, with this fruit across its beak, and another customer joined the queue in its place. */
  | { kind: 'gliderAway'; whom: 0 | 1; fruit: Fruit }
  /** The crate chewed a piece and burped it across to the dog. */
  | { kind: 'burp'; piece: Piece; from: Box; voice: VoiceId }
  /** A flung piece hit a customer and is licked off. */
  | { kind: 'splat'; whom: Whom; piece: Piece; from: Box; voice: VoiceId }
  /** A flung piece bounced off something and came back to the counter. `struck` is the whole fruit it bounced off, which shivers. */
  | { kind: 'bounce'; id: number; off: 'tin' | 'fruit' | 'crate' | 'shelf'; x: number; y: number; length: number; voice: VoiceId; struck?: number }
  /** A piece was knocked along its lane by a flung one, from `from`. */
  | { kind: 'knocked'; id: number; from: Box; length: number; voice: VoiceId }
  /** The roller pressed so many equal parts into a fruit or a piece. */
  | { kind: 'pressed'; id: number; parts: number; length: number; voice: VoiceId }
  /** The roller ran over something it leaves no mark on. `parts` is how many ruled parts answered, on an open tin. */
  | { kind: 'rolled'; on: 'tin' | 'customer' | 'crate' | 'dog' | 'bare'; whom: Whom | null; parts: number; x: number; y: number; voice: VoiceId }

/** What one stroke has done so far, so that it cuts each piece once and bothers each other thing once. */
export type Stroke = { made: number[]; crate: boolean; dog: boolean; tin: boolean; snipped: Whom[]; cuts: number; travelled: number }
export const newStroke = (): Stroke => ({ made: [], crate: false, dog: false, tin: false, snipped: [], cuts: 0, travelled: 0 })

/**
 * The tin on the rail, or nothing: there is one while a customer at the window waits to be served. Before the
 * first piece is laid in it, it is shut and folded small. Once the customer has been served it has lifted its
 * tin off the rail and holds it.
 */
export function tinAt(game: Game): TinShape | null {
  return game.window && !game.finished ? tinShape(tinParts(game.window), WHOLE[game.window.fruit], game.world.tinOpen) : null
}

/** What is under a point of the stage in this game: `without` leaves out pieces in the hand, which cannot be their own target. */
export function thingAt(game: Game, p: Point, without: readonly number[] = []): Under {
  const world = without.length > 0 ? { ...game.world, pieces: game.world.pieces.filter((piece) => !without.includes(piece.id)) } : game.world
  return under(world, p, tinAt(game), game.window !== null)
}

/** Whether the segment from a to b touches a box: the segment is clipped against each side of the box in turn, and touches it if anything is left. */
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
export function gone(before: World, ids: readonly number[], tin: TinShape | null = null): { piece: Piece; from: Box }[] {
  const boxes = new Map(shown(before, tin).map(({ piece, box }) => [piece.id, box]))
  return ids.flatMap((id) => {
    const piece = pieceOf(before, id), from = boxes.get(id)
    return piece && from ? [{ piece, from }] : []
  })
}

export function fellEvents(before: World, ids: readonly number[], tin: TinShape | null = null): GameEvent[] {
  return gone(before, ids, tin).map(({ piece, from }) => ({ kind: 'fell', piece, from, voice: 'munch' }))
}

/** A fresh fruit lands: on an empty lane, or on the far lane, shoving what lay there onto the shelf and the shelf's oldest to the dog. */
export function land(game: Game, fruit?: Fruit): { game: Game; events: GameEvent[] } {
  const dropped = fruit ? landFruit(game.world, fruit) : null
  // A kind that is named lands as it is; otherwise the crate gives the ordered kind, or one from the stream.
  const made = dropped ? { game: { ...game, world: dropped.world }, id: dropped.id, swept: dropped.swept, fell: dropped.fell } : crate(game)
  const landed = { world: made.game.world, id: made.id, swept: made.swept, fell: made.fell }
  const swept = gone(game.world, landed.swept)
  const events: GameEvent[] = []
  if (swept.length > 0) events.push({ kind: 'swept', ids: swept.map(({ piece }) => piece.id), from: swept.map(({ from }) => from) })
  events.push(...fellEvents(game.world, landed.fell))
  const piece = pieceOf(landed.world, landed.id)!
  events.push({ kind: 'land', id: landed.id, fruit: piece.fruit, length: piece.length, voice: 'thump' })
  return { game: made.game, events }
}

/** The lid shuts by itself when what lies in the tin has come to fit: the end of the cycle, as an event. */
export function shutIfFit(game: Game): { game: Game; events: GameEvent[] } {
  const settled = settle(game)
  if (settled.ending) return { game: settled.game, events: [{ kind: 'ending', ending: settled.ending, how: 'shut' }] }
  return { game: settled.game, events: leftOver(game) }
}

/**
 * What is left in an open tin does not fit: the lid comes down on it as it does on a piece just laid in, and
 * bounces on what sticks out or finds the gap. The piece it names is the last one in the compartment that is off.
 */
function leftOver(game: Game): GameEvent[] {
  if (!game.window || game.finished || !game.world.tinOpen) return []
  const result = served(game.world, game.window)
  if (result.kind !== 'over' && result.kind !== 'under') return []
  const off = result.parts.find((part) => part.fit.kind === result.kind && part.fit.by === result.by && part.pieces.length > 0) ?? result.parts.find((part) => part.pieces.length > 0)
  const piece = off?.pieces[off.pieces.length - 1]
  if (!off || !piece) return []
  return [{ kind: 'misfit', id: piece.id, how: result.kind, by: result.by, length: piece.length, voice: result.kind === 'over' ? 'clang' : 'slide', gap: off.fit.kind === 'under' ? -off.fit.by : 0 }]
}

/**
 * One step of a stroke, from a to b. Every fruit or piece whose middle line the step crosses is cut square
 * where it crosses, in the order the blade meets them, on the board, on the shelf and in the tin; a piece this
 * stroke made is not cut again by it. A step through the crate splits a slat and one fruit of each kind tumbles
 * out; past the dog, the dog snaps; across the tin where no piece lies, the blade skids; across a customer, a
 * tuft comes off and pops back.
 */
export function slice(game: Game, a: Point, b: Point, stroke: Stroke): { game: Game; stroke: Stroke; events: GameEvent[] } {
  const events: GameEvent[] = []
  const next: Stroke = { ...stroke, made: [...stroke.made], snipped: [...stroke.snipped], travelled: stroke.travelled + Math.hypot(b.x - a.x, b.y - a.y) }
  const tin = tinAt(game)
  const met: { t: number; id: number; x: number; y: number; h: number; at: number }[] = []
  for (const { piece, box } of shown(game.world, tin)) {
    const mid = box.y + box.h / 2
    // A step that ends exactly on the line has crossed it; the next step, which starts there, has not.
    if (a.y < mid === b.y < mid) continue
    const t = (mid - a.y) / (b.y - a.y)
    const x = a.x + t * (b.x - a.x)
    if (x >= box.x && x <= box.x + box.w) met.push({ t, id: piece.id, x, y: mid, h: box.h, at: (x - box.x) / PX })
  }
  let world = game.world
  let trimmed = false
  // A tin stands open only while its customer waits to be served: once the customer has it, or nobody is at the window, a cut is made by eye.
  const standsOpen = game.world.tinOpen && game.window !== null && !game.finished
  for (const hit of met.sort((p, q) => p.t - q.t)) {
    if (next.made.includes(hit.id)) continue
    const piece = pieceOf(world, hit.id)
    if (!piece) continue
    const whole = piece.length
    const result = cut(world, hit.id, hit.at, standsOpen)
    if (result.kind === 'curl') {
      next.made.push(hit.id)
      events.push({ kind: 'curl', id: hit.id, fruit: piece.fruit, length: whole, x: hit.x, y: hit.y, voice: 'curl' })
    } else if (result.kind === 'cut') {
      next.made.push(result.left, result.right)
      next.cuts += 1
      if (piece.place.on === 'tin') trimmed = next.tin = true
      events.push({ kind: 'cut', left: result.left, right: result.right, fruit: piece.fruit, length: whole, x: hit.x, y: hit.y, h: hit.h, voice: piece.place.on === 'board' && whole === WHOLE[piece.fruit] ? 'thwack' : 'snick' })
      // What dropped off the shelf is gone from the new world, so it is read from the one before. When the
      // piece that dropped is the left part of this very cut, it dropped at its new length.
      const before: World = { ...world, pieces: world.pieces.map((other) => (other.id === hit.id ? { ...other, length: Math.round(hit.at) } : other)) }
      events.push(...fellEvents(before, result.fell, tin))
      world = result.world
    }
  }
  let now: Game = { ...game, world }
  // A piece trimmed where it lay in the tin may now fit: the lid shuts by itself. Or it is still too long, or now too short: the lid comes down on it and says so.
  if (trimmed) {
    const shut = shutIfFit(now)
    now = shut.game
    events.push(...shut.events)
  }
  if (tin && !next.tin && touches(a, b, tin.body)) {
    next.tin = true
    // The tin rings at the pitch of its length: open, the length of the order; shut and folded small, the same low note whatever the order, which it does not give away.
    events.push({ kind: 'skid', x: b.x, y: tin.body.y + tin.body.h / 2, length: tin.open ? shareLength(game.window!.fruit, wanted(game.window!)) : WHOLE.long, voice: 'skid' })
  }
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
  const customers: [Whom, Box, boolean][] = [['window', WINDOW, game.window !== null], [0, QUEUE[0], true], [1, QUEUE[1], true]]
  for (const [whom, box, there] of customers) {
    if (!there || next.snipped.includes(whom) || !touches(a, b, box)) continue
    next.snipped.push(whom)
    events.push({ kind: 'snip', whom, voice: 'pop' })
  }
  return { game: now, stroke: next, events }
}

/**
 * A tap. A fruit quivers and gives its low note; a piece rings, higher the shorter it is; the crate drops a
 * fresh fruit on the board; the dog barks; the tin's jaw snaps, or the shut tin rattles. A customer flinches,
 * and then: one who waits steps up, or changes places with an unserved customer whose tin is empty; and one at
 * the window whose tin holds something takes its order as it is. Anything bare answers with a knock, so no
 * tap lands in silence.
 */
export function poke(game: Game, p: Point): { game: Game; events: GameEvent[] } {
  const hit = thingAt(game, p)
  switch (hit.thing) {
    case 'fruit':
    case 'piece':
      return { game, events: [{ kind: 'poke', id: hit.piece.id, fruit: hit.piece.fruit, length: hit.piece.length, voice: hit.thing === 'fruit' ? 'quiver' : 'pluck' }] }
    case 'crate':
      return land(game)
    case 'dog':
      return { game, events: [{ kind: 'bark', voice: 'bark' }] }
    case 'tin': {
      const open = game.world.tinOpen && !game.finished
      return { game, events: [{ kind: 'tinPoke', open, voice: open ? 'castanet' : 'rattle' }] }
    }
    case 'customer': {
      const events: GameEvent[] = [{ kind: 'flinch', whom: 'window', voice: 'babble' }]
      const sent = sendOff(game)
      if (sent.ending) events.push({ kind: 'ending', ending: sent.ending, how: 'sentOff' })
      return { game: sent.game, events }
    }
    case 'waiting': {
      const events: GameEvent[] = [{ kind: 'flinch', whom: hit.index, voice: 'babble' }]
      const called = call(game, hit.index)
      if (called.did === 'sentOff') events.push({ kind: 'ending', ending: called.ending!, how: 'sentOff' })
      else events.push({ kind: 'called', index: hit.index, did: called.did })
      return { game: called.game, events }
    }
    case 'nothing':
      return { game, events: [] }
    default:
      return { game, events: [{ kind: 'knock', x: p.x, y: p.y, on: hit.thing, voice: 'tickEnd' }] }
  }
}

/** Whether the tin at the window holds anything of the ordered fruit that does not yet fit: what a send-off would take. */
export function holdsMisfit(game: Game): boolean {
  if (!game.window || game.finished) return false
  const kind = served(game.world, game.window).kind
  return kind === 'over' || kind === 'under'
}
