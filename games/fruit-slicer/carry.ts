import { feed, give, splat, treat, type Game } from './cycle'
import { RAIL, WHOLE } from './measure'
import { fellEvents, gone, land, shutIfFit, thingAt, tinAt, type GameEvent, type Whom } from './moves'
import { ruling } from './serve'
import { COUNTER, CRATE, LANE_H, PX, TIN, WALL, X0, laneTop, type Box, type Point, type Under } from './stage'
import { LANES, onLane, pieceOf, remove, roll, rowOf, setRowOnBoard, setOnShelf, type World } from './world'

// Carrying, flinging and the roller: the other three acts of the grid. A
// finger that lands on a piece takes hold of it, and of the row it lies in on
// the side it is held by; where it is let go decides what becomes of it. A
// piece let go at speed flies on and hits the first thing in its way. The
// roller is carried like a piece and rolls whatever it is let go over. Pure:
// points are in stage units and speeds in stage units a second. A piece in
// the hand stays where it was in the world until it is let go.

/** What the finger holds: the pieces of the row, left to right, where each was drawn, and how far the finger is from the first one's corner. */
export type Held = { ids: number[]; boxes: Box[]; dx: number; dy: number }

/** A piece let go faster than this, in stage units a second, over bare wood or the wall, is flung. Let go over a thing, it is given to that thing however fast the hand was going. */
export const FLING_SPEED = 900
/** How long a flung piece is in the air: it comes down this many seconds of its speed away, no nearer and no further than these. */
export const FLIGHT_SECONDS = 0.4
export const FLIGHT_REACH = [120, 1100] as const
/** How far a knocked piece slides along its lane, in points, if nothing stops it sooner. */
export const KNOCK_POINTS = 700

/** Where a piece let go at `at` with speed `v` comes down: the faster the throw, the further, and always on the page. */
export function landing(at: Point, v: Point): Point {
  const speed = Math.hypot(v.x, v.y)
  if (speed < 1) return at
  const reach = Math.max(FLIGHT_REACH[0], Math.min(FLIGHT_REACH[1], speed * FLIGHT_SECONDS))
  return { x: Math.max(PAGE.x + 4, Math.min(PAGE.x + PAGE.w - 4, at.x + (v.x / speed) * reach)), y: Math.max(PAGE.y + 4, Math.min(PAGE.y + PAGE.h - 4, at.y + (v.y / speed) * reach)) }
}
/** The part of the stage a flung piece may come down on: the wall and the counter together. */
const PAGE: Box = { x: WALL.x, y: WALL.y, w: WALL.w, h: COUNTER.y + COUNTER.h - WALL.y }

/** The finger lands on a piece: it takes hold of that piece and of the row on the side of the half it landed on. */
export function grab(game: Game, p: Point): Held | null {
  const tin = tinAt(game)
  const hit = thingAt(game, p)
  if (hit.thing !== 'fruit' && hit.thing !== 'piece') return null
  const ids = rowOf(game.world, hit.piece.id, p.x < hit.box.x + hit.box.w / 2 ? 'left' : 'right')
  const boxes = gone(game.world, ids, tin).map(({ from }) => from)
  return { ids, boxes, dx: p.x - boxes[0].x, dy: p.y - boxes[0].y }
}

/** The world as it is under the finger: without the pieces in the hand, which cannot be their own target. */
function without(world: World, ids: readonly number[]): World {
  return { ...world, pieces: world.pieces.filter((piece) => !ids.includes(piece.id)) }
}

/** The lane of the board nearest a height of the stage. */
function laneAt(y: number): number {
  let best = 0
  for (let lane = 1; lane < LANES; lane++) if (Math.abs(y - (laneTop(lane) + LANE_H / 2)) < Math.abs(y - (laneTop(best) + LANE_H / 2))) best = lane
  return best
}

/** Sets the pieces in the hand down on the board as a row, and says how. */
function put(game: Game, held: Held, lane: number, x: number, how: 'put' | 'beside' | 'butted'): { game: Game; events: GameEvent[] } {
  const set = setRowOnBoard(game.world, held.ids, lane, x)
  const events: GameEvent[] = [{ kind: 'setDown', ids: held.ids, from: held.boxes, how, voice: how === 'butted' ? 'butt' : 'lay' }, ...fellEvents(game.world, set.fell)]
  return shutAfter({ ...game, world: set.world }, events, game, held)
}

