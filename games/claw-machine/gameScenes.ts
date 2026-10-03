import { MINI } from './belly'
import { jolt, newBody, toss } from './bodies'
import type { Deed } from './deeds'
import { Game, newActor, type Actor } from './game'
import { crewGoesBy } from './gobblers'
import { RIDER, crewSpot, deckSpots, deckTop, riderSpots, waitingSpot, type Spot } from './layout'
import { actSeconds } from './motion'
import { SHELF } from './places'
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
  const beats: Beat[] = []
  let at = 0.2, nth = 0
  for (const actor of old) {
    const mine = tipped.filter((toy) => Math.abs(game.bodies[toy].x - actor.x) < 6.6)
    const start = at
    beats.push(cue(game, start, () => game.startAct(actor, 'tip')))
    mine.forEach((toy, j) => {
      const n = nth++
      beats.push(cue(game, start + 0.3 + j * 0.13, () => {
        const body = game.bodies[toy], home = game.spotOf(toy)
        game.say({ type: 'tip', nth: n })
        toss(body, { x: home.x, y: home.y, z: home.z, seconds: 0.42, scale: 1, landing: 'stand' })
      }))
    })
    at += 0.5 + mine.length * 0.13
  }
  // The old crew shuffles off one side while the new one hops down on the other.
  beats.push(cue(game, at, () => { game.say({ type: 'waddle' }); for (const actor of old) walk(actor, { x: actor.x - 44, y: actor.y, z: actor.z }, 1.4, 0, 1, true) }))
  game.crew.forEach((actor, k) => beats.push(cue(game, at + 0.3 + k * 0.3, () => { game.say({ type: 'hop-in', nth: k }); walk(actor, crewSpot(actor.slot, crew.length), 0.6, 5) })))
  const landed = at + 0.3 + game.crew.length * 0.3 + 0.7
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
  for (const crate of game.crates) crate.sink = 1
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
      jolt(body, 4.5, 0, 1)
    })))
    at += lasts + 0.1
  })
  game.crew.forEach((actor, i) => beats.push(cue(game, at + 0.15, () => { game.startAct(actor, 'burp'); game.say({ type: 'burp', nth: i }) })))
  beats.push(cue(game, at + 1.0, () => game.say({ type: 'slide-in' })))
  beats.push(over(game, at + 1.0, 1.1, (progress) => { const ease = progress * progress * (3 - 2 * progress); for (const crate of game.crates) crate.sink = 1 - ease }))
  scene(game, beats)
}

/**
 * The delivery: the old crew goes off with its bellies full, the crate the
 * claw was put on tips its load onto the tray, and its crews hop down: the
 * first to the tray, the next to wait on the ledge. What it saves when it
 * starts: the new cycle whole (its load, where each toy stands, its crews),
 * that no cycle is ended, and no crates.
 */
export function delivery(game: Game, which: number): void {
  const world = game.world, cycle = world.cycle, first = cycle.toys[0]
  const old = game.crew, oldBodies = game.bodies
  const crate = game.crates[Math.min(which, game.crates.length - 1)]
  const others = game.crates.filter((one) => one !== crate)
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
  // The new load starts on the deck of its crate, small, and the crews on their rows behind it.
  const deck = deckSpots(cycle.toys), top = SHELF.top + deckTop(crate.which)
  game.bodies = cycle.toys.map((toy, i) => {
    const body = newBody(toy)
    body.mode = 'parked'; body.scale = MINI
    body.x = crate.x + deck[i].x; body.y = top + deck[i].y; body.z = crate.z + deck[i].z
    return body
  })
  const rows = riderSpots(cycle.crews)
  const ride = (actor: Actor, row: number, i: number) => { actor.x = crate.x + rows[row][i].x; actor.y = top + rows[row][i].y; actor.z = crate.z + rows[row][i].z; actor.scale = RIDER }
  const crew = crewNow(world)
  game.crew = crew.map((id, slot) => newActor(game.mint(), id, slot, 'crew', crewSpot(slot, crew.length), first))
  game.crew.forEach((actor, i) => ride(actor, 0, i))
  const next = cycle.crews[1] ?? []
  game.waiting = next.map((id, slot) => newActor(game.mint(), id, slot, 'waiting', waitingSpot(slot, next.length), first))
  game.waiting.forEach((actor, i) => ride(actor, 1, i))
  // The riders are drawn as these gobblers from here on, so the crate carries none of its own.
  crate.crews = []; crate.toys = []
  const beats: Beat[] = []
  beats.push(cue(game, 0, () => { game.say({ type: 'waddle' }); for (const actor of old) walk(actor, { x: actor.x - 44, y: actor.y, z: actor.z }, 1.4, 0, 1, true) }))
  beats.push(over(game, 0.2, 0.5, (progress) => { crate.tip = progress * progress * (3 - 2 * progress) }))
  beats.push(cue(game, 0.5, () => game.say({ type: 'pour' })))
  game.bodies.forEach((body, toy) => beats.push(cue(game, 0.55 + toy * 0.08, () => {
    const home = game.spotOf(toy)
    toss(body, { x: home.x, y: home.y, z: home.z, seconds: 0.55, scale: 1, landing: 'stand' })
  })))
  const poured = 0.55 + game.bodies.length * 0.08 + 0.3
  game.crew.forEach((actor, k) => beats.push(cue(game, poured + k * 0.3, () => { game.say({ type: 'hop-in', nth: k }); game.say({ type: 'grow' }); walk(actor, crewSpot(actor.slot, crew.length), 0.7, 5) })))
  game.waiting.forEach((actor, k) => beats.push(cue(game, poured + 0.15 + k * 0.3, () => walk(actor, waitingSpot(actor.slot, next.length), 0.6, 3))))
  const down = poured + Math.max(game.crew.length, game.waiting.length) * 0.3 + 0.4
  beats.push(over(game, down, 0.7, (progress) => { const ease = progress * progress; crate.tip = 1 - ease; crate.sink = ease; for (const other of others) other.sink = ease }))
  const landed = down + 0.8
  beats.push(cue(game, landed, () => {}))
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
