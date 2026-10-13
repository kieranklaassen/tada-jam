import { apart, nearestPlace, offTape, onFloor, reachTo, stripUnder } from './floor'
import { GAITS, RANK, WANT, type Mover } from './habits'
import type { Point } from './input'
import { TAPE_WIDTH, TOY_IDS, TOY_SIZE, type Pose, type ToyId } from './layout'
import type { Crossing } from './crossings'
import { nearestOn, type Strip } from './tape'
import { headingOf, placeOf, travel } from './roads'
import type { PegId } from './save'
import type { Ride, Town, Walk } from './town'
import { HOP, LAND, TOOT, scuff, whine } from './voices'

// How nothing passes through anything. A moving toy looks along its own way
// for the next moments. A toy standing there steps aside to the nearest free
// floor, a short hop and never a leap; where there is none, the mover toots
// once, the one in the way shuffles, and the mover waits and then goes back.
// Stopped again by the same toy in the same place it waits without a sound,
// so a full floor is a calm one. Behind another mover it queues.

/** One place on a toy's way: where it is and how it faces, or, where it is turning, the whole circle it sweeps. */
export type Spot = Pose & { swing: boolean }

export const HOP_SECONDS = 0.34
/** How far ahead a mover looks: the length of a hop and a little more, so that whoever hops has landed before it is there. */
const LOOK_AHEAD = HOP_SECONDS + 0.12
const LAND_CLEAR_OF = 2
/** How often one toy sends another hopping out of its way before it stops doing so, and how far from every tape the second hop lands where it can. */
export const SAME_PAIR = 2
export const WELL_CLEAR = 60
/** How long a mover has been away from a toy it tooted at for it to have come by again, in seconds. */
const CAME_BACK = 1
const LANE_STEP = 20
/** The least room left between a mover and anything else. */
export const CLEAR_BY = 10
/** A hop out of the way is never longer than this. */
export const HOP_REACH = 150
/** How far the dog will trot to get out of the way when there is no room nearer. */
const DOG_REACH = 420
/** How long a mover waits after its toot before it goes back the way it came. */
/** A mover's own toots are at least this far apart, in seconds. */
const TOOT_APART = 1
const PATIENCE = 2.5
/** How long before a dog that came back to where it stood is asked to trot off again. */
const TRY_AGAIN = 20
/** How much slower its patience runs out while the one in the way is busy or ranks lower, or is one it has tooted at already: four times as long. */
const FORBEARANCE = 0.25

