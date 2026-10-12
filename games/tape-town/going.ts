import { extent, onFloor, stripUnder } from './floor'
import { ACTS, CROSS, GAITS, GRID, NOTHING, WANT, type Act, type ActName, type Gait, type GaitName, type Mover } from './habits'
import type { Point } from './input'
import { ROLLS, TAPE_WIDTH, TOY_SIZE, type Kind, type Pose, type ToyId } from './layout'
import { goesUnder, stepRide, turnBack } from './riding'
import { headingOf, locate, placeOf, type Rider } from './roads'
import { along, isStub, lengthOf, nearestOn, type Strip } from './tape'
import type { Acting, Ride, Stand, Standing, Town, Walk } from './town'
import { leapOnto } from './leap'
import { HOP_REACH, SAME_PAIR, atHome, freePlace, grounded, hopTo, laneOf, noseOf, roomFrom, roomToTurn, wayOf, wayRound } from './way'
import { bloop, brrm, clank, hoot, thwip } from './voices'

// What each toy does where it finds itself: the grid of the design sheet,
// toy by tape and by the bare floor. `decide` is the one place a habit is
// taken up; the steps below carry it out on the town's clock.

const TAU = Math.PI * 2
const ease = (t: number): number => t * t * (3 - 2 * t)
export const turnToward = (from: number, to: number, most: number): number => {
  const gap = ((((to - from) % TAU) + TAU + Math.PI) % TAU) - Math.PI
  return from + Math.max(-most, Math.min(most, gap))
}
const stand = (as: Standing, since: number): Stand => ({ is: 'stand', as, since })
const isMover = (id: ToyId): id is Mover => id in GRID

export function rideOn(kind: Strip['kind'], rider: Rider, gait: GaitName): Ride {
  return { is: 'ride', kind, rider, gait, odo: 0, held: 0, toots: 0, tootAt: -Infinity, inside: null, done: null, hooted: null, braked: false, back: false }
}

export function walkTo(to: Point, gait: GaitName, follow = false): Walk {
  return { is: 'walk', to, gait, odo: 0, held: 0, toots: 0, tootAt: -Infinity, follow }
}

/** Starts something done on the spot. `exit` is how far ahead (or, below zero, behind) the toy ends up when the act leaves its tape. */
export function startAct(town: Town, id: Mover, name: ActName, after: Ride | Walk | null = null, flip = false, exit = 0): void {
  const body = town.bodies[id], act: Act = ACTS[name]
  let to: Pose | null = null
  if (act.leaveAt !== undefined && exit !== 0) {
    const want = { x: body.at.x + Math.cos(body.at.a) * exit, y: body.at.y + Math.sin(body.at.a) * exit, a: body.at.a }
    to = freePlace(town, id, want, 150, exit > 0 ? body.at.a : body.at.a + Math.PI, undefined, true, body.at)
  }
  // Where there is no room to turn, an act with a turn in it is done without the turn.
  const turns = name === 'spin' || name === 'circle' || name === 'doughnut'
  const doing: Acting = { is: 'act', name, t: 0, cue: 0, from: { ...body.at }, to, after, flip, still: turns && !roomToTurn(town, id, name === 'doughnut' ? 92 : 0) }
  body.doing = doing
  // What an act opens with is seen and heard in the call that starts it.
  cues(town, id, doing)
}

function cues(town: Town, id: Mover, doing: Acting): void {
  const body = town.bodies[id], act: Act = ACTS[doing.name]
  while (doing.cue < act.cues.length && doing.t >= act.cues[doing.cue].at) {
    const cue = act.cues[doing.cue++]
    if (cue.sound) town.hum(cue.sound)
    if (cue.fx) town.puff(cue.fx, body.at.x - Math.cos(body.at.a) * (cue.fx === 'leaf' ? 60 : 0), body.at.y - Math.sin(body.at.a) * (cue.fx === 'leaf' ? 60 : 0))
    if (cue.mark === 'hat') body.hatAt = town.time
    if (cue.mark === 'hatOff') body.hatAt = -Infinity
    if (cue.mark === 'leaf') body.leafAt = town.time
    if (cue.mark === 'leafOff') body.leafAt = -Infinity
  }
}