/**
 * Lays the pieces in the hand alongside a whole fruit: on the other lane, from the same left end, so the two
 * lengths can be compared edge to edge. What lies in the way on that lane is shoved onto the shelf, as it is
 * when a fresh fruit lands there. A row too long to lie from that end within the board is only put down.
 */
function layBeside(game: Game, held: Held, lane: number, x: number): { game: Game; events: GameEvent[] } {
  const total = held.ids.reduce((sum, id) => sum + (pieceOf(game.world, id)?.length ?? 0), 0)
  if (x + total > RAIL) return put(game, held, lane, x, 'put')
  const inWay = onLane(without(game.world, held.ids), lane).filter((piece) => piece.place.on === 'board' && piece.place.x < x + total && piece.place.x + piece.length > x)
  const swept = gone(game.world, inWay.map((piece) => piece.id))
  let world = game.world
  const fell: GameEvent[] = []
  for (const { piece } of swept) {
    const set = setOnShelf(world, piece.id)
    fell.push(...fellEvents(world, set.fell))
    world = set.world
  }
  const events: GameEvent[] = swept.length > 0 ? [{ kind: 'swept', ids: swept.map(({ piece }) => piece.id), from: swept.map(({ from }) => from) }, ...fell] : []
  const laid = put({ ...game, world }, held, lane, x, 'beside')
  return { game: laid.game, events: [...events, ...laid.events] }
}

/** A piece that left the tin may leave what is in it fitting: the lid then shuts by itself. */
function shutAfter(game: Game, events: GameEvent[], before: Game, held: Held): { game: Game; events: GameEvent[] } {
  const fromTin = held.ids.some((id) => pieceOf(before.world, id)?.place.on === 'tin')
  if (!fromTin) return { game, events }
  const shut = shutIfFit(game)
  return { game: shut.game, events: [...events, ...shut.events] }
}

/**
 * The finger lets go at `at`. What is under it takes what it held: the tin has the pieces laid in it, a
 * customer eats them, the dog and the crate make away with them, a fruit has them laid alongside, a piece has
 * them butted against the end nearer the finger, the board and the shelf take them where they are put; and
 * anywhere else they come back to the board. Nothing refuses.
 */
