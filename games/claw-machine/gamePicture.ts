import type { Body } from './bodies'
import { hubAt } from './claw'
import type { Actor, Game } from './game'
import { EYE, knobAt, rimHeight } from './gobblerBuild'
import { GOBBLER, shapeOf } from './gobblers'
import type { Guidance } from './guidance'
import { handPose, type HandPose } from './guidance'
import { hintFor } from './guide'
import { PERSONALITY, WRONG, actPose, idlePose, liftedPose, restPose, wrongPose, type Pose } from './motion'
import type { GlowLook, GobblerLook, Picture, Shadow, ToyLook } from './picture'
import { RAIL, TRAY } from './places'
import { nearestPlace } from './tray'

// The picture of the game for one frame: where every toy, gobbler and crate
// is drawn, the claw, the shadows, and what the idle ladder shows. It reads
// the game and changes nothing in it.

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))
/** How far to the side a crate slides to be out of sight. */
const AWAY = 34
const scratch: Pose = restPose({} as Pose), idle: Pose = restPose({} as Pose)
const hand: HandPose = { travel: 0, press: 0, opacity: 0 }

/** How a gobbler is posed now: its own idle life, with whatever it is doing laid over it. */
export function poseOf(game: Game, actor: Actor, out: Pose): Pose {
  idlePose(actor.id, game.time, idle)
  const ways = GOBBLER[actor.id]
  if (actor.liftedT >= 0) liftedPose(ways.lifted, actor.liftedT, scratch)
  else if (actor.wrongT >= 0) wrongPose(ways.wrong, actor.wrongT / WRONG[ways.wrong].seconds, scratch)
  else if (actor.act) actPose(actor.id, actor.act, actor.actT, actor.actN, scratch)
  else if (actor.openT >= 0) actPose(actor.id, 'open-wide', clamp(actor.openT / 1.2, 0, 1), 1, scratch)
  else restPose(scratch)
  out.dx = scratch.dx + idle.dx; out.dy = scratch.dy + idle.dy; out.dz = scratch.dz
  out.squash = scratch.squash * idle.squash
  out.leanX = scratch.leanX; out.leanZ = scratch.leanZ + idle.leanZ; out.turn = scratch.turn
  out.looks = scratch.looks; out.gazeX = scratch.gazeX; out.gazeY = scratch.gazeY
  out.blink = Math.max(scratch.blink, idle.blink)
  if (actor.role === 'crew' && actor.liftedT < 0 && actor.scale > 0.95) {
    const claw = game.claw, near = Math.abs(claw.x - actor.x) < shapeOf(actor.id).width / 2 + 1.5 && claw.z < 1.5
    // A toy in the jaws: every gobbler stretches toward it the same way, whatever the toy is.
    if (game.held >= 0) out.squash *= 1.04 + 0.02 * Math.sin(game.time * PERSONALITY[actor.id].tempo * 3)
    // Their own habits. The duck-head flaps when anything is carried over it; the rocket-head goes up on tiptoe
    // as the hoist climbs; the little one hops to reach the claw whenever it is near.
    if (actor.id === 'duck' && game.held >= 0 && near) out.leanZ += 0.2 * Math.sin(game.time * 12)
    if (actor.id === 'rocket' && claw.phase === 'rising') out.squash *= 1 + 0.14 * Math.min(1, claw.t * 2)
    if (actor.id === 'little' && near && claw.phase === 'ready') out.dy += 0.6 * Math.abs(Math.sin(game.time * 7))
  }
  if (actor.liftedT >= 0) {
    // In the jaws it hangs from its knob: however it stretches, leans or spins, the knob stays between the teeth.
    const knob = knobAt(shapeOf(actor.id)), wide = 1 / Math.sqrt(Math.max(0.2, out.squash))
    const at = turned(knob.x * wide, knob.y * out.squash, knob.z * wide, out)
    out.dx += knob.x - at.x; out.dy += knob.y - at.y; out.dz += knob.z - at.z
  }
  // A walk is a waddle: it rocks from foot to foot as it goes.
  if (actor.walk && actor.walk.arc === 0) out.leanZ += 0.14 * Math.sin(actor.walk.t * 26)
  return out
}

