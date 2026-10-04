import { MINI } from './belly'
import { ON_STUDS, PLATE, STUD_HEIGHT } from './bricks'
import { holdOf, toySpan } from './builds'
import { FALL, airTime, jolt, toss, type Body, type Leg } from './bodies'
import { STEP, knock } from './claw'
import { KNOB_HALF, gripFor } from './clawBuild'
import type { Deed } from './deeds'
import { fromSegment, type Actor, type Game, type Plan } from './game'
import { carriedBy } from './gamePicture'
import { OVER_ITS_BROWS, rimHeight } from './gobblerBuild'
import { GOBBLER, shapeOf } from './gobblers'
import { headTop, type Spot } from './layout'
import { WRONG, actSeconds } from './motion'
import { BELL, GATE, SLOT_Z, TRAY, placeAt } from './places'
import { nearestPlace } from './tray'

// What each deed looks like as it is carried out: which bodies fly where,
// which gobbler does what, and what is heard. The rules have already put
// every toy where it belongs; this only shows it getting there. A deed never
// waits for another to finish: reactions run alongside the next touch.

/** The positions at which an attribute is new, where a wrong toy is held up on the tongue for longer. */
const NEW_HERE = ['two-colours', 'three-colours', 'two-kinds', 'two-sizes']

/** One stop of a flight: a point (or home, where the rules have the toy), how it lands there, and how high the throw to it rises. */
type Stop = { at?: Spot; landing: Leg['landing']; peak?: number; seconds?: number; scale?: number }

/** How small a toy is chewed to go down a throat: small enough that the biggest fits it. */
export const DOWN_THE_THROAT = 0.15
/** How far above the rim a toy lies that rests on a gobbler's teeth. */
const ON_TEETH = 1
/** How far a toy that is not its sort is lifted on the tongue: from the floor of the mouth to its rim. */
const HELD_UP = 1.25
/** How far above the bell a toy rises as it leaves it: enough that its far end is past the bell before it is lower than the bell. */
const OFF_THE_BELL = 2.2
/** How far above its rim a toy is lifted before it is thrown out: clear of its eyes and of its brows, raised. */
const OVER_ITS_EYES = OVER_ITS_BROWS + 0.3
/** How far above the higher end of a throw it rises when nothing is said: a short hop. */
const HOP = 0.3

/**
 * Throws a body from stop to stop. A throw takes as long as its rise needs:
 * what flies over something clears it by going high enough, and never by
 * passing through it.
 */
export function send(game: Game, body: Body, toy: number, stops: Stop[], deed?: Deed, after = 0): void {
  let y = body.y
  const legs: Leg[] = stops.map((stop) => {
    const at = stop.at ?? (stop.landing === 'mouth' ? game.mouthOf(game.crew[body.slot]) : game.spotOf(toy))
    const seconds = stop.seconds ?? airTime(y, at.y, stop.peak ?? Math.max(y, at.y) + HOP)
    y = at.y
    return { x: at.x, y: at.y, z: at.z, seconds, scale: stop.scale ?? (stop.landing === 'belly' ? MINI : 1), landing: stop.landing, fixed: stop.at !== undefined }
  })
  body.hang = 0
  body.note = 0
  if (deed) game.causes.set(body, deed)
  // A toy that waits its turn stays where it is, with its whole way laid out, until its wait is over.
  if (after > 0) { body.legs = legs; body.wait = after; body.mode = 'parked'; return }
  body.legs = legs.slice(1)
  if (legs[0].fixed) game.flights.set(body, legs[0]); else game.flights.delete(body)
  toss(body, legs[0])
}

/**
 * How high a throw has to rise so that the toy passes over everything on its way from one point to another: the
 * crew at the tray, with the models on their heads and the tops of their eyes, and whatever stands on the places
 * of the tray it crosses, which it then comes down onto from above. `least` is how far over its higher end it
 * rises anyway, `skip` a place that is not counted (the one it starts from), and `there` says which of the toys
 * the rules have on the tray stand on it yet (in a scene that brings them one by one, not all of them do). The throw is a plain arc under
 * the world's fall, so it is held over each thing at the point where it comes to it and the point where it
 * leaves it.
 */
