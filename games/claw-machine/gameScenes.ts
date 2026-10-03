import { MINI } from './belly'
import { airTime, jolt, newBody, toss } from './bodies'
import { gripFor } from './clawBuild'
import type { Deed } from './deeds'
import { Game, KNOB_HOLD, newActor, type Actor } from './game'
import { rimHeight } from './gobblerBuild'
import { crewGoesBy, shapeOf } from './gobblers'
import { RIDER, crewSpot, deckSpots, deckTop, handleSpot, riderSpots, waitingSpot, type Spot } from './layout'
import { actSeconds } from './motion'
import { CRATE, SHELF, TRAY, TRAY_DEPTH } from './places'
import { chew, nextLeg, react } from './react'
import { Scene, type Beat } from './scene'
import { bellyOf, crewArrives, crewNow, type World } from './world'

// The four short scenes (ART.md, "The scenes"), as timed beats filled in from
// the state of play. The outcome of a scene is in the rules before it starts,
// and it is saved at once when it starts, so a put-away at any moment of a
// scene loses nothing and nothing replays on load. A scene only shows the
// world getting to where the rules already have it; when it ends, by itself
// or by a touch, everything is set at rest there.

/** How long a gobbler takes to show its snack and swallow it, in a first showing. */
const SHOW_EACH = 1.5

function scene(game: Game, beats: Beat[]): void {
  const playing = new Scene(beats)
  // Whatever the scene changes in the saved state was changed by the deed that caused it; it is saved now.
  playing.start(game.time, () => { game.save = 'now' })
  game.scene = playing
}

/** A cue: something that happens at a moment. A touch that ends the scene skips it, and the world is then set at rest. */
function cue(game: Game, at: number, act: () => void): Beat {
  return { at, lasts: 0, play: () => { if (!game.skipping) act() } }
}

/** A stretch over which something moves, given its progress. */
function over(game: Game, at: number, lasts: number, move: (progress: number) => void): Beat {
  return { at, lasts, play: (progress) => { if (!game.skipping) move(progress) } }
}

const walk = (actor: Actor, to: Spot, seconds: number, arc = 0, scaleTo = 1, gone = false) => {
  actor.walk = { from: { x: actor.x, y: actor.y, z: actor.z }, to, seconds, t: 0, arc, scaleFrom: actor.scale, scaleTo, gone }
}

/**
 * The first showing: each gobbler of a crew that goes by an attribute not yet
 * shown holds its snack up beside itself, looks from one to the other, and
 * gulps it. What it saves when it starts: the mark that this attribute has
 * been shown. Returns no beats when the attribute has been shown before.
 */
function showing(game: Game, from: number): Beat[] {
  const { showing: plays } = crewArrives(game.world)
  if (!plays) return []
  // The snacks start on the tongues, held up at the rim, full size.
  for (const actor of game.crew) actor.snack.mode = 'mouth'
  const beats: Beat[] = []
  game.crew.forEach((actor, i) => {
    const at = from + i * SHOW_EACH
    beats.push(cue(game, at, () => { game.startAct(actor, 'show'); game.say({ type: 'show', who: actor.id }) }))
    beats.push(cue(game, at + actSeconds(actor.id, 'show') * 0.8, () => {
      game.startAct(actor, 'gulp', 1)
      game.say({ type: 'gulp', heavy: 1, who: actor.id })
      toss(actor.snack, { ...game.snackSpot(actor), seconds: 0.26, scale: MINI, landing: 'belly' })
    }))
  })
  beats.push(cue(game, from + game.crew.length * SHOW_EACH, () => {}))
  return beats
}

/** How long a crew takes to shuffle off, and how far to the side it goes to be out of sight. */
const OFF_SECONDS = 1.3
const OFF = 44

/**
 * The tip-out: the crew at the tray tips the toys back onto it, in the order
 * they went in, and goes; the crew that waited hops down and lines up. What
 * it saves when it starts: where every toy stands (back on the tray), which
 * crew is at the tray, and the first tries begun again.
 */