/** The nearest point of any strip of one tape to `at`, or null when none lies. */
export function tapeNear(town: Town, kind: Kind, at: Point): Point | null {
  let best: { at: Point; off: number } | null = null
  for (const strip of town.nets[kind].strips) {
    const near = nearestOn(strip, at)
    if (!best || near.off < best.off) best = { at: along(strip, near.d), off: near.off }
  }
  return best ? best.at : null
}

/** The nearest point of the tape a toy wants, or null when none lies. */
export function wantOf(town: Town, id: Mover): Point | null {
  const kind = WANT[id]
  return kind === null ? null : tapeNear(town, kind, town.bodies[id].at)
}

/** The strip a place is on, as it is seen: where two tapes cross, the one the pair puts on top, whichever was laid last. */
export function topUnder(town: Town, id: ToyId, flat: readonly Strip[], at: Point): number {
  const under = stripUnder(flat, at)
  if (under < 0) return under
  // Its own tape first, if that is there at all: the duck at a bridge is in the river, under the road.
  const want = isMover(id) ? WANT[id] : null
  if (want !== null) {
    if (flat[under].kind === want) return under
    for (let i = flat.length - 1; i >= 0; i--) if (flat[i].kind === want && nearestOn(flat[i], at).off <= TAPE_WIDTH / 2 && stripUnder([flat[i]], at) === 0) return i
  }
  for (const crossing of town.crossings) {
    if (crossing.low !== flat[under] && crossing.high !== flat[under]) continue
    const top = crossing.kind === 'bridge' || crossing.kind === 'tunnel' ? crossing.low : crossing.high
    if (top !== flat[under] && nearestOn(top, at).off <= TAPE_WIDTH / 2) return flat.indexOf(top)
  }
  return under
}

/**
 * A toy takes up its habit from where it is. `loud` is a toy the child has just put there, or one that has
 * just arrived: it does the thing of its cell. Not loud, it only does what goes on by itself. `called` is a
 * strip just pressed flat, which only a toy that wants that tape and stands on bare floor answers.
 */
export function decide(town: Town, id: ToyId, loud: boolean, called?: Strip): void {
  const body = town.bodies[id]
  if (!isMover(id)) { body.doing = stand('plain', town.time); return }
  const flat = town.flat, under = topUnder(town, id, flat, body.at)
  if (called) {
    // On a stub of its own tape it is called by a longer strip of that tape like anyone on the bare floor: a road gets its car.
    const onStub = under >= 0 && flat[under] !== called && flat[under].kind === WANT[id] && isStub(flat[under]) && !isStub(called)
    if (called.kind !== WANT[id] || (under >= 0 && !onStub)) return
    // The train will not cross the floor on its wheels: called by a rail just laid, it goes there in one hop.
    if (id === 'train') {
      body.onto = called
      body.wayFor = Infinity
      body.lookIn = 0
      leap(town, id)
      return
    }
  } else if (under >= 0) return onTape(town, id, flat[under], loud)
  body.hidden = false
  // The bare floor. The train will not cross it, and the dog waits for somebody to follow.
  if (id === 'train') { body.doing = stand('plain', town.time); return }
  if (id === 'dog') {
    if (loud) startAct(town, id, 'circle')
    else body.doing = stand('plain', town.time)
    return
  }
  const net = town.nets[WANT[id]!], at = body.at
  let to: Point | null = null, onto: Strip | null = null
  // On its way to a strip already, that is still the one it goes to.
  const ways = called ? [called] : body.onto && body.onto.kind === WANT[id] && flat.includes(body.onto) ? [body.onto] : net.strips
  let far = Infinity
  for (const strip of ways) {
    const length = lengthOf(strip), inset = Math.min(noseOf(id), length / 2)
    for (const d of isStub(strip) ? [length / 2] : [inset, length - inset]) {
      const end = along(strip, d), gap = Math.hypot(end.x - at.x, end.y - at.y) + (isStub(strip) ? 2000 : 0)
      if (gap < far) { far = gap; to = end; onto = strip }
    }
  }
  if (!to) {
    body.onto = null
    body.wayFor = Infinity
    if (loud) startAct(town, id, NOTHING[id])
    else body.doing = stand('parked', town.time)
    return
  }
  // Stopped on its way and setting off for the same place again, it has said so already.
  const aloud = loud && !(body.offFor && Math.hypot(body.offFor.x - to.x, body.offFor.y - to.y) < 2)
  if (aloud) town.hum(CROSS[id].off)
  body.offFor = { x: to.x, y: to.y }
  // The clock of its way there starts when it first sets off for that strip, however often it is stopped.
  if (body.onto !== onto || body.wayFor === Infinity) body.wayFor = 0
  body.onto = onto
  const walk = body.doing = walkTo(to, CROSS[id].gait)
  // The sound it sets off with is its toot for that moment.
  if (aloud) walk.tootAt = town.time
}

