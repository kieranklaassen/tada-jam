import { feed, give, splat, treat, type Game } from './cycle'
import { RAIL, WHOLE } from './measure'
import { SETS_DOWN_AFTER, fellEvents, gone, land, shutIfFit, thingAt, tinAt, type GameEvent, type Whom } from './moves'
import { fedAfter } from './scenes'
import { ruling } from './serve'
import { isGlider } from './tastes'
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
/** How long the crate chews a piece before it burps it across to the dog. */
export const CHEW_SECONDS = 0.36
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
  // Laid against a piece or alongside a fruit, the row lies exactly there; only a row that is just put down settles against what is near.
  const set = setRowOnBoard(game.world, held.ids, lane, x, how !== 'put')
  const events: GameEvent[] = [{ kind: 'setDown', ids: held.ids, from: held.boxes, how, voice: how === 'butted' ? 'butt' : 'lay' }, ...fellEvents(game.world, set.fell)]
  return shutAfter({ ...game, world: set.world }, events, game, held)
}

/**
 * Lays the pieces in the hand exactly where they are meant to lie: alongside a whole fruit, on the other lane,
 * from the same left end, so the two lengths can be compared edge to edge; or end to end against a piece, so
 * the two travel as a row. What lies in the way on that lane is shoved onto the shelf, as it is when a fresh
 * fruit lands there. A row too long to lie there within the board is only put down, as near as it fits.
 */
function layClear(game: Game, held: Held, lane: number, x: number, how: 'beside' | 'butted'): { game: Game; events: GameEvent[] } {
  const total = held.ids.reduce((sum, id) => sum + (pieceOf(game.world, id)?.length ?? 0), 0)
  if (x < 0 || x + total > RAIL) return put(game, held, lane, x, 'put')
  const inWay = onLane(without(game.world, held.ids), lane).filter((piece) => piece.place.on === 'board' && piece.place.x < x + total && piece.place.x + piece.length > x)
  const swept = gone(game.world, inWay.map((piece) => piece.id))
  let world = game.world
  const fell: GameEvent[] = []
  for (const { piece } of swept) {
    // The pieces being laid are in the hand: they are not what the swept ones push off the shelf.
    const set = setOnShelf(world, piece.id, held.ids)
    fell.push(...fellEvents(world, set.fell, null, SETS_DOWN_AFTER))
    world = set.world
  }
  // What lies in the way is shoved aside as the piece from the hand gets there, not as the hand lets go.
  const events: GameEvent[] = swept.length > 0 ? [{ kind: 'swept', ids: swept.map(({ piece }) => piece.id), from: swept.map(({ from }) => from), after: SETS_DOWN_AFTER }, ...fell] : []
  const laid = put({ ...game, world }, held, lane, x, how)
  return { game: laid.game, events: [...events, ...laid.events] }
}

