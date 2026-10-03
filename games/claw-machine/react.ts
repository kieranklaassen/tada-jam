import { MINI } from './belly'
import { toss, type Body, type Leg } from './bodies'
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

const leg = (at: Spot, seconds: number, landing: Leg['landing'], scale = 1): Leg => ({ x: at.x, y: at.y, z: at.z, seconds, scale, landing })

/** Throws a body along some points and then home to where the rules have it. */
function send(game: Game, body: Body, toy: number, via: Leg[], home: { seconds: number; landing: 'stand' | 'belly' | 'mouth'; scale?: number }, deed?: Deed): void {
  const at = home.landing === 'mouth' ? game.mouthOf(game.crew[body.slot]) : game.spotOf(toy)
  const legs = [...via, leg(at, home.seconds, home.landing, home.scale ?? (home.landing === 'belly' ? MINI : 1))]
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
      send(game, game.bodies[deed.toy], deed.toy, [], { seconds: 0.26, landing: 'stand' }, deed)
      break
    case 'bounce': {
      const body = game.bodies[deed.toy]
      const top = { x: body.x, y: game.stackTop(deed.off), z: body.z }
      send(game, body, deed.toy, [leg(top, 0.24, 'again')], { seconds: 0.44, landing: 'stand' }, deed)
      break
    }
    case 'topple':
      game.say({ type: 'teeter' })
      deed.moved.forEach(({ toy }, i) => send(game, game.bodies[toy], toy, [], { seconds: 0.36 + i * 0.15, landing: 'stand' }, deed))
      break
    case 'gulp': {
      const body = game.bodies[deed.toy]
      body.slot = deed.slot
      game.plans.set(body, { kind: 'gulp', chomps: deed.chomps, ends: deed.ends, chompsDone: 0 })
      send(game, body, deed.toy, [], { seconds: 0.26, landing: 'mouth' }, deed)
      break
    }
    case 'spit': {
      const body = game.bodies[deed.toy], actor = game.crew[deed.slot]
      body.slot = deed.slot
      const hold = NEW_HERE.includes(cycle.from) ? 1.1 : 0.4
      game.plans.set(body, { kind: 'spit', hold, started: false, released: false, place: deed.place })
      if (deed.way === 'falls-through') {
        // Too small for it: straight through its belly and out underneath, and then onto the tray.
        const under = { x: actor.x, y: STEP_PLACE.top, z: actor.z + 3.6 }
        game.plans.delete(body)
        actor.wrongT = 0
        game.say({ type: 'wrong', way: 'falls-through' })
        send(game, body, deed.toy, [leg(game.mouthOf(actor), 0.24, 'again'), leg(under, 0.3, 'again')], { seconds: WRONG['falls-through'].air, landing: 'stand' }, deed)
      } else send(game, body, deed.toy, [], { seconds: 0.26, landing: 'mouth' }, deed)
      break
    }
    case 'thrown-back': {
      const body = game.bodies[deed.toy]
      send(game, body, deed.toy, [leg(ledgePoint(game), 0.42, 'again')], { seconds: deed.heavy ? 0.8 : 0.62, landing: 'stand' }, deed)
      break
    }
    case 'gate-roll': {
      const body = game.bodies[deed.toy]
      const sill = { x: GATE.x, y: STEP_PLACE.top, z: GATE.z + 5.5 }
      send(game, body, deed.toy, [leg({ x: GATE.x, y: GATE.top + 0.2, z: GATE.z }, 0.36, 'again'), leg(sill, deed.heavy ? 0.34 : 0.24, 'again')], { seconds: 0.34, landing: 'stand' }, deed)
      break
    }
    case 'rim-slide': {
      const body = game.bodies[deed.toy], side = Math.sign(claw.x) || 1
      const rim = { x: side * (TRAY_WIDTH / 2 + 0.5), y: TRAY.top + 0.5, z: BELL.z }
      send(game, body, deed.toy, [leg({ x: side * BELL.x, y: BELL.top, z: BELL.z }, 0.26, 'again'), leg(rim, 0.2, 'again')], { seconds: 0.3, landing: 'stand' }, deed)
      break
    }
    case 'knock':
      game.say({ type: 'knock' })
      send(game, game.bodies[deed.toy], deed.toy, [], { seconds: 0.24, landing: 'stand' }, deed)
      break
    case 'dominoes':
      deed.moved.forEach(({ toy }, i) => { game.say({ type: 'domino', nth: i }); send(game, game.bodies[toy], toy, [], { seconds: 0.22 + i * 0.11, landing: 'stand' }, deed) })
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
  body.x = at.x; body.z = at.z; body.y = onHead ? actor.y + rimHeight(shapeOf(actor.id)) + 0.5 : at.y
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
    const home = game.spotOf(toy)
    toss(body, { x: home.x, y: home.y, z: home.z, seconds: 0.24, scale: MINI, landing: 'belly' })
    if (plan.ends) onEnd(plan.ends)
    return
  }
  if (body.chewed < plan.hold) return
  if (!plan.started) { plan.started = true; actor.wrongT = 0; game.say({ type: 'wrong', way }) }
  const spec = WRONG[way]
  if (actor.wrongT >= 0 && actor.wrongT < spec.release * spec.seconds) return
  game.plans.delete(body)
  const home = game.spotOf(toy)
  toss(body, { x: home.x, y: home.y, z: home.z, seconds: spec.air, scale: 1, landing: 'stand' })
}
