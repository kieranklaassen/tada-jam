import { HEADS, RIM_Y, UPRIGHT_SIZE, insideOrder, overRim } from './basket'
import { covers } from './shape'
import { BASKET, freeSpot } from './layout'
import { BOO_SQUEAK, RATTLES, ROCK_HORSE_CREAKS, ROCK_HORSE_NEIGH, ROCK_ONCE_KNOCKS, SHUFFLE_SQUEAK, TEETER } from './pose'
import { OUT_ORDER, call, march, outAgain } from './scenesBasket'
import { carried, ride, tower } from './scenesCarry'
import { asleep, slide, tunnel } from './scenesClimb'
import { ghost } from './scenesGhost'
import { outermost, parentOf, rests, topOf, withRiders } from './stack'
import type { Piece } from './thing'
import type { World } from './world'

// What one thing does when it is put on another, and what the basket does. Every pair has its own answer.
// The long ones are scenes (the scenes* modules); the short ones are here, and each sounds at the moment the
// thing lands on its seat. Either way the outcome is in the things' resting places from the press on, so a
// put-away at any instant finds it.

/** A thing in hand is put on a thing on the mat: on the top of whatever stack that thing is part of, and under the silk if the silk lies there. */
export function putOn(w: World, a: Piece, target: Piece): void {
  const top = topOf(w.pieces, target)
  w.say({ name: 'touch', piece: a.def.id, gain: 0.4 })
  if (top.def.kind !== 'silk') return join(w, a, top, null)
  const under = parentOf(w.pieces, top)
  if (under) return join(w, a, under, top)
  // The silk lies flat on the mat: the thing takes its place and the silk is over it.
  const over = topOf(w.pieces, a)
  a.at = 'mat'
  w.moveRest(a, top.x, top.y)
  w.attach(top, over)
  w.changes += 1
  if (over.def.kind === 'arch') w.fly(a, 'seat')
  else ghost(w, top, over, a)
}

function join(w: World, a: Piece, lower: Piece, silk: Piece | null): void {
  // A doll and the horse never stay on a standing arch: the doll slides down it, the horse goes through it or stops at its mouth. An arch on its back comes down beside it.
  // A nest of arches is climbed and gone round as the arch it looks like from outside: its outermost.
  if (!rests(a, lower)) return a.def.kind === 'arch' ? beside(w, a, lower) : a.def.kind === 'doll' ? slide(w, a, outermost(w.pieces, lower)) : tunnel(w, a, outermost(w.pieces, lower))
  // The silk that lay over the lower thing lies over the top of the stack again, with the newcomer under it.
  if (silk) w.detach(silk)
  w.attach(a, lower)
  if (silk) w.attach(silk, topOf(w.pieces, a))
  if (a.def.kind === 'silk' && lower.def.kind !== 'arch') return ghost(w, a, lower, null)
  if (a.def.kind === 'doll' && lower.def.kind === 'arch') return asleep(w, a, lower)
  if (a.def.kind === 'doll' && lower.def.kind === 'doll') return tower(w, a, lower)
  if (a.def.kind === 'doll' && lower.def.kind === 'horse') return ride(w, a, lower)
  if (a.def.kind === 'horse' && lower.def.kind === 'doll') return carried(w, a, lower)
  w.changes += 1
  w.fly(a, 'seat')
}

/** A thing has landed on its seat: the pair answers, now. */
export function answer(w: World, p: Piece, gain: number): void {
  const id = p.def.id, lower = parentOf(w.pieces, p)
  if (p.at === 'basket') return inBasket(w, p)
  if (!lower) {
    // It was put under the silk: it knocks down, and the silk over it answers.
    w.knock(p, gain)
    const over = topOf(w.pieces, p)
    if (over.def.kind === 'silk') silkOver(w, over, p)
    return
  }
  p.stirAt = lower.stirAt = w.time
  if (p.def.kind === 'silk') return silkOver(w, p, lower)
  if (p.def.kind === 'horse') {
    // A rocking horse: it stands in the cradle and rocks, creak and creak, and neighs upward.
    w.say({ name: 'clop', piece: id, gain: 0.8 })
    lower.stir = 'rockHorse'
    for (const at of ROCK_HORSE_CREAKS) w.after(at + 0.02, lower, { name: 'creak', gain: 0.7 - at * 0.25 })
    w.after(ROCK_HORSE_NEIGH, p, { name: 'neigh', piece: id, gain: 0.9 })
    return
  }
  p.squashV += 3
  lower.squashV += 3
  switch (lower.def.kind) {
    case 'arch':
      if (lower.turned && !p.turned) {
        // A lid: it teeters, a tick and a tock on the two arches' notes, slowing, and stays tilted.
        p.stir = 'teeter'
        TEETER.forEach((each, i) => {
          const sound = { name: 'tick' as const, piece: i % 2 ? lower.def.id : id, gain: 0.4 + 0.6 * each.wide }
          if (each.at === 0) w.say(sound)
          else w.after(each.at, p, sound)
        })
      } else w.say({ name: 'clack', piece: id, other: lower.def.id, gain: 0.9 })
      break
    case 'doll':
      // A collar: a hollow bonk, then the doll's muffled squeak as it shuffles about blind.
      w.say({ name: 'bonk', piece: id, gain: 0.9 })
      lower.stir = 'shuffle'
      w.after(SHUFFLE_SQUEAK, lower, { name: 'squeak', piece: lower.def.id, gain: 0.6 })
      break
    case 'horse':
      // Round the horse's neck: it shakes it round and round, a rattle of quick dry knocks.
      w.say({ name: 'tok', piece: id, gain: 0.7 })
      p.stir = 'shake'
      lower.stir = 'shake'
      for (const at of RATTLES) w.after(at, p, { name: 'rattle', piece: id, gain: 0.8 })
      break
    case 'silk':
      break
  }
}