const pose: Pose = restPose({} as Pose)

/**
 * Where a point of a gobbler is once the gobbler leans and turns, measured
 * from its feet: the stage rolls it to its side, turns it about its upright
 * and then pitches it forward, in that order.
 */
export function turned(x: number, y: number, z: number, of: { leanX: number; leanZ: number; turn: number }): { x: number; y: number; z: number } {
  const cz = Math.cos(of.leanZ), sz = Math.sin(of.leanZ), cy = Math.cos(of.turn), sy = Math.sin(of.turn), cx = Math.cos(of.leanX), sx = Math.sin(of.leanX)
  const x1 = x * cz - y * sz, y1 = x * sz + y * cz
  const x2 = x1 * cy + z * sy, z2 = -x1 * sy + z * cy
  return { x: x2, y: y1 * cx - z2 * sx, z: y1 * sx + z2 * cx }
}

/** The cabinet with nothing in it but the claw at rest: what is drawn before the saved state has been read. */
export function barePicture(): Picture {
  return { toys: [], gobblers: [], crates: [], shadows: [], glows: [], hand: null, gate: 0, claw: { x: 0, z: 6, length: RAIL.top - 9.2 - 1.6, swingX: 0, swingZ: 0, open: 0.55, squash: 1 } }
}

export function gamePicture(game: Game, guidance: Guidance | null): Picture {
  const claw = game.claw, hub = hubAt(claw)
  const toys: ToyLook[] = [], gobblers: GobblerLook[] = [], shadows: Shadow[] = [], glows: GlowLook[] = []
  const look = (key: number, body: Body, x = body.x, y = body.y, z = body.z, turn = 0): ToyLook => ({ key, toy: body.toy, x, y, z, squash: body.squash, leanX: body.leanX, leanZ: body.leanZ, scale: body.scale, turn })
  /** A thing in or on a gobbler rides its pose as if fixed to it: it shifts, leans and turns with it and rises as it stretches. */
  const riding = (actor: Actor, body: Body, key: number) => {
    const at = turned(body.x - actor.x, (body.y - actor.y) * pose.squash, body.z - actor.z, pose)
    const one = look(key, body, actor.x + pose.dx * actor.scale + at.x, actor.y + pose.dy + at.y, actor.z + pose.dz * actor.scale + at.z, pose.turn)
    one.leanX += pose.leanZ; one.leanZ -= pose.leanX
    toys.push(one)
  }

  // What the gobblers watch: the toy in the jaws, or the claw.
  const watched = game.held >= 0 ? game.bodies[game.held] : hub
  const stand = (actor: Actor) => {
    poseOf(game, actor, pose)
    const shape = shapeOf(actor.id)
    const eyeY = actor.y + (rimHeight(shape) + EYE / 2) * actor.scale
    gobblers.push({
      id: `g${actor.key}`, who: actor.id, shape, x: actor.x + pose.dx * actor.scale, y: actor.y + pose.dy, z: actor.z + pose.dz * actor.scale,
      squash: pose.squash, leanX: pose.leanX, leanZ: pose.leanZ, turn: pose.turn, scale: actor.scale,
      gazeX: pose.looks ? pose.gazeX : clamp((watched.x - actor.x) / 11, -1, 1),
      gazeY: pose.looks ? pose.gazeY : clamp((watched.y - eyeY) / 9 - (watched.z - actor.z) / 30, -1, 1),
      blink: pose.blink, tongue: actor.tongue, waiting: actor.role === 'waiting' || actor.scale < 0.95,
    })
    // A snack shows in the belly of a gobbler at the tray; the ones who wait are seen from the eyes up.
    if (actor.role !== 'waiting') riding(actor, actor.snack, 10000 + actor.key)
    actor.cargo.forEach((body, i) => riding(actor, body, 20000 + actor.key * 16 + i))
  }
  for (const actor of game.crew) {
    stand(actor)
    game.bodies.forEach((body, toy) => {
      const where = game.world.cycle.where[toy]
      const inside = (body.mode === 'resting' && where.at === 'belly' && where.slot === actor.slot) || (body.mode === 'mouth' && body.slot === actor.slot)
      if (inside && toy !== game.held) riding(actor, body, game.generation * 100 + toy)
    })
  }
  for (const actor of game.waiting) stand(actor)
  for (const actor of game.leaving) stand(actor)

  game.bodies.forEach((body, toy) => {
    const where = game.world.cycle.where[toy]
    const inside = toy !== game.held && ((body.mode === 'resting' && where.at === 'belly') || body.mode === 'mouth')
    if (inside) return
    toys.push(look(game.generation * 100 + toy, body))
    // A toy in the jaws has no shadow of its own, and neither has one on a crate or behind the parapet.
    if (toy === game.held || body.z < TRAY.z - 0.5) return
    const under = nearestPlace(body.x, body.z)
    const ground = body.mode === 'resting' && where.at === 'tray' ? game.stackTop(where.place, toy) : game.stackTop(under, toy)
    const lift = Math.max(0, body.y - ground)
    shadows.push({ x: body.x, y: ground, z: body.z, r: (body.heavy > 1 ? 3.3 : 2.1) * body.scale, a: Math.max(0.25, 1 - lift / 16) })
  })
  // The shadow of the claw lies straight under the trolley and the swing never moves it: it is where the claw,
  // or the toy in its jaws, will land. Over the tray it lies on the tray; elsewhere there is none.
  if (claw.z > TRAY.z - 0.5 && Math.abs(claw.x) < 15.5) {
    const below = nearestPlace(claw.x, claw.z)
    const held = game.held >= 0 ? game.bodies[game.held] : null
    shadows.push({ x: claw.x, y: game.stackTop(below), z: claw.z, r: held ? (held.heavy > 1 ? 3.1 : 2) : 1.7, a: 0.75 })
  }

  // The idle ladder: a ring on each thing that can be touched now, and the ghost hand tapping one of them.
  let ghost: Picture['hand'] = null
  if (guidance && (guidance.glow > 0.01 || guidance.demo !== null)) {
    const hint = hintFor(game, guidance.demoIndex)
    const breath = 0.75 + 0.25 * Math.sin(game.time * 3.2)
    for (const mark of hint.marks) glows.push({ x: mark.x, y: mark.y, z: mark.z, r: mark.r, a: guidance.glow * breath })
    if (guidance.demo !== null && hint.tap) {
      handPose(guidance.demo, false, hand)
      ghost = { x: hint.tap.x, y: hint.tap.y, z: hint.tap.z, press: hand.press, opacity: hand.opacity }
    }
  }

  const resting = claw.phase === 'ready' && !claw.following && !claw.dropOnArrival
  return {
    toys, gobblers, shadows, glows, hand: ghost, gate: game.gateShake,
    crates: game.crates.map((crate) => ({
      key: `${crate.from}-${crate.seed}-${crate.toys.length}-${crate.crews.length}`, which: crate.which, toys: crate.toys, crews: crate.crews,
      x: crate.x + crate.away * AWAY * (crate.x < 0 ? -1 : 1), y: crate.y, z: crate.z, tip: crate.tip,
    })),
    // Left alone, the claw is never quite still: the cable sways a hair and the jaws work a little.
    claw: {
      x: claw.x, z: claw.z, length: claw.length,
      swingX: claw.swingX + (resting ? 0.012 * Math.sin(game.time * 1.3) : 0), swingZ: claw.swingZ + (resting ? 0.008 * Math.sin(game.time * 0.9 + 1) : 0),
      open: claw.open + (resting && game.held < 0 ? 0.06 * Math.sin(game.time * 1.1) : 0), squash: claw.squash,
    },
  }
}