export function tipOut(game: Game, tipped: readonly number[]): void {
  const world = game.world, cycle = world.cycle
  const old = game.crew, first = cycle.toys[0]
  // The toys stay in the bellies they were in until each is tipped.
  for (const toy of tipped) game.bodies[toy].mode = 'parked'
  for (const actor of old) actor.role = 'leaving'
  game.leaving = old
  const crew = crewNow(world)
  game.crew = game.waiting
  game.crew.forEach((actor) => { actor.role = 'crew' })
  const next = cycle.crews[cycle.sort + 1] ?? []
  game.waiting = next.map((id, slot) => newActor(game.mint(), id, slot, 'waiting', waitingSpot(slot, next.length), first))
  // The crew after next comes along the shelf from the side once the others have hopped down.
  for (const actor of game.waiting) actor.x += OFF
  const beats: Beat[] = []
  let at = 0.2, nth = 0
  for (const actor of old) {
    const mine = tipped.filter((toy) => Math.abs(game.bodies[toy].x - actor.x) < 6.6)
    const start = at, rim = actor.y + rimHeight(shapeOf(actor.id))
    beats.push(cue(game, start, () => game.startAct(actor, 'tip')))
    mine.forEach((toy, j) => {
      const n = nth++
      beats.push(cue(game, start + 0.3 + j * 0.14, () => {
        const body = game.bodies[toy], home = game.spotOf(toy)
        game.say({ type: 'tip', nth: n })
        // Up out of the mouth, growing as it comes, and over the teeth onto the tray.
        const mouth = { x: actor.x, y: rim + 0.6, z: actor.z, seconds: 0.16, scale: 0.8, landing: 'again' as const }
        game.flights.set(body, mouth)
        body.legs = [{ x: home.x, y: home.y, z: home.z, seconds: airTime(mouth.y, home.y, mouth.y + 3.4), scale: 1, landing: 'stand' }]
        toss(body, mouth)
      }))
    })
    at += 0.5 + mine.length * 0.14
  }
  // The old crew shuffles off to one side; when it has gone the new one hops down, and the crew after that
  // comes along the shelf.
  const off = at + 0.5
  beats.push(cue(game, off, () => { game.say({ type: 'waddle' }); for (const actor of old) walk(actor, { x: actor.x - OFF, y: actor.y, z: actor.z }, OFF_SECONDS, 0, 1, true) }))
  const hop = off + OFF_SECONDS * 0.75
  game.crew.forEach((actor, k) => beats.push(cue(game, hop + k * 0.3, () => { game.say({ type: 'hop-in', nth: k }); walk(actor, crewSpot(actor.slot, crew.length), 0.7, 7) })))
  game.waiting.forEach((actor) => beats.push(cue(game, hop + 0.6, () => walk(actor, waitingSpot(actor.slot, next.length), 1.0))))
  const landed = hop + game.crew.length * 0.3 + 0.9
  beats.push(cue(game, landed, () => {}))
  scene(game, [...beats, ...showing(game, landed)])
}

/**
 * The ending: after half a second of quiet each gobbler drums on its belly
 * and its toys ring in the order they went in, then all burp at once, then
 * the crates slide onto the ledge. What it saves when it starts: that the
 * cycle has ended, the position as it now stands, and the crates.
 */
export function ending(game: Game): void {
  const cycle = game.world.cycle
  game.arrangeCrates()
  for (const crate of game.crates) crate.away = 1
  const total = Math.max(1, cycle.toys.length)
  const gap = Math.min(0.5, Math.max(0.3, 3.2 / total))
  const beats: Beat[] = []
  let at = 0.5
  game.crew.forEach((actor) => {
    const mine = bellyOf(cycle, actor.slot)
    const start = at, lasts = 0.4 + mine.length * gap
    beats.push(cue(game, start, () => { game.startAct(actor, 'drum', Math.max(1, mine.length)); actor.actFor = lasts }))
    mine.forEach((toy, j) => beats.push(cue(game, start + 0.2 + j * gap, () => {
      const body = game.bodies[toy]
      game.say({ type: 'ring', size: body.toy.size, kind: body.toy.kind, nth: j })
      jolt(body, 3, 0, 1)
    })))
    at += lasts + 0.1
  })
  game.crew.forEach((actor, i) => beats.push(cue(game, at + 0.15, () => { game.startAct(actor, 'burp'); game.say({ type: 'burp', nth: i }) })))
  beats.push(cue(game, at + 1.0, () => game.say({ type: 'slide-in' })))
  beats.push(over(game, at + 1.0, 1.1, (progress) => { const ease = progress * (2 - progress); for (const crate of game.crates) crate.away = 1 - ease }))
  scene(game, beats)
}