export function clearTop(game: Game, toy: number, from: Spot, to: Spot, least: number, skip = -1, there: (toy: number) => boolean = () => true): number {
  const lowest = Math.max(from.y, to.y) + least
  const span = toySpan(game.bodies[toy].toy), dx = to.x - from.x, dz = to.z - from.z, long = Math.hypot(dx, dz)
  if (long < 0.5) return lowest
  /** Points along the way, as parts of it from 0 to 1, with the height the base of the toy has to have there. */
  const bars: [number, number][] = []
  if (game.crew.length > 0 && Math.abs(dz) > 1e-6) {
    // (A gobbler that is startled or keen stands a little taller than at rest.)
    const heads = Math.max(...game.crew.map((actor) => actor.y + headTop(actor.id) * 1.06)) + 0.4
    const eyes = Math.max(...game.crew.map((actor) => actor.y + (rimHeight(shapeOf(actor.id)) + OVER_ITS_BROWS) * 1.06)) + 0.3
    // Over the models at the backs of their heads, and past the fronts of their eyes and brows.
    for (const [z, bar] of [[SLOT_Z - 5.6 - span.depth / 2, heads], [SLOT_Z - 2 + span.depth / 2, heads], [SLOT_Z + 3.7 + span.depth / 2, eyes]]) bars.push([(z - from.z) / dz, bar])
  }
  const tray = game.tray(), reach = Math.max(span.length, span.depth) / 2 + 2.9
  for (let place = 0; place < tray.length; place++) {
    if (place === skip || !tray[place].some(there)) continue
    const at = placeAt(place), under = game.stackTop(place, toy)
    if (under <= TRAY.top + 1e-6 || fromSegment(at, from, to) > 4.2) continue
    const middle = ((at.x - from.x) * dx + (at.z - from.z) * dz) / (long * long)
    bars.push([middle - reach / long, under + 0.4], [middle + reach / long, under + 0.4])
  }
  for (let top = lowest; top < MOST_THROW; top += 0.5) {
    const up = Math.sqrt((2 * (top - from.y)) / FALL), down = Math.sqrt((2 * (top - to.y)) / FALL)
    const clears = bars.every(([part, bar]) => {
      if (part <= 0 || part >= 1) return true
      const t = part * (up + down) - up
      return top - 0.5 * FALL * t * t >= bar
    })
    if (clears) return top
  }
  return MOST_THROW
}
/** The highest any throw rises: under the rail. */
const MOST_THROW = 26

/**
 * The stops of a throw from behind the crew back to a toy's own place. No throw can come down over their heads
 * onto the back row of the tray without brushing their faces, so a toy for the back row comes down on the place
 * in front of its own, on whatever stands there, and hops back to its place from that.
 */
export function backOverTheCrew(game: Game, toy: number, from: Spot, least: number, there: (toy: number) => boolean = () => true): Stop[] {
  const home = game.spotOf(toy), where = game.world.cycle.where[toy]
  if (where.at !== 'tray' || where.place >= TRAY.columns) return [{ landing: 'stand', peak: clearTop(game, toy, from, home, least, -1, there) }]
  const front = where.place + TRAY.columns, at = placeAt(front)
  const bounce = { x: at.x, y: game.stackTop(front) + ON_STUDS, z: at.z }
  return [{ at: bounce, landing: 'again', peak: clearTop(game, toy, from, bounce, least, -1, there) }, { landing: 'stand', peak: Math.max(bounce.y, home.y) + 0.6 }]
}

function nearestWaiter(game: Game, x: number): Actor | null {
  return game.waiting.length === 0 ? null : game.waiting.reduce((best, actor) => (Math.abs(actor.x - x) < Math.abs(best.x - x) ? actor : best))
}