function onTape(town: Town, id: Mover, strip: Strip, loud: boolean): void {
  const body = town.bodies[id], cell = GRID[id][strip.kind]
  body.offFor = null
  body.rounds = 0
  // The dog's count of hops out of the way is its own: it runs out only at a tap or when the tape changes.
  if (id !== 'dog') body.asides = 0
  body.roundAt = -Infinity
  body.wayFor = Infinity
  body.lookIn = 0
  body.onto = body.calledTo = null
  if ('act' in cell) {
    // Found there on load, it waits for the child's touch before it does its funny thing again.
    if (!loud) body.doing = stand('dormant', town.time)
    else startAct(town, id, cell.act, null, false, id === 'dog' ? 120 : -130)
    return
  }
  if (isStub(strip)) {
    // A stub is a whole road or river one tape-width long: the car spins on it like a top, the duck sits in it as in a bath.
    if (id === 'car' && strip.kind === 0 && loud) startAct(town, id, 'spin')
    else if (id === 'duck' && strip.kind === 1) { body.doing = stand('bath', town.time); if (loud) town.hum(bloop) }
    else body.doing = stand('parked', town.time)
    return
  }
  // Found travelling tail first, the train on its run back or a toy backing away to turn, it goes on the way it was going.
  const tail = town.state.tail[id] === true
  const rider = locate(town.nets[strip.kind], body.at, body.at.a + (tail ? Math.PI : 0))
  if (!rider) { body.doing = stand('parked', town.time); return }
  if (loud && id === 'car') town.hum(brrm)
  const ride = rideOn(strip.kind, rider, cell.ride)
  if (tail && id !== 'train') ride.back = true
  body.doing = ride
  goesUnder(town, id, ride)
}

/** As a load finds it: riders ride on and walkers walk on, in silence, and whoever stood stands. */
export function takeUpQuietly(town: Town, id: Mover): void {
  decide(town, id, false)
}

/** The toys that wait for the child's touch take up their habit at the first one. */
export function wake(town: Town): void {
  if (!town.state.out) return
  for (const id of Object.keys(GRID) as Mover[]) {
    const doing = town.bodies[id].doing
    if (doing.is === 'stand' && doing.as === 'dormant' && !town.bodies[id].flight) decide(town, id, true)
  }
}

export function stepToy(town: Town, id: Mover, dt: number): void {
  const body = town.bodies[id], doing = body.doing
  // A leaf that settled on the funnel is hooted off half a second later, and comes off in the frame of the hoot.
  if (id === 'train' && body.leafAt > -Infinity && doing.is !== 'act' && town.time - body.leafAt >= 0.5) {
    body.leafAt = -Infinity
    town.hum(hoot)
    body.soundedAt = town.time
    town.puff('leaf', body.at.x + Math.cos(body.at.a) * 40, body.at.y + Math.sin(body.at.a) * 40)
  }
  // A strip that called it while it was in the middle of something: it answers now.
  if (body.calledTo && !body.flight && (doing.is === 'ride' || doing.is === 'walk' || (doing.is === 'stand' && (doing.as === 'parked' || doing.as === 'plain' || (doing.as === 'bath' && atHome(town, id)))))) {
    const strip = body.calledTo
    body.calledTo = null
    if (answer(town, id, strip)) return
  }
  if (doing.is === 'stand') return stepStand(town, id, doing, dt)
  if (doing.is === 'walk') return stepWalk(town, id, doing, dt)
  if (doing.is === 'ride') return stepRide(town, id, doing, dt)
  if (doing.is === 'act') return stepAct(town, id, doing, dt)
  if (doing.is === 'stuck') {
    doing.t += dt
    if (doing.t < 0.9) return
    // It pops free and stands on the tape, bewildered.
    town.say(thwip)
    body.landedAt = town.time
    body.doing = stand('dazed', town.time)
  }
}

