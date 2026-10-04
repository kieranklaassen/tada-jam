import type { Body } from './bodies'
import { holdOf } from './builds'
import { hubAt } from './claw'
import { LEANS_FOR, PEERS_FOR, type Actor, type Game } from './game'
import { EYE, knobAt, rimHeight } from './gobblerBuild'
import { crateSpot, crewSpot } from './layout'
import { GOBBLER, shapeOf } from './gobblers'
import type { Guidance } from './guidance'
import { handPose, type HandPose } from './guidance'
import { hintFor } from './guide'
import { PERSONALITY, WRONG, actPose, idlePose, liftedPose, restPose, wrongPose, type Pose } from './motion'
import type { GlowLook, GobblerLook, Picture, Shadow, ToyLook, WatcherLook } from './picture'
import { RAIL, TRAY } from './places'
import { nearestPlace } from './tray'
import { WATCHER_AT, WATCHER_FACES, watcherPose, type WatcherPose } from './watcher'
import { trayIsClear } from './world'

// The picture of the game for one frame: where every toy, gobbler and crate
// is drawn, the claw, the shadows, and what the idle ladder shows. It reads
// the game and changes nothing in it.

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))
/** How far to the side a crate slides to be out of sight. */
const AWAY = 34
const scratch: Pose = restPose({} as Pose), idle: Pose = restPose({} as Pose), swung: Pose = restPose({} as Pose)
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
  // The ones who wait: when the tray is clear they go up on tiptoe to look over the parapet. They do not
  // call or hurry anyone; they are only where the next thing is.
  if (actor.role === 'waiting' && !actor.walk && !actor.act && game.bodies.length > 0 && trayIsClear(game.world.cycle)) out.squash *= 1.1 + 0.03 * Math.sin(game.time * PERSONALITY[actor.id].tempo)
  if (actor.liftedT < 0) {
    // Standing, it leans as a thing on feet does: it rocks up onto the edge of its feet, and never down into the
    // floor.
    // (Squashed, it is wider, and its feet stand further out.)
    const shape = shapeOf(actor.id), wide = 1 / Math.sqrt(Math.max(0.2, out.squash)), foot = (Math.max(1.5, shape.width / 2 - 2.5) + 1) * wide
    out.dy += (Math.abs(Math.sin(out.leanZ)) * foot + Math.abs(Math.sin(out.leanX)) * 2 * wide) * actor.scale
  }
  if (actor.liftedT >= 0) {
    const shape = shapeOf(actor.id), knob = knobAt(shape), floor = crewSpot(actor.slot, game.crew.length).y
    // In the jaws only its own way of being lifted moves it: nothing of its idle life shifts the knob between
    // the teeth.
    out.dx = scratch.dx; out.dy = scratch.dy; out.leanZ = scratch.leanZ
    // It hangs from its knob: however it stretches or leans, the knob stays between the teeth. A spin is about
    // its own middle, and the claw goes round with the knob (`knobSwing`). And it never goes down through the
    // step: while its feet would, it stretches and swings less, so a lift begins stiff and loosens as it rises.
    for (let tries = 0; tries < 12; tries++) {
      const wide = 1 / Math.sqrt(Math.max(0.2, out.squash)), foot = (Math.max(1.5, shape.width / 2 - 2.5) + 1) * wide
      const at = turned(knob.x * wide, knob.y * out.squash, knob.z * wide, { leanX: out.leanX, leanZ: out.leanZ, turn: 0 })
      const feet = actor.y + out.dy + knob.y - at.y - Math.abs(Math.sin(out.leanZ)) * foot - Math.abs(Math.sin(out.leanX)) * 2 * wide
      if (feet >= floor || tries === 11) { out.dx += knob.x - at.x; out.dy += knob.y - at.y; out.dz += knob.z - at.z; break }
      out.leanX *= 0.6; out.leanZ *= 0.6; out.squash = 1 + (out.squash - 1) * 0.6
    }
  }
  // A walk is a waddle: it rocks from foot to foot as it goes.
  // (A step back into its own place after a lift is too short to waddle.)
  if (actor.walk && actor.walk.arc === 0 && actor.walk.seconds > 0.5) out.leanZ += 0.14 * Math.sin(actor.walk.t * 26)
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
  return { toys: [], gobblers: [], crates: [], carts: [], shadows: [], glows: [], hand: null, gate: 0, seconds: 0, watcher: { ...WATCHER_AT, squash: 1, turn: WATCHER_FACES, gazeX: 0, gazeY: 0, blink: 0 }, claw: { x: 0, z: 6, length: RAIL.top - 9.2 - 1.6, swingX: 0, swingZ: 0, open: 0.55, squash: 1, shiftX: 0, shiftZ: 0, turn: 0 } }
}

