import type { Aim } from './aim'
import { MINI } from './belly'
import { ON_STUDS } from './bricks'
import { fly, newBody, settle, type Body, type Landing } from './bodies'
import { STEP, follow, hubAt, letBe, newClaw, release, stepClaw, type Claw, type ClawEvent } from './claw'
import { holdOf } from './builds'
import { HINGE_DROP, JAW_REACH, TOOTH_DROP } from './clawBuild'
import type { PositionId } from './config'
import { clawLands, clawSwingsInto, clawWaitsAbove, toyLetGo, type Deed, type Target } from './deeds'
import type { GameEvent } from './events'
import { knobAt, tongueTop } from './gobblerBuild'
import { GOBBLER, shapeOf, snackOf, type GobblerId } from './gobblers'
import { bellySpots, crateSpot, crateTop, crewSpot, deckTop, handleSpot, headTop, waitingSpot, type Spot } from './layout'
import { LIFT_SECONDS, WRONG, actSeconds, type Act } from './motion'
import { layCycle } from './order'
import { BELL, GATE, PLACES, RAIL, SHELF, SLOT_Z, TRAY, WAIT_Z, placeAt } from './places'
import type { Scene } from './scene'
import type { Toy } from './toys'
import { nearestToy, type Tray } from './tray'
import { bellyOf, crewNow, placesFor, someoneWaits, trayOf, type World } from './world'

// The game: the rules (world.ts, deeds.ts) played with a claw. It answers
// every touch at once, carries out each deed the rules allow, and moves the
// bodies and the gobblers to where the rules already have them. Nothing here
// draws; `gamePicture.ts` turns it into a picture and the view draws that.
// It is stepped by a fixed amount of game time and reads no clock and no
// chance, so the same touches always play the same way.

export type Walk = { from: Spot; to: Spot; seconds: number; t: number; arc: number; scaleFrom: number; scaleTo: number; gone: boolean }

export type Actor = {
  /** Its own number, for the view to know it by from frame to frame. */
  key: number
  id: GobblerId
  slot: number
  role: 'crew' | 'waiting' | 'leaving'
  x: number
  y: number
  z: number
  scale: number
  /** A shared act that is playing, and how far through it is. */
  act: Act | null
  actT: number
  actFor: number
  actN: number
  /** Seconds into its way with a wrong toy, or -1. */
  wrongT: number
  /** Seconds in the jaws, or -1. */
  liftedT: number
  /** Seconds the claw has waited above it, or -1. */
  openT: number
  walk: Walk | null
  /** Its snack, and what it carries off in its belly when it leaves. */
  snack: Body
  cargo: Body[]
  /** Where each thing it carries off lies, measured from its feet. */
  cargoAt: Spot[]
}

export type CrateBody = {
  from: PositionId
  seed: number
  which: number
  toys: Toy[]
  /** The place on the tray each toy of its load is going to. */
  places: number[]
  crews: GobblerId[][]
  /** The middle of its foot. */
  x: number
  y: number
  z: number
  /** 0 standing in its place, 1 slid away to the side, out of sight. */
  away: number
  /** Its bed: 0 level, 1 tipped forward to pour. */
  tip: number
  /** In the jaws: it hangs from its handle under the claw. */
  carried: boolean
}

/** What becomes of a toy that is on a gobbler's tongue. */
export type Plan =
  | { kind: 'gulp'; chomps: number; ends: 'sort' | 'cycle' | null; chompsDone: number; /** The chewing is done and the toy is being chewed small to go down the throat. */ swallowed: boolean }
  | { kind: 'spit'; hold: number; started: boolean; released: boolean; place: number }

/** How far from the middle of a toy the claw can land and still close on it. */
export const REACH = 4.6
/** How far from the way of a thrown toy the claw backs off: half the longest toy and the reach of its own open jaws. */
const CLEAR_OF_A_THROW = 6.5
/** How long after it lets a toy go the claw backs off: the toy has dropped out of its jaws by then, and nothing has been thrown yet. */
const BACKS_OFF_AFTER = 0.28

/** How far a point is from a stretch between two others, over the floor. */
export function fromSegment(p: { x: number; z: number }, a: { x: number; z: number }, b: { x: number; z: number }): number {
  const dx = b.x - a.x, dz = b.z - a.z, long = dx * dx + dz * dz
  const t = long < 1e-9 ? 0 : Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.z - a.z) * dz) / long))
  return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t)
}
const LOWEST_RIDE = 9.2
/** How far above a thing the hinge stops when the shut jaws are only to touch it. */
const TOUCH = JAW_REACH + 0.5
/** How far above the top of a gobbler's knob the hinge is when the teeth hold the knob by its middle. */
export const KNOB_HOLD = TOOTH_DROP - 0.2
/** The sliver of air a crate stands on: two things that touch are never drawn in the same plane. */
export const AIR = 0.02
/** How long the claw has to wait above a thing before the thing notices. */
const WAIT_SECONDS = 0.7