/** A toy turns where it stands toward a point, but only as far as it has room to: its corners brush nobody. */
function faceIfClear(town: Town, id: Mover, toward: Point, most: number): void {
  const at = town.bodies[id].at, turned = { ...at, a: turnToward(at.a, Math.atan2(toward.y - at.y, toward.x - at.x), most) }
  if (turned.a !== at.a && onFloor(town.field, turned, TOY_SIZE[id]) && grounded(town, id).every((other) => roomFrom(town, turned, TOY_SIZE[id], other) >= 6)) at.a = turned.a
}

/** How far off the one it hopped aside for must be before a toy goes on its way, how long it stands aside at the least, and how long it waits at the most. */
const GONE_BY = 260
const LET_BY = 1.5
const LONGEST_ASIDE = 60
const GO_ON_AFTER = 12

function stepStand(town: Town, id: Mover, doing: Stand, dt: number): void {
  const body = town.bodies[id]
  if (doing.since === -Infinity) doing.since = town.time
  const stood = town.time - doing.since
  if (doing.as === 'dazed') { if (stood >= 0.8) decide(town, id, true); return }
  if (doing.as === 'dormant') return
  if (id === 'dog') {
    // Hopped out of the way twice, it has lain down beside the road and watches, until the road changes or it is tapped.
    if (body.asides >= DOG_HOPS) return
    const leader = town.leader
    if (leader && town.time - leader.at < 0.3) body.doing = walkTo({ ...body.at }, 'follow', true)
    return
  }
  if (doing.as === 'reeds') {
    // Whoever passes next gets a quack.
    const passing = (Object.keys(GRID) as Mover[]).some((other) => other !== id && town.bodies[other].doing.is !== 'stand' && Math.hypot(town.bodies[other].at.x - body.at.x, town.bodies[other].at.y - body.at.y) < 170)
    if (passing && stood > 0.6) startAct(town, id, 'popOut', doing.resume ?? null)
    return
  }
  if (doing.as !== 'plain' && doing.as !== 'parked') return
  if (doing.aside && !body.flight) {
    // It hopped out of somebody's way on its way to its tape: when they have gone by, or after a long wait, it goes
    // on. Hopped aside again and again, it waits longer each time: nobody is batted to and fro for ever.
    const them = town.bodies[doing.aside].at
    // Hopped aside twice, or too long on its way: it goes the rest in one hop, over whoever is between.
    if ((body.asides >= 2 || onItsWayFor(town, id) > LEAP_AFTER) && leap(town, id)) return
    if (body.asides <= 1 ? (stood > LET_BY && Math.hypot(them.x - body.at.x, them.y - body.at.y) > GONE_BY) || stood > GO_ON_AFTER : stood > Math.min(LONGEST_ASIDE, GO_ON_AFTER * body.asides)) return decide(town, id, true)
  }
  // Standing short of the tape it was going to, or called by: it goes there in one hop as soon as there is room on it.
  if (!doing.aside && !body.flight && body.onto && onItsWayFor(town, id) > LEAP_AFTER && leap(town, id)) return
  if (id === 'duck' || id === 'train') {
    // It faces the tape it wants, or that tape's roll while none lies.
    const want = wantOf(town, id) ?? ROLLS[WANT[id]!]
    if (Math.hypot(want.x - body.at.x, want.y - body.at.y) > TAPE_WIDTH) faceIfClear(town, id, want, 1.5 * dt)
  }
  if (id === 'train' && Math.floor(stood / 1.6) > Math.floor(Math.max(0, stood - dt) / 1.6)) {
    // It sits where it is, puffing small clouds and clanking its coupling.
    town.hum(clank(town.level))
    town.puff('puff', body.at.x + Math.cos(body.at.a) * 46, body.at.y + Math.sin(body.at.a) * 46)
  }
}

/** The gait's beat: its sound, what it leaves behind, and for the car a jolt over the gap in the boards. */
export function beat(town: Town, id: Mover, doing: Ride | Walk, went: number, gait: GaitName = doing.gait): boolean {
  const { every, beat: sound, fx } = GAITS[gait] as Gait
  const before = Math.floor(doing.odo / every)
  doing.odo += went
  if (Math.floor(doing.odo / every) <= before) return false
  const at = town.bodies[id].at
  if (gait === 'scoot') town.bumpAt = town.time
  town.hum(sound(town.level))
  if (fx) town.puff(fx, at.x - Math.cos(at.a) * 40, at.y - Math.sin(at.a) * 40)
  return true
}

