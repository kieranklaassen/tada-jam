import { MINI } from './belly'
import { FALL, airTime, jolt, newBody, toss } from './bodies'
import { toySpan } from './builds'
import { KNOB_HALF, gripFor } from './clawBuild'
import type { Deed } from './deeds'
import { AIR, Game, KNOB_HOLD, newActor, type Actor } from './game'
import { SHOWN_AT } from './gamePicture'
import { OVER_ITS_BROWS, rimHeight } from './gobblerBuild'
import { crewGoesBy, shapeOf } from './gobblers'
import { BED, CRATE_STANDS, ON_DECK, RIDER, TIP, crewSpot, deckSpots, deckTop, handleSpot, riderSpots, tipped, waitingSpot, type Spot } from './layout'
import { actSeconds } from './motion'
import { CRATE, TRAY, TRAY_DEPTH } from './places'
import { DOWN_THE_THROAT, chew, clearTop, nextLeg, react } from './react'
import { Scene, type Beat } from './scene'
import { bellyOf, crewArrives, crewNow, type World } from './world'

// The four short scenes (ART.md, "The scenes"), as timed beats filled in from
// the state of play. The outcome of a scene is in the rules before it starts,
// and it is saved at once when it starts, so a put-away at any moment of a
// scene loses nothing and nothing replays on load. A scene only shows the
// world getting to where the rules already have it; when it ends, by itself
// or by a touch, everything is set at rest there.