/** How far a toy's nose is ahead of its middle: it stops this far short of the end of its tape. */
export const noseOf = (id: ToyId): number => TOY_SIZE[id].long / 2 - 8
export const swingOf = (id: ToyId): number => Math.hypot(TOY_SIZE[id].long, TOY_SIZE[id].wide) / 2 + 6
const bend = (a: number): number => Math.abs(((((a % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI))

/** Only the car takes the turn at a join; everyone else goes straight on. */
export const turnsAt = (id: Mover): boolean => id === 'car'

/** Where a toy will be over the next `seconds`, as places along its way. */
export function laneOf(town: Town, id: Mover, seconds: number): Spot[] {
  const body = town.bodies[id], at = body.at, doing = body.doing
  const here = (swing: boolean): Spot => ({ x: at.x, y: at.y, a: at.a, swing })
  if (doing.is === 'act') return doing.to ? [here(true), { ...doing.to, swing: false }] : [here(true)]
  if (doing.is === 'walk') {
    const dx = doing.to.x - at.x, dy = doing.to.y - at.y, far = Math.hypot(dx, dy), going = Math.atan2(dy, dx)
    // Where it stands, as it faces and through every heading its nose passes as it comes round.
    const spots = [here(false)]
    const gap = ((((going - at.a) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI
    if (far > 1) for (let k = 1, n = Math.ceil(Math.abs(gap) / 0.25); k <= n; k++) spots.push({ x: at.x, y: at.y, a: at.a + (gap * k) / n, swing: false })
    const go = Math.min(far, GAITS[doing.gait].speed * seconds)
    for (let d = LANE_STEP; d < go; d += LANE_STEP) spots.push({ x: at.x + Math.cos(going) * d, y: at.y + Math.sin(going) * d, a: going, swing: false })
    if (go > 1) spots.push({ x: at.x + Math.cos(going) * go, y: at.y + Math.sin(going) * go, a: going, swing: far <= go && !doing.follow })
    return spots
  }
  if (doing.is !== 'ride') return [here(false)]
  const net = town.nets[doing.kind]
  let rider = doing.rider, left = GAITS[doing.gait].speed * seconds, swinging = 0
  const facing = id === 'train' ? at.a : headingOf(net, rider) + (doing.back ? Math.PI : 0)
  const spots = bend(facing - at.a) > 0.2 ? [here(false), { x: at.x, y: at.y, a: facing, swing: false }] : [here(false)]
  while (left > 0) {
    const d = Math.min(LANE_STEP, left)
    left -= d
    const went = travel(net, rider, d, noseOf(id), turnsAt(id))
    rider = went.rider
    // Round a join its nose comes round over the next few lengths, and at the end of its tape it turns on the spot.
    if (went.turned) swinging = 3
    const place = placeOf(net, rider)
    spots.push({ x: place.x, y: place.y, a: id === 'train' ? at.a : headingOf(net, rider) + (doing.back ? Math.PI : 0), swing: swinging > 0 || (went.ended && id !== 'train' && !doing.back) })
    if (went.ended) break
    swinging--
  }
  return spots
}

/** How much room there is between a toy standing at `pose` and a mover at one place on its way. */
export function clearance(spot: Spot, mover: ToyId, other: ToyId, pose: Pose): number {
  return spot.swing ? reachTo(pose, TOY_SIZE[other], spot) - swingOf(mover) : apart(spot, TOY_SIZE[mover], pose, TOY_SIZE[other])
}

/** The circle a toy sweeps while it does something with a turn in it, or 0 when it is doing no such thing. */
export function sweepOf(town: Town, id: ToyId): number {
  const doing = town.bodies[id].doing
  if (doing.is !== 'act' || doing.still) return 0
  if (doing.name === 'doughnut') return swingOf(id) + 92
  return (doing.flip && id !== 'train') || doing.name === 'spin' || doing.name === 'circle' ? swingOf(id) : 0
}

/** How much room there is between a toy at `pose` and another as it is now: its rectangle, or the circle it is sweeping. */
export function roomFrom(town: Town, pose: Pose, size: { long: number; wide: number }, other: ToyId): number {
  const sweep = sweepOf(town, other), theirs = town.bodies[other]
  if (!sweep) return apart(pose, size, theirs.at, TOY_SIZE[other])
  const centre = theirs.doing.is === 'act' ? theirs.doing.from : theirs.at
  return reachTo(pose, size, centre) - sweep
}

/** How much room a toy at `pose` leaves another that is backing off to a place on the floor: the least along the rest of its way there. */
function roomOnItsWay(town: Town, pose: Pose, size: { long: number; wide: number }, other: ToyId): number {
  const theirs = town.bodies[other], doing = theirs.doing
  if (doing.is !== 'act' || !doing.to || theirs.flight) return Infinity
  let least = Infinity
  for (const part of [0.25, 0.5, 0.75, 1]) least = Math.min(least, apart(pose, size, { x: theirs.at.x + (doing.to.x - theirs.at.x) * part, y: theirs.at.y + (doing.to.y - theirs.at.y) * part, a: doing.to.a }, TOY_SIZE[other]))
  return least
}

/** Whether a toy has room to turn where it stands, with `more` units to spare. */
export function roomToTurn(town: Town, id: ToyId, more = 0): boolean {
  const at = town.bodies[id].at, f = town.field, reach = swingOf(id) + more - 20
  // Its corners may swing a little over the edge of the boards, and no more.
  if (at.x - reach < f.x0 || at.x + reach > f.x1 || at.y - reach < f.y0 || at.y + reach > f.y1) return false
  // Whoever is itself turning where it stands takes up the whole circle it sweeps.
  return grounded(town, id).every((other) => {
    const sweep = sweepOf(town, other), theirs = town.bodies[other]
    const centre = theirs.doing.is === 'act' ? theirs.doing.from : theirs.at
    const room = sweep ? Math.hypot(centre.x - at.x, centre.y - at.y) - sweep : reachTo(theirs.at, TOY_SIZE[other], at)
    return room - swingOf(id) - more >= 4
  })
}

/** The toys that take up floor: not a peg on the bus's roof or one in the hand. */
export function grounded(town: Town, but?: ToyId): ToyId[] {
  return TOY_IDS.filter((id) => id !== but && !town.state.riding[id as PegId] && town.bodies[id].doing.is !== 'held')
}

/**
 * The nearest free floor to `want` for a toy the game sets down: its whole body on the bare floor, on no tape
 * of any colour, on no other toy, and out of the way of `mover` if one is named; with `via`, reachable from there in
 * a straight line, and with `nose` it goes and stands there nose first. Null when there is none within `far`.
 */
export function freePlace(town: Town, id: ToyId, want: Pose, far: number, toward: number, mover?: { id: ToyId; lane: Spot[] }, offToys = true, via?: Pose, nose = false, offTapeBy = 4): Pose | null {
  const size = TOY_SIZE[id], all = grounded(town, id), others = all.filter((other) => other !== mover?.id)
  const facing = (at: Point): number => (nose && via && (at.x !== via.x || at.y !== via.y) ? Math.atan2(at.y - via.y, at.x - via.x) : want.a)
  const found = nearestPlace(want, far, toward, (at: Point) => {
    const pose = { x: at.x, y: at.y, a: facing(at) }
    if (!onFloor(town.field, pose, size)) return false
    if (offToys && !town.state.strips.every((strip) => offTape(strip, pose, size) >= offTapeBy)) return false
    if (!others.every((other) => roomFrom(town, pose, size, other) >= 6 && roomOnItsWay(town, pose, size, other) >= 6)) return false
    // Going there along the floor, and not through the air, it must get there without brushing anybody, and the
    // one it makes way for stands in that way like anybody else.
    if (via) for (const part of [0.2, 0.4, 0.6, 0.8]) { const on = { x: via.x + (at.x - via.x) * part, y: via.y + (at.y - via.y) * part, a: pose.a }; if (!(nose ? all : others).every((other) => roomFrom(town, on, size, other) >= 4)) return false }
    return !mover || mover.lane.every((spot) => clearance(spot, mover.id, id, pose) >= CLEAR_BY + 6)
  })
  return found && { x: found.x, y: found.y, a: facing(found) }
}

/** How many toys stand in a walker's straight way from one place to another: its body, nose first, at steps along it. */
function inTheWay(town: Town, id: ToyId, from: Point, to: Point, others: ToyId[]): number {
  const a = Math.atan2(to.y - from.y, to.x - from.x), size = TOY_SIZE[id]
  const steps = Math.max(2, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 40))
  let count = 0
  for (const other of others) {
    if (town.bodies[other].doing.is !== 'stand' && !sweepOf(town, other)) continue
    for (let k = 1; k <= steps; k++) {
      const on = { x: from.x + ((to.x - from.x) * k) / steps, y: from.y + ((to.y - from.y) * k) / steps, a }
      if (roomFrom(town, on, size, other) < CLEAR_BY + 2) { count++; break }
    }
  }
  return count
}

/**
 * A way round for a walker stopped on its way to `to` by somebody who cannot step aside: a place on the bare
 * floor to one side that it can walk straight to past everybody, where it has room to turn, and from where fewer
 * stand between it and where it is going. The shortest such way, or null when there is none.
 */
export function wayRound(town: Town, id: Mover, to: Point): Point | null {
  const at = town.bodies[id].at, size = TOY_SIZE[id], others = grounded(town, id)
  const now = inTheWay(town, id, at, to, others)
  let best: { at: Point; cost: number } | null = null
  for (const far of [110, 170, 230, 300]) {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2, spot = { x: at.x + Math.cos(a) * far, y: at.y + Math.sin(a) * far }, pose = { ...spot, a }
      if (!onFloor(town.field, pose, size)) continue
      if (!town.state.strips.every((strip) => offTape(strip, pose, size) >= 4)) continue
      if (!others.every((other) => reachTo(town.bodies[other].at, TOY_SIZE[other], spot) - swingOf(id) >= 4)) continue
      if (inTheWay(town, id, at, spot, others) > 0) continue
      const then = inTheWay(town, id, spot, to, others)
      if (then >= now) continue
      const cost = then * 1000 + far + Math.hypot(to.x - spot.x, to.y - spot.y)
      if (!best || cost < best.cost) best = { at: spot, cost }
    }
  }
  return best ? best.at : null
}

/**
 * A toy afloat goes under whatever travels a road or a rail: where they meet is a bridge or a trestle.
 * True while it is under that road or rail, or about to be.
 */
export function passesUnder(town: Town, swimmer: ToyId, other: ToyId): boolean {
  const swims = town.bodies[swimmer].doing, theirs = town.bodies[other].doing
  // In the reeds beside a bridge it is still in its river.
  const afloat = swims.is === 'ride' ? swims : swims.is === 'act' && swims.after?.is === 'ride' ? swims.after : swims.is === 'stand' && swims.as === 'reeds' ? swims.resume : null
  const over = theirs.is === 'ride' ? theirs : theirs.is === 'act' && theirs.after?.is === 'ride' ? theirs.after : null
  if (!afloat || afloat.kind !== 1 || !over || (over.kind !== 0 && over.kind !== 3)) return false
  const way = town.nets[over.kind].strips[over.rider.s]
  return way !== undefined && nearestOn(way, town.bodies[swimmer].at).off < underReach(swimmer) + 60
}

/** How near the middle of a road or rail a toy afloat is while any of it is under: half the tape, half its own length and a little. */
export const underReach = (id: ToyId): number => TAPE_WIDTH / 2 + TOY_SIZE[id].long / 2 + 27

export type Under = { crossing: Crossing; over: Strip; d: number; off: number }

/** The road or the rails a toy afloat is under: of those that cross its river, the one it is nearest to. Null when it is under none. */
export function underOf(town: Town, id: ToyId): Under | null {
  const body = town.bodies[id]
  if (!body.hidden || id === 'train') return null
  let found: Under | null = null
  for (const crossing of town.crossings) {
    if (crossing.kind !== 'bridge' && crossing.kind !== 'trestle') continue
    const bridge = crossing.kind === 'bridge', over = bridge ? crossing.low : crossing.high, off = nearestOn(over, body.at).off
    if (off <= (found?.off ?? underReach(id)) && Math.hypot(crossing.at.x - body.at.x, crossing.at.y - body.at.y) < underReach(id) + 40) found = { crossing, over, d: bridge ? crossing.dLow : crossing.dHigh, off }
  }
  return found
}

/** How large a toy is drawn and touched: the duck under a bridge has dived, smaller the further under it is, so that at the middle it is gone. */
export function drawnScale(town: Town, id: ToyId): number {
  const under = id === 'duck' ? underOf(town, id) : null
  return under ? 0.48 + 0.52 * Math.max(0, Math.min(1, under.off / (TAPE_WIDTH / 2 + TOY_SIZE.duck.long / 2))) : 1
}

/** The toys that float: they go under what crosses their river. */
export const AFLOAT: readonly ToyId[] = ['duck', 'car', 'bus']

/**
 * The order the toys are painted in, bottom first: whoever is afloat under a bridge, then the toys on the floor,
 * the pegs on the bus's roof, whoever is in the air, and last whoever is in the hand. The view paints in this
 * order and a finger meets the toys in the reverse of it, so a tap meets what is seen.
 */
export function layersOf(town: Town): { under: ToyId[]; floor: ToyId[]; riding: ToyId[]; aloft: ToyId[]; held: ToyId[] } {
  const up = (id: ToyId): boolean => !!town.bodies[id].flight?.started || town.bodies[id].doing.is === 'held'
  const rides = (id: ToyId): boolean => town.state.riding[id as PegId] === true
  const under = AFLOAT.filter((id) => !up(id) && underOf(town, id) !== null)
  // A toy that has not yet tumbled out of the tipped box is still inside it, out of sight.
  const inBox = (id: ToyId): boolean => { const flight = town.bodies[id].flight; return !!flight && !flight.started && flight.scene }
  const floor = TOY_IDS.filter((id) => !inBox(id) && !up(id) && !under.includes(id) && !rides(id))
  const busUp = up('bus')
  const riders = TOY_IDS.filter((id) => rides(id) && !town.bodies[id].flight && town.bodies[id].doing.is !== 'held')
  const withRiders = (id: ToyId): ToyId[] => (id === 'bus' ? [id, ...riders] : [id])
  return {
    under,
    floor,
    riding: busUp ? [] : TOY_IDS.filter((id) => rides(id) && !up(id)),
    aloft: TOY_IDS.filter((id) => up(id) && town.bodies[id].doing.is !== 'held').flatMap(withRiders),
    held: TOY_IDS.filter((id) => town.bodies[id].doing.is === 'held').flatMap(withRiders),
  }
}

/**
 * A short hop to free floor, with its own sound: it stands where it lands. One that was on its way across the
 * boards to its tape was not standing: it stands aside for `asideFor`, the one it hopped for, and sets off again
 * when they have gone by.
 */
export function hopTo(town: Town, id: ToyId, to: Pose, asideFor?: ToyId): void {
  const body = town.bodies[id]
  // Hopped again while it stood aside, it is still on its way.
  if (!asideFor && body.doing.is === 'stand') asideFor = body.doing.aside
  if (asideFor) body.asides++
  // The dog hopped out of the way a second time lies down where it lands, and follows nobody from there. Its count
  // does not run out by itself: only a tap, or a strip laid or peeled, gets it up.
  const lies = id === 'dog' && ++body.asides >= 2
  body.flight = { from: { ...body.at }, wait: 0, t: 0, lasts: HOP_SECONDS, started: false, scene: false, loud: false, off: HOP[id], land: LAND[id], then: 'stand' }
  body.at = town.state.toys[id] = to
  body.hidden = false
  body.doing = asideFor ? { is: 'stand', as: 'parked', since: town.time, aside: asideFor } : { is: 'stand', as: lies ? 'lying' : 'parked', since: town.time }
  town.mark('soon')
}

/** A toy whose tape was peeled from under it stands where it stood, unless that is on top of somebody: then it hops to the nearest free floor. */
export function clearOf(town: Town, id: ToyId): void {
  const body = town.bodies[id]
  if (grounded(town, id).every((other) => roomFrom(town, body.at, TOY_SIZE[id], other) >= 0)) return
  const to = freePlace(town, id, body.at, HOP_REACH * 2, 0)
  if (to) hopTo(town, id, to)
}

/**
 * Whether a mover has tooted at this toy already and nothing has changed since: a toy that stands is where it
 * stood then, and one that is crossing its way has been in it without a break (it is somewhere else every frame,
 * and one toot is all it gets).
 */
export function asMet(seen: (Pose & { at: number }) | undefined, now: Pose, walking: boolean, time: number): boolean {
  if (seen === undefined) return false
  if (walking) return time - seen.at < 0.5
  return Math.abs(seen.x - now.x) < 2 && Math.abs(seen.y - now.y) < 2 && Math.abs(seen.a - now.a) < 0.05
}

/** Whether a toy sits on its own tape: the duck in its bath, a bus on a stub of road. */
export function atHome(town: Town, id: ToyId): boolean {
  const body = town.bodies[id], doing = body.doing
  if (!(id in WANT) || doing.is !== 'stand' || body.flight || (doing.as !== 'bath' && doing.as !== 'parked')) return false
  const kind = WANT[id as Mover]
  return kind !== null && town.flat.some((strip) => strip.kind === kind && stripUnder([strip], body.at) === 0)
}

/**
 * Looks along a mover's way. A toy standing in it steps aside; where it cannot, or where the one ahead is
 * itself on the move, the mover waits: `wait`. Stopped by a toy that cannot step aside it toots once, the one
 * in the way shuffles, and after a wait it gives up: `back`. Stopped again by the same toy in the same place it
 * makes no sound and waits four times as long: no toot repeats while nothing has changed. `but` is a toy it
 * need not look for: the train, for whoever waits behind a shut gate. `look` is how far ahead it looks, in
 * seconds, where that is further than a hop: right across a level crossing, before it drives onto one.
 */
export function wayOf(town: Town, id: Mover, doing: Ride | Walk, dt: number, but?: ToyId, look = 0): 'go' | 'wait' | 'back' {
  const lane = laneOf(town, id, look > 0 ? look + LOOK_AHEAD : LOOK_AHEAD), body = town.bodies[id]
  let further: Spot[] | null = null, verdict: 'go' | 'wait' = 'go', patient = false, queued = false, deadlock = false, fresh = false
  const blockers = new Set<ToyId>()
  for (const other of grounded(town, id)) {
    const theirs = town.bodies[other]
    if (other === but) continue
    // Whoever is on the road at a level crossing and short of the rails is clear of the train, which does not wait for it.
    if (id === 'train' && town.frames - theirs.offRailsAt <= 1 && theirs.doing.is === 'ride') continue
    if (passesUnder(town, id, other) || passesUnder(town, other, id)) continue
    const sweep = sweepOf(town, other)
    const room = (spot: Spot): number => (sweep && !spot.swing ? roomFrom(town, spot, TOY_SIZE[id], other) : clearance(spot, id, other, theirs.at))
    if (lane.every((spot) => room(spot) >= CLEAR_BY)) continue
    // Nearer than that already where it stands, and no nearer anywhere along its way, and further off at the end
    // of it: it is leaving, and nobody is kept standing against the one it would leave.
    const here = room(lane[0])
    if (lane.length > 1 && here < CLEAR_BY && room(lane[lane.length - 1]) >= here + 2 && lane.every((spot) => room(spot) >= here - 0.01)) continue
    // Whoever stands hops aside, and so does one of lower rank who is only crossing the floor.
    const crossing = theirs.doing.is === 'walk' && other in RANK && RANK[other as Mover] < RANK[id]
    // Whoever sits on a stub of its own tape is at home there, and hops aside for the train alone.
    const home = id !== 'train' && atHome(town, other)
    // Nobody is sent hopping by the same toy again and again: twice, and after that the mover is the one who waits
    // or turns back, without a sound.
    const sent = theirs.hopped[id] ?? 0, spent = sent >= SAME_PAIR
    // One a finger rests on, standing or stopped on its way, is in the way like a toy with no free floor near: it is
    // tooted at once and left where it is.
    const rested = town.stopped(other)
    if ((rested || ((theirs.doing.is === 'stand' || crossing) && !home && !spent)) && !theirs.flight) {
      further ??= laneOf(town, id, LAND_CLEAR_OF)
      const away = Math.atan2(theirs.at.y - body.at.y, theirs.at.x - body.at.x)
      // The second time, it goes well clear of every tape if there is such a place: out of everybody's way for good.
      // So does one it tooted at here before and finds here still when it comes by again: no free floor is near, and
      // it goes to free floor further off.
      const before = body.met[other], again = other !== 'dog' && before !== undefined && theirs.doing.is === 'stand' && town.time - before.at > CAME_BACK && asMet(before, theirs.at, false, town.time)
      const to = rested ? null : (sent > 0 || again ? freePlace(town, other, theirs.at, HOP_REACH * 2, away, { id, lane: further }, true, undefined, false, WELL_CLEAR) : null) ?? freePlace(town, other, theirs.at, again ? HOP_REACH * 2 : HOP_REACH, away, { id, lane: further })
      if (to) {
        theirs.hopped[id] = sent + 1
        // The dog was only following somebody, and stands where it lands like a toy that stood.
        hopTo(town, other, to, (theirs.doing.is === 'walk' && !theirs.doing.follow && other !== 'dog') || (theirs.doing.is === 'stand' && theirs.doing.aside) ? id : undefined)
        continue
      }
      verdict = 'wait'
      patient = true
      const seen = body.met[other]
      const known = asMet(seen, theirs.at, theirs.doing.is === 'walk', town.time)
      if (other === 'dog' && !rested) {
        // The dog got there on its own legs and leaves on them: with a whine it trots off to free floor further away.
        if (theirs.doing.is === 'walk' && !theirs.doing.follow) continue
        // It went from here before and is back where it stood: it is not sent again until a long quiet while has
        // gone by, and then without a sound.
        const back = seen !== undefined && Math.hypot(seen.x - theirs.at.x, seen.y - theirs.at.y) < 12
        if (!back || town.time - (seen.sent ?? -Infinity) > TRY_AGAIN) {
          const off = freePlace(town, other, theirs.at, DOG_REACH, away, { id, lane: further }, true, theirs.at, true)
          if (off) {
            body.met[other] = { ...theirs.at, at: town.time, sent: town.time }
            theirs.doing = { is: 'walk', to: off, gait: 'follow', odo: 0, held: 0, toots: 0, tootAt: -Infinity, follow: false }
            if (!back) town.hum(whine)
            continue
          }
        }
        if (back) { body.met[other] = { ...seen, at: town.time }; continue }
      }
      // Nowhere to hop to: it toots once, and the one in the way shuffles. It has tooted at this toy in this place
      // already: it says nothing more until something there changes.
      body.met[other] = { ...theirs.at, at: town.time, sent: seen?.sent }
      // It has only one toot in it at a time: the one it gave a moment ago, or the sound it set off with, does for
      // whoever else is there. They shuffle all the same.
      if (!known) {
        fresh = true
        if (town.time - doing.tootAt >= TOOT_APART) {
          doing.tootAt = town.time
          doing.toots++
          town.hum(TOOT[id])
        }
        town.hum(scuff)
        theirs.landedAt = town.time
      }
      continue
    }
    verdict = 'wait'
    blockers.add(other)
    if (town.waiting.get(other as Mover)?.has(id)) deadlock = true
    // Behind somebody going the same way along the same tape it queues, for as long as it takes.
    const ahead = theirs.doing
    if (doing.is === 'ride' && ahead.is === 'ride' && ahead.kind === doing.kind && ahead.rider.s === doing.rider.s && ahead.rider.dir === doing.rider.dir && (ahead.rider.d - doing.rider.d) * doing.rider.dir > 0) patient = queued = true
    else if (theirs.flight || ahead.is === 'act' || ahead.is === 'stuck') patient = true
    // The one who ranks lower gives way: the train to nobody, the dog to everybody.
    else if (!spent && other in RANK && RANK[other as Mover] < RANK[id]) patient = true
  }
  if (verdict === 'go') {
    doing.held = 0
    doing.toots = 0
    doing.fresh = false
    town.waiting.delete(id)
    return 'go'
  }
  town.waiting.set(id, blockers)
  if (fresh) doing.fresh = true
  // Two who each wait for the other would stand there: the one who gives way gives way soon.
  if (!patient) doing.held += deadlock ? dt * 4 : dt
  // The one who need not give way waits for the other to: where the other cannot, it gives way itself in the end.
  else if (deadlock) doing.held += dt
  // It has just tooted at whoever stands there: it waits a moment and goes back the way it came.
  else if (doing.fresh && blockers.size === 0) doing.held += dt
  // Whoever it waits for should be out of the way soon, or stands where it was tooted at before: it waits long and quietly, and then stops waiting.
  else if (!queued) doing.held += dt * FORBEARANCE
  if (doing.held > PATIENCE) {
    doing.held = 0
    doing.toots = 0
    doing.fresh = false
    return 'back'
  }
  return 'wait'
}