export function newActor(key: number, id: GobblerId, slot: number, role: Actor['role'], at: Spot, first: Toy | undefined): Actor {
  const snack = newBody(snackOf(id, first ?? { colour: 'yellow', kind: 'duck', size: 'small' }))
  snack.scale = MINI
  return { key, cargoAt: [], id, slot, role, x: at.x, y: at.y, z: at.z, scale: 1, act: null, actT: 0, actFor: 1, actN: 1, wrongT: -1, liftedT: -1, openT: -1, walk: null, snack, cargo: [] }
}

export class Game {
  readonly claw: Claw = newClaw(0, 6, LOWEST_RIDE)
  bodies: Body[] = []
  crew: Actor[] = []
  waiting: Actor[] = []
  leaving: Actor[] = []
  crates: CrateBody[] = []
  readonly plans = new Map<Body, Plan>()
  /** The toy in the jaws, or -1; the gobbler in the jaws, or -1. */
  held = -1
  lifted = -1
  scene: Scene | null = null
  /** True while a touch is ending a scene: its cues land without playing. */
  skipping = false
  time = 0
  events: GameEvent[] = []
  /** What the Mount should do about saving: nothing, at the throttle, or at once. */
  save: 'none' | 'soon' | 'now' = 'none'
  /** What the finger last pointed at, and what the claw is on its way to do it to. */
  aim: Aim = { target: { on: 'place', place: 2 }, x: 0, z: 6 }
  pending: Target = { on: 'place', place: 2 }
  /** How long the trolley has stood still over one thing with the finger down, and whether the thing has noticed. */
  private still = 0
  private noticed = false
  /** The finger wagging over a thing: which way it last went, how often it has turned, and when. */
  private wagWay = 0
  private wagTurns = 0
  private wagAt = 0
  private wagFrom = 0
  /** The fastest the trolley has gone on its way to the end of the rail, and whether it has hit the buffer on this run. */
  private runPeak = 0
  private buffered = false
  /** The gate shaking, 1 to 0. */
  gateShake = 0
  /** While the claw carries a crate in a scene: the height its hinge rides at. Otherwise null. */
  hoist: number | null = null
  private owed = 0
  private readonly fromClaw: ClawEvent[] = []
  /** Set by the scenes module: starts the scene a deed calls for. */
  onDeed: (deed: Deed) => void = () => {}

  constructor(readonly world: World) {
    this.arrange()
  }

  /** Builds the bodies, the crew, the ones who wait and the crates from the world, all at rest: found as left. */
  arrange(): void {
    const cycle = this.world.cycle, first = cycle.toys[0]
    this.bodies = cycle.toys.map((toy) => newBody(toy))
    this.plans.clear()
    this.held = -1; this.lifted = -1
    const crew = crewNow(this.world)
    this.crew = crew.map((id, slot) => newActor(this.mint(), id, slot, 'crew', crewSpot(slot, crew.length), first))
    const next = this.world.finished ? [] : cycle.crews[cycle.sort + 1] ?? []
    this.waiting = next.map((id, slot) => newActor(this.mint(), id, slot, 'waiting', waitingSpot(slot, next.length), first))
    this.leaving = []
    this.arrangeCrates()
    this.generation++
    this.rest()
  }

  private minted = 0
  /** A number for a new gobbler, its own for as long as the game lasts. */
  mint(): number {
    return ++this.minted
  }

  /** How many loads this game has laid out: bodies of different loads never share a number for the view. */
  generation = 0

  /** The crates that wait on the ledge, as the rules have them. */
  arrangeCrates(): void {
    this.crates = this.world.crates.map((crate, which) => {
      const laid = layCycle(crate.from, crate.seed), at = crateSpot(which, this.world.crates.length)
      return { from: crate.from, seed: crate.seed, which, toys: laid.toys, places: placesFor(crate.seed).slice(0, laid.toys.length), crews: laid.crews, x: at.x, y: SHELF.top + ON_STUDS, z: at.z, away: 0, tip: 0, carried: false }
    })
  }

  /** Where a gobbler's snack lies: first in its belly. */
  snackSpot(actor: Actor): Spot {
    const spot = bellySpots(actor.id, this.world.cycle.toys[0] ?? actor.snack.toy, [])[0] ?? { x: 0, y: 2, z: 0 }
    return { x: actor.x + spot.x * actor.scale, y: actor.y + (spot.y + AIR) * actor.scale, z: actor.z + spot.z * actor.scale }
  }