export function drop(game: Game, held: Held, at: Point): { game: Game; events: GameEvent[] } {
  const tin = tinAt(game)
  const target = thingAt(game, at, held.ids)
  const leftEdge = (at.x - held.dx - X0) / PX
  const pieces = gone(game.world, held.ids, tin)
  // Where each piece is when it is let go: in the hand, carried there from where it lay. What is eaten flies from there.
  const inHand = pieces.map(({ piece, from }) => ({ piece, from: carried(from, held, at) }))
  switch (target.thing) {
    case 'tin':
      return intoTin(game, held, target.part)
    case 'customer':
    case 'waiting': {
      const whom: Whom = target.thing === 'waiting' ? target.index : 'window'
      let now = game
      const events: GameEvent[] = []
      for (const { piece, from } of inHand) {
        if (whom === 'window') {
          const fed = feed(now, piece.id)
          // What lay in the tin of a customer fed by hand slides to the shelf, and whatever that pushes off the shelf's end drops to the dog.
          const moved = gone(now.world, fed.shelved, tinAt(now))
          if (moved.length > 0) events.push({ kind: 'setDown', ids: moved.map((one) => one.piece.id), from: moved.map((one) => one.from), how: 'put', voice: 'lay' })
          events.push(...fellEvents(now.world, fed.fell, tinAt(now)))
          now = fed.game
          // The piece goes from the hand to the mouth and is gulped, whether or not that ends the cycle. A whole fruit to the pelican is the glider, and stays across its beak.
          if (fed.ate && !fed.ending?.glider) events.push({ kind: 'ate', whom, piece, from, voice: 'gulp' })
          if (fed.ending) events.push({ kind: 'ending', ending: fed.ending, how: 'fed' })
        } else {
          const given = treat(now, whom, piece.id)
          now = given.game
          // A whole fruit to a waiting pelican is the glider: it is not swallowed, it goes across the beak and out with the pelican.
          if (given.glider) events.push({ kind: 'gliderAway', whom, fruit: piece.fruit })
          else events.push({ kind: 'ate', whom, piece, from, voice: 'gulp' })
        }
      }
      // A piece that came out of the tin to be eaten may leave what is in the tin fitting: the lid then shuts by itself.
      return now.finished ? { game: now, events } : shutAfter(now, events, game, held)
    }
    case 'dog':
    case 'crate': {
      let world = game.world
      const events: GameEvent[] = []
      for (const { piece, from } of inHand) {
        world = remove(world, piece.id)
        // The crate chews it and burps it across: it flies to the dog from the crate's top, not from the hand.
        const out = target.thing === 'crate' ? { ...from, x: CRATE.x + CRATE.w / 2 - from.w / 2, y: CRATE.y - from.h / 2 } : from
        if (target.thing === 'crate') events.push({ kind: 'burp', piece, from, voice: 'burp' })
        events.push({ kind: 'fell', piece, from: out, voice: 'munch' })
      }
      return shutAfter({ ...game, world }, events, game, held)
    }
    case 'fruit':
    case 'piece': {
      const on = target.piece.place
      if (on.on === 'tin') return intoTin(game, held, on.part)
      if (on.on !== 'board') return onShelf(game, held)
      // Alongside a whole fruit, from the same left end, on the other lane; against a piece, end to end, on the side the finger is nearer.
      if (target.thing === 'fruit') return layBeside(game, held, (on.lane + 1) % LANES, on.x)
      const total = pieces.reduce((sum, { piece }) => sum + piece.length, 0)
      const rightSide = at.x >= target.box.x + target.box.w / 2
      return put(game, held, on.lane, rightSide ? on.x + target.piece.length : on.x - total, 'butted')
    }
    case 'shelf':
      return onShelf(game, held)
    default:
      return put(game, held, laneAt(at.y), leftEdge, 'put')
  }
}

/** Where a piece in the hand is drawn when the finger is at `at`: as far from where it lay as the finger has carried the first of them. */
function carried(from: Box, held: Held, at: Point): Box {
  return { ...from, x: from.x + at.x - held.dx - held.boxes[0].x, y: from.y + at.y - held.dy - held.boxes[0].y }
}

function onShelf(game: Game, held: Held): { game: Game; events: GameEvent[] } {
  let world = game.world
  const fell: GameEvent[] = []
  for (const id of held.ids) {
    const set = setOnShelf(world, id)
    fell.push(...fellEvents(world, set.fell))
    world = set.world
  }
  return shutAfter({ ...game, world }, [{ kind: 'setDown', ids: held.ids, from: held.boxes, how: 'put', voice: 'lay' }, ...fell], game, held)
}