/** Whoever moves is the one the dog follows next, if it passes near enough. */
export function passed(town: Town, id: Mover): void {
  if (id === 'dog') return
  const dog = town.bodies.dog.at, at = town.bodies[id].at
  if (Math.hypot(dog.x - at.x, dog.y - at.y) < 260 || town.leader?.id === id) town.leader = { id, at: town.time }
}

/** How long a toy is on its way across the boards to its tape before it goes the rest in one hop, in seconds. */
const LEAP_AFTER = 6
/** How long it stands stopped by a toy that cannot hop aside before it hops over, in seconds of its patience. */
const STOPPED_FOR = 0.4
/** How many hops out of the way the dog takes before it lies down and watches. */
export const DOG_HOPS = 2

/** The dog has lain down beside the road and watches: its eyes are open and follow whoever moves nearest. */
export function watching(town: Town): boolean {
  const dog = town.bodies.dog, doing = dog.doing
  return doing.is === 'stand' && doing.as === 'lying' && dog.asides >= DOG_HOPS
}

/** How long the car's rev sounds, and the car shakes with it, in seconds. */
export const REV_SECONDS = 0.3

/** Whether the car's rev at a grey strip being pulled can be seen on it: where it cannot, there is no rev. */
export function revShows(town: Town): boolean {
  const car = town.bodies.car, doing = car.doing
  if (!town.state.out || car.flight || car.hidden) return false
  // On a rail under a hedge it is in the tunnel, and the hedge is laid over it.
  if (doing.is === 'ride' && doing.kind === 3 && town.crossings.some((crossing) => crossing.kind === 'tunnel' && Math.hypot(crossing.at.x - car.at.x, crossing.at.y - car.at.y) < TOY_SIZE.car.long / 2 + TAPE_WIDTH)) return false
  return doing.is === 'stand' ? doing.as !== 'dazed' : doing.is === 'ride' || doing.is === 'walk'
}

/**
 * As a load finds it, the train on the bare floor is called by the nearest rail that lies flat, as if that rail
 * had just been pressed: it hops on in its first step, or looks again every half second while the rail is full.
 */
export function recall(town: Town): void {
  const body = town.bodies.train, doing = body.doing
  if (!town.state.out || body.flight || doing.is !== 'stand' || (doing.as !== 'plain' && doing.as !== 'parked')) return
  if (topUnder(town, 'train', town.flat, body.at) >= 0) return
  let far = Infinity
  for (const strip of town.nets[3].strips) {
    const off = nearestOn(strip, body.at).off + (isStub(strip) ? 2000 : 0)
    if (off < far) { far = off; body.onto = strip }
  }
  if (far === Infinity) return
  body.wayFor = Infinity
  body.lookIn = 0
}

/** A train the child set on a rail that was full stands beside it and is called by that rail: it hops on as soon as there is room. */
export function waitFor(town: Town, strip: Strip): void {
  const body = town.bodies.train
  body.onto = strip
  body.wayFor = Infinity
  body.lookIn = LEAP_AGAIN
}

/** How long a toy has been on its way to its tape, in seconds of the town's clock: summed step by step from nought, so that a town put away and one loaded agree to the step. */
const onItsWayFor = (town: Town, id: Mover): number => town.bodies[id].wayFor

/** How long after it found its tape full it looks again, in seconds. */
const LEAP_AGAIN = 0.5

/** The rest of its way to its tape in one hop. Where the tape is full it stays as it is, and looks again a moment later. */
function leap(town: Town, id: Mover): boolean {
  const body = town.bodies[id], onto = body.onto
  if (!onto || body.lookIn > 1e-9) return false
  if (!town.state.strips.includes(onto)) { body.onto = null; return false }
  if (leapOnto(town, id, onto)) return true
  // Half a second from when this look fell due, so that the looks keep time whatever the length of a step.
  body.lookIn = body.lookIn > -LEAP_AGAIN ? body.lookIn + LEAP_AGAIN : LEAP_AGAIN
  return false
}

/**
 * A strip just pressed flat calls whoever wants that tape. A toy with nothing to do sets off for it; the car
 * leaves the road it is on for a new one, as it takes every road it is offered; the train hops onto a new rail.
 * True when the toy answered.
 */