  /** Puts every body and every gobbler where the rules have it, at rest: the end state of any scene. */
  rest(): void {
    this.bodies.forEach((body, toy) => {
      if (toy === this.held) return
      body.mode = 'resting'; body.legs = []; body.wait = 0; body.rides = 0; body.vx = body.vy = body.vz = 0; body.hop = 0; body.hopV = 0; body.leanX = 0; body.leanZ = 0
      this.plans.delete(body)
      this.place(body, toy)
    })
    const crew = crewNow(this.world)
    this.crew = this.crew.filter((actor) => crew[actor.slot] === actor.id)
    for (const actor of this.crew) {
      const at = crewSpot(actor.slot, crew.length)
      actor.role = 'crew'; actor.x = at.x; actor.y = at.y; actor.z = at.z; actor.scale = 1
      actor.walk = null; actor.act = null; actor.wrongT = -1; actor.openT = -1
      if (actor.slot !== this.lifted) actor.liftedT = -1
      actor.snack.mode = 'resting'; actor.snack.scale = MINI
    }
    this.waiting.forEach((actor) => {
      const at = waitingSpot(actor.slot, this.waiting.length)
      actor.x = at.x; actor.y = at.y; actor.z = at.z; actor.scale = 1; actor.walk = null; actor.act = null
    })
    this.leaving = []
    if (this.world.crates.length === 0) this.crates = []
    this.crates.forEach((crate) => { const at = crateSpot(crate.which, this.crates.length); crate.x = at.x; crate.y = SHELF.top + ON_STUDS; crate.z = at.z; crate.away = 0; crate.tip = 0; crate.carried = false })
    if (this.hoist !== null) { this.hoist = null; this.claw.load = 0; this.claw.grip = 0; this.claw.targetX = this.claw.x; this.claw.targetZ = this.claw.z }
    this.flights.clear(); this.causes.clear()
  }

  /** The tray as stacks of toy numbers, with the toy in the jaws left out. */
  tray(): Tray {
    return trayOf(this.world.cycle, this.held)
  }

  /** The height of the top of a stack, or of the stack under one toy of it. */
  stackTop(place: number, upTo = -1): number {
    let y: number = TRAY.top
    for (const toy of trayOf(this.world.cycle, this.held)[place]) {
      if (toy === upTo) break
      y += ON_STUDS + this.bodies[toy].height
    }
    return y
  }

  /** Where the rules have a toy: on its place on the tray, or in its place in a belly. */
  spotOf(toy: number): Spot & { scale: number } {
    const where = this.world.cycle.where[toy]
    // A toy stands on the tops of the studs under it, and a hair off the lines of the grid, the more the higher
    // it is in a stack: two things that touch never lie in one plane.
    if (where.at === 'tray') { const at = placeAt(where.place), off = where.level + 1; return { x: at.x + 0.013 * off, y: this.stackTop(where.place, toy) + ON_STUDS, z: at.z + 0.009 * off, scale: 1 } }
    const actor = this.crew[where.slot]
    const group = bellyOf(this.world.cycle, where.slot).map((one) => this.world.cycle.toys[one])
    const spot = bellySpots(actor.id, this.world.cycle.toys[0], group)[where.nth + 1] ?? { x: 0, y: 2, z: 0 }
    return { x: actor.x + spot.x, y: actor.y + spot.y + AIR, z: actor.z + spot.z, scale: MINI }
  }

  private place(body: Body, toy: number): void {
    const at = this.spotOf(toy)
    body.x = at.x; body.y = at.y; body.z = at.z; body.scale = at.scale
  }

  /** Where a toy in a gobbler's mouth lies: on its tongue, in the middle, over the throat. */
  mouthOf(actor: Actor): Spot {
    return { x: actor.x, y: actor.y + tongueTop(shapeOf(actor.id)) * actor.scale + AIR, z: actor.z }
  }

  say(event: GameEvent): void {
    if (!this.skipping) this.events.push(event)
  }

  startAct(actor: Actor, act: Act, n = 1): void {
    if (this.skipping) return
    actor.act = act; actor.actT = 0; actor.actN = n; actor.actFor = actSeconds(actor.id, act, n)
  }

  // --- Touch ---------------------------------------------------------------

  /** Where the trolley goes for a thing the finger points at. */
  trolleyFor(aim: Aim): { x: number; z: number } {
    const target = aim.target
    if (target.on === 'place') return aim
    if (target.on === 'gobbler') {
      const actor = this.crew[target.slot]
      if (!actor) return { x: aim.x, z: SLOT_Z }
      const knob = knobAt(shapeOf(actor.id))
      // With a toy in the jaws the toy is brought over the middle of the mouth, and the toy hangs by its
      // highest part, which may be off its middle.
      return this.held >= 0 ? { x: actor.x + holdOf(this.bodies[this.held].toy).x, z: actor.z } : { x: actor.x + knob.x, z: actor.z + knob.z }
    }
    if (target.on === 'rail-end') return { x: target.side * RAIL.maxX, z: BELL.z }
    // The ledge: the front of a crate, a waiting head, or the gate.
    if (this.crates.length > 0) { const crate = this.crates[Math.min(target.which, this.crates.length - 1)]; return { x: crate.x, z: crate.z + handleSpot().z } }
    if (this.waiting.length > 0 && (this.held >= 0 || this.tray().some((stack) => stack.length > 0))) {
      const nearest = this.waiting.reduce((best, actor) => (Math.abs(actor.x - aim.x) < Math.abs(best.x - aim.x) ? actor : best))
      return { x: nearest.x, z: WAIT_Z }
    }
    return { x: GATE.x, z: GATE.z }
  }