/** How long a gobbler takes to show its snack and swallow it, in a first showing. */
const SHOW_EACH = 2

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
  // The snacks start on the tongues, full size; each is held up to the rim as its gobbler shows it.
  for (const actor of game.crew) actor.snack.mode = 'mouth'
  const beats: Beat[] = []
  game.crew.forEach((actor, i) => {
    const at = from + i * SHOW_EACH
    beats.push(cue(game, at, () => { game.startAct(actor, 'show'); game.say({ type: 'show', who: actor.id }) }))
    const gulp = at + actSeconds(actor.id, 'show') * 0.8
    beats.push(cue(game, gulp, () => { game.startAct(actor, 'gulp', 1); game.say({ type: 'gulp', heavy: 1, who: actor.id }) }))
    // The swallow: chewed small where it lies on the tongue, down the throat, and up to its size and its place
    // in the belly.
    const snack = actor.snack
    beats.push(over(game, gulp + 0.12, 0.5, (progress) => {
      const mouth = game.mouthOf(actor), home = game.snackSpot(actor)
      snack.mode = 'parked'
      // From where it was held up at the rim it comes down onto the tongue as it is chewed small.
      if (progress < 0.35) { snack.x = mouth.x; snack.y = mouth.y + SHOWN_AT * (1 - progress / 0.35) * actor.scale; snack.z = mouth.z; snack.scale = (1 - (1 - DOWN_THE_THROAT) * (progress / 0.35)) * actor.scale; return }
      if (progress < 0.55) { snack.x = mouth.x; snack.y = mouth.y - 0.75 * ((progress - 0.35) / 0.2); snack.z = mouth.z; snack.scale = DOWN_THE_THROAT * actor.scale; return }
      const u = (progress - 0.55) / 0.45
      snack.x = mouth.x + (home.x - mouth.x) * u; snack.y = mouth.y - 0.75 + (home.y - (mouth.y - 0.75)) * u; snack.z = mouth.z + (home.z - mouth.z) * u
      snack.scale = (DOWN_THE_THROAT + (MINI - DOWN_THE_THROAT) * u) * actor.scale
      if (progress >= 1) { snack.mode = 'resting'; game.say({ type: 'plink', nth: 0 }) }
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
  // The toys stay in the bellies they were in, and ride them, until each is tipped.
  for (const toy of tipped) game.bodies[toy].mode = 'parked'
  for (const actor of old) {
    actor.role = 'leaving'
    actor.cargo = tipped.filter((toy) => Math.abs(game.bodies[toy].x - actor.x) < 6.6).map((toy) => game.bodies[toy])
    actor.cargoAt = actor.cargo.map((body) => ({ x: body.x - actor.x, y: body.y - actor.y, z: body.z - actor.z }))
  }
  game.leaving = old
  const crew = crewNow(world)
  game.crew = game.waiting
  game.crew.forEach((actor) => { actor.role = 'crew' })
  const next = cycle.crews[cycle.sort + 1] ?? []
  game.waiting = next.map((id, slot) => newActor(game.mint(), id, slot, 'waiting', waitingSpot(slot, next.length), first))
  // The crew after next comes along the shelf from the side once the others have hopped down.
  for (const actor of game.waiting) actor.x += OFF
  // The claw, which hooked the gate, goes back over the tray: the crew that hops in comes over the gate.
  game.claw.targetX = 0; game.claw.targetZ = TRAY.z + TRAY_DEPTH / 2
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
        const held = actor.cargo.indexOf(body)
        if (held >= 0) { actor.cargo.splice(held, 1); actor.cargoAt.splice(held, 1) }
        // Chewed small again, up the throat, out of the mouth growing as it comes, and over the teeth onto the tray.
        const tongue = game.mouthOf(actor).y
        const under = { x: actor.x, y: tongue - 0.75, z: actor.z, seconds: 0.12, scale: DOWN_THE_THROAT, landing: 'again' as const, fixed: true }
        const on = { x: actor.x, y: tongue, z: actor.z, seconds: 0.08, scale: DOWN_THE_THROAT, landing: 'again' as const, fixed: true }
        // Up to over the tops of its eyes, still small, and from there over them onto the tray, growing late.
        const above = { x: actor.x, y: rim + OVER_ITS_BROWS + 0.3, z: actor.z, seconds: 0.2, scale: 0.5, landing: 'again' as const, fixed: true }
        const peak = clearTop(game, toy, above, home, 1.5)
        game.flights.set(body, under)
        body.legs = [on, above, { x: home.x, y: home.y, z: home.z, seconds: airTime(above.y, home.y, peak), scale: 1, landing: 'stand' }]
        toss(body, under)
      }))
    })
    at += 0.5 + mine.length * 0.14
  }
  // The old crew shuffles off to one side; when it has gone the new one hops down, and the crew after that
  // comes along the shelf.
  const off = at + 0.5
  beats.push(cue(game, off, () => { game.say({ type: 'waddle' }); for (const actor of old) walk(actor, { x: actor.x - OFF, y: actor.y, z: actor.z }, OFF_SECONDS, 0, 1, true) }))
  const hop = off + OFF_SECONDS * 0.75
  game.crew.forEach((actor, k) => beats.push(cue(game, hop + k * 0.3, () => { game.say({ type: 'hop-in', nth: k }); walk(actor, crewSpot(actor.slot, crew.length), 0.8, 9.5) })))
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
  // A claw sent to the ledge before this began lands on a ledge that was bare when it was sent.
  game.sentBeforeTheEnding = game.claw.dropOnArrival || game.claw.phase === 'dropping'
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
  // They settle for a moment, and then the crates come.
  beats.push(cue(game, at + 1.4, () => game.say({ type: 'slide-in' })))
  beats.push(over(game, at + 1.4, 1.1, (progress) => { const ease = progress * (2 - progress); for (const crate of game.crates) crate.away = 1 - ease }))
  scene(game, beats)
}