/** Where a toy let go over the ledge is caught, or lands on the gate. */
function ledgePoint(game: Game): Spot {
  const waiter = nearestWaiter(game, game.claw.x)
  if (waiter) return { x: waiter.x, y: waiter.y + rimHeight(shapeOf(waiter.id)) + 2.2, z: waiter.z }
  const crate = game.crates.reduce<Game['crates'][number] | null>((best, one) => (!best || Math.abs(one.x - game.claw.x) < Math.abs(best.x - game.claw.x) ? one : best), null)
  if (crate) return { x: crate.x, y: crate.y + 12, z: crate.z }
  return { x: GATE.x, y: GATE.top + 0.2, z: GATE.z }
}

export function react(game: Game, deed: Deed): void {
  const claw = game.claw, cycle = game.world.cycle
  switch (deed.type) {
    case 'grab': {
      const body = game.bodies[deed.toy]
      game.held = deed.toy
      body.hang = 0; body.squash = 1; body.squashV = 0
      claw.load = body.heavy; claw.grip = gripFor(holdOf(body.toy).half)
      game.shake(body.x, body.z, 13, 6, deed.toy)
      break
    }
    case 'bonk':
      game.say({ type: 'bonk', column: deed.column })
      game.shake(claw.x, claw.z, 12, 24)
      for (const actor of game.crew) game.startAct(actor, 'start')
      break
    case 'lift-gobbler': {
      const actor = game.crew.find((one) => one.id === deed.gobbler)
      if (!actor) break
      game.lifted = actor.slot
      actor.liftedT = 0; actor.act = null; actor.wrongT = -1
      claw.load = 2; claw.grip = gripFor(KNOB_HALF)
      game.say({ type: 'groan' }); game.say({ type: 'lifted', way: deed.way })
      // What is in its belly hops as it leaves the step.
      jolt(actor.snack, 2.2, 0, 1)
      game.bodies.forEach((body, toy) => { const where = cycle.where[toy]; if (where.at === 'belly' && where.slot === actor.slot) jolt(body, 2.2, 0, 1) })
      break
    }
    case 'bonk-waiter': {
      const waiter = nearestWaiter(game, claw.x)
      if (waiter) { game.startAct(waiter, 'bonked', waiter.x > 0 ? -1 : 1); game.say({ type: 'squeak', who: waiter.id }) }
      game.say({ type: 'cork' })
      break
    }
    case 'bell':
      game.say({ type: 'bell' })
      knock(claw, -Math.sign(claw.x) * 3, 0)
      break
    case 'gate-rattle':
      game.say({ type: 'gate-rattle' }); game.gateShake = 1
      break
    case 'click':
      send(game, game.bodies[deed.toy], deed.toy, [{ landing: 'stand', seconds: 0.26 }], deed)
      break
    case 'bounce': {
      const body = game.bodies[deed.toy]
      const top = { x: body.x, y: game.stackTop(deed.off) + ON_STUDS, z: body.z }
      // It comes off the stack low: the claw that let it go is still right above it.
      send(game, body, deed.toy, [{ at: top, landing: 'again', seconds: 0.24 }, { landing: 'stand', peak: clearTop(game, deed.toy, top, game.spotOf(deed.toy), 0.4, deed.off) }], deed)
      break
    }
    case 'topple':
      game.say({ type: 'teeter' })
      // The toy from the jaws drops onto the stack and goes off it; then the stack comes down, top first, each
      // one after the last has gone and each a little higher, while the claw backs off out of their way.
      deed.moved.forEach(({ toy }, i) => {
        const body = game.bodies[toy]
        const over = clearTop(game, toy, body, game.spotOf(toy), 0.3, nearestPlace(body.x, body.z))
        if (i === 0) send(game, body, toy, [{ at: { x: body.x, y: body.y - 1 + ON_STUDS, z: body.z }, landing: 'again', seconds: 0.2 }, { landing: 'stand', peak: Math.max(body.y - 0.5, over) }], deed)
        else send(game, body, toy, [{ landing: 'stand', peak: Math.max(body.y + 0.8 + i * 0.6, over) }], deed, 0.5 + i * 0.3)
        // Each lands with its own note, a step up from the one before.
        body.note = i
      })
      break
    case 'gulp': {
      const body = game.bodies[deed.toy]
      body.slot = deed.slot
      game.plans.set(body, { kind: 'gulp', chomps: deed.chomps, ends: deed.ends, chompsDone: 0, swallowed: false })
      send(game, body, deed.toy, [{ landing: 'mouth', seconds: 0.26 }], deed)
      break
    }
    case 'spit': {
      const body = game.bodies[deed.toy], actor = game.crew[deed.slot]
      body.slot = deed.slot
      // The big one does not notice a small toy at all: there is no chomp and no stare, it only looks about.
      const hold = deed.way === 'falls-through' ? 0.15 : NEW_HERE.includes(cycle.from) ? 1.1 : 0.4
      game.plans.set(body, { kind: 'spit', hold, started: false, released: false, place: deed.place })
      if (deed.way === 'hat') {
        // Too big for its mouth: it comes to rest on its teeth.
        send(game, body, deed.toy, [{ at: { x: actor.x, y: actor.y + rimHeight(shapeOf(actor.id)) + ON_TEETH, z: actor.z - 0.2 }, landing: 'mouth', seconds: 0.24 }], deed)
      } else send(game, body, deed.toy, [{ landing: 'mouth', seconds: 0.26 }], deed)
      break
    }
    case 'thrown-back': {
      const body = game.bodies[deed.toy]
      // Caught, bobbled once where it was caught, and thrown back: by then the claw has backed off.
      thrown.delete(body)
      const caught = ledgePoint(game)
      send(game, body, deed.toy, [{ at: caught, landing: 'again', seconds: 0.42 }, { at: caught, landing: 'again', seconds: 0.3, peak: caught.y + 0.3 }, ...backOverTheCrew(game, deed.toy, caught, deed.heavy ? 1 : 2.5)], deed)
      break
    }
    case 'gate-roll': {
      const body = game.bodies[deed.toy]
      // Onto the gate, a roll along its bar, and off it over the crew onto the tray.
      const on = { x: GATE.x, y: GATE.top + 0.05, z: GATE.z }, along = { x: GATE.x + (body.x < 0 ? 1.6 : -1.6), y: GATE.top + 0.05, z: GATE.z }
      send(game, body, deed.toy, [{ at: on, landing: 'again', seconds: 0.36 }, { at: along, landing: 'again', seconds: deed.heavy ? 0.5 : 0.3, peak: GATE.top + 0.1 }, ...backOverTheCrew(game, deed.toy, along, 1)], deed)
      break
    }
    case 'rim-slide': {
      const body = game.bodies[deed.toy], side = Math.sign(claw.x) || 1
      // Onto the bell, a small hop on it, and off it over the rim of the tray onto the studs, low all the way.
      const bell = { x: side * BELL.x, y: BELL.top + STUD_HEIGHT + 0.03, z: BELL.z }
      send(game, body, deed.toy, [{ at: bell, landing: 'again', seconds: 0.26 }, { at: bell, landing: 'again', seconds: 0.22, peak: bell.y + 0.2 }, { landing: 'stand', peak: Math.max(bell.y + OFF_THE_BELL, clearTop(game, deed.toy, bell, game.spotOf(deed.toy), 0.3)) }], deed)
      break
    }
    case 'knock':
      game.say({ type: 'knock' })
      // It skitters over the studs to the place beside it: the claw that knocked it is still right above it.
      send(game, game.bodies[deed.toy], deed.toy, [{ landing: 'stand', peak: game.bodies[deed.toy].y + 0.3 }], deed)
      break
    case 'dominoes':
      deed.moved.forEach(({ toy }, i) => { game.say({ type: 'domino', nth: i }); send(game, game.bodies[toy], toy, [{ landing: 'stand', peak: game.bodies[toy].y + 0.6 }], deed) })
      break
    case 'rattle':
      // The tip of the claw dips to the studs and drags along them, like a stick along a fence.
      game.say({ type: 'rattle', speed: Math.abs(claw.vx) + Math.abs(claw.swingVX) * 4 })
      claw.lengthV += 7
      break
    case 'jostle':
      // Hemmed in, it rocks where it stands, with the same rattle.
      game.say({ type: 'rattle', speed: Math.abs(claw.vx) + Math.abs(claw.swingVX) * 4 })
      for (const toy of game.tray()[deed.place]) { game.bodies[toy].squash = 0.86; game.bodies[toy].squashV = 0 }
      break
    case 'duck': {
      const actor = game.crew.find((one) => one.id === deed.gobbler)
      if (!actor) break
      // Yellow is ticklish: a brush from the claw sets off its hiccups.
      if (actor.id === 'yellow') { actor.wrongT = 0; game.say({ type: 'wrong', way: 'hiccups' }) } else game.startAct(actor, 'duck')
      game.say({ type: 'squeak', who: actor.id })
      break
    }
    case 'snap-miss': {
      const actor = game.crew.find((one) => one.id === deed.gobbler)
      if (actor) game.startAct(actor, 'snap', Math.sign(claw.vx) || 1)
      game.say({ type: 'snap' })
      break
    }
    case 'lean':
      // One after another, like grass: each begins a moment after the one before it.
      game.waiting.forEach((actor, i) => { game.startAct(actor, 'lean', Math.sign(claw.vx) || 1); actor.actT = -(i * 0.12) / actor.actFor; game.say({ type: 'creak', nth: i }) })
      // With crates on the ledge it is the crates, riders and all, that lean out of the way, one after the other.
      game.crates.forEach((crate, i) => { crate.leans = -i * 0.12; game.say({ type: 'creak', nth: i }) })
      if (game.waiting.length === 0 && game.crates.length === 0) game.say({ type: 'creak', nth: 0 })
      break
    case 'double-ding':
      game.say({ type: 'double-ding' })
      break
    case 'spread-jaws':
      claw.openV += 7; game.say({ type: 'jaw-hum' })
      break
    case 'breathe':
      claw.openV -= 6; game.say({ type: 'jaw-click' })
      break
    case 'wind-up':
      claw.lengthV -= 9; game.say({ type: 'wind' })
      break
    case 'open-wide': {
      const actor = game.crew.find((one) => one.id === deed.gobbler)
      // Its feet patter as it shuffles to stay under the claw.
      if (actor) { actor.openT = 0; game.say({ type: 'gargle', who: actor.id }); game.say({ type: 'waddle' }) }
      break
    }
    case 'stare':
      for (const actor of game.waiting) game.startAct(actor, 'stare')
      // With crates on the ledge the crates stand up on their carts to see.
      for (const crate of game.crates) crate.peers = 0
      game.say({ type: 'stare' })
      break
    case 'hum':
      game.say({ type: 'bell-hum' })
      // The cable trembles.
      knock(claw, 1.6, -1.1)
      break
    case 'gate-comb':
      game.say({ type: 'comb' }); game.gateShake = 1
      break
    case 'gate-creak':
      game.say({ type: 'gate-creak' }); game.gateShake = 0.5
      break
    case 'next-crew':
    case 'take-crate':
      // A scene: `gameScenes.ts` plays it.
      break
  }
}