  /** The finger landed or moved. A landing ends a scene and lets a lifted gobbler go, and is then answered as a touch. */
  point(aim: Aim, landing: boolean): void {
    if (landing) {
      this.endScene(true)
      if (this.lifted >= 0) this.dropGobbler()
      this.still = 0; this.noticed = false; this.wagTurns = 0; this.wagWay = 0
    }
    // With one crate on the ledge, either side of the ledge means that crate.
    if (aim.target.on === 'ledge' && this.crates.length > 0) aim = { ...aim, target: { on: 'ledge', which: Math.min(aim.target.which, this.crates.length - 1) } }
    this.aim = aim
    const to = this.trolleyFor(aim)
    follow(this.claw, to.x, to.z, this.fromClaw)
    this.wag(to.x)
  }

  /** The finger lifted: the claw drops on what the finger pointed at, or lets its toy go there. */
  lift(): void {
    const claw = this.claw
    let target = this.aim.target
    // A gobbler the bare claw is coming down on holds still for it, so the jaws find its knob where it stands.
    if (target.on === 'gobbler' && this.held < 0) { const actor = this.crew[target.slot]; if (actor) { actor.act = null; actor.wrongT = -1; actor.openT = -1 } }
    let to = this.trolleyFor(this.aim)
    if (target.on === 'place') {
      // The nearest toy in reach is meant, or with a toy in the jaws the place under the finger.
      const place = this.held >= 0 ? target.place : nearestToy(this.tray(), this.aim.x, this.aim.z, REACH)
      if (place >= 0) {
        target = { on: 'place', place }; to = placeAt(place)
        // The claw comes down over the highest part of the toy, which is what its teeth close beside.
        const stack = this.tray()[place]
        if (this.held < 0 && stack.length > 0) to = { x: to.x + holdOf(this.bodies[stack[stack.length - 1]].toy).x, z: to.z }
        // And a toy in the jaws is let go with its own middle over the place.
        if (this.held >= 0) to = { x: to.x + holdOf(this.bodies[this.held].toy).x, z: to.z }
      }
    }
    this.pending = target
    claw.targetX = Math.min(RAIL.maxX, Math.max(RAIL.minX, to.x)); claw.targetZ = Math.min(RAIL.maxZ, Math.max(RAIL.minZ, to.z))
    release(claw, true)
    for (const actor of this.crew) actor.openT = -1
  }

  /** The press ended with no lift: the claw stays where it is with what it has. */
  cancel(): void {
    letBe(this.claw)
  }

  /** The finger wagging to and fro over a thing swings the claw into it. */
  private wag(x: number): void {
    const moved = x - this.wagFrom
    if (Math.abs(moved) < 1.6) return
    const way = Math.sign(moved)
    this.wagFrom = x
    if (way === this.wagWay) return
    this.wagWay = way
    if (this.time - this.wagAt > 0.7) this.wagTurns = 0
    this.wagAt = this.time
    if (++this.wagTurns < 3 || this.claw.phase !== 'ready' || this.scene) return
    this.wagTurns = 0
    this.claw.swingVX += way * 5
    this.carry(clawSwingsInto(this.world, this.aim.target, way as -1 | 1, this.held >= 0))
  }

  // --- Time ----------------------------------------------------------------

  /** Plays `seconds` of game time in fixed steps. */
  advance(seconds: number): void {
    this.owed += seconds
    while (this.owed >= STEP - 1e-9) { this.owed -= STEP; this.step() }
  }

