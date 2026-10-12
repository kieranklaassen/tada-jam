import { TAP_REACH, onPiece, pullOff } from './benches'
import type { Colour } from './candle'
import { ENDING, type Fair } from './fair'
import { BASKET, COUNTER, FOLK, LANTERNS, LENGTH, STICK, WHO, type Who } from './hall'
import { layIn, sendBack, toBench } from './moving'
import { BENCH, BOARD, RING, WALK, drawnOn, handOf, inEmbers, isStall, onBench, onRack, overBasket, spotAt, whoAt } from './places'
import { again, carryOut, give, overSill, walk } from './playing'
import { POINTS, isMade, type Craft, type Thing } from './things'

// What a touch does. The finger lands (`pressOn`), moves (`moveTo`) and lifts
// or is taken away (`letGo`). The answer to a touch starts where the finger
// lands, whatever it lands on. A thing is worked on while the finger stays on
// it and carried once it is pulled off its bench, out of the basket or out of
// a hand; it is let go on the basket, on a fair-goer, or on a bench.
// Two rules hold for every giving. A tap never gives anything away: a giving
// needs a pull (`pulled`) let go on a hand or a body. And where the finger
// ends decides what a pull on a piece was: on a hand or a body the piece is
// given as it is, with what the pull made on the way; on the piece it was a
// stroke or a rub.

/** Where the hand has the basket when it carries it by its handle: a hand that took it lower down carries it as if from here. */
const HOOK_Y = 560

/** `cut` is whether this touch has just ended a scene. */
export function pressOn(fair: Fair, x: number, y: number, cut = false): void {
  fair.finger = { x, y }
  fair.pending = null
  fair.snowTap = false
  fair.landed = { x, y }
  fair.bare = false
  const place = fair.at
  if (place === 'candle' && fair.dipping.reaches(x, y)) {
    fair.stick = true
    fair.dipping.grab(x, y)
    return
  }
  const stall = isStall(place) ? place : null
  const held: Partial<Record<Who, Craft>> = {}
  for (const who of WHO) if (fair.shown[who] && fair.held[who]) held[who] = fair.shown[who]!.craft
  const spot = spotAt(x, y, { place, covered: stall !== null && !fair.uncovered[stall], things: fair.basket.length, finished: fair.finished, held, piece: fair.piece })
  switch (spot.kind) {
    case 'slot':
      // A thing in the basket hops under the finger. It is carried if the finger moves, and goes to the bench if it lifts.
      fair.pending = spot
      fair.hop = { what: 'slot', index: spot.index, age: 0 }
      fair.say({ name: 'thingHop' })
      break
    case 'basket':
      // In the snow it rocks under the finger. The next fair begins when the finger lifts from it: never in a touch
      // that ended the ending, and never before the ending's own time is up and the halo stands.
      if (place === 'door' && fair.finished) fair.snowTap = !cut && fair.out >= ENDING.seconds
      fair.basketShake.v += x >= BASKET.x ? 5 : -5
      fair.say({ name: 'basketPoke' })
      fair.folk.react('basket')
      // At the door the basket comes off its hook into the hand, by its rim, its handle or its wicker.
      if (place === 'door' && !fair.finished) {
        fair.hookDy = Math.max(0, y - HOOK_Y)
        fair.hooked = { x, y: y - fair.hookDy }
      }
      break
    case 'lantern':
      // The lantern lights under the finger. The walk starts when the finger lifts from it: a tap, not a thumb at rest.
      fair.pending = spot
      fair.say({ name: 'lantern' })
      break
    case 'cloth':
      // The cloth flies up and off on the tap, and stays off.
      if (stall) fair.uncovered[stall] = true
      fair.clothFlown = 0
      fair.flutter.v += 5
      fair.say({ name: 'cloth' })
      fair.changed(2)
      break
    case 'colour':
      colour(fair, spot.index as Colour)
      break
    case 'size':
      size(fair, spot.index)
      break
    case 'bench':
      bench(fair, x, y)
      break
    case 'who': {
      const holds = fair.shown[spot.who]
      fair.folk.poke(spot.who)
      fair.say({ name: 'poke', who: spot.who, holds: holds ? holds.craft : null })
      // What it holds can be taken back: it comes away if the finger moves.
      if (holds && fair.held[spot.who]) fair.pending = spot
      break
    }
    case 'lamp':
      fair.lamps[spot.index].v += x >= LANTERNS[spot.index].x ? -3.4 : 3.4
      fair.say({ name: 'lantern' })
      break
    case 'window':
      fair.swirl = 1
      fair.say({ name: 'window' })
      break
    case 'wall':
      // Nothing is here to work: a contact that stays is a palm at rest, and the next one that lands takes over.
      fair.bare = true
      prop(fair, x, y)
      break
  }
}