/** How many turns of its way back from the ledge a thrown toy has made. */
const thrown = new WeakMap<Body, number>()

/** One leg of a flight has ended and the next begins: what is heard and done at the turn. */
export function nextLeg(game: Game, body: Body, toy: number, deed: Deed | undefined): void {
  const next = body.legs.shift()
  if (!next) return
  const actor = game.crew[body.slot]
  // It leaves the gobbler that carried it from where the gobbler has it at this moment.
  if (body.rides > 0 && --body.rides === 0 && actor) {
    const at = carriedBy(game, actor, body)
    body.x = at.x; body.y = at.y; body.z = at.z
    // And the throw is worked out again from there: a gobbler that was blown back or leant over throws from
    // where it is, and still over the eyes of the crew.
    if (!next.fixed && next.landing === 'stand') {
      const to = game.spotOf(toy)
      next.seconds = Math.max(next.seconds, airTime(body.y, to.y, clearTop(game, toy, body, to, 0.3)))
    }
  }
  if (deed?.type === 'bounce') game.say({ type: 'boing' })
  else if (deed?.type === 'thrown-back') {
    // Caught, then thrown, then (for the back row) a bounce on the place in front: each is heard once.
    const turn = thrown.get(body) ?? 0
    thrown.set(body, turn + 1)
    const waiter = nearestWaiter(game, body.x)
    if (turn === 0) {
      // A big one is caught by all of them, who stagger under it on pattering feet.
      if (deed.heavy) { for (const one of game.waiting) game.startAct(one, 'heave'); game.say({ type: 'grunt' }); game.say({ type: 'waddle' }) }
      else { if (waiter) game.startAct(waiter, 'catch'); game.say({ type: 'slap' }) }
    } else if (turn === 1) game.say(deed.heavy ? { type: 'huff' } : { type: 'whistle' })
    else game.say({ type: 'boing' })
  } else if (deed?.type === 'gate-roll') {
    // On the gate: a small toy pings along its bars; a big one thuds onto it and then scrapes off. Past the gate
    // it only lands.
    if (Math.abs(body.z - GATE.z) < 1.2) {
      const first = Math.hypot(body.x - GATE.x, 0) < 0.3
      if (!deed.heavy) game.say({ type: 'ping', nth: body.legs.length })
      else game.say(first ? { type: 'thud', who: 'big' } : { type: 'scrape' })
      game.gateShake = 0.6
    }
  }
  else if (deed?.type === 'rim-slide') { if (body.legs.length > 0) game.say({ type: 'bell' }); else game.say(deed.heavy ? { type: 'rim-thud' } : { type: 'zip' }) }
  else if (deed?.type === 'spit' && actor && body.legs.length === 0) game.startAct(actor, 'start')
  const to = next.fixed ? next : { ...next, ...game.spotOf(toy) }
  if (next.fixed) game.flights.set(body, next); else game.flights.delete(body)
  toss(body, to)
}

