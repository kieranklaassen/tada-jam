import { MINI } from './belly'
import { airTime, toss, type Body, type Leg } from './bodies'
import { STEP } from './claw'
import type { Deed } from './deeds'
import type { Actor, Game, Plan } from './game'
import { rimHeight } from './gobblerBuild'
import { GOBBLER, shapeOf } from './gobblers'
import type { Spot } from './layout'
import { WRONG, actSeconds } from './motion'
import { BELL, GATE, SHELF, STEP as STEP_PLACE, TRAY, TRAY_WIDTH } from './places'

// What each deed looks like as it is carried out: which bodies fly where,
// which gobbler does what, and what is heard. The rules have already put
// every toy where it belongs; this only shows it getting there. A deed never
// waits for another to finish: reactions run alongside the next touch.

/** The positions at which an attribute is new, where a wrong toy is held up on the tongue for longer. */
const NEW_HERE = ['two-colours', 'three-colours', 'two-kinds', 'two-sizes']

/** One stop of a flight: a point (or home, where the rules have the toy), how it lands there, and how high the throw to it rises. */
type Stop = { at?: Spot; landing: Leg['landing']; peak?: number; seconds?: number; scale?: number }

/** How far above the higher end of a throw it rises when nothing is said: a short hop. */
const HOP = 0.3
/** The height a throw rises to when it has to pass over the crew at the tray, models and all. */
const OVER_THE_CREW = 14.5

/**
 * Throws a body from stop to stop. A throw takes as long as its rise needs:
 * what flies over something clears it by going high enough, and never by
 * passing through it.
 */
function send(game: Game, body: Body, toy: number, stops: Stop[], deed?: Deed): void {
  let y = body.y
  const legs: Leg[] = stops.map((stop) => {
    const at = stop.at ?? (stop.landing === 'mouth' ? game.mouthOf(game.crew[body.slot]) : game.spotOf(toy))
    const seconds = stop.seconds ?? airTime(y, at.y, stop.peak ?? Math.max(y, at.y) + HOP)
    y = at.y
    return { x: at.x, y: at.y, z: at.z, seconds, scale: stop.scale ?? (stop.landing === 'belly' ? MINI : 1), landing: stop.landing }
  })
  body.legs = legs.slice(1)
  body.hang = 0
  if (deed) game.causes.set(body, deed)
  if (legs[0].landing === 'again') game.flights.set(body, legs[0])
  toss(body, legs[0])
}

function nearestWaiter(game: Game, x: number): Actor | null {
  return game.waiting.length === 0 ? null : game.waiting.reduce((best, actor) => (Math.abs(actor.x - x) < Math.abs(best.x - x) ? actor : best))
}

/** Where a toy let go over the ledge is caught, or lands on the gate. */
function ledgePoint(game: Game): Spot {
  const waiter = nearestWaiter(game, game.claw.x)
  if (waiter) return { x: waiter.x, y: waiter.y + rimHeight(shapeOf(waiter.id)) + 2.2, z: waiter.z }
  const crate = game.crates.reduce<Game['crates'][number] | null>((best, one) => (!best || Math.abs(one.x - game.claw.x) < Math.abs(best.x - game.claw.x) ? one : best), null)
  if (crate) return { x: crate.x, y: SHELF.top + 12, z: crate.z }
  return { x: GATE.x, y: GATE.top + 0.2, z: GATE.z }
}