  /** How high the hinge of the jaws rides here: clear of whatever is near, with what it carries. */
  rideY(): number {
    if (this.hoist !== null) return this.hoist
    const claw = this.claw
    let near: number = TRAY.top
    const tray = this.tray()
    for (let place = 0; place < tray.length; place++) {
      const at = placeAt(place)
      if (Math.hypot(at.x - claw.x, at.z - claw.z) < 7.5) near = Math.max(near, this.stackTop(place))
    }
    // Over the crew it rides clear of their heads, and it starts to rise as soon as it is sent across them.
    if (claw.z < 1.5 || claw.targetZ < 1.5) for (const actor of this.crew) {
      const beside = Math.abs(actor.x - claw.x) < shapeOf(actor.id).width / 2 + 5, onTheWay = (actor.x - claw.x) * (actor.x - claw.targetX) < 0
      if ((beside || onTheWay) && actor.slot !== this.lifted) near = Math.max(near, actor.y + headTop(actor.id))
    }
    if (claw.z < -5.5) {
      near = Math.max(near, GATE.top + 0.6)
      for (const actor of this.waiting) near = Math.max(near, actor.y + headTop(actor.id))
      for (const crate of this.crates) near = Math.max(near, SHELF.top + crateTop(crate.which, crate.crews.length))
    }
    // Clear of a toy it has just let go, or one that is thrown up near it: it lifts away from it and never comes
    // down onto it.
    this.bodies.forEach((body, toy) => {
      if (toy === this.held || body.mode === 'resting' || body.mode === 'parked') return
      if (Math.abs(body.x - claw.x) < 4.5 && Math.abs(body.z - claw.z) < 4) near = Math.max(near, body.y + body.height * body.scale)
    })
    // And clear of the bell on its post at either end of the rail.
    if (Math.hypot(Math.abs(claw.x) - BELL.x, claw.z - BELL.z) < 5.5) near = Math.max(near, BELL.top + 0.4)
    const below = this.held >= 0 ? this.hang(this.held) : JAW_REACH + 0.1
    if (this.lifted >= 0) {
      // A gobbler in the jaws comes up a little way and no further. Big barely leaves the step; Little, who
      // spins like a top, is lifted clear of the gate behind it.
      const actor = this.crew[this.lifted], up = actor.id === 'big' ? 0.5 : actor.id === 'little' ? 5.6 : 2.6
      return crewSpot(actor.slot, this.crew.length).y + knobAt(shapeOf(actor.id)).y + KNOB_HOLD + up
    }
    return Math.max(LOWEST_RIDE, near + below + 1)
  }

  /** How far below the hinge of the jaws the base of a held toy hangs: the teeth close beside the top plate of its highest part. */
  hang(toy: number): number {
    const hold = holdOf(this.bodies[toy].toy)
    return TOOTH_DROP - 0.2 + hold.top
  }

  /**
   * The height the hinge of the jaws stops at when the claw drops for the thing it is going for: beside the
   * highest part of a toy or the knob of a gobbler, and with the shut jaws just touching anything else.
   */
  landY(): number {
    const target = this.pending, claw = this.claw
    if (target.on === 'place') {
      const place = nearestToy(this.tray(), claw.x, claw.z, REACH)
      if (place < 0) return TRAY.top + TOUCH
      const stack = this.tray()[place], top = stack[stack.length - 1]
      // The toy is held exactly where it stands, on the studs under it.
      return this.spotOf(top).y + this.hang(top)
    }
    if (target.on === 'gobbler') { const actor = this.crew[target.slot]; return actor ? actor.y + knobAt(shapeOf(actor.id)).y + KNOB_HOLD : TRAY.top + TOUCH }
    if (target.on === 'rail-end') return BELL.top + TOUCH
    // A crate is held by the knob on its arch, as a gobbler is by the knob on its head.
    if (this.crates.length > 0) return SHELF.top + deckTop(Math.min(target.which, this.crates.length - 1)) + handleSpot().y + KNOB_HOLD
    if (Math.abs(claw.z - WAIT_Z) < 1 && this.waiting.length > 0) return SHELF.top + headTop(this.waiting[0].id) + TOUCH
    return GATE.top + TOUCH
  }

  private step(): void {
    this.time += STEP
    const claw = this.claw
    stepClaw(claw, this.rideY(), this.landY(), this.fromClaw)
    for (const event of this.fromClaw) this.answer(event)
    this.fromClaw.length = 0
    if (this.lifted >= 0 && this.crew[this.lifted].liftedT >= LIFT_SECONDS && claw.phase === 'ready') release(claw, false)
    this.bodies.forEach((body, toy) => this.moveBody(body, toy))
    for (const actor of this.crew) { this.moveActor(actor); this.moveSnack(actor) }
    for (const actor of this.waiting) this.moveActor(actor)
    for (const actor of this.leaving) { this.moveActor(actor); this.moveSnack(actor) }
    this.leaving = this.leaving.filter((actor) => !(actor.walk === null && actor.role === 'leaving'))
    this.gateShake = Math.max(0, this.gateShake - STEP / 0.5)
    // A crate in the jaws hangs from its handle under the hub.
    for (const crate of this.crates) if (crate.carried) {
      const hub = hubAt(claw), handle = handleSpot()
      crate.x = hub.x; crate.z = hub.z - handle.z
      crate.y = hub.y - HINGE_DROP - KNOB_HOLD - handle.y - deckTop(crate.which)
    }
    if (this.dodge) {
      // A finger on the glass, or a scene, has the claw: it backs off only when left alone.
      if (claw.following || claw.phase !== 'ready' || this.scene || this.held >= 0 || this.lifted >= 0) this.dodge = null
      else if ((this.dodge.wait -= STEP) <= 0) { const toy = this.dodge.toy; this.dodge = null; this.backOff(toy) }
    }
    this.watchBuffer()
    this.watchWaiting()
    if (this.scene) { this.scene.update(this.time); if (!this.scene.running) this.endScene(false) }
  }