/** A piece that left the tin may leave what is in it fitting: the lid then shuts by itself. What is left may also be a misfit: the lid comes down on that too. */
function shutAfter(game: Game, events: GameEvent[], before: Game, held: Held): { game: Game; events: GameEvent[] } {
  const fromTin = held.ids.some((id) => pieceOf(before.world, id)?.place.on === 'tin')
  if (!fromTin) return { game, events }
  const shut = shutIfFit(game)
  // A lid that has just come down on a piece laid in does not come down a second time for what was taken out.
  const told = events.some((event) => event.kind === 'misfit')
  return { game: shut.game, events: [...events, ...shut.events.filter((event) => !(told && event.kind === 'misfit'))] }
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
  // Where each piece is when it is let go: in the hand, carried there from where it lay. Whatever becomes of it starts from there: it is
  // set down from the hand, slides off the rail from the rail, and flies to a mouth from the hand.
  const lifted: Held = { ...held, boxes: held.boxes.map((box) => carried(box, held, at)) }
  const pieces = gone(game.world, held.ids, tin).map(({ piece }, index) => ({ piece, from: lifted.boxes[index] }))
  const inHand = pieces
  switch (target.thing) {
    case 'tin':
      return intoTin(game, lifted, target.part)
    case 'customer':
    case 'waiting': {
      const whom: Whom = target.thing === 'waiting' ? target.index : 'window'
      let now = game
      const events: GameEvent[] = []
      if (target.thing === 'customer') {
        // A row is fed as one serving: the customer's body makes of it what it makes of exactly those pieces, every one of them. A whole
        // fruit in a row fed to the pelican is the glider all the same: what came before it is the serving, and what came after it stays.
        const customer = game.window
        const whole = customer ? inHand.findIndex(({ piece }) => isGlider(customer, piece)) : -1
        const servings = whole < 0 ? [inHand] : [inHand.slice(0, whole), inHand.slice(whole, whole + 1)]
        for (const serving of servings) {
          if (serving.length === 0) continue
          const fed = feed(now, serving[0].piece.id, serving.slice(1).map(({ piece }) => piece.id))
          // What lay in the tin of a customer fed by hand slides to the shelf, and whatever that pushes off the shelf's end drops to the dog.
          const moved = gone(now.world, fed.shelved, tinAt(now))
          if (moved.length > 0) events.push({ kind: 'setDown', ids: moved.map((one) => one.piece.id), from: moved.map((one) => one.from), how: 'put', voice: 'lay' })
          events.push(...fellEvents(now.world, fed.fell, tinAt(now)))
          now = fed.game
          // Each piece goes from the hand to the mouth and is gulped, whether or not that ends the cycle. A whole fruit to the pelican is the glider, and stays across its beak.
          if (fed.ate && !fed.ending?.glider) serving.forEach(({ piece, from }, index) => events.push({ kind: 'ate', whom, piece, from, voice: 'gulp', after: fedAfter(index, serving.length) }))
          if (fed.ending) events.push({ kind: 'ending', ending: fed.ending, how: 'fed' })
        }
      }
      const waits = target.thing === 'waiting' ? target.index : null
      for (const { piece, from } of waits === null ? [] : inHand) {
        if (waits === null || events.some((event) => event.kind === 'gliderAway')) {
          // The pelican has gone with the fruit: what came after it in the row is not fed to whoever joins in its place, and stays where it lay.
          continue
        } else {
          const given = treat(now, waits, piece.id)
          now = given.game
          // A whole fruit to a waiting pelican is the glider: it is not swallowed, it goes across the beak and out with the pelican.
          if (given.glider) events.push({ kind: 'gliderAway', whom: waits, fruit: piece.fruit })
          else events.push({ kind: 'ate', whom, piece, from, voice: 'gulp', after: fedAfter(inHand.findIndex((one) => one.piece.id === piece.id), inHand.length) })
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
        events.push({ kind: 'fell', piece, from: out, voice: 'munch', after: target.thing === 'crate' ? CHEW_SECONDS : 0 })
      }
      return shutAfter({ ...game, world }, events, game, held)
    }
    case 'fruit':
    case 'piece': {
      const on = target.piece.place
      if (on.on === 'tin') return intoTin(game, lifted, on.part)
      if (on.on !== 'board') return onShelf(game, lifted)
      // Alongside a whole fruit, from the same left end, on the other lane; against a piece, end to end, on the side the finger is nearer.
      if (target.thing === 'fruit') return layClear(game, lifted, (on.lane + 1) % LANES, on.x, 'beside')
      // End to end against the piece, on the side the finger is nearer; on the other side when the board ends too soon on that one.
      const total = pieces.reduce((sum, { piece }) => sum + piece.length, 0)
      const right = on.x + target.piece.length, left = on.x - total
      const fits = (x: number): boolean => x >= 0 && x + total <= RAIL
      const rightSide = at.x >= target.box.x + target.box.w / 2
      const x = rightSide ? (fits(right) ? right : left) : fits(left) ? left : right
      return layClear(game, lifted, on.lane, x, 'butted')
    }
    case 'shelf':
      return onShelf(game, lifted)
    default:
      return put(game, lifted, laneAt(at.y), leftEdge, 'put')
  }
}

/** Where a piece in the hand is drawn when the finger is at `at` (for a hold as it was taken, with its boxes where the pieces lay): as far from where it lay as the finger has carried the first of them. */
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
  // The hold comes with its boxes where the hand let go.
  const pieces = gone(game.world, held.ids, tin).map(({ piece }, index) => ({ piece, from: held.boxes[index] }))
  const back: number[] = []
  // A row is one laying: the lid comes down once, on all of it, when the last piece is in.
  for (const [index, { piece, from }] of pieces.entries()) {
    const result = give(now, piece.id, part, index < pieces.length - 1)
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
      if (given.ending) events.push({ kind: 'ending', ending: given.ending, how: 'shut' })
    }
    now = result.game
  }
  if (back.length === 0) {
    if (now.finished) return { game: now, events }
    // The lid comes down once on what now lies in the tin: it shuts if that fits (a last piece that slid off the rail's end may leave
    // it fitting), and otherwise bounces on what sticks out or finds the gap, where a piece rattles only in a gap of its own compartment.
    const told = shutIfFit(now)
    return { game: told.game, events: [...events, ...told.events] }
  }
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
  const lay = gone(game.world, held.ids, tin)[0]
  // The piece as it is in the hand when it is let go: its flight, and whatever it does next, starts there.
  const mine = { piece: lay.piece, from: carried(lay.from, held, at) }
  const lifted: Held = { ...held, boxes: [mine.from] }
  const rest = without(game.world, held.ids)
  const end = landing(at, v)
  const hit: Under = thingAt(game, end, held.ids)
  const backOnBoard = (off: 'tin' | 'fruit' | 'crate' | 'shelf', voice: 'bong' | 'boing' | 'rock', from: Game = game, struck?: number): { game: Game; events: GameEvent[] } => {
    const set = setRowOnBoard(from.world, [id], laneAt(at.y), (at.x - held.dx - X0) / PX)
    const events: GameEvent[] = [{ kind: 'bounce', id, off, x: end.x, y: end.y, length: mine.piece.length, voice, struck }, { kind: 'setDown', ids: [id], from: [{ ...mine.from, x: end.x - mine.from.w / 2, y: end.y - mine.from.h / 2 }], how: 'put', voice: 'lay' }, ...fellEvents(from.world, set.fell)]
    return shutAfter({ ...from, world: set.world }, events, game, held)
  }
  switch (hit.thing) {
    case 'customer':
    case 'waiting': {
      const whom: Whom = hit.thing === 'waiting' ? hit.index : 'window'
      return shutAfter(splat(game, id), [{ kind: 'splat', whom, piece: mine.piece, from: mine.from, voice: 'splat' }], game, held)
    }
    case 'dog':
      return shutAfter({ ...game, world: remove(game.world, id) }, [{ kind: 'fell', piece: mine.piece, from: mine.from, voice: 'catch' }], game, held)
    case 'tin':
      return backOnBoard('tin', 'bong')
    case 'crate': {
      // The crate rocks and a fruit jumps out by itself; the piece comes back to the board. The piece is in the air as the fruit lands:
      // it lies nowhere, so it is not shoved to the shelf with a lane it was taken from, and is not what drops off a full shelf.
      const jumped = land({ ...game, world: rest })
      const back = backOnBoard('crate', 'rock', { ...jumped.game, world: { ...jumped.game.world, pieces: [...jumped.game.world.pieces, pieceOf(game.world, id)!] } })
      return { game: back.game, events: [...jumped.events, ...back.events] }
    }
    case 'fruit':
    case 'piece': {
      const on = hit.piece.place
      if (on.on === 'tin') return backOnBoard('tin', 'bong')
      // A piece on the shelf lies alone in its row and has nowhere to be knocked along to: the flung piece bounces off it, and it shivers.
      if (on.on !== 'board') return backOnBoard('shelf', 'boing', game, hit.piece.id)
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
      const events: GameEvent[] = [{ kind: 'knocked', id: hit.piece.id, from: hit.box, length: hit.piece.length, voice: 'clack', after: SETS_DOWN_AFTER }, { kind: 'setDown', ids: [id], from: [mine.from], how: 'put', voice: 'lay' }, ...fellEvents(world, set.fell)]
      return shutAfter({ ...game, world: set.world }, events, game, held)
    }
    case 'shelf':
      return onShelf(game, lifted)
    default:
      // On anything bare it is set down where it came down, its middle on that place; from the wall it drops to the nearest lane.
      return put(game, lifted, laneAt(end.y), (end.x - mine.from.w / 2 - X0) / PX, 'put')
  }
}

/**
 * The roller is let go at `at` and rolls what is under it. A fruit or a piece has the equal parts of the
 * ticket at the window pressed into it (for the cat, the same parts both its shares are ruled into on the
 * rail), as if it were a whole of its own; with no order waiting to be filled
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