export function react(game: Game, deed: Deed): void {
  const claw = game.claw, cycle = game.world.cycle
  switch (deed.type) {
    case 'grab': {
      const body = game.bodies[deed.toy]
      game.held = deed.toy
      body.hang = 0; body.squash = 1.22; body.squashV = 0
      claw.load = body.heavy; claw.grip = body.heavy === 2 ? 0.52 : 0.3
      game.shake(body.x, body.z, 13, 6, deed.toy)
      // What it stood on wobbles as its top goes.
      for (const below of game.tray()[deed.place]) { game.bodies[below].squash = 0.86; game.bodies[below].squashV = 0 }
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
      claw.load = 2; claw.grip = 0.22
      game.say({ type: 'groan' }); game.say({ type: 'lifted', way: deed.way })
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
      claw.swingVX -= Math.sign(claw.x) * 3
      break
    case 'gate-rattle':
      game.say({ type: 'gate-rattle' }); game.gateShake = 1
      break
    case 'click':
      send(game, game.bodies[deed.toy], deed.toy, [{ landing: 'stand', seconds: 0.26 }], deed)
      break
    case 'bounce': {
      const body = game.bodies[deed.toy]
      const top = { x: body.x, y: game.stackTop(deed.off), z: body.z }
      send(game, body, deed.toy, [{ at: top, landing: 'again', seconds: 0.24 }, { landing: 'stand', peak: top.y + 3 }], deed)
      break
    }
    case 'topple':
      game.say({ type: 'teeter' })
      // The top comes down first and furthest up; each one after it a little later.
      deed.moved.forEach(({ toy }, i) => send(game, game.bodies[toy], toy, [{ landing: 'stand', peak: game.bodies[toy].y + 2 + i * 1.6 }], deed))
      break
    case 'gulp': {
      const body = game.bodies[deed.toy]
      body.slot = deed.slot
      game.plans.set(body, { kind: 'gulp', chomps: deed.chomps, ends: deed.ends, chompsDone: 0 })
      send(game, body, deed.toy, [{ landing: 'mouth', seconds: 0.26 }], deed)
      break
    }
    case 'spit': {
      const body = game.bodies[deed.toy], actor = game.crew[deed.slot]
      body.slot = deed.slot
      const hold = NEW_HERE.includes(cycle.from) ? 1.1 : 0.4
      game.plans.set(body, { kind: 'spit', hold, started: false, released: false, place: deed.place })
      if (deed.way === 'falls-through') {
        // Too small for it: straight through its belly and out underneath, and then onto the tray.
        const under = { x: actor.x, y: STEP_PLACE.top, z: actor.z }
        game.plans.delete(body)
        actor.wrongT = 0
        game.say({ type: 'wrong', way: 'falls-through' })
        send(game, body, deed.toy, [{ at: game.mouthOf(actor), landing: 'again', seconds: 0.24 }, { at: under, landing: 'again', seconds: 0.3 }, { landing: 'stand', peak: STEP_PLACE.top + 2.2 }], deed)
      } else send(game, body, deed.toy, [{ landing: 'mouth', seconds: 0.26 }], deed)
      break
    }
    case 'thrown-back': {
      const body = game.bodies[deed.toy]
      send(game, body, deed.toy, [{ at: ledgePoint(game), landing: 'again', seconds: 0.42 }, { landing: 'stand', peak: OVER_THE_CREW + (deed.heavy ? 0 : 1.5) }], deed)
      break
    }
    case 'gate-roll': {
      const body = game.bodies[deed.toy]
      // Onto the gate, a roll along its bar, and off it over the crew onto the tray.
      const on = { x: GATE.x, y: GATE.top + 0.05, z: GATE.z }, along = { x: GATE.x + (body.x < 0 ? 1.6 : -1.6), y: GATE.top + 0.05, z: GATE.z }
      send(game, body, deed.toy, [{ at: on, landing: 'again', seconds: 0.36 }, { at: along, landing: 'again', seconds: deed.heavy ? 0.5 : 0.3, peak: GATE.top + 0.1 }, { landing: 'stand', peak: OVER_THE_CREW }], deed)
      break
    }
    case 'rim-slide': {
      const body = game.bodies[deed.toy], side = Math.sign(claw.x) || 1
      // Onto the bell, off it onto the rim of the tray, and down the rim onto the edge studs.
      const rim = { x: side * (TRAY_WIDTH / 2 + 0.5), y: TRAY.top + 0.45, z: BELL.z }
      send(game, body, deed.toy, [{ at: { x: side * BELL.x, y: BELL.top + 0.05, z: BELL.z }, landing: 'again', seconds: 0.26 }, { at: rim, landing: 'again', peak: BELL.top + 1.4 }, { landing: 'stand', peak: TRAY.top + 2 + body.height }], deed)
      break
    }
    case 'knock':
      game.say({ type: 'knock' })
      send(game, game.bodies[deed.toy], deed.toy, [{ landing: 'stand', peak: game.bodies[deed.toy].y + 1.1 }], deed)
      break
    case 'dominoes':
      deed.moved.forEach(({ toy }, i) => { game.say({ type: 'domino', nth: i }); send(game, game.bodies[toy], toy, [{ landing: 'stand', peak: game.bodies[toy].y + 1.6 + i * 1.4 }], deed) })
      break
    case 'rattle':
      game.say({ type: 'rattle' })
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
      game.waiting.forEach((actor, i) => { game.startAct(actor, 'lean', Math.sign(claw.vx) || 1); game.say({ type: 'creak', nth: i }) })
      if (game.waiting.length === 0) game.say({ type: 'creak', nth: 0 })
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
      if (actor) { actor.openT = 0; game.say({ type: 'gargle', who: actor.id }) }
      break
    }
    case 'stare':
      for (const actor of game.waiting) game.startAct(actor, 'stare')
      game.say({ type: 'stare' })
      break
    case 'hum':
      game.say({ type: 'bell-hum' })
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

/** One leg of a flight has ended and the next begins: what is heard and done at the turn. */
export function nextLeg(game: Game, body: Body, toy: number, deed: Deed | undefined): void {
  const next = body.legs.shift()
  if (!next) return
  const actor = game.crew[body.slot]
  if (deed?.type === 'bounce') game.say({ type: 'boing' })
  else if (deed?.type === 'thrown-back') {
    const waiter = nearestWaiter(game, body.x)
    if (deed.heavy) { for (const one of game.waiting) game.startAct(one, 'heave'); game.say({ type: 'grunt' }); game.say({ type: 'huff' }) }
    else { if (waiter) game.startAct(waiter, 'catch'); game.say({ type: 'slap' }); game.say({ type: 'whistle' }) }
  } else if (deed?.type === 'gate-roll') { if (deed.heavy) game.say({ type: 'scrape' }); else game.say({ type: 'ping', nth: body.legs.length }); game.gateShake = 0.6 }
  else if (deed?.type === 'rim-slide') { if (body.legs.length > 0) game.say({ type: 'bell' }); else game.say(deed.heavy ? { type: 'rim-thud' } : { type: 'zip' }) }
  else if (deed?.type === 'spit' && actor && body.legs.length === 0) game.startAct(actor, 'start')
  const to = next.landing === 'again' ? next : { ...next, ...game.spotOf(toy) }
  if (next.landing === 'again') game.flights.set(body, next)
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
  body.x = at.x; body.z = at.z; body.y = onHead ? actor.y + rimHeight(shapeOf(actor.id)) + 0.85 : at.y
  if (body.chewed === 0) {
    if (plan.kind === 'gulp') game.startAct(actor, 'gulp', plan.chomps)
    else { game.startAct(actor, 'hold'); game.say({ type: 'chomp', heavy: body.heavy, who: actor.id }); game.say({ type: 'hmm', who: actor.id }) }
  }
  body.chewed += STEP
  if (plan.kind === 'gulp') {
    const seconds = actSeconds(actor.id, 'gulp', plan.chomps), chewing = seconds * 0.7
    while (plan.chompsDone < plan.chomps && body.chewed >= (chewing * (plan.chompsDone + 0.5)) / plan.chomps) { plan.chompsDone++; game.say({ type: 'chomp', heavy: body.heavy, who: actor.id }) }
    if (body.chewed < chewing) return
    game.say({ type: 'gulp', heavy: body.heavy, who: actor.id })
    game.plans.delete(body)
    send(game, body, toy, [{ landing: 'belly', seconds: 0.24 }])
    if (plan.ends) onEnd(plan.ends)
    return
  }
  if (body.chewed < plan.hold) return
  if (!plan.started) { plan.started = true; actor.wrongT = 0; game.say({ type: 'wrong', way }) }
  const spec = WRONG[way]
  if (actor.wrongT >= 0 && actor.wrongT < spec.release * spec.seconds) return
  game.plans.delete(body)
  // Out over its own teeth and eyes and onto the tray: high for the one that shoots straight up.
  send(game, body, toy, [{ landing: 'stand', peak: body.y + (way === 'straight-up' ? 11 : way === 'cannon' ? 3.6 : 4.4) }])
}