/**
 * The delivery: the old crew goes off with its bellies full; the claw hoists
 * the crate it was put on over the tray, the crew that rode on it hops down
 * and lines up, and the crate tips and its toys rain onto their studs; then
 * the claw sets the crate back and both crates slide away. The next crew of
 * the load hops off onto the shelf to wait. What it saves when it starts: the
 * new cycle whole (its load, where each toy stands, its crews), that no cycle
 * is ended, and no crates.
 */
export function delivery(game: Game, which: number): void {
  const world = game.world, cycle = world.cycle, first = cycle.toys[0]
  const old = game.crew, oldBodies = game.bodies, claw = game.claw
  const crate = game.crates[Math.min(which, game.crates.length - 1)]
  const others = game.crates.filter((one) => one !== crate)
  const home = { x: crate.x, z: crate.z }
  // Each old gobbler takes what is in its belly with it.
  for (const actor of old) {
    actor.role = 'leaving'
    actor.cargo = oldBodies.filter((body) => Math.abs(body.x - actor.x) < 6.6 && body.z < 0)
    actor.cargoAt = actor.cargo.map((body) => ({ x: body.x - actor.x, y: body.y - actor.y, z: body.z - actor.z }))
  }
  game.leaving = old
  game.held = -1
  game.plans.clear()
  game.generation++
  // The new load rides on the deck of its crate, small, and the crews on their rows behind it, until they leave it.
  const deck = deckSpots(cycle.toys), rows = riderSpots(cycle.crews)
  const top = () => crate.y + deckTop(crate.which)
  game.bodies = cycle.toys.map((toy) => { const body = newBody(toy); body.mode = 'parked'; body.scale = MINI; return body })
  const crew = crewNow(world)
  game.crew = crew.map((id, slot) => newActor(game.mint(), id, slot, 'crew', crewSpot(slot, crew.length), first))
  const next = cycle.crews[1] ?? []
  game.waiting = next.map((id, slot) => newActor(game.mint(), id, slot, 'waiting', waitingSpot(slot, next.length), first))
  const riding = new Set<Actor>([...game.crew, ...game.waiting])
  for (const actor of riding) actor.scale = RIDER
  const aboard = new Set(game.bodies)
  // Whatever is still aboard is carried along with the crate, wherever the claw takes it.
  const carry = () => {
    game.bodies.forEach((body, i) => { if (aboard.has(body)) { body.x = crate.x + deck[i].x; body.y = top() + deck[i].y; body.z = crate.z + deck[i].z } })
    game.crew.forEach((actor, i) => { if (riding.has(actor)) { actor.x = crate.x + rows[0][i].x; actor.y = top() + rows[0][i].y; actor.z = crate.z + rows[0][i].z } })
    game.waiting.forEach((actor, i) => { if (riding.has(actor)) { actor.x = crate.x + rows[1][i].x; actor.y = top() + rows[1][i].y; actor.z = crate.z + rows[1][i].z } })
  }
  carry()
  // The riders are drawn as these gobblers from here on, so the crate carries none of its own.
  crate.crews = []; crate.toys = []
  // The claw holds the crate by the knob on its arch and lifts it clear of the gate and of whoever is leaving.
  const handle = handleSpot()
  claw.load = 2; claw.grip = gripFor(0.8)
  crate.carried = true
  game.hoist = 8 + deckTop(crate.which) + handle.y + KNOB_HOLD
  const beats: Beat[] = []
  beats.push(cue(game, 0, () => { game.say({ type: 'groan' }); if (old.length > 0) game.say({ type: 'waddle' }); for (const actor of old) walk(actor, { x: actor.x - OFF, y: actor.y, z: actor.z }, OFF_SECONDS, 0, 1, true) }))
  // The crew that waits next hops off onto the shelf before the crate goes.
  game.waiting.forEach((actor, k) => beats.push(cue(game, 0.1 + k * 0.2, () => { riding.delete(actor); walk(actor, waitingSpot(actor.slot, next.length), 0.5, 2.5) })))
  // Over the tray.
  beats.push(cue(game, 0.9, () => { claw.targetX = 0; claw.targetZ = TRAY.z + TRAY_DEPTH / 2 + handle.z }))
  // Its crew hops down from it onto the step and lines up, growing as it comes.
  const arrived = 2.1
  game.crew.forEach((actor, k) => beats.push(cue(game, arrived + k * 0.28, () => { riding.delete(actor); game.say({ type: 'hop-in', nth: k }); game.say({ type: 'grow' }); walk(actor, crewSpot(actor.slot, crew.length), 0.6, 3) })))
  // It tips, and the toys rain onto their studs.
  const tips = arrived + game.crew.length * 0.28 + 0.5
  beats.push(over(game, tips, 0.45, (progress) => { crate.tip = progress * progress * (3 - 2 * progress) }))
  beats.push(cue(game, tips + 0.2, () => game.say({ type: 'pour' })))
  game.bodies.forEach((body, toy) => beats.push(cue(game, tips + 0.3 + toy * 0.07, () => {
    aboard.delete(body)
    const to = game.spotOf(toy)
    // Off the front of the tipped deck and down.
    body.y = Math.max(body.y, crate.y + 2); body.z = crate.z + CRATE.depth / 2 + 1
    toss(body, { x: to.x, y: to.y, z: to.z, seconds: airTime(body.y, to.y, body.y + 0.4), scale: 1, landing: 'stand' })
  })))
  // Back to the ledge, set down, and both crates slide away.
  const emptied = tips + 0.3 + game.bodies.length * 0.07 + 0.5
  beats.push(over(game, emptied, 0.35, (progress) => { crate.tip = 1 - progress * progress * (3 - 2 * progress) }))
  beats.push(cue(game, emptied + 0.2, () => { claw.targetX = home.x; claw.targetZ = home.z + handle.z }))
  const back = emptied + 1.3
  beats.push(cue(game, back, () => { game.hoist = SHELF.top + deckTop(crate.which) + handle.y + KNOB_HOLD }))
  beats.push(cue(game, back + 0.5, () => { crate.carried = false; crate.x = home.x; crate.y = SHELF.top; crate.z = home.z; game.hoist = null; claw.load = 0; claw.grip = 0; game.say({ type: 'thud', who: 'big' }) }))
  beats.push(over(game, back + 0.6, 0.8, (progress) => { const ease = progress * progress; crate.away = ease; for (const other of others) other.away = ease }))
  const landed = back + 1.5
  beats.push(cue(game, landed, () => {}))
  // What is aboard is carried on every frame until the crate is back, ahead of the cues that take things off it.
  beats.unshift(over(game, 0, back + 0.5, carry))
  scene(game, [...beats, ...showing(game, landed)])
}