  /** A hard slide into the end of the rail hits the buffer: a double ding, and the trolley bounces back a stud. */
  private watchBuffer(): void {
    const claw = this.claw, target = this.aim.target
    if (target.on !== 'rail-end' || claw.phase !== 'ready') { this.runPeak = 0; this.buffered = false; return }
    const end = target.side * RAIL.maxX
    this.runPeak = Math.max(this.runPeak, claw.vx * target.side)
    if (this.buffered || Math.abs(claw.x - end) > 0.8 || this.runPeak < 45) return
    this.buffered = true
    claw.vx = -target.side * 14
    this.carry(clawSwingsInto(this.world, target, target.side, this.held >= 0))
  }

  /** The claw held still over one thing: after a moment the thing notices, once for each hold. */
  private watchWaiting(): void {
    const claw = this.claw
    const waiting = claw.following && claw.phase === 'ready' && Math.hypot(claw.vx, claw.vz) < 1.5 && Math.hypot(claw.targetX - claw.x, claw.targetZ - claw.z) < 0.6 && !this.scene
    if (!waiting) { this.still = 0; if (!claw.following) { this.noticed = false; for (const actor of this.crew) actor.openT = -1 } return }
    this.still += STEP
    if (this.noticed || this.still < WAIT_SECONDS) return
    this.noticed = true
    this.carry(clawWaitsAbove(this.world, this.aim.target))
  }

  private answer(event: ClawEvent): void {
    const claw = this.claw
    if (event.type === 'chirp') this.say({ type: 'chirp', distance: event.distance })
    else if (event.type === 'tick') this.say({ type: 'tick' })
    else if (event.type === 'ratchet') this.say({ type: 'ratchet', progress: event.progress, heavy: claw.load })
    else if (event.type === 'landed') { this.say({ type: 'clack' }); this.carry(clawLands(this.world, this.pending)) }
    else if (event.type === 'closed') {
      if (this.held >= 0) {
        const where = this.world.cycle.where[this.held]
        const left = where.at === 'tray' ? this.tray()[where.place].length : 0
        this.say({ type: 'pop', heavy: this.bodies[this.held].heavy, level: left })
        if (left > 0 && where.at === 'tray') {
          this.say({ type: 'settle' })
          // What it stood on wobbles as its top goes up.
          for (const below of this.tray()[where.place]) { this.bodies[below].squash = 0.86; this.bodies[below].squashV = 0 }
        }
      } else if (this.lifted < 0 && this.hoist === null) this.say({ type: 'bite' })
    } else if (event.type === 'let-go') {
      if (this.lifted >= 0) { this.dropGobbler(); return }
      if (this.held < 0) return
      const toy = this.held
      this.say({ type: 'let-go' })
      const deed = toyLetGo(this.world, toy, this.pending)
      this.held = -1
      this.carry(deed)
      // The claw gets out of the way of whatever comes back, once the toy has dropped clear of its jaws.
      this.dodge = { toy, wait: BACKS_OFF_AFTER }
    }
  }

  /** A toy let go a moment ago, which the claw is about to back away from. */
  private dodge: { toy: number; wait: number } | null = null

  /**
   * A toy has been let go and is on its way somewhere: into a mouth, off a stack, back from the ledge. The claw
   * backs off to over the nearest place that is well clear of the whole way the toy may go, so that nothing
   * thrown ever comes up through it. A toy set down on the place under it goes nowhere, and the claw stays.
   */
  private backOff(toy: number): void {
    const body = this.bodies[toy], claw = this.claw
    if (!body || body.mode === 'resting' || body.mode === 'held') return
    const way: { x: number; z: number }[] = [{ x: body.x, z: body.z }]
    if (body.mode === 'flying') way.push(this.flightEnd(body, toy))
    if (body.mode === 'mouth') { const actor = this.crew[body.slot]; if (actor) way.push(actor) }
    for (const leg of body.legs) way.push(leg.fixed ? leg : this.spotOf(toy))
    const where = this.world.cycle.where[toy]
    if (where.at === 'tray') way.push(this.spotOf(toy))
    if (this.pending.on === 'place' && way.every((stop) => Math.hypot(stop.x - claw.x, stop.z - claw.z) < 1.5)) return
    let best: { x: number; z: number } | null = null, least = Infinity
    for (let place = 0; place < PLACES; place++) {
      const at = placeAt(place)
      let clear = Infinity
      for (let i = 0; i + 1 < way.length; i++) clear = Math.min(clear, fromSegment(at, way[i], way[i + 1]))
      const far = Math.hypot(at.x - claw.x, at.z - claw.z)
      if (clear >= CLEAR_OF_A_THROW && far < least) { least = far; best = at }
    }
    if (best) { claw.targetX = best.x; claw.targetZ = best.z }
  }