export function answer(town: Town, id: Mover, strip: Strip): boolean {
  const body = town.bodies[id], doing = body.doing
  if (!town.state.out || !town.flat.includes(strip)) return false
  if (doing.is === 'held' || strip.kind !== WANT[id]) return false
  // In the air, or under a finger that rests on it: it answers when it has landed, or when the finger lets it go.
  if (body.flight || town.stopped(id)) { body.calledTo = strip; return false }
  // One that stands, on the bare floor or at home on a stub of its own tape.
  if (doing.is === 'stand' && (doing.as === 'parked' || doing.as === 'plain' || (doing.as === 'bath' && atHome(town, id)))) { decide(town, id, true, strip); return body.doing !== doing || body.flight !== null }
  // In the middle of a turn, or of something else: it answers when that is done.
  if (doing.is === 'act' || doing.is === 'stuck' || (doing.is === 'stand' && doing.as === 'dazed')) { body.calledTo = strip; return false }
  if (id !== 'car') return false
  // The car on a road, or on its way to one: the new road is the one it takes.
  const onRoad = doing.is === 'ride' && doing.kind === 0 && town.nets[0].strips[doing.rider.s] !== strip
  if (!onRoad && !(doing.is === 'walk' && !doing.follow)) return false
  const length = lengthOf(strip), inset = Math.min(noseOf(id), length / 2), at = body.at
  let to: Point = along(strip, length / 2), far = Infinity
  for (const d of isStub(strip) ? [length / 2] : [inset, length - inset]) {
    const end = along(strip, d), gap = Math.hypot(end.x - at.x, end.y - at.y)
    if (gap < far) { far = gap; to = end }
  }
  town.hum(CROSS[id].off)
  body.offFor = { x: to.x, y: to.y }
  body.onto = strip
  body.wayFor = 0
  body.hidden = false
  const walk = body.doing = walkTo(to, CROSS[id].gait)
  walk.tootAt = town.time
  return true
}

/** Every toy is called by a strip just pressed flat. */
export function call(town: Town, strip: Strip): void {
  for (const id of Object.keys(GRID) as Mover[]) answer(town, id, strip)
}

/** It goes round at most this many times running, and then not again for a long quiet while: nobody wanders the boards for ever. */
const ROUNDS = 3
const ROUND_REST = 20
const ROUND_FORGET = 30

function stepWalk(town: Town, id: Mover, doing: Walk, dt: number): void {
  const body = town.bodies[id], at = body.at
  if (doing.follow && !followOn(town, doing)) return
  doing.from ??= { x: at.x, y: at.y }
  // Too long on its way to its tape: the rest in one hop.
  if (!doing.follow && onItsWayFor(town, id) > LEAP_AFTER && leap(town, id)) return
  const verdict = wayOf(town, id, doing, dt)
  // Stopped by somebody who stands there and has nowhere to hop to, it does not stand and wait for them: after its
  // toot it goes round or over at once.
  const stopped = verdict === 'wait' && !doing.follow && body.onto !== null && doing.held > STOPPED_FOR && town.waiting.get(id)?.size === 0
  if (verdict === 'wait' && !stopped) return
  if (verdict === 'back' || stopped) {
    // It cannot get through: it goes back the way it came, and from there it tries again. Nobody parks for ever.
    if (doing.follow) return
    // Where there is a way round whoever stands there, it takes that: a few steps to one side, and on from there.
    const round = town.time - body.roundAt > ROUND_REST ? wayRound(town, id, doing.to) : null
    if (round) {
      body.rounds = town.time - body.roundAt > ROUND_FORGET ? 1 : body.rounds + 1
      if (body.rounds >= ROUNDS) { body.roundAt = town.time; body.rounds = 0 }
      doing.from = { x: at.x, y: at.y }
      doing.to = round
      doing.held = 0
      return
    }
    // No way round: over whoever stands there in one hop, onto its tape.
    if (leap(town, id) || stopped) return
    const back = doing.from; doing.from = doing.to; doing.to = back
    return
  }
  const dx = doing.to.x - at.x, dy = doing.to.y - at.y, far = Math.hypot(dx, dy), gait = GAITS[doing.gait]
  if (far > 1) at.a = turnToward(at.a, Math.atan2(dy, dx), gait.turn * 2.4 * dt)
  const go = Math.min(far, gait.speed * dt)
  if (far > 0) { at.x += (dx / far) * go; at.y += (dy / far) * go }
  // Turning near the edge of the boards, it shuffles inward so that its corners stay on them.
  const { across, down } = extent(at, TOY_SIZE[id]), f = town.field
  at.x = Math.min(f.x1 - across, Math.max(f.x0 + across, at.x))
  at.y = Math.min(f.y1 - down, Math.max(f.y0 + down, at.y))
  // Tape may lie nearer the edge of the boards than half a toy: kept on the boards within its own reach of where it
  // was going, it is as near as it gets.
  const left = Math.hypot(doing.to.x - at.x, doing.to.y - at.y), kept = !doing.follow && go > 0 && left > far - go / 2 && left <= Math.max(across, down)
  if (go > 0 && !kept) { beat(town, id, doing, go); passed(town, id) }
  if (doing.follow) return
  if (far <= gait.speed * dt) return decide(town, id, true)
  if (!kept) return
  // It is on its tape there and takes to it. Anywhere else it thinks again, and stands where it is if that sends it
  // to the same place.
  const was = doing.to
  decide(town, id, true)
  const now = body.doing
  if (now.is === 'walk' && Math.hypot(now.to.x - was.x, now.to.y - was.y) < 2) body.doing = stand('parked', town.time)
}