/** Lays the pieces in the hand in a compartment of the tin, one after another. A tin that takes nothing sends them back to the board with a bong. */
function intoTin(game: Game, held: Held, part: number): { game: Game; events: GameEvent[] } {
  let now = game
  const events: GameEvent[] = []
  const tin = tinAt(game)
  const pieces = gone(game.world, held.ids, tin)
  const back: number[] = []
  for (const { piece, from } of pieces) {
    const result = give(now, piece.id, part)
    if (!result.given) {
      back.push(piece.id)
      continue
    }
    const given = result.given
    if (given.slidOff) {
      // It slid off the end of the rail onto the shelf; what that pushed off the shelf's old end drops to the dog.
      events.push({ kind: 'setDown', ids: [piece.id], from: [from], how: 'put', voice: 'lay' }, ...fellEvents(now.world, given.fell, tin))
    } else {
      events.push({ kind: 'given', id: piece.id, from, opened: given.opened, firstShowing: given.firstShowing, length: piece.length, voice: given.opened ? 'spring' : 'lay' })
      // A piece of another fruit is picked out of the tin: it goes to the dog from the tin, where it was laid, not from where it lay before it was carried.
      for (const stray of gone(now.world, given.strays, tin)) events.push({ kind: 'fell', piece: stray.piece, from: { x: X0 + 4, y: TIN.bodyY + (TIN.bodyH - TIN.pieceH) / 2, w: stray.from.w, h: TIN.pieceH }, voice: 'munch' })
      // A piece of another fruit: the customer will not have it in its tin. It flinches, and the piece is flicked out to the dog.
      if (given.strays.length > 0) events.push({ kind: 'flinch', whom: 'window', voice: 'babble' })
      const worst = given.result
      if (given.ending) events.push({ kind: 'ending', ending: given.ending, how: 'shut' })
      else if (worst.kind === 'over' || worst.kind === 'under') events.push({ kind: 'misfit', id: piece.id, how: worst.kind, by: worst.by, length: piece.length, voice: worst.kind === 'over' ? 'clang' : 'slide' })
    }
    now = result.game
  }
  // A piece that left the tin on the way (one that slid off the rail's end) may leave what is in the tin fitting: the lid then shuts by itself.
  if (back.length === 0) return now.finished ? { game: now, events } : shutAfter(now, events, game, held)
  // Served already, or nobody there to serve: the tin takes nothing, and the pieces come back to the near lane.
  const first = pieces.find(({ piece }) => piece.id === back[0])!
  const set = setRowOnBoard(now.world, back, 0, (first.from.x - X0) / PX)
  events.push({ kind: 'bounce', id: back[0], off: 'tin', x: first.from.x, y: first.from.y, length: first.piece.length, voice: 'bong' })
  events.push({ kind: 'setDown', ids: back, from: pieces.filter(({ piece }) => back.includes(piece.id)).map(({ from }) => from), how: 'put', voice: 'lay' }, ...fellEvents(now.world, set.fell))
  return { game: { ...now, world: set.world }, events }
}

/**
 * One piece is let go at speed. It flies from `at` the way it was going and comes down further off the
 * faster it was thrown, over whatever lies between. What it comes down on answers: a customer is splatted and
 * licks it off; the dog catches it; the tin's lid and a whole fruit send it bouncing back onto the board; the
 * crate rocks and a fruit jumps out; a piece is knocked along its lane like a puck until it clacks into the
 * next one. On anything bare it is simply set down there.
 */
export function fling(game: Game, held: Held, at: Point, v: Point): { game: Game; events: GameEvent[] } {
  const speed = Math.hypot(v.x, v.y)
  if (held.ids.length !== 1 || speed < 1) return drop(game, held, at)
  const tin = tinAt(game)
  const id = held.ids[0]
  const mine = gone(game.world, held.ids, tin)[0]
  const rest = without(game.world, held.ids)
  const end = landing(at, v)
  const hit: Under = thingAt(game, end, held.ids)
  const backOnBoard = (off: 'tin' | 'fruit' | 'crate' | 'shelf', voice: 'bong' | 'boing' | 'rock', from: Game = game, struck?: number): { game: Game; events: GameEvent[] } => {
    const set = setRowOnBoard(from.world, [id], laneAt(at.y), (at.x - held.dx - X0) / PX)
    const events: GameEvent[] = [{ kind: 'bounce', id, off, x: end.x, y: end.y, length: mine.piece.length, voice, struck }, { kind: 'setDown', ids: [id], from: [mine.from], how: 'put', voice: 'lay' }, ...fellEvents(from.world, set.fell)]
    return shutAfter({ ...from, world: set.world }, events, game, held)
  }
  switch (hit.thing) {
    case 'customer':
    case 'waiting': {
      const whom: Whom = hit.thing === 'waiting' ? hit.index : 'window'
      return shutAfter(splat(game, id), [{ kind: 'splat', whom, piece: mine.piece, from: carried(mine.from, held, at), voice: 'splat' }], game, held)
    }
    case 'dog':
      return shutAfter({ ...game, world: remove(game.world, id) }, [{ kind: 'fell', piece: mine.piece, from: carried(mine.from, held, at), voice: 'catch' }], game, held)
    case 'tin':
      return backOnBoard('tin', 'bong')
    case 'crate': {
      // The crate rocks and a fruit jumps out by itself; the piece comes back to the board.
      const jumped = land(game)
      const back = backOnBoard('crate', 'rock', jumped.game)
      return { game: back.game, events: [...jumped.events, ...back.events] }
    }
    case 'fruit':
    case 'piece': {
      const on = hit.piece.place
      if (on.on === 'tin') return backOnBoard('tin', 'bong')
      if (on.on !== 'board') return backOnBoard('shelf', 'boing')
      if (hit.thing === 'fruit') return backOnBoard('fruit', 'boing', game, hit.piece.id)
      // Knocked along its lane, the way the flung piece was going, until it meets the next thing; the flung piece lands where it was.
      const lane = onLane(rest, on.lane)
      const dir = v.x < 0 ? -1 : 1
      const spans = lane.filter((other) => other.id !== hit.piece.id).map((other) => ({ from: other.place.on === 'board' ? other.place.x : 0, length: other.length }))
      const end = on.x + hit.piece.length
      const room = dir > 0
        ? Math.min(RAIL, ...spans.filter((span) => span.from >= end).map((span) => span.from)) - end
        : on.x - Math.max(0, ...spans.filter((span) => span.from + span.length <= on.x).map((span) => span.from + span.length))
      const slid = setRowOnBoard(rest, [hit.piece.id], on.lane, on.x + dir * Math.min(KNOCK_POINTS, Math.max(0, room)))
      const world: World = { ...slid.world, pieces: [...slid.world.pieces, pieceOf(game.world, id)!] }
      const set = setRowOnBoard(world, [id], on.lane, on.x)
      const events: GameEvent[] = [{ kind: 'knocked', id: hit.piece.id, from: hit.box, length: hit.piece.length, voice: 'clack' }, { kind: 'setDown', ids: [id], from: [mine.from], how: 'put', voice: 'lay' }, ...fellEvents(world, set.fell)]
      return shutAfter({ ...game, world: set.world }, events, game, held)
    }
    case 'shelf':
      return onShelf(game, held)
    default:
      // On anything bare it is set down where it came down, its middle on that place; from the wall it drops to the nearest lane.
      return put(game, held, laneAt(end.y), (end.x - mine.from.w / 2 - X0) / PX, 'put')
  }
}