  /** Carries out a deed: the scenes module and `react.ts` play it. */
  carry(deed: Deed): void {
    this.onDeed(deed)
  }

  /** A lifted gobbler is let go and drops back into its own place. */
  dropGobbler(): void {
    const actor = this.crew[this.lifted]
    this.lifted = -1
    this.claw.load = 0; this.claw.grip = 0
    if (!actor) return
    actor.liftedT = -1
    const home = crewSpot(actor.slot, this.crew.length)
    actor.walk = { from: { x: actor.x, y: actor.y, z: actor.z }, to: home, seconds: 0.22, t: 0, arc: 0, scaleFrom: 1, scaleTo: 1, gone: false }
  }

  /** Ends the scene that is playing. A touch ends it at once, with everything set where it was going. */
  endScene(byTouch: boolean): void {
    const scene = this.scene
    if (!scene) return
    this.scene = null
    if (byTouch) { this.skipping = true; scene.finish(); this.skipping = false }
    this.rest()
  }

  takeEvents(): GameEvent[] {
    const out = this.events
    this.events = []
    return out
  }

  /** Whether anyone waits on the ledge. */
  someoneWaits(): boolean {
    return someoneWaits(this.world)
  }

  // --- Bodies --------------------------------------------------------------

  private moveBody(body: Body, toy: number): void {
    settle(body, STEP)
    // A toy that waits its turn in a tumble stays where it is until then.
    if (body.wait > 0) {
      body.wait -= STEP
      if (body.wait <= 0) { body.wait = 0; this.onLeg(body, toy) }
      return
    }
    if (toy === this.held) {
      // Hangs under the jaws along the cable, easing from where it stood to where it hangs.
      const claw = this.claw, hub = hubAt(claw)
      const down = (hub.y - RAIL.top) / claw.length, across = (hub.x - claw.x) / claw.length, along = (hub.z - claw.z) / claw.length
      const drop = HINGE_DROP + this.hang(toy)
      body.mode = 'held'
      // It was standing where the jaws closed, so it hangs true at once.
      body.hang = 1
      const ease = 1
      // The part the teeth hold is under the hub, so a toy whose highest part is off its middle hangs off its middle.
      const off = holdOf(body.toy).x
      body.x += (hub.x + across * drop - off - body.x) * ease
      body.y += (hub.y + down * drop - body.y) * ease
      body.z += (hub.z + along * drop - body.z) * ease
      body.leanX = claw.swingX * ease; body.leanZ = claw.swingZ * ease
      return
    }
    if (body.mode === 'flying') {
      const landing = fly(body, this.flightEnd(body, toy), STEP)
      if (landing) this.landed(body, toy, landing)
      return
    }
    if (body.mode === 'mouth') { this.chew(body, toy); return }
    if (body.mode !== 'resting') return
    const at = this.spotOf(toy)
    // A toy on a stack rides the hop of whatever it stands on; a toy in a belly rides its gobbler.
    const where = this.world.cycle.where[toy]
    let lift = body.hop
    if (where.at === 'tray') {
      const stack = this.tray()[where.place]
      // A toy on a stack hops at least as high as everything under it: a stack hops as one and never into itself.
      for (const below of stack) { if (below === toy) break; lift = Math.max(lift, this.bodies[below].hop) }
      // And it rides the squash of everything under it, so a stack squashes as one and nothing sinks into what is below.
      for (const below of stack) { if (below === toy) break; lift += this.bodies[below].height * (this.bodies[below].squash - 1) }
    }
    body.x = at.x; body.y = at.y + lift; body.z = at.z; body.scale = at.scale
  }

  /** Where a flight is going when that is no place of the rules, and the deed that set a body flying. */
  flights = new Map<Body, Spot>()
  causes = new Map<Body, Deed>()
  private flightEnd(body: Body, toy: number): Spot {
    const fixed = this.flights.get(body)
    if (fixed) return fixed
    if (body.landing === 'mouth') { const actor = this.crew[body.slot]; if (actor) return this.mouthOf(actor) }
    if ((body.landing === 'stand' || body.landing === 'belly') && toy >= 0) return this.spotOf(toy)
    return this.flights.get(body) ?? { x: body.x, y: body.y, z: body.z }
  }