/** The dog after its leader: a place just behind them, and its own business with whatever it crosses on the way. False when it stopped walking. */
function followOn(town: Town, doing: Walk): boolean {
  const body = town.bodies.dog, at = body.at, leader = town.leader
  if (!leader || town.time - leader.at > 1.2) {
    // Nobody to follow any more: it does what it does where it stands.
    decide(town, 'dog', true)
    return false
  }
  const them = town.poseOf(leader.id)
  doing.to = { x: them.x - Math.cos(them.a) * 170, y: them.y - Math.sin(them.a) * 170 }
  if (Math.hypot(doing.to.x - at.x, doing.to.y - at.y) < 14) {
    faceIfClear(town, 'dog', them, 0.1)
    return false
  }
  const flat = town.flat, under = topUnder(town, 'dog', flat, at), kind = under >= 0 ? flat[under].kind : -1
  doing.gait = kind === 0 ? 'tick' : kind === 3 ? 'trot' : 'follow'
  // Halfway over a bridge it woofs at the water; a river it paddles, a hedge it has its own use for: each once.
  const bridge = town.crossings.find((crossing) => crossing.kind === 'bridge' && Math.hypot(crossing.at.x - at.x, crossing.at.y - at.y) < 26)
  if (bridge) {
    if (body.wet === bridge.high) return true
    body.wet = bridge.high
    startAct(town, 'dog', 'woof', doing)
    return false
  }
  if ((kind === 1 || kind === 2) && body.wet !== flat[under]) {
    body.wet = flat[under]
    startAct(town, 'dog', kind === 1 ? 'paddle' : 'leg', doing, false, 120)
    return false
  }
  return true
}

/** Whether the train is still coming or going by for the dog: on its rails, and not yet well past where the dog sits or a gate still shut for it. */
function trainGoesBy(town: Town): boolean {
  const train = town.bodies.train, doing = train.doing, dog = town.bodies.dog.at
  if (train.flight) return false
  const ride = doing.is === 'ride' ? doing : doing.is === 'act' && doing.after?.is === 'ride' ? doing.after : null
  if (!ride || ride.kind !== 3 || !town.nets[3].strips[ride.rider.s]) return false
  if (town.gates.some((gate) => gate.openAt === -Infinity)) return true
  const way = headingOf(town.nets[3], ride.rider), dx = dog.x - train.at.x, dy = dog.y - train.at.y
  // Coming toward it, or not yet two lengths past.
  return Math.cos(way) * dx + Math.sin(way) * dy > -2 * TOY_SIZE.train.long
}

/**
 * Backing off to a place on the floor it is a mover like any other: whoever has come to stand in its way since
 * it chose that place hops aside, and where they cannot it stops where it is. True when it stops.
 */
function backsInto(town: Town, id: Mover, next: Pose): boolean {
  const body = town.bodies[id], size = TOY_SIZE[id]
  for (const other of grounded(town, id)) {
    const room = roomFrom(town, next, size, other)
    if (room >= 4 || room >= roomFrom(town, body.at, size, other)) continue
    const theirs = town.bodies[other]
    // Nobody is sent hopping by the same toy more than twice, backing off as driving up.
    const sent = theirs.hopped[id] ?? 0
    const to = theirs.doing.is === 'stand' && !theirs.flight && !town.stopped(other) && sent < SAME_PAIR ? freePlace(town, other, theirs.at, HOP_REACH, Math.atan2(theirs.at.y - body.at.y, theirs.at.x - body.at.x), { id, lane: laneOf(town, id, 0) }) : null
    if (!to) return true
    theirs.hopped[id] = sent + 1
    hopTo(town, other, to)
  }
  return false
}