/** What becomes of a toy on a gobbler's tongue as time passes: it is swallowed, or it comes back. */
export function chew(game: Game, body: Body, toy: number, onEnd: (ends: 'sort' | 'cycle') => void): void {
  const actor = game.crew[body.slot], plan: Plan | undefined = game.plans.get(body)
  if (!actor || !plan) { body.mode = 'resting'; return }
  const at = game.mouthOf(actor)
  const way = GOBBLER[actor.id].wrong
  // A toy that will not go in sits on the head; any other lies on the tongue.
  const onHead = plan.kind === 'spit' && way === 'hat'
  // On the head it rests on the teeth, clear of the rim.
  // A toy that is not its sort is held up on the tongue to the height of the rim, beside the body, for as long as
  // the gobbler looks at it; a small one that will drop out between the bars only lies there.
  const heldUp = plan.kind === 'spit' && way !== 'falls-through' ? HELD_UP * Math.min(1, body.chewed / 0.22) : 0
  // (On the head it lies a little back from the eyes, and is not squashed wide over them.)
  body.x = at.x; body.z = onHead ? at.z - 0.2 : at.z; body.y = onHead ? actor.y + rimHeight(shapeOf(actor.id)) + ON_TEETH : at.y + heldUp
  if (onHead && body.chewed === 0) { body.squash = 0.94; body.squashV = 0 }
  if (body.chewed === 0) {
    // The chewing of the cycle's last toy starts: the rules ended the cycle when it was let go, and what they
    // wrote (that it is finished, the position as it now stands, the crates) is saved now.
    if (plan.kind === 'gulp' && plan.ends === 'cycle') game.save = 'now'
    if (plan.kind === 'gulp') game.startAct(actor, 'gulp', plan.chomps)
    else { game.startAct(actor, 'hold'); game.say({ type: 'chomp', heavy: body.heavy, who: actor.id }); game.say({ type: 'hmm', who: actor.id }) }
  }
  body.chewed += STEP
  if (plan.kind === 'gulp') {
    const seconds = actSeconds(actor.id, 'gulp', plan.chomps), chewing = seconds * 0.7
    while (plan.chompsDone < plan.chomps && body.chewed >= (chewing * (plan.chompsDone + 0.5)) / plan.chomps) { plan.chompsDone++; game.say({ type: 'chomp', heavy: body.heavy, who: actor.id }) }
    if (body.chewed < chewing) return
    // The swallow: it is chewed small where it lies, goes down the throat, and stands up in its place with the
    // others, as big as a toy in a belly is.
    if (!plan.swallowed) { plan.swallowed = true; game.say({ type: 'gulp', heavy: body.heavy, who: actor.id }) }
    body.scale = Math.max(DOWN_THE_THROAT, body.scale - (STEP / 0.16) * (1 - DOWN_THE_THROAT))
    if (body.scale > DOWN_THE_THROAT) return
    game.plans.delete(body)
    // Down through the tongue to just under it, clear of the roof of the belly, and a fall from there to its
    // place: it never comes back up.
    const under = { x: actor.x, y: at.y - PLATE - toySpan(body.toy).height * DOWN_THE_THROAT - 0.15, z: actor.z }
    const lands = game.spotOf(toy)
    send(game, body, toy, [{ at: under, landing: 'again', seconds: 0.12, scale: DOWN_THE_THROAT }, { landing: 'belly', seconds: Math.sqrt((2 * Math.max(0.3, under.y - lands.y)) / FALL) }])
    // It is inside the gobbler all the way: whatever the gobbler does meanwhile, it does too.
    body.rides = 99
    if (plan.ends) onEnd(plan.ends)
    return
  }
  if (body.chewed < plan.hold) return
  if (!plan.started) { plan.started = true; actor.wrongT = 0; game.say({ type: 'wrong', way }) }
  const spec = WRONG[way]
  if (actor.wrongT >= 0 && actor.wrongT < spec.release * spec.seconds) return
  game.plans.delete(body)
  // Straight up clear of its own teeth and eyes first, then over and onto the tray: high for the one that
  // shoots straight up, flat for the one that fires it.
  if (way === 'falls-through') {
    // The big one's mouth has wide bars in front: a small toy slides out between them, drops down its front
    // onto the rim of the tray, and tips over onto the studs.
    const gap = { x: actor.x, y: body.y, z: actor.z + 3.5 + toySpan(body.toy).depth / 2 }
    send(game, body, toy, [{ at: gap, landing: 'again', seconds: 0.4, peak: body.y + 0.05 }, { landing: 'stand', peak: clearTop(game, toy, gap, game.spotOf(toy), 0.1) }])
    // Out between the bars it is still the gobbler's: it goes where the gobbler sways.
    body.rides = 1
    return
  }
  // Up to well over the tops of its eyes, and no throw from there is so flat that it dips back among them.
  const clear = { x: body.x, y: Math.max(body.y + 2.7, actor.y + rimHeight(shapeOf(actor.id)) + OVER_ITS_EYES), z: body.z }
  const home = game.spotOf(toy), least = way === 'straight-up' ? 9 : way === 'cannon' ? 1.2 : 1.8
  send(game, body, toy, [{ at: clear, landing: 'again', seconds: 0.16 }, { landing: 'stand', peak: clearTop(game, toy, clear, home, least) }])
  // Until it is up clear of the mouth it is still the gobbler's: however the gobbler jumps or leans as it lets the
  // toy go, the toy leaves its mouth the same way. All but the one that reverses out from under it: that one
  // lets go standing still, and backs away only once the toy is up over its eyes, and leaves it in the air.
  body.rides = way === 'reverse' ? 0 : 1
}