/**
 * The delivery: the old crew goes off with its bellies full; the claw hoists
 * the crate it was put on, with its load and its riders on it, to the back of
 * the tray, over the step the old crew has left; the bed of the crate tips
 * and the toys rain onto their studs, the front row first and furthest; then
 * the claw sets the crate back, the crew that rode on it hops down over the
 * gate and lines up, and both crates slide away. The next crew of the load
 * hops off onto the shelf to wait. The crate is over the step only while no
 * one stands on it, and it stays level: only its bed tips, so nothing on it
 * sweeps through the claw that holds it. What it saves when it starts: the
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
  // The new load rides on the bed of its crate, small, and the crews on their rows behind it, until they leave it.
  const places = cycle.where.map((where, toy) => (where.at === 'tray' ? where.place : toy))
  const deck = deckSpots(cycle.toys, places), rows = riderSpots(cycle.crews)
  game.bodies = cycle.toys.map((toy) => { const body = newBody(toy); body.mode = 'parked'; body.scale = ON_DECK; return body })
  const crew = crewNow(world)
  game.crew = crew.map((id, slot) => newActor(game.mint(), id, slot, 'crew', crewSpot(slot, crew.length), first))
  const next = cycle.crews[1] ?? []
  game.waiting = next.map((id, slot) => newActor(game.mint(), id, slot, 'waiting', waitingSpot(slot, next.length), first))
  const riding = new Set<Actor>([...game.crew, ...game.waiting])
  for (const actor of riding) actor.scale = RIDER
  const aboard = new Set(game.bodies)
  // How far each toy has slid down the tipped bed, 0 to 1: at 1 it is out past the front edge, in the air.
  const slid = game.bodies.map(() => 0)
  const ease = (t: number) => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u) }
  const edge = (toy: number) => BED.front + (toySpan(cycle.toys[toy]).depth * ON_DECK) / 2 + OFF_THE_EDGE
  // Whatever is still aboard is carried along with the crate, wherever the claw takes it; the load tips with the bed.
  const carry = () => {
    const top = crate.y + deckTop(crate.which)
    game.bodies.forEach((body, i) => {
      if (!aboard.has(body)) return
      const at = tipped(deck[i].y + AIR, deck[i].z + (edge(i) - deck[i].z) * ease(slid[i]), crate.tip)
      body.x = crate.x + deck[i].x; body.y = top + at.y; body.z = crate.z + at.z; body.leanZ = -crate.tip * TIP
    })
    const seat = (actor: Actor, spot: Spot) => { if (riding.has(actor)) { actor.x = crate.x + spot.x; actor.y = top + spot.y; actor.z = crate.z + spot.z } }
    game.crew.forEach((actor, i) => seat(actor, rows[0][i]))
    game.waiting.forEach((actor, i) => seat(actor, rows[1][i]))
  }
  carry()
  // The riders are drawn as these gobblers from here on, so the crate carries none of its own.
  crate.crews = []; crate.toys = []; crate.places = []
  // The claw holds the crate by the knob on its arch and lifts it clear of the gate.
  const handle = handleSpot()
  // A crate is so heavy that the cable hangs plumb under it: it never swings off the knob it hangs by.
  claw.load = 3; claw.grip = gripFor(KNOB_HALF)
  crate.carried = true
  game.hoist = CARRIED_AT + deckTop(crate.which) + handle.y + KNOB_HOLD
  const beats: Beat[] = []
  beats.push(cue(game, 0, () => { game.say({ type: 'groan' }); if (old.length > 0) game.say({ type: 'waddle' }); for (const actor of old) walk(actor, { x: actor.x - OFF, y: actor.y, z: actor.z }, OFF_SECONDS, 0, 1, true) }))
  // Their bellies rattle as they go.
  if (old.some((actor) => actor.cargo.length > 0)) for (const at of [0.1, 0.5, 0.9]) beats.push(cue(game, at, () => game.say({ type: 'rattle', speed: 14 })))
  // To the back of the tray, over the step, once the old crew is off it: the front of the crate just over the rim.
  beats.push(cue(game, 0.9, () => { claw.targetX = 0; claw.targetZ = TRAY.z - POURS_FROM - CRATE.depth / 2 + handle.z }))
  // Once it is past the gate it comes down low over the empty step, so that the claw that holds it and the crew
  // that rides it stay in sight while it pours.
  beats.push(cue(game, 1.45, () => { game.hoist = POURS_AT + deckTop(crate.which) + handle.y + KNOB_HOLD }))
  // Its bed tips, and the toys rain onto their studs: the front row of the bed first, then the row behind it.
  const tips = 1.95
  beats.push(over(game, tips, 0.45, (progress) => { crate.tip = Math.max(0.001, ease(progress)) }))
  beats.push(cue(game, tips + 0.2, () => game.say({ type: 'pour' })))
  // Row by row from the front, and in a row whoever has furthest to go sideways first: so a toy that is on its way
  // never moves into its neighbour that has not left yet.
  // (It pours from the middle of the tray, wherever on the ledge it waited.)
  const sideways = (toy: number) => Math.abs(game.spotOf(toy).x - deck[toy].x)
  const order = game.bodies.map((_, toy) => toy).sort((a, b) => deck[b].z - deck[a].z || sideways(b) - sideways(a))
  let leaves = tips + 0.3, lastRow = order.length > 0 ? deck[order[0]].z : 0
  for (const toy of order) {
    const body = game.bodies[toy]
    // The row behind waits until the row in front is off the bed.
    if (deck[toy].z !== lastRow) { leaves += ROW_WAITS; lastRow = deck[toy].z }
    beats.push(over(game, leaves, SLIDE, (progress) => { slid[toy] = progress }))
    beats.push(cue(game, leaves + SLIDE, () => {
      aboard.delete(body)
      // Off the edge and down onto its own stud, growing as it falls: it is never thrown up or back.
      const to = game.spotOf(toy)
      game.flights.delete(body)
      toss(body, { x: to.x, y: to.y, z: to.z, seconds: Math.sqrt((2 * Math.max(0.5, body.y - to.y)) / FALL), scale: 1, landing: 'stand' })
    }))
    leaves += 0.07
  }
  // The bed comes down; back to the ledge, set down where it comes to rest, and the claw goes back over the tray.
  const emptied = leaves + SLIDE + 0.35
  beats.push(over(game, emptied, 0.35, (progress) => { crate.tip = 1 - ease(progress) }))
  // Up again to clear the gate: the trolley stands until the hoist has wound, and then goes.
  beats.push(cue(game, emptied, () => { game.hoist = CARRIED_AT + deckTop(crate.which) + handle.y + KNOB_HOLD }))
  beats.push(cue(game, emptied + 0.4, () => { claw.targetX = home.x; claw.targetZ = home.z + handle.z }))
  // The trolley is given time to get all the way back before the crate comes down.
  const back = emptied + 1.3
  beats.push(cue(game, back, () => { game.hoist = CRATE_STANDS + deckTop(crate.which) + handle.y + KNOB_HOLD }))
  const down = back + 0.5
  beats.push(cue(game, down, () => {
    crate.carried = false; crate.x = home.x; crate.y = CRATE_STANDS; crate.z = home.z; game.hoist = null; claw.load = 0; claw.grip = 0
    claw.targetX = 0; claw.targetZ = TRAY.z + TRAY_DEPTH / 2
    game.say({ type: 'thud', who: 'big' })
  }))
  // Its crew hops down from it over the gate onto the step and lines up, growing as it comes.
  // The claw has to be up and away over the tray before they come over the gate.
  const hops = down + 0.9
  game.crew.forEach((actor, k) => beats.push(cue(game, hops + k * 0.28, () => { riding.delete(actor); game.say({ type: 'hop-in', nth: k }); game.say({ type: 'grow' }); walk(actor, crewSpot(actor.slot, crew.length), 0.8, 9.5) })))
  // The crates slide away to the side, and the crew that waits next hops off its crate as it goes and stands on the shelf.
  const away = hops + game.crew.length * 0.28 + 0.1
  beats.push(over(game, away, 0.8, (progress) => { const gone = progress * progress; crate.away = gone; for (const other of others) other.away = gone }))
  game.waiting.forEach((actor, k) => beats.push(cue(game, away - 0.05 + k * 0.1, () => { riding.delete(actor); walk(actor, waitingSpot(actor.slot, next.length), 0.9, 6) })))
  const landed = away + 1.0
  beats.push(cue(game, landed, () => {}))
  // What is aboard is carried on every frame until it has left the crate, ahead of the cues that take things off it.
  beats.unshift(over(game, 0, landed, carry))
  scene(game, [...beats, ...showing(game, landed)])
}

/** How high over the floor the foot of a carried crate rides: clear of the gate with room to spare. */
const CARRIED_AT = 7.4
/** How high over the floor its foot is while it pours: low over the step, where no one stands. */
const POURS_AT = 4
/** How far behind the back of the tray the front of the crate hangs while it pours. */
const POURS_FROM = 0.3
/** How far past the front edge of the bed a toy slides before it falls, and how long the slide takes. */
const OFF_THE_EDGE = 0.6
const SLIDE = 0.24
/** How long the back row of the bed waits after the front row has gone. */
const ROW_WAITS = 0.25

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