/** 0 before `a`, 1 at the middle of `a` to `b`, 0 after `b`. */
const swell = (t: number, a: number, b: number) => Math.sin(clamp((t - a) / (b - a), 0, 1) * Math.PI)

/**
 * What is on a gobbler's face: its brows and the tip of its tongue. Before a toy is in its mouth every gobbler
 * looks the same way at any toy, keen, with its brows up and its tongue out; what it thinks of the toy shows
 * only once it is chewing. It frowns at a toy that is not its sort and sticks its tongue out as it sends it
 * back; it licks its lips after a swallow; and when its neighbour has the wrong toy it raises its brows at it.
 */
function faceOf(game: Game, actor: Actor): { brow: number; tongue: number; lick: number } {
  const ways = GOBBLER[actor.id], time = game.time * PERSONALITY[actor.id].tempo
  if (actor.liftedT >= 0) {
    // Lifted: the one that loves it beams, the one that hates it scowls, and the rest are astonished.
    return { brow: ways.lifted === 'kicks-and-squeals' ? 1 : ways.lifted === 'goes-rigid' || ways.lifted === 'thuds-back' ? -1 : 0.7, tongue: ways.lifted === 'kicks-and-squeals' ? 0.7 : 0, lick: 0.5 + 0.5 * Math.sin(actor.liftedT * 20) }
  }
  if (actor.wrongT >= 0) {
    // Its own way with a toy that is not its sort: a frown, and its tongue out as the toy goes.
    const spec = WRONG[ways.wrong], t = actor.wrongT / spec.seconds
    return { brow: t < spec.release + 0.2 ? -1 : 0.4, tongue: swell(t, spec.release - 0.08, spec.release + 0.3), lick: 0 }
  }
  if (actor.act === 'hold') return { brow: -1, tongue: 1, lick: 0 }
  if (actor.act === 'show') return { brow: 0.8, tongue: 1, lick: 0 }
  if (actor.act === 'gulp') return { brow: 0.7, tongue: swell(actor.actT, 0.74, 1), lick: swell(actor.actT, 0.74, 1) }
  if (actor.act === 'burp') return { brow: 0.6, tongue: swell(actor.actT, 0.1, 0.9), lick: 0 }
  if (actor.act === 'duck' || actor.act === 'bonked') return { brow: -0.6, tongue: 0, lick: 0 }
  if (actor.act === 'start' || actor.act === 'snap' || actor.act === 'stare' || actor.act === 'catch' || actor.act === 'heave') return { brow: 1, tongue: 0, lick: 0 }
  if (actor.openT >= 0) return { brow: 1, tongue: 1, lick: 0.5 + 0.5 * Math.sin(actor.openT * 16) }
  if (actor.role === 'crew' && actor.scale > 0.95) {
    // A neighbour with the wrong toy on its tongue is something to see.
    if (game.crew.some((other) => other !== actor && (other.wrongT >= 0 || other.act === 'hold'))) return { brow: 0.9, tongue: 0, lick: 0 }
    // A bang, or a toy or a stack that comes flying: whatever makes the watcher jump or laugh raises their brows.
    if (game.watcher.act === 'start' || game.watcher.act === 'laugh') return { brow: 0.9, tongue: 0, lick: 0 }
    // A toy in the jaws: keen, whatever the toy is.
    if (game.held >= 0) return { brow: 0.6, tongue: 0.45 + 0.25 * Math.sin(time * 3), lick: 0.5 + 0.5 * Math.sin(time * 5) }
  }
  return { brow: 0, tongue: 0, lick: 0 }
}