function stepAct(town: Town, id: Mover, doing: Acting, dt: number): void {
  const body = town.bodies[id], act: Act = ACTS[doing.name]
  doing.t += dt
  cues(town, id, doing)
  if (doing.name === 'watch') {
    // Sitting where it howled, it turns its nose after the train until the train has gone by.
    faceIfClear(town, id, town.bodies.train.at, 4 * dt)
    if (doing.t >= act.lasts || !trainGoesBy(town)) finishAct(town, id, doing)
    return
  }
  const p = Math.min(1, doing.t / act.lasts), from = doing.from
  if (doing.to && act.leaveAt !== undefined) {
    const e = ease(Math.max(0, Math.min(1, (doing.t - act.leaveAt) / (act.leaveFor ?? 0.5))))
    const next = { x: from.x + (doing.to.x - from.x) * e, y: from.y + (doing.to.y - from.y) * e, a: body.at.a }
    if (backsInto(town, id, next)) doing.from = doing.to = { ...body.at }
    else { body.at.x = next.x; body.at.y = next.y }
  }
  // A turn at the end of its tape swings the nose half round; the train runs back as it stands.
  if (doing.flip && id !== 'train') body.at.a = from.a + Math.PI * ease(p)
  if (doing.still) { if (doing.t >= act.lasts) finishAct(town, id, doing); return }
  if (doing.name === 'spin') body.at.a = from.a + TAU * 2 * p
  if (doing.name === 'circle') body.at.a = from.a + TAU * 3 * ease(Math.min(1, doing.t / 2))
  if (doing.name === 'doughnut') {
    const turn = TAU * ease(p), r = 46
    body.at.a = from.a + turn
    body.at.x = from.x + r * (Math.sin(from.a + turn) - Math.sin(from.a))
    body.at.y = from.y - r * (Math.cos(from.a + turn) - Math.cos(from.a))
  }
  if (doing.t < act.lasts) return
  finishAct(town, id, doing)
}

const STAYS: Partial<Record<ActName, Standing>> = { spin: 'parked', doughnut: 'parked', sink: 'parked', preen: 'parked', circle: 'lying', nest: 'nested' }

function finishAct(town: Town, id: Mover, doing: Acting): void {
  const body = town.bodies[id]
  if (doing.name === 'doughnut' || doing.name === 'spin' || doing.name === 'circle') body.at = { ...doing.from, a: doing.from.a }
  if (doing.to) body.at = { ...doing.to }
  const after = doing.after
  // The howl done, the dog stays sitting and watches the train by.
  if (doing.name === 'howl' && trainGoesBy(town)) { body.doing = { is: 'act', name: 'watch', t: 0, cue: 0, from: { ...body.at }, to: null, after, flip: false, still: false }; return }
  if (doing.name === 'hide') { body.doing = { ...stand('reeds', town.time), resume: after?.is === 'ride' ? after : undefined }; return }
  // A jam is honked at in turn, and then each makes its turn and drives back the way it came.
  if ((doing.name === 'jamCar' || doing.name === 'jamBus') && after?.is === 'ride') { body.doing = after; after.done = null; return turnBack(town, id, after) }
  if (after) {
    if (doing.flip && after.is === 'ride') {
      after.rider = { ...after.rider, dir: after.rider.dir === 1 ? -1 : 1, skip: -1 }
      if (id !== 'train') body.at.a = doing.from.a + Math.PI
      after.back = false
    }
    after.held = 0
    body.doing = after
    if (after.is === 'ride') {
      const net = town.nets[after.kind]
      if (!net.strips[after.rider.s]) body.doing = stand('parked', town.time)
      else if (!doing.to) { const place = placeOf(net, after.rider); body.at.x = place.x; body.at.y = place.y }
    }
    return
  }
  // The dog that had lain down to watch lies down again where it is: it stands only for a tap or a strip laid or peeled.
  if (id === 'dog' && body.asides >= DOG_HOPS) { body.doing = stand('lying', town.time); return }
  const stays = STAYS[doing.name]
  if (stays) { body.doing = stand(stays, town.time); return }
  if (doing.to) return decide(town, id, false)
  body.doing = stand('parked', town.time)
}