  private landed(body: Body, toy: number, landing: Landing): void {
    this.flights.delete(body)
    body.squash = 0.7; body.squashV = 0
    if (landing === 'again' && body.legs.length > 0) { this.onLeg(body, toy); return }
    if (landing === 'mouth') { body.mode = 'mouth'; body.chewed = 0; this.say({ type: 'catch', heavy: body.heavy }); return }
    body.mode = 'resting'; body.rides = 0
    if (landing === 'belly') {
      const where = toy >= 0 ? this.world.cycle.where[toy] : null
      this.say({ type: 'plink', nth: where && where.at === 'belly' ? where.nth + 1 : 0 })
      return
    }
    const where = this.world.cycle.where[toy]
    if (where.at !== 'tray') return
    this.say({ type: 'click', heavy: body.heavy, level: where.level })
    // A small toy hops its neighbours; a big one hops the whole tray.
    this.shake(body.x, body.z, body.heavy === 2 ? 16 : 12, body.heavy === 2 ? 14 : 6, toy)
  }

  /** Set by `react.ts`: what a body does when one leg of its flight ends and another begins. */
  onLeg: (body: Body, toy: number) => void = () => {}
  /** Set by `react.ts`: what becomes of a toy on a tongue as time passes. */
  chew: (body: Body, toy: number) => void = () => {}

  /** Hops the resting toys on the tray round a point: hardest beside it, fading with distance. */
  shake(x: number, z: number, strength: number, reach: number, except = -1): void {
    this.bodies.forEach((body, toy) => {
      if (toy === except || toy === this.held || body.mode !== 'resting' || this.world.cycle.where[toy].at !== 'tray') return
      const d = Math.hypot(body.x - x, body.z - z)
      body.hopV += strength / (1 + (d / reach) * (d / reach)) / Math.sqrt(body.heavy)
    })
  }

  // --- Gobblers ------------------------------------------------------------

  private moveActor(actor: Actor): void {
    if (actor.act) { actor.actT += STEP / actor.actFor; if (actor.actT >= 1) { actor.act = null; actor.actT = 0 } }
    if (actor.wrongT >= 0) { actor.wrongT += STEP; if (actor.wrongT >= WRONG[GOBBLER[actor.id].wrong].seconds) actor.wrongT = -1 }
    if (actor.openT >= 0) actor.openT += STEP
    if (actor.slot === this.lifted && actor.role === 'crew' && this.claw.phase !== 'letting-go') {
      // In the jaws: it hangs from its knob under the claw.
      const hub = hubAt(this.claw), knob = knobAt(shapeOf(actor.id)), home = crewSpot(actor.slot, this.crew.length)
      if (actor.liftedT < 0) return
      actor.liftedT += STEP
      actor.y = Math.max(home.y, hub.y - HINGE_DROP - KNOB_HOLD - knob.y)
      // Its knob is right under the hub, wherever the swing has the hub.
      actor.x = home.x + (hub.x - this.claw.x); actor.z = home.z + (hub.z - this.claw.z)
      return
    }
    const walk = actor.walk
    if (!walk) return
    walk.t = Math.min(1, walk.t + STEP / walk.seconds)
    const u = walk.t, ease = u * u * (3 - 2 * u)
    actor.x = walk.from.x + (walk.to.x - walk.from.x) * ease
    actor.z = walk.from.z + (walk.to.z - walk.from.z) * ease
    actor.y = walk.from.y + (walk.to.y - walk.from.y) * (walk.arc > 0 ? u : ease) + walk.arc * 4 * u * (1 - u)
    // A rider grows to its full size late in its hop, when it is clear of the crate.
    const grow = Math.min(1, Math.max(0, (u - 0.55) / 0.45))
    actor.scale = walk.scaleFrom + (walk.scaleTo - walk.scaleFrom) * grow * grow * (3 - 2 * grow)
    if (walk.t < 1) return
    actor.walk = null
    if (walk.gone) { actor.role = 'leaving'; return }
    if (actor.role === 'crew' && (walk.arc > 0 || walk.from.y > walk.to.y + 0.2)) {
      // Down onto the step: a thud, and the tray hops.
      this.say({ type: 'thud', who: actor.id })
      this.startAct(actor, 'land')
      this.shake(actor.x, TRAY.z, actor.id === 'big' ? 14 : 8, 12)
    }
  }

  /** A gobbler's snack lies first in its belly, and rides with it. */
  private moveSnack(actor: Actor): void {
    const snack = actor.snack
    settle(snack, STEP)
    const home = this.snackSpot(actor)
    actor.cargo.forEach((body, i) => { const at = actor.cargoAt[i]; body.x = actor.x + at.x; body.y = actor.y + at.y; body.z = actor.z + at.z })
    if (snack.mode === 'parked') return
    if (snack.mode === 'flying') {
      if (fly(snack, home, STEP)) { snack.mode = 'resting'; snack.squash = 0.7; snack.squashV = 0; this.say({ type: 'plink', nth: 0 }) }
      return
    }
    if (snack.mode === 'mouth') { const at = this.mouthOf(actor); snack.x = at.x; snack.y = at.y; snack.z = at.z; snack.scale = actor.scale; return }
    snack.x = home.x; snack.y = home.y + snack.hop; snack.z = home.z; snack.scale = MINI * actor.scale
  }
}