/**
 * A touch on something that is only painted: the wall, a prop on the counter or at the front, the mat, the broom.
 * It answers where it is touched: embers flare, wax candles on their rail knock, wood knocks, and dust or flour
 * lifts from the place. The fair-goer nearest the place looks at it. Bare wall high up answers with a breath of
 * air that leans the flames, and with the same look.
 */
function prop(fair: Fair, x: number, y: number): void {
  let nearest: Who = 'maker', reach = Infinity
  for (const who of WHO) {
    const far = Math.hypot(x - FOLK[who].eyes.x, y - FOLK[who].eyes.y)
    if (far < reach) { nearest = who; reach = far }
  }
  // It leans towards the place and its eyes go wide; the eyes of all five follow the finger while it is down.
  fair.folk.kick(nearest, { lean: x >= FOLK[nearest].x ? 1.4 : -1.4, brow: 3 })
  fair.folk.widen(nearest, 0.8)
  if (fair.at === 'candle' && inEmbers(x, y)) {
    fair.puff('sparks', x, y - 10, 7)
    fair.say({ name: 'crackle' })
  } else if (fair.at === 'candle' && onRack(x, y)) {
    fair.puff('flour', x, y, 2)
    fair.say({ name: 'tick' })
    fair.flutter.v += 2
  } else if (y > COUNTER.back) {
    fair.puff('flour', x, y, 3)
    fair.say({ name: 'bench' })
  } else {
    fair.flutter.v += 6
    fair.say({ name: 'flutter' })
    fair.folk.react('flutter')
  }
}

/** A touch on the bench itself: the wax rings, the door creaks, and a finger on the piece of another bench works on it. */
function bench(fair: Fair, x: number, y: number): void {
  const piece = fair.piece
  if (fair.at === 'candle') {
    fair.potRing.v += 4
    fair.ring(x)
    fair.say({ name: 'pot' })
  } else if (!piece) {
    fair.doorOpen = Math.min(1, fair.doorOpen + 0.1)
    fair.say({ name: 'door' })
  } else if (onPiece(piece, x, y)) {
    // The piece gives under the finger. What is made of it comes from the move that makes it (benches.ts).
    fair.working = true
    fair.bench.touch(x, y)
  } else {
    fair.bench.knock(3)
    fair.say({ name: 'bench' })
  }
}

/** A tap on one of the three colours at the front: the stall has that colour out from now on, and its piece in work takes it. */
function colour(fair: Fair, index: Colour): void {
  const piece = fair.piece
  fair.hop = { what: 'colour', index, age: 0 }
  if (!piece) return
  if (piece.craft === 'candle') {
    if (fair.pot === index) return fair.say({ name: 'source' })
    // That wax is poured into the big pot.
    fair.potWas = fair.pot
    fair.pot = index
    fair.potMix = 0
    fair.dipping.colour = index
    fair.potRing.v += 3
    fair.say({ name: 'pour' })
  } else {
    if (piece.colour === index) return fair.say({ name: 'source' })
    piece.colour = index
    fair.bench.knock(3)
    fair.say({ name: piece.craft === 'star' ? 'sheet' : piece.craft === 'wreath' ? 'zip' : 'squirt' })
  }
  fair.changed(2)
}