/** The silk has come to lie over something that is not a doll or the horse: a hill over a standing arch, a hammock in a cradle. */
function silkOver(w: World, silk: Piece, lower: Piece): void {
  silk.stirAt = lower.stirAt = w.time
  if (lower.def.kind !== 'arch') return
  if (!lower.turned) {
    // A paper hill: one low held tone, and the dolls peek over it.
    w.say({ name: 'hum', piece: lower.def.id, gain: 0.9 })
    w.look = { x: lower.x, y: lower.y - lower.def.height, until: w.time + 1.8, peek: true }
    return
  }
  // A hammock: the cradle rocks once under it with two soft knocks, and a hum slides down and stops.
  w.say({ name: 'humfall', piece: lower.def.id, gain: 0.9 })
  lower.stir = 'rockOnce'
  for (const at of ROCK_ONCE_KNOCKS) w.after(at, lower, { name: 'rock', piece: lower.def.id, gain: 0.35 })
}

/** An arch on its back that is put on a standing arch, or turned onto its back where it nested in one, is set down on the mat beside it, with whatever lies in it: the two never share a foot. */
export function beside(w: World, a: Piece, lower: Piece): void {
  // Beside the whole nest, if the arch is part of one.
  const by = outermost(w.pieces, lower), side = a.px < by.x ? -1 : 1
  const spot = freeSpot(w.bulk(a), by.x + side * (by.def.reach + a.def.reach + 10), by.y, w.roots(a.def.id), true)
  a.at = 'mat'
  w.moveRest(a, spot.x, spot.y)
  w.changes += 1
  w.fly(a, 'knock')
}

/** A doll or the horse that was in a cradle when the cradle was set on its feet tumbles out beside it, and so does an arch that lay in it on its back. */
export function tumble(w: World, p: Piece): void {
  const lower = parentOf(w.pieces, p)
  w.detach(p)
  const side = lower && p.px < lower.x ? -1 : 1
  const spot = freeSpot(w.bulk(p), p.x + side * ((lower?.def.reach ?? 0) + p.def.reach + 10), p.y, w.roots(p.def.id), true)
  w.moveRest(p, spot.x, spot.y)
  w.fly(p, 'knock')
}

/** A thing in hand is put on the basket: it drops in, and whatever rode on it with it. */
export function intoBasket(w: World, a: Piece): void {
  w.say({ name: 'touch', piece: a.def.id, gain: 0.4 })
  const going = withRiders(w.pieces, a)
  for (const p of going) {
    if (p !== a) w.detach(p)
    p.at = 'basket'; p.on = null; p.turned = false; p.stir = null
  }
  w.seatBasket()
  // Each flies in over the rim (or into the mouth of the lying basket), in front of the basket and whole; it sinks behind the wicker once it has landed.
  const over = overRim(w.basket === 'tipped')
  for (const p of going) { p.x = over.x; p.y = over.y; w.fly(p, 'seat', 0.3) }
  w.changes += 1
}

function inBasket(w: World, p: Piece): void {
  const id = p.def.id
  // A wicker thump, and it peeks over the rim. A doll ducks and comes up again with a squeak; the small doll, who likes the basket, with glee.
  w.say({ name: 'wicker', gain: 0.8 })
  w.basketAt = w.time
  // Now it is inside: it sinks to its place, out of sight or with its head looking out.
  w.seatBasket()
  if (p.def.kind !== 'doll') return
  p.stir = 'boo'
  p.stirAt = w.time
  w.after(BOO_SQUEAK, p, { name: id === 'doll-small' ? 'glee' : 'squeak', piece: id, gain: 0.9 })
}

/** The basket is tapped with nothing in hand, at a point of the stage. */
export function tapBasket(w: World, x: number = BASKET.x, y: number = BASKET.y - 20): void {
  if (w.basket === 'tipped') return outAgain(w)
  // While the upright basket holds a thing, a tap pops one thing back out to its place and does nothing else: the one whose face over the rim the finger is on, and anywhere else on the basket the smallest first.
  const inside = OUT_ORDER.map((id) => w.piece(id)).filter((p) => p.at === 'basket')
  if (inside.length) {
    const faces = insideOrder(w.pieces).filter((each) => each.at === 'basket' && HEADS.includes(each.def.id)).reverse()
    const p = (y <= RIM_Y ? faces.find((each) => covers(each.def.id, x - each.px, y - each.py, 0, UPRIGHT_SIZE)) : undefined) ?? inside[0]
    p.at = 'home'; p.x = p.def.home.x; p.y = p.def.home.y; p.stir = null; p.gen += 1
    w.seatBasket()
    w.changes += 1
    w.say({ name: 'pop', piece: p.def.id, gain: 0.9 })
    // It rises out of the basket first, and then flies to its place. One that was still on its way in is in front of the basket and whole: it turns back from where it is, and is never hidden.
    if (p.far < 1) { const far = p.far; w.fly(p, 'tok'); if (p.flight) p.flight.far = far }
    else w.fly(p, 'tok', 0.34, { x: p.px, y: overRim(false).y })
    return
  }
  // The march and the call start only from an upright basket that is empty.
  if (w.pieces.some((p) => p.at === 'mat')) march(w)
  else call(w)
}