/**
 * How a toy takes being in the jaws, which goes with its kind and with nothing else: a duck waggles from side to
 * side, a car goes limp and see-saws, a rocket shivers. It turns and tips about the part the teeth hold, so that
 * part stays between them; a big one does it slower. It begins once the toy is up off what it stood on and is
 * still while the cable swings hard, so it never rocks into what is under it or out of the teeth.
 */
function inTheJaws(game: Game, toy: number, body: Body, into: ToyLook): void {
  const claw = game.claw, hold = holdOf(body.toy)
  const up = clamp((body.y - game.spotOf(toy).y) / 1.2, 0, 1), calm = 1 - clamp(Math.hypot(claw.swingX, claw.swingZ) / 0.22, 0, 1)
  const much = up * calm, t = game.time * (body.heavy > 1 ? 0.7 : 1)
  if (much <= 0) return
  if (body.toy.kind === 'duck') {
    const turn = 0.3 * much * Math.sin(t * 9)
    into.turn = turn
    into.x += hold.x * (1 - Math.cos(turn)); into.z += hold.x * Math.sin(turn)
  } else if (body.toy.kind === 'car') {
    const pitch = 0.12 * much * Math.sin(t * 3.1)
    into.pitch = pitch
    into.x += hold.x - (hold.x * Math.cos(pitch) - hold.top * Math.sin(pitch)); into.y += hold.top - (hold.x * Math.sin(pitch) + hold.top * Math.cos(pitch))
  } else {
    into.x += 0.035 * much * Math.sin(t * 70)
  }
}

/** How far above the tongue a snack is held up while its gobbler shows it: at the rim. */
export const SHOWN_AT = 1.25

const peering: WatcherPose = { dy: 0, squash: 1, turn: 0, gazeX: 0, gazeY: 0, blink: 0 }

/** The watcher, looking at what the gobblers look at: the toy in the jaws, or the claw. */
function watching(game: Game, at: { x: number; y: number; z: number }): WatcherLook {
  const pose = watcherPose(game.watcher, game.time, clamp((at.x - WATCHER_AT.x) / 26, -1, 0.3), clamp((at.y - 4) / 12 - (at.z - WATCHER_AT.z) / 40, -1, 1), peering)
  return { x: WATCHER_AT.x, y: WATCHER_AT.y + pose.dy, z: WATCHER_AT.z, squash: pose.squash, turn: WATCHER_FACES + pose.turn, gazeX: pose.gazeX, gazeY: pose.gazeY, blink: pose.blink }
}

/** In flight, but still carried by the gobbler it is leaving or going down into. */
const rides = (body: Body) => body.mode === 'flying' && body.rides > 0

/**
 * Where a thing fixed to a gobbler is in the cabinet, given where it is against the gobbler standing at rest: it
 * shifts, leans, turns and stretches with it.
 */
export function carriedBy(game: Game, actor: Actor, at: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  const pose = poseOf(game, actor, swung), wide = 1 / Math.sqrt(Math.max(0.2, pose.squash))
  const to = turned((at.x - actor.x) * wide, (at.y - actor.y) * pose.squash, (at.z - actor.z) * wide, pose)
  return { x: actor.x + pose.dx * actor.scale + to.x, y: actor.y + pose.dy + to.y, z: actor.z + pose.dz * actor.scale + to.z }
}

/**
 * How far the knob of a lifted gobbler has gone round its middle, and how far it has turned: the claw that holds
 * it goes with it, as a claw on a cable does when its load spins.
 */