/**
 * The roller is let go at `at` and rolls what is under it. A fruit or a piece has the equal parts of the
 * ticket at the window pressed into it, as if it were a whole of its own; with no order waiting to be filled
 * there are no parts to press, and the roller only drums. An open tin's ruled parts answer one by one, and a
 * shut one drums and takes no mark. A customer is rolled flat and springs back, the crate's slats rattle, and
 * the dog's ears are ironed.
 */
export function rollOver(game: Game, at: Point): { game: Game; events: GameEvent[] } {
  const hit = thingAt(game, at)
  const parts = game.window && !game.finished ? ruling(game.window).rows[0].parts : 0
  const rolled = (on: 'tin' | 'customer' | 'crate' | 'dog' | 'bare', voice: 'rule' | 'drum' | 'honk' | 'washboard' | 'sproing', whom: Whom | null = null, count = 0): { game: Game; events: GameEvent[] } => ({ game, events: [{ kind: 'rolled', on, whom, parts: count, x: at.x, y: at.y, voice }] })
  switch (hit.thing) {
    case 'fruit':
    case 'piece': {
      if (parts < 2) return rolled('bare', 'drum')
      const whole = hit.piece.length === WHOLE[hit.piece.fruit]
      return { game: { ...game, world: roll(game.world, hit.piece.id, parts) }, events: [{ kind: 'pressed', id: hit.piece.id, parts, length: hit.piece.length, voice: whole ? 'ticks' : 'press' }] }
    }
    case 'tin':
      // Every ruled part along the rail answers, those of the second fruit too where the order is longer than one.
      return game.world.tinOpen && !game.finished ? rolled('tin', 'rule', null, ruling(game.window!).along) : rolled('tin', 'drum')
    case 'customer':
      return rolled('customer', 'honk', 'window')
    case 'waiting':
      return rolled('customer', 'honk', hit.index)
    case 'crate':
      return rolled('crate', 'washboard')
    case 'dog':
      return rolled('dog', 'sproing')
    default:
      return rolled('bare', 'drum')
  }
}

/** Whether a point of the stage is over a thing a piece in the hand could be given to, for the view to show the thing leaning in. */
export function over(game: Game, held: Held, at: Point): Under {
  return thingAt(game, at, held.ids)
}