/** The twigs a bundle of each size binds on the ring: four, eight or all twelve, spread round it. */
const BUNDLES: readonly (readonly number[])[] = [
  [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
  [1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
]

/** A tap on one of the three sizes: a sheet for the star, a bundle of twigs for the wreath, a tin for the biscuit. */
function size(fair: Fair, index: number): void {
  const piece = fair.piece
  fair.hop = { what: 'size', index, age: 0 }
  if (piece?.craft === 'star') {
    if (piece.size === index) return fair.say({ name: 'paper' })
    // A sheet with fewer points than are folded is not taken: the folds are the child's work, and the bench keeps them.
    // The sheet at the front hops, the paper answers, and the star on the bench stays as it is.
    if (piece.points > POINTS[index]) {
      fair.bench.knock(2)
      return fair.say({ name: 'paper' })
    }
    piece.size = index
    fair.bench.knock(4)
    fair.say({ name: 'sheet' })
    fair.changed(2)
  } else if (piece?.craft === 'wreath') {
    // The bundle is bound on beside the twigs that are there: a twig bound by hand stays, and any twig can still be added by hand.
    if (BUNDLES[index].every((twig, place) => !twig || piece.twigs[place])) return fair.say({ name: 'brush' })
    piece.twigs = piece.twigs.map((twig, place) => (twig || BUNDLES[index][place] ? 1 : 0))
    fair.bench.knock(5)
    fair.say({ name: 'rustle' })
    fair.after(0.1, { name: 'vrrp' })
    fair.folk.react('coat')
    fair.changed(2)
  } else if (piece?.craft === 'biscuit') {
    // The tin comes down on the dough, every time. Icing beyond a smaller tin's edge is kept under it: a larger tin shows it again.
    piece.tin = index
    piece.cut = true
    fair.bench.knock(6)
    fair.say({ name: 'chk' })
    fair.folk.react('coat')
    fair.changed(2)
  }
}

/** Whether the finger has gone further from where it landed than a tap may: a pull, not a tap. */
function pulled(fair: Fair, at: { x: number; y: number } | null): boolean {
  const from = fair.landed
  return at !== null && from !== null && Math.hypot(at.x - from.x, at.y - from.y) > TAP_REACH
}

/** How much of the pull the piece follows before it comes off. */
const SLACK = 0.4

/**
 * How far the piece is drawn after the finger. A star is not worked by moving, so it follows from where the
 * finger landed. A ring and a biscuit are worked by moving over them, so they follow a finger that has left them.
 */
function slack(fair: Fair, piece: Thing, x: number, y: number): { x: number; y: number } {
  if (piece.craft === 'star') {
    const from = fair.landed ?? { x, y }
    return { x: (x - from.x) * SLACK, y: (y - from.y) * SLACK }
  }
  const mid = piece.craft === 'wreath' ? RING : BOARD
  const edge = piece.craft === 'wreath' ? RING.r + RING.band : piece.craft === 'biscuit' && piece.cut ? BOARD.r[piece.tin] + 4 : BOARD.dough
  const far = Math.hypot(x - mid.x, y - mid.y), over = Math.max(0, far - edge)
  return far > 0 ? { x: ((x - mid.x) / far) * over * SLACK * 1.5, y: ((y - mid.y) / far) * over * SLACK * 1.5 } : { x: 0, y: 0 }
}

export function moveTo(fair: Fair, x: number, y: number): void {
  fair.finger = { x, y }
  // While the finger is down a hand takes nothing: the candle goes on dipping across the whole pot, over her hand and his.
  if (fair.stick) return fair.dipping.moveTo(x, y)
  if (fair.hooked) { fair.hooked = { x, y: y - fair.hookDy }; return }
  if (fair.carry) { fair.carry.x = x; fair.carry.y = y; return }
  if (fair.working) {
    const piece = fair.piece
    if (!piece) return
    const off = pullOff(piece)
    // A finger that is working never gives the piece away by crossing a hand, and never lifts it there: only the
    // far pull takes it off its bench, and a finger on a hand held out is not pulling it anywhere else.
    if (Math.hypot(x - off.x, y - off.y) > off.r && !handOf(x, y) && isMade(piece) && isStall(fair.at)) {
      // Pulled off its bench: from here it is carried as it is, with whatever the finger made of it on the way.
      // Where the finger ends decides what the pull was, so nothing it piped or bound is taken back.
      fair.working = false
      fair.pull = { x: 0, y: 0 }
      fair.bench.lift(piece, false)
      fair.carry = { thing: piece, from: { kind: 'bench' }, x, y }
      fair.say({ name: 'thingUp' })
    } else {
      if (fair.bench.move(piece, x, y)) fair.changed(1)
      // A made piece comes after the finger that pulls at it, with slack, from the start of the pull.
      fair.pull = isMade(piece) ? slack(fair, piece, x, y) : { x: 0, y: 0 }
    }
    return
  }
  const from = fair.pending
  if (!from) return
  if (from.kind === 'lantern') {
    // A finger that slides off the lantern has not tapped it.
    const lantern = from.dir < 0 ? WALK.left : WALK.right
    if (Math.hypot(x - lantern.x, y - lantern.y) > lantern.r) fair.pending = null
    return
  }
  fair.pending = null
  const thing = from.kind === 'slot' ? fair.basket[from.index] : from.kind === 'who' ? fair.held[from.who] : null
  if (!thing) return
  fair.carry = { thing, from, x, y }
  if (from.kind === 'who') fair.show(from.who, null)
  fair.say({ name: 'thingUp' })
}

/** The touch is over. `dropped` is false when it was taken away (a put-away, the browser): the child made no move, and nothing is moved for them. */
export function letGo(fair: Fair, dropped: boolean): void {
  const at = fair.finger, pending = fair.pending, snowTap = fair.snowTap, letAt = fair.letAt
  fair.finger = null
  fair.pending = null
  fair.snowTap = false
  fair.letAt = null
  fair.bare = false
  if (fair.stick) {
    fair.stick = false
    const d = fair.dipping, candle = fair.pieces.candle
    // A finger let go on a hand held out says who is meant, wherever the candle hangs. Taken from the wax like that,
    // the candle comes out with the coat of the dip the child made.
    const hand = at ? handOf(at.x, at.y) : null
    // A tap gives nothing away: the candle is given, or laid in the basket, by a hand that has taken it somewhere.
    const moved = dropped && pulled(fair, at)
    if (moved && hand && d.inPot) { d.takeOut(); fair.drain() }
    if (moved && (hand || !d.inPot) && isMade(candle)) {
      // The candle is where it hangs: let go with its tip in the basket it is laid in, and held up to a fair-goer it is given.
      // Where it hung when the finger lifted, if it has swung on through a lifted finger's moment since.
      const tip = letAt?.tip ?? d.tipShown(), stick = letAt?.stick ?? d.stick, from = { kind: 'bench' } as const
      // The hand holds the stick, and the candle swings under it: where it would hang at rest counts before where the swing has it.
      const rest = { x: stick.x, y: stick.y + LENGTH }
      const inBasket = (p: { x: number; y: number }) => Math.abs(p.x - BASKET.x) <= BASKET.rx + 24 && p.y > 470
      // The stick stops short of the two at the edges: there the finger says who is meant.
      const beyond = at !== null && (at.x < STICK.minX || at.x > STICK.maxX)
      const far = hand ?? (beyond ? whoAt(at.x, at.y) : null)
      // The swing never gives the candle away, to the basket or to anyone: the hand holds the stick, and the stick decides.
      const who = far ?? whoAt(rest.x, rest.y) ?? whoAt(stick.x, stick.y + LENGTH / 2)
      if (!far && inBasket(rest) && !fair.finished) layIn(fair, candle, from, tip)
      else if (who) give(fair, who, candle, from, tip)
    }
    d.release()
    return
  }
  if (fair.hooked) {
    const p = fair.hooked
    fair.hooked = null
    // The basket hangs round the finger that has it: where the finger is says whether it is over the sill.
    if (dropped && overSill({ x: p.x, y: p.y + fair.hookDy })) return carryOut(fair, p)
    // Back on its hook.
    fair.basketFrom = p
    fair.basketAge = dropped ? 0 : 9
    if (dropped) fair.say({ name: 'hookOn' })
    return
  }
  if (fair.carry) {
    const { thing, from, x, y } = fair.carry
    fair.carry = null
    const here = { x, y }
    if (!dropped) return sendBack(fair, thing, from, here, false)
    const who = whoAt(x, y), stall = isStall(fair.at) ? fair.at : null
    // The basket takes a thing wherever it is: on the counter at a stall, on its hook at the door.
    if (!fair.finished && overBasket(x, y)) layIn(fair, thing, from, here)
    else if (who) give(fair, who, thing, from, here)
    else if (stall && (onBench(stall, x, y) || Math.hypot(x - BENCH[stall].x, y - BENCH[stall].y) <= BENCH[stall].r)) toBench(fair, thing, from, here)
    else sendBack(fair, thing, from, here, true)
    return
  }
  if (fair.working) {
    fair.working = false
    const piece = fair.piece
    // Where the finger ends decides. A made piece that was pulled, from anywhere on it, and let go on a hand held
    // out or on a fair-goer's body, off the piece as it is drawn, is given as it is: the line piped or the twig
    // bound on the way stays on it. A rub or a stroke that ends on the piece is the rub or the stroke it was. A tap
    // gives nothing away.
    const who = at ? whoAt(at.x, at.y) : null
    if (dropped && piece && at && who && pulled(fair, at) && isMade(piece) && !drawnOn(piece, at.x, at.y)) {
      fair.bench.lift(piece, false)
      const bench = BENCH[piece.craft as Exclude<Craft, 'candle'>], from = { x: bench.x + fair.pull.x, y: bench.y + fair.pull.y }
      fair.pull = { x: 0, y: 0 }
      return give(fair, who, piece, { kind: 'bench' }, from)
    }
    // A tap makes one piece of work where the finger landed; a touch that was taken away makes none.
    if (piece && fair.bench.lift(piece, dropped, at?.x, at?.y)) fair.changed(1)
    return
  }
  // The basket in the snow, tapped once the ending is over: the next fair begins.
  if (dropped && snowTap && at && fair.finished && fair.at === 'door' && spotAt(at.x, at.y, { place: 'door', covered: false, things: 0, finished: true }).kind === 'basket') return again(fair)
  // A tap on a thing in the basket only made it hop, but for a thing of the stall the child stands at: that one
  // goes back onto its own bench, and the piece that was in work takes its place, so the next tap undoes it.
  // A thing is used at another stall by carrying it onto that bench.
  // A walking lantern, let go where it was pressed: the walk begins.
  if (dropped && pending?.kind === 'lantern' && at) {
    const lantern = pending.dir < 0 ? WALK.left : WALK.right
    if (Math.hypot(at.x - lantern.x, at.y - lantern.y) <= lantern.r) walk(fair, pending.dir)
    return
  }
  const tapped = pending?.kind === 'slot' ? fair.basket[pending.index] : null
  if (dropped && pending?.kind === 'slot' && tapped && tapped.craft === fair.at) toBench(fair, tapped, pending, fair.placeOf(pending, tapped))
}

