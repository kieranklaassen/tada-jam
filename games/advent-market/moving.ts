import { BASKET, REST } from './hall'
import type { Fair, From, Point } from './fair'
import { BENCH, RING, isStall, slotAt, type Stall } from './places'
import { MARK, fresh, isMade, copyThing, twigCount, type Biscuit, type CandleThing, type Star, type Thing, type Wreath } from './things'
import { comesOff, use } from './uses'

// How a thing goes from one place of the fair to another: into the basket,
// onto a bench, back where it came from. Each changes what a save keeps in
// the same call, and sends the thing on its way as a view.

/** The bench the child stands at gets its fresh piece again, in the size and the colour it had out. */
export function freshen(fair: Fair, stall: Stall): void {
  const old = fair.pieces[stall]
  switch (old.craft) {
    case 'candle':
      fair.pieces.candle = fresh('candle') as CandleThing
      fair.hung()
      break
    case 'star':
      fair.pieces.star = fresh('star', old.size, old.colour) as Star
      break
    case 'wreath':
      fair.pieces.wreath = fresh('wreath', 1, old.colour) as Wreath
      break
    case 'biscuit':
      fair.pieces.biscuit = fresh('biscuit', old.tin, old.colour) as Biscuit
      break
  }
}

/** Sends a thing through the air, as a view: what a save keeps has already changed. `hides` is where it must not be drawn until it lands. */
export function fly(fair: Fair, thing: Thing, from: Point, to: Point, hides: From | null, thereAndBack = false): void {
  fair.flight = { thing: copyThing(thing), from, to, age: 0, lasts: thereAndBack ? 0.9 : 0.26, dip: thereAndBack, hides }
}

/** The thing in the hand goes back where it came from. Nothing changed. */
export function sendBack(fair: Fair, thing: Thing, from: From, at: Point, heard: boolean): void {
  if (from.kind === 'who') fair.show(from.who, copyThing(thing))
  if (!heard) return
  fly(fair, thing, at, fair.placeOf(from, thing), from)
  fair.say({ name: 'thingBack' })
}

/** There is no place for it: the basket rocks with a creak and the thing goes back. */
function noRoom(fair: Fair, thing: Thing, from: From, at: Point): void {
  // Carried out, the basket is not here to rock: the thing only goes back.
  if (fair.finished) return sendBack(fair, thing, from, at, true)
  fair.basketShake.v += 8
  fair.say({ name: 'basketFull' })
  fair.folk.react('full')
  if (from.kind === 'who') fair.show(from.who, copyThing(thing))
  fly(fair, thing, at, fair.placeOf(from, thing), from)
}

/** A thing let go over the basket is laid in it. */
export function layIn(fair: Fair, thing: Thing, from: From, at: Point): void {
  if (from.kind === 'slot' || !isMade(thing)) return sendBack(fair, thing, from, at, true)
  if (!fair.room()) return noRoom(fair, thing, from, at)
  if (from.kind === 'bench') { if (isStall(fair.at)) freshen(fair, fair.at) }
  else { fair.held[from.who] = null; fair.show(from.who, null) }
  fair.basket.push(thing)
  const slot: From = { kind: 'slot', index: fair.basket.length - 1 }
  fly(fair, thing, at, slotAt(slot.index), slot)
  fair.basketShake.v += 3
  fair.say({ name: 'basketIn' })
  fair.folk.react('basket')
  fair.changed(2)
}

/** Takes a thing out of where a save keeps it: its place in the basket or the hand that holds it. */
function takeOut(fair: Fair, from: From): void {
  if (from.kind === 'slot') fair.basket.splice(from.index, 1)
  else if (from.kind === 'who') { fair.held[from.who] = null; fair.show(from.who, null) }
}

/**
 * A thing from the basket or from a hand is put on the bench the child stands at: let go there, or tapped in the
 * basket. At the stall of its own craft it becomes the piece in work, and the piece that was in work takes its
 * place. At another stall it is used there (uses.ts).
 */
export function toBench(fair: Fair, thing: Thing, from: From, at: Point): void {
  const stall = fair.at
  if (!isStall(stall) || from.kind === 'bench') return sendBack(fair, thing, from, at, true)
  const piece = fair.pieces[stall], middle = stall === 'candle' ? { x: REST.x, y: REST.y + 150 } : BENCH[stall]
  if (thing.craft === stall) {
    const old = isMade(piece) ? piece : null
    if (old && from.kind === 'who' && !fair.room()) return noRoom(fair, thing, from, at)
    if (old && from.kind === 'slot') fair.basket[from.index] = old
    else { takeOut(fair, from); if (old) fair.basket.push(old) }
    ;(fair.pieces as Record<Stall, Thing>)[stall] = thing
    if (stall === 'candle') fair.hung()
    fly(fair, thing, at, middle, { kind: 'bench' })
    fair.bench.knock(4)
    fair.say({ name: 'thingBack' })
    fair.say({ name: 'bench' })
    fair.changed(2)
    return
  }
  const off = comesOff(stall, thing, piece)
  const free = fair.finished ? 0 : BASKET.slots - fair.basket.length + (from.kind === 'slot' && off > 0 ? 1 : 0)
  if (off > free) return noRoom(fair, thing, from, at)
  const used = use(stall, thing, piece, stall === 'candle' ? fair.pot : 'colour' in piece ? piece.colour : 0)
  if (used.kind === 'set') {
    takeOut(fair, from)
    used.back.forEach((back, n) => {
      if (n === 0 && from.kind === 'slot') fair.basket.splice(from.index, 0, back)
      else fair.basket.push(back)
    })
    fly(fair, thing, at, middle, null)
    if (stall === 'wreath' && thing.craft === 'candle' && twigCount(piece as Wreath) > 0) {
      // The twigs spring apart round it and needles scatter. A bare ring has none to scatter.
      fair.puff('needles', RING.x, RING.y + RING.r - 10, 10)
      fair.bench.knock(6)
    }
    if (stall === 'wreath' && thing.craft === 'star' && fair.flight) {
      // Tied to the top of the ring: the ribbon pulls tight and the star spins once.
      fair.flight.to = { x: RING.x, y: RING.y - RING.r }
      fair.flight.lasts = 0.5
      fair.flight.spin = true
    }
  } else {
    if (from.kind === 'who') fair.show(from.who, copyThing(thing))
    fly(fair, thing, fair.placeOf(from, thing), stall === 'candle' ? { x: BENCH.candle.x, y: BENCH.candle.y + 40 } : middle, from, true)
  }
  fair.bench.knock(used.kind === 'set' ? 6 : 4)
  if (stall === 'candle') { fair.potRing.v += 3; fair.ring(BENCH.candle.x) }
  // A candle that gives no light makes no chime behind the star: it knocks on the pane.
  const dark = stall === 'star' && thing.craft === 'candle' && thing.mark !== MARK.none
  // A bare ring rustles no needles: the candle knocks into the straw.
  const bare = stall === 'wreath' && thing.craft === 'candle' && twigCount(piece as Wreath) === 0
  fair.say(dark ? { name: 'glassTap' } : bare ? { name: 'thock' } : used.first)
  if (used.times > 0) fair.after(0.3, used.then, used.times)
  if (used.last) fair.after(0.3 + used.times * 0.11 + 0.12, used.last)
  fair.folk.react('coat')
  fair.changed(2)
}