function knobSwing(game: Game): { x: number; z: number; turn: number } {
  const actor = game.lifted >= 0 ? game.crew[game.lifted] : undefined
  if (!actor || actor.liftedT < 0) return { x: 0, z: 0, turn: 0 }
  const pose = poseOf(game, actor, swung)
  if (pose.turn === 0) return { x: 0, z: 0, turn: 0 }
  const knob = knobAt(shapeOf(actor.id)), wide = 1 / Math.sqrt(Math.max(0.2, pose.squash))
  const at = turned(knob.x * wide, knob.y * pose.squash, knob.z * wide, pose), unturned = turned(knob.x * wide, knob.y * pose.squash, knob.z * wide, { leanX: pose.leanX, leanZ: pose.leanZ, turn: 0 })
  return { x: at.x - unturned.x, z: at.z - unturned.z, turn: pose.turn }
}

/** A toy bulges a little as it squashes: little enough that two big toys side by side on the tray never meet. */
const bulge = (squash: number) => 1 + (1 - Math.min(1.3, Math.max(0.5, squash))) * 0.25

export function gamePicture(game: Game, guidance: Guidance | null): Picture {
  const claw = game.claw, hub = hubAt(claw)
  const toys: ToyLook[] = [], gobblers: GobblerLook[] = [], shadows: Shadow[] = [], glows: GlowLook[] = []
  const look = (key: number, body: Body, x = body.x, y = body.y, z = body.z, turn = 0): ToyLook => ({ key, toy: body.toy, x, y, z, squash: body.squash, wide: bulge(body.squash), leanX: body.leanX, leanZ: body.leanZ, pitch: 0, ride: null, scale: body.scale, turn })
  /** A thing in or on a gobbler rides its pose as if fixed to it: it shifts, leans and turns with it and rises as it stretches. */
  const riding = (actor: Actor, body: Body, key: number, from: { x: number; y: number; z: number } = body) => {
    // The body draws wider as it squashes and narrower as it stretches, and what is in it keeps its place in it.
    const wide = 1 / Math.sqrt(Math.max(0.2, pose.squash))
    const at = turned((from.x - actor.x) * wide, (from.y - actor.y) * pose.squash, (from.z - actor.z) * wide, pose)
    const one = look(key, body, actor.x + pose.dx * actor.scale + at.x, actor.y + pose.dy + at.y, actor.z + pose.dz * actor.scale + at.z, pose.turn)
    one.ride = { leanX: pose.leanX, leanZ: pose.leanZ, turn: pose.turn }
    // It squashes and stretches with what it rides in, so two toys side by side in a belly never meet.
    one.squash *= pose.squash; one.wide = wide
    toys.push(one)
  }

  // What the gobblers watch: the toy in the jaws, or the claw.
  const watched = game.held >= 0 ? game.bodies[game.held] : hub
  const stand = (actor: Actor) => {
    poseOf(game, actor, pose)
    const shape = shapeOf(actor.id)
    const eyeY = actor.y + (rimHeight(shape) + EYE / 2) * actor.scale
    // A neighbour at the tray with the wrong toy on its tongue is what everyone looks at.
    const odd = actor.role === 'crew' ? game.crew.find((other) => other !== actor && (other.wrongT >= 0 || other.act === 'hold')) : undefined
    const sight = odd ? { x: odd.x, y: odd.y + rimHeight(shapeOf(odd.id)), z: odd.z } : watched
    gobblers.push({
      id: `g${actor.key}`, who: actor.id, shape, x: actor.x + pose.dx * actor.scale, y: actor.y + pose.dy, z: actor.z + pose.dz * actor.scale,
      squash: pose.squash, deep: actor.role !== 'waiting', leanX: pose.leanX, leanZ: pose.leanZ, turn: pose.turn, scale: actor.scale,
      gazeX: pose.looks ? pose.gazeX : clamp((sight.x - actor.x) / 11, -1, 1),
      gazeY: pose.looks ? pose.gazeY : clamp((sight.y - eyeY) / 9 - (sight.z - actor.z) / 30, -1, 1),
      blink: pose.blink, waiting: actor.role === 'waiting' || actor.scale < 0.95, ...faceOf(game, actor),
    })
    // A snack shows in the belly of a gobbler at the tray; the ones who wait are seen from the eyes up.
    // A snack at rest or on the tongue is where its gobbler is at this very moment, however fast the gobbler is
    // being carried.
    if (actor.role !== 'waiting') {
      const snack = actor.snack
      if (snack.mode === 'resting') { const home = game.snackSpot(actor); riding(actor, snack, 10000 + actor.key, { x: home.x, y: home.y + snack.hop * actor.scale, z: home.z }) }
      else if (snack.mode === 'mouth') {
        // On the tongue; and while its gobbler shows it, held up to the rim beside its body.
        const mouth = game.mouthOf(actor), up = actor.act === 'show' ? Math.min(1, actor.actT / 0.12) : actor.act === 'gulp' ? 1 : 0
        riding(actor, snack, 10000 + actor.key, { x: mouth.x, y: mouth.y + SHOWN_AT * up * actor.scale, z: mouth.z })
      }
      else riding(actor, snack, 10000 + actor.key)
    }
    actor.cargo.forEach((body, i) => riding(actor, body, 20000 + actor.key * 16 + i))
  }
  for (const actor of game.crew) {
    stand(actor)
    game.bodies.forEach((body, toy) => {
      const where = game.world.cycle.where[toy]
      const inside = (body.mode === 'resting' && where.at === 'belly' && where.slot === actor.slot) || ((body.mode === 'mouth' || rides(body)) && body.slot === actor.slot)
      if (inside && toy !== game.held) riding(actor, body, game.generation * 100 + toy)
    })
  }
  for (const actor of game.waiting) stand(actor)
  for (const actor of game.leaving) stand(actor)
  // What a gobbler carries off is drawn with it, and not a second time.
  const carried = new Set<Body>()
  for (const actor of game.leaving) for (const body of actor.cargo) carried.add(body)

  game.bodies.forEach((body, toy) => {
    const where = game.world.cycle.where[toy]
    const inside = toy !== game.held && ((body.mode === 'resting' && where.at === 'belly') || body.mode === 'mouth' || (rides(body) && game.crew[body.slot] !== undefined))
    if (inside || carried.has(body)) return
    const into = body.mode === 'flying' && body.landing === 'mouth' ? game.crew[body.slot] : undefined
    if (into) {
      // On its way into a mouth it is drawn more and more where the gobbler has its mouth at this moment, and
      // wholly so by half-way, while it is still well above it: so it lands on the tongue, or on the teeth,
      // however the gobbler is hopping or stretching for it.
      const to = carriedBy(game, into, body), part = Math.min(1, (body.flown / Math.max(1e-6, body.flight)) * 2)
      toys.push(look(game.generation * 100 + toy, body, body.x + (to.x - body.x) * part, body.y + (to.y - body.y) * part, body.z + (to.z - body.z) * part))
      return
    }
    const one = look(game.generation * 100 + toy, body)
    if (toy === game.held) inTheJaws(game, toy, body, one)
    // A toy of a stack that is about to come down teeters where it waits: the higher it stands, the further it
    // slides from side to side over the one under it.
    if (body.wait > 0) one.x += 0.07 * (body.y - TRAY.top) * Math.sin(game.time * 17)
    toys.push(one)
    // A toy in the jaws has no shadow of its own, and neither has one on a crate or behind the parapet.
    if (toy === game.held || body.z < TRAY.z - 0.5) return
    const under = nearestPlace(body.x, body.z)
    const ground = body.mode === 'resting' && where.at === 'tray' ? game.stackTop(where.place, toy) : game.stackTop(under, toy)
    const lift = Math.max(0, body.y - ground)
    shadows.push({ x: body.x, y: ground, z: body.z, r: (body.heavy > 1 ? 3.3 : 2.1) * body.scale, a: Math.max(0.25, 1 - lift / 16) })
  })
  // The shadow of the claw lies straight under the trolley and the swing never moves it: it is where the claw,
  // or the toy in its jaws, will land. Over the tray it lies on the tray or on the toy under it.
  if (claw.z > TRAY.z - 0.5 && Math.abs(claw.x) < 15.5) {
    const below = nearestPlace(claw.x, claw.z)
    const held = game.held >= 0 ? game.bodies[game.held] : null
    // A claw that waits above a toy has its shadow tighten on the toy; above bare studs its shadow breathes.
    const waits = game.waitsAbove === 'toy' ? 0.62 : game.waitsAbove === 'studs' ? 1 + 0.22 * Math.sin(game.time * 3.4) : 1
    shadows.push({ x: claw.x, y: game.stackTop(below), z: claw.z, r: (held ? (held.heavy > 1 ? 3.1 : 2) : 1.7) * waits, a: game.waitsAbove === 'toy' ? 0.95 : 0.75 })
  } else {
    // Off the tray it lies on top of the thing the trolley stands over, as wide as that thing has room for.
    const on = game.under()
    if (on) shadows.push({ x: claw.x, y: on.y, z: claw.z, r: Math.min(on.most, game.held >= 0 ? 2 : 1.7), a: 0.9 })
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
  const swing = knobSwing(game)
  // Left alone and holding nothing, the claw is never quite still. Holding anything, it is: a knob or a toy
  // between its teeth has a hair of room and no more.
  const idling = resting && game.held < 0 && game.lifted < 0 && claw.load === 0
  return {
    toys, gobblers, shadows, glows, hand: ghost, gate: game.gateShake, seconds: game.time,
    watcher: watching(game, watched),
    carts: game.crates.map((crate) => { const at = crateSpot(crate.which, game.crates.length); return { which: crate.which, x: at.x + crate.away * AWAY * (at.x < 0 ? -1 : 1), z: at.z } }),
    crates: game.crates.map((crate) => ({
      key: `${crate.from}-${crate.seed}-${crate.toys.length}-${crate.crews.length}`, which: crate.which, toys: crate.toys, places: crate.places, crews: crate.crews,
      // A crate that waits rocks a little on its foot: its riders cannot sit still.
      // On the ledge it leans out of the way of a swing, away from the middle, and stands up on its cart to see
      // what waits above it.
      x: crate.x + crate.away * AWAY * (crate.x < 0 ? -1 : 1) + (crate.leans > 0 ? 0.7 * Math.sin((crate.leans / LEANS_FOR) * Math.PI) * (crate.x < 0 ? -1 : 1) : 0),
      y: crate.y + (crate.carried || game.scene ? 0 : 0.07 * Math.abs(Math.sin(game.time * 2.6 + crate.which))) + (crate.peers >= 0 ? 0.5 * Math.sin((crate.peers / PEERS_FOR) * Math.PI) * (0.6 + 0.4 * Math.abs(Math.sin(crate.peers * 9))) : 0),
      z: crate.z, tip: crate.tip,
    })),
    // Left alone, the claw is never quite still: the cable sways a hair and the jaws work a little.
    claw: {
      x: claw.x, z: claw.z, length: claw.length,
      swingX: claw.swingX + (idling ? 0.012 * Math.sin(game.time * 1.3) : 0), swingZ: claw.swingZ + (idling ? 0.008 * Math.sin(game.time * 0.9 + 1) : 0),
      open: claw.open + (idling ? 0.06 * Math.sin(game.time * 1.1) : 0), squash: claw.squash,
      shiftX: swing.x, shiftZ: swing.z, turn: swing.turn,
    },
  }
}