/** A sort is done and another crew waits: they notice, and that is all. Nothing starts until the child's touch. */
function sortDone(game: Game): void {
  game.waiting.forEach((actor) => game.startAct(actor, 'stare'))
  game.say({ type: 'stare' })
}

/** A game on a world, with its reactions and its scenes wired in. */
export function newGame(world: World): Game {
  return install(new Game(world))
}

function install(game: Game): Game {
  game.onDeed = (deed: Deed) => {
    react(game, deed)
    if (deed.type === 'next-crew') { game.say({ type: 'clank' }); game.gateShake = 1; tipOut(game, deed.tipped) }
    else if (deed.type === 'take-crate') { game.say({ type: 'clank' }); delivery(game, deed.which) }
    if (deed.type !== 'grab' && deed.type !== 'bonk' && deed.type !== 'lift-gobbler' && deed.type !== 'bell') game.save = game.save === 'now' ? 'now' : 'soon'
  }
  game.onLeg = (body, toy) => nextLeg(game, body, toy, game.causes.get(body))
  game.chew = (body, toy) => chew(game, body, toy, (ends) => (ends === 'cycle' ? ending(game) : sortDone(game)))
  return game
}

/** The attribute the crew at the tray goes by, or null on a bare tray. */
export function goesBy(game: Game) {
  const crew = crewNow(game.world)
  return crew.length > 0 ? crewGoesBy(crew) : null
}
