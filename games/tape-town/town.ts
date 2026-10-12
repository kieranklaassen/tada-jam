import { crossingsOf, type Crossing } from './crossings'
import { homeDisc, type Field } from './floor'
import { stepGates, type Gate } from './gates'
import { call, decide, recall, stepToy, takeUpQuietly } from './going'
import type { ActName, FxKind, GaitName, Mover } from './habits'
import { MOVERS } from './habits'
import type { Point } from './input'
import { BOX, FIELD, KINDS, TAPE_WIDTH, TOY_IDS, TOY_SIZE, type Kind, type Pose, type ToyId } from './layout'
import { TAPPED_MOVE, arc } from './motion'
import { headingOf, network, type Network, type Rider } from './roads'
import { makeRng, type Rng } from './rng'
import { PEGS, serializeTown, type PegId, type TownState } from './save'
import { callHome, finishScene, roofOf, tipOut } from './shoebox'
import { along, lengthOf, nearestOn, type Strip } from './tape'
import { cancelTouch, liftTouch, moveTouch, pressTouch, type Grip, type Hold } from './touch'
import { gatesAsFound } from './riding'
import { resettle } from './settle'
import { HONKS, TAPPED, hoot, pat, soften, type Sound } from './voices'

// The toy, with no canvas and no clock of its own: a floor, four rolls of
// tape, a shoebox and its toys. The Mount carries gestures in and steps it
// by the attended clock; the view reads it and draws. Everything a touch
// starts, starts in the call that carries the touch, and every sound is
// queued in the same call or step as the motion it belongs to.
//
// The model is in five files. This one holds what the town is and the one
// clock; touch.ts what a finger does; going.ts what each toy does on each
// tape; way.ts how nothing passes through anything; shoebox.ts the two
// scenes and the bus's passengers.

export type Standing = 'plain' | 'parked' | 'nested' | 'reeds' | 'lying' | 'bath' | 'dormant' | 'dazed'
/** `resume` is the swim a duck in the reeds goes back to. */
export type Stand = { is: 'stand'; as: Standing; since: number; resume?: Ride; /** Whom it hopped aside for on its way across the boards: it goes on when they have gone by. */ aside?: ToyId }
/** `from` is where it set off, which is where it goes back to when it cannot get through. */
export type Walk = { is: 'walk'; to: Point; from?: Point; gait: GaitName; odo: number; held: number; toots: number; tootAt: number; /** It has just tooted at whoever stands in its way. */ fresh?: boolean; follow: boolean }
export type Ride = {
  is: 'ride'; kind: Kind; rider: Rider; gait: GaitName; odo: number
  /** How long something has stood in its way, how often it has tooted at it, and when last. */
  held: number; toots: number; tootAt: number
  /** It has just tooted at whoever stands in its way. */
  fresh?: boolean
  /** The crossing it is in, and the one it has dealt with and is not yet clear of. */
  inside: Crossing | null; done: Crossing | null
  hooted: Crossing | null; braked: boolean
  /** It is backing along its tape, tail first: there was no room to turn. */
  back: boolean
}
/** `still` is an act with a turn in it done without the turn, where there is no room to turn. */
export type Acting = { is: 'act'; name: ActName; t: number; cue: number; from: Pose; to: Pose | null; after: Ride | Walk | null; flip: boolean; still: boolean }
export type Doing = Stand | Walk | Ride | Acting | { is: 'stuck'; t: number; strip: Strip } | { is: 'held'; before: Doing; from: Pose }

export type Flight = {
  from: Pose
  /** Seconds until it takes off, then seconds since. */
  wait: number; t: number; lasts: number; started: boolean
  /** Part of the tipping-out or the calling-home, which a touch ends. */
  scene: boolean
  off: Sound; land: Sound
  /** Its take-off and landing answer a touch, and are as loud as ever; otherwise they are part of the town's own running. */
  loud: boolean
  /** What it does when it lands: takes up its habit, or stands. */
  then: 'decide' | 'stand'
}

export type Body = {
  /** Where the toy is, or where it will land while it is in the air. */
  at: Pose
  doing: Doing
  flight: Flight | null
  tappedAt: number
  /** The next sound of its answer to a tap that has not been played yet. */
  cue: number
  landedAt: number
  /** Under a bridge or in a tunnel: the view draws the bridge or the hedge over it. */
  hidden: boolean
  /** When the bus's hat of leaves came on, and when a leaf settled on the train's funnel. */
  hatAt: number
  leafAt: number
  /** The river or hedge the dog has just dealt with, so that it does it once. */
  wet: Strip | null
  /** Whom it has tooted at, where they stood, and when it was last stopped by them. */
  met: Partial<Record<ToyId, Pose & { at: number; /** When it last sent the dog off from there. */ sent?: number }>>
  /** The step in which it was last on a road at a level crossing and short of the rails, as a count of steps and not of seconds: the train does not wait for whoever is. */
  offRailsAt: number
  /** When it last made a sound of its way that no other motion of its own goes with: the train's hoot, the drum of a bridge under its wheels, the horn of a car or a bus afloat. It is seen on the toy. */
  soundedAt: number
  /** Where it last set off for across the boards, with its sound: setting off for there again it says nothing. */
  offFor: Point | null
  /** How many times running it has gone round somebody on its way across the boards, and when it last had enough of that. */
  rounds: number
  roundAt: number
  /** How many times running it has been hopped aside on its way to its tape; for the dog, out of the way of whoever it follows. */
  asides: number
  /** The strip it is on its way to across the boards, and for how long it has been, in seconds of the town's clock: Infinity while it is on its way to none, and for one that goes at once. */
  onto: Strip | null
  wayFor: number
  /** How long until it looks again for room on a tape it found full, in seconds: at nought or below it may look. */
  lookIn: number
  /** How often each toy has sent it hopping out of its way, since a finger or the tape last changed anything. */
  hopped: Partial<Record<ToyId, number>>
  /** A strip that called it while it could not answer: the car in the middle of a turn. */
  calledTo: Strip | null
  /** How far it has travelled its tapes this visit, and how far it had when it last stopped at a hedge across a road: boxed in, it does not honk on and on. */
  gone: number
  jamAt: number | null
}

export type Pressing = { strip: Strip; t: number; lasts: number }
export type Pull = { kind: Kind; ax: number; ay: number; bx: number; by: number; ticks: number; speed: number; moved: number; /** When the car revved at it: a grey strip being pulled. */ revAt: number }
export type Fx = { kind: FxKind | 'knock'; x: number; y: number; at: number; turn: number }
export type Hint = { tap: Point } | { from: Point; to: Point }

/** A touch this near the home control's edge is still the grown-up's. */
const HOME_MARGIN = 20
const ease = (t: number): number => t * t * (3 - 2 * t)
const stand = (as: Standing, since: number): Stand => ({ is: 'stand', as, since })

export class Town {
  readonly state: TownState
  /** Seconds of play this visit, and frames stepped. */
  time = 0
  frames = 0
  pull: Pull | null = null
  grip: Grip | null = null
  hold: Hold | null = null
  pressings: Pressing[] = []
  /** The oldest strip, lifting by itself to make room: seen for a moment. */
  lifting: { strip: Strip; t: number }[] = []
  bodies!: Record<ToyId, Body>
  finger: Point | null = null
  rollPickedAt = -Infinity
  rollBackAt = -Infinity
  rollFrom: Point | null = null
  readonly rollTurns = [0, 0, 0, 0]
  /** When the box last rocked, the cat, the basket and the plant were last touched, a rip was last heard and something last honked. */
  boxAt = -Infinity
  catAt = -Infinity
  basketAt = -Infinity
  plantAt = -Infinity
  ripAt = -Infinity
  honkAt = -Infinity
  bumpAt = -Infinity
  fx: Fx[] = []
  /** Counts up each time the strips that lie flat change, so the view knows to paint its floor again. */
  layer = 0
  moving = false
  /** The bare floor, and the home control as a disc on the stage of this surface. */
  readonly field: Field = { ...FIELD }
  home = { x: (FIELD.x0 + FIELD.x1) / 2, y: 34, r: 24 }
  nets!: Record<Kind, Network>
  crossings: Crossing[] = []
  /** Who moved last, for the dog, and when. */
  leader: { id: ToyId; at: number } | null = null
  /** Pegs the bus has just set down or passed, until it has left them behind. */
  served = new Set<PegId>()
  /** Who is held up this frame: worked out afresh as each looks along its way. */
  /** Who waits, and for whom: two who each wait for the other must not stand there. */
  waiting = new Map<Mover, Set<ToyId>>()
  /** The gates of level crossings that are shut or swinging. */
  gates: Gate[] = []
  sceneOn = false
  touchedAt = -Infinity
  readonly rng: Rng
  private sounds: Sound[] = []
  private changed: 'no' | 'soon' | 'now' = 'no'
  private cut = false
  private savedAt = 0

  constructor(state: TownState, seed: number) {
    this.state = state
    this.rng = makeRng(seed)
    this.settle()
  }

  /**
   * The town as it is found: on load, and after it was put away. Every toy stands where it was saved and takes
   * up its habit from there with no sound, nothing short-lived is left, and no clock is part way.
   */
  settle(): void {
    this.pull = this.grip = this.hold = this.finger = null
    this.pressings = []
    this.lifting = []
    this.fx = []
    this.leader = null
    this.sceneOn = false
    // A peg the bus has just set down stands behind it, and is not called for again; one beside it or ahead of it still waits.
    const bus = this.state.toys.bus
    this.served = new Set(PEGS.filter((peg) => {
      const dx = this.state.toys[peg].x - bus.x, dy = this.state.toys[peg].y - bus.y
      return !this.state.riding[peg] && Math.hypot(dx, dy) <= 200 && dx * Math.cos(bus.a) + dy * Math.sin(bus.a) < -24
    }))
    this.waiting = new Map()
    this.gates = []
    this.touchedAt = this.rollPickedAt = this.rollBackAt = this.boxAt = this.catAt = this.basketAt = this.plantAt = this.ripAt = this.honkAt = this.bumpAt = -Infinity
    this.rollFrom = null
    this.rollTurns.fill(0)
    this.bodies = Object.fromEntries(TOY_IDS.map((id) => [id, { at: { ...this.state.toys[id] }, doing: stand('plain', -Infinity), flight: null, tappedAt: -Infinity, cue: 0, landedAt: -Infinity, hidden: false, hatAt: -Infinity, leafAt: -Infinity, wet: null, met: {}, offRailsAt: -Infinity, soundedAt: -Infinity, gone: 0, jamAt: null, offFor: null, rounds: 0, roundAt: -Infinity, asides: 0, onto: null, wayFor: Infinity, lookIn: 0, hopped: {}, calledTo: null }])) as Record<ToyId, Body>
    this.stripsChanged(true)
    if (this.state.out) for (const id of MOVERS) takeUpQuietly(this, id)
    // The train on the bare floor is called by the rail that lies there, and a train on a level crossing has its gates shut.
    this.state.tail = {}
    recall(this)
    gatesAsFound(this)
    this.layer++
  }

  /** Put away: nothing the finger had not done is done for it, whatever is in the air is where it was going, and the town is as a load would find it. */
  rest(): void {
    cancelTouch(this)
    finishScene(this, false)
    this.noteTails()
    for (const id of TOY_IDS) {
      const body = this.bodies[id], doing = body.doing
      if (doing.is === 'act' && doing.to) body.at = { ...doing.to }
      const at = this.state.riding[id as PegId] ? this.state.toys[id] : body.at
      this.state.toys[id] = { x: Math.round(at.x), y: Math.round(at.y), a: (Math.round((at.a * 180) / Math.PI) * Math.PI) / 180 }
    }
    this.sounds = []
    this.cut = true
    this.settle()
  }

  /**
   * The surface changed size: the home control is somewhere else on the stage. The stage is fitted so that the
   * control stays above the bare floor (floor.ts), so the floor is the same on every surface, and no strip and
   * no toy is ever moved or taken away because the surface is another size.
   */
  setSurface(width: number, by: { scale: number; x: number; y: number }): void {
    this.home = homeDisc(width, by)
  }

  /** Whether a place is on or round the home control, where a touch is the grown-up's and not the game's. */
  onHome(at: Point): boolean {
    return Math.hypot(at.x - this.home.x, at.y - this.home.y) <= this.home.r + HOME_MARGIN
  }

  /** The strips that lie flat: the ones the view bakes into its floor and the toys travel on. */
  get flat(): Strip[] {
    return this.state.strips.filter((strip) => !this.pressings.some((pressing) => pressing.strip === strip))
  }

  get playing(): boolean { return this.sceneOn }

  /**
   * How loud a habit is: full while a finger is down and for a while after the last touch ended, then fading
   * until the town runs in silence. The quiet never runs under a held finger.
   */
  get level(): number {
    if (this.finger) return 1
    return Math.max(0, Math.min(1, 1 - (this.time - this.touchedAt - 15) / 20))
  }

  /** A sound that answers a touch, at its full loudness. */
  say(sound: Sound): void {
    if (HONKS.has(sound.name)) this.honkAt = this.time
    this.sounds.push(sound)
  }

  /**
   * A sound of a toy's own habit: quieter the longer the child has only watched, and not made at all in the end.
   * Only the sound goes: what the habit does and leaves behind, it does and leaves every time.
   */
  hum(sound: Sound): void {
    const level = this.level
    if (level > 0) this.say(level >= 1 ? sound : soften(sound, level))
    // A honk nobody hears is still a honk: the cat's eye opens at it.
    else if (HONKS.has(sound.name)) this.honkAt = this.time
    if (sound === hoot) this.hooted()
  }

  /** The train hooted: the dog, wherever it is, sits and howls along. */
  private hooted(): void {
    const dog = this.bodies.dog
    // Under a finger that rests on it the dog is left alone.
    if (!this.state.out || dog.flight || this.stopped('dog') || (dog.doing.is !== 'stand' && dog.doing.is !== 'walk' && dog.doing.is !== 'ride')) return
    const after = dog.doing.is === 'stand' ? null : dog.doing
    dog.doing = { is: 'act', name: 'howl', t: 0, cue: 0, from: { ...dog.at }, to: null, after, flip: false, still: false }
  }

  puff(kind: Fx['kind'], x: number, y: number): void {
    // Ripples, bubbles, steam, leaves and puffs are left every time, however quiet the town has grown.
    if (this.fx.length >= 48) this.fx.shift()
    this.fx.push({ kind, x, y, at: this.time, turn: this.rng.next() * Math.PI * 2 })
  }

  mark(how: 'soon' | 'now'): void {
    if (this.changed !== 'now') this.changed = how
  }

  takeSounds(): Sound[] {
    const sounds = this.sounds
    this.sounds = []
    return sounds
  }

  /** Whether a scene was ended by a touch, or the game put away, since the last call: the Mount cuts what is still sounding. */
  takeCut(): boolean {
    const cut = this.cut
    this.cut = false
    return cut
  }

  cutScene(): void { this.cut = true }

  takeChanged(): 'no' | 'soon' | 'now' {
    const changed = this.changed
    this.changed = 'no'
    return changed
  }

  saved(): Record<string, unknown> {
    this.noteTails()
    const record = serializeTown(this.state)
    this.state.tail = {}
    return record
  }

  /** Writes down who travels its tape tail first, for the save: the train on its run back, a toy backing away to turn. */
  private noteTails(): void {
    this.state.tail = {}
    if (!this.state.out) return
    for (const id of MOVERS) {
      const body = this.bodies[id], doing = body.doing
      if (body.flight || doing.is !== 'ride' || !this.nets[doing.kind].strips[doing.rider.s]) continue
      if (id === 'train' ? Math.cos(body.at.a - headingOf(this.nets[doing.kind], doing.rider)) < 0 : doing.back) this.state.tail[id] = true
    }
  }

  /** The strips are not what they were: the joins and crossings are worked out again, and every toy is settled on what it now stands on. */
  stripsChanged(quiet = false): void {
    const flat = this.flat, old = this.nets as Record<Kind, Network> | undefined
    this.nets = Object.fromEntries(KINDS.map((kind) => [kind, network(flat, kind)])) as Record<Kind, Network>
    this.crossings = crossingsOf(flat)
    this.layer++
    if (!quiet) resettle(this, old)
  }

  /** Where a toy is drawn and touched now: on its way when it is in the air, on the bus's roof when it rides. */
  poseOf(id: ToyId): Pose & { lift: number } {
    const body = this.bodies[id], flight = body.flight
    if (flight) {
      if (!flight.started) return { ...flight.from, lift: 0 }
      const p = Math.min(1, flight.t / flight.lasts), e = ease(p)
      return { x: flight.from.x + (body.at.x - flight.from.x) * e, y: flight.from.y + (body.at.y - flight.from.y) * e, a: flight.from.a + (body.at.a - flight.from.a) * e, lift: arc(p) }
    }
    if (body.doing.is === 'held') return { ...body.at, lift: 0.8 }
    if (this.state.riding[id as PegId]) return { ...roofOf(this, id as PegId), lift: 0.35 }
    return { ...body.at, lift: 0 }
  }

  press(at: Point): void { pressTouch(this, at) }
  move(at: Point): void { moveTouch(this, at) }
  /** The quiet counts from the end of the last touch, however it ended. */
  lift(): void { const down = this.finger !== null; liftTouch(this); if (down) this.touchedAt = this.time }
  cancel(): void { const down = this.finger !== null; cancelTouch(this); if (down) this.touchedAt = this.time }
  tipOut(): void { tipOut(this) }
  callHome(): void { callHome(this) }

  /**
   * Whether a finger rests on this toy and has not picked it up: it stands still under the finger, and nobody sends
   * it hopping or calls it away. The bus stands still under a finger on a peg on its roof.
   */
  stopped(id: ToyId): boolean {
    const hold = this.hold
    if (!hold || hold.carried) return false
    return hold.id === id || (id === 'bus' && this.state.riding[hold.id as PegId] === true)
  }

  /** One step of attended time, in seconds. */
  step(dt: number): void {
    if (dt <= 0) return
    this.time += dt
    this.frames++
    const pull = this.pull
    if (pull) {
      pull.speed += (pull.moved / dt - pull.speed) * 0.35
      pull.moved = 0
    }
    // The press runs along each new strip, and the pat lands when it reaches the far end.
    for (const pressing of [...this.pressings]) {
      pressing.t += dt
      if (pressing.t < pressing.lasts) continue
      this.pressings = this.pressings.filter((other) => other !== pressing)
      this.say(pat)
      this.stripsChanged()
      // Whoever wants that tape sets off for it at once.
      call(this, pressing.strip)
    }
    if (this.lifting.length) {
      for (const lifting of this.lifting) lifting.t += dt
      this.lifting = this.lifting.filter((lifting) => lifting.t < 0.35)
    }
    let flying = false
    this.moving = false
    for (const id of TOY_IDS) {
      const body = this.bodies[id], flight = body.flight
      if (flight) {
        flying = flying || flight.scene
        this.moving = true
        if (!flight.started) {
          flight.wait -= dt
          if (flight.wait <= 0) {
            // Off the floor in this step, and heard in this step.
            flight.started = true
            flight.t = Math.max(dt * 0.5, -flight.wait)
            if (flight.loud) this.say(flight.off)
            else this.hum(flight.off)
          }
        } else flight.t += dt
        if (flight.started && flight.t >= flight.lasts) {
          body.flight = null
          body.landedAt = this.time
          if (flight.loud) this.say(flight.land)
          else this.hum(flight.land)
          if (flight.then === 'decide' && this.state.out) decide(this, id, true)
        }
      }
      const cues = TAPPED_MOVE[id].cues
      while (body.cue < cues.length && body.cue > 0 && this.time - body.tappedAt >= cues[body.cue]) this.say(TAPPED[id][body.cue++])
    }
    if (this.sceneOn && !flying) this.sceneOn = false
    if (this.state.out) {
      for (const id of MOVERS) {
        const body = this.bodies[id]
        // The clocks of its way to its tape run on the town's time, in the air as on the floor.
        if (body.onto) body.wayFor += dt
        body.lookIn -= dt
        if (body.flight || (body.doing.is !== 'walk' && body.doing.is !== 'ride')) this.waiting.delete(id)
        if (body.flight || this.stopped(id)) continue
        stepToy(this, id, dt)
        if (body.doing.is !== 'stand') this.moving = true
        // A save holds a toy where it is; one that is leaving its tape, where it will stand; one in the hand, where it was picked up.
        const doing = body.doing
        if (doing.is !== 'held') this.state.toys[id] = doing.is === 'act' && doing.to ? doing.to : body.at
      }
      for (const peg of PEGS) if (this.state.riding[peg] && !this.bodies[peg].flight && this.bodies[peg].doing.is !== 'held') this.state.toys[peg] = this.bodies[peg].at = { ...this.bodies.bus.at }
    }
    stepGates(this, dt)
    if (this.fx.length) this.fx = this.fx.filter((fx) => this.time - fx.at < 1.4)
    // A town that runs by itself is saved now and then, so that a crash loses little.
    if (this.moving && this.time - this.savedAt > 4) { this.savedAt = this.time; this.mark('soon') }
  }

  /** The one move the idle ladder shows: a pull of tape across the barest boards, or a tap on the box when the toys are in it. */
  hint(): Hint {
    if (!this.state.out) return { tap: { x: BOX.x + BOX.w / 2, y: BOX.y + BOX.h / 2 } }
    const car = this.bodies.car.at, field = this.field
    const clamp = (at: Point): Point => ({ x: Math.min(field.x1 - 60, Math.max(field.x0 + 60, at.x)), y: Math.min(field.y1 - 60, Math.max(field.y0 + 60, at.y)) })
    let from = clamp({ x: car.x + Math.cos(car.a) * 90, y: car.y + Math.sin(car.a) * 90 }), heading = car.a
    const doing = this.bodies.car.doing
    if (doing.is === 'ride') {
      const strip = this.nets[doing.kind].strips[doing.rider.s]
      from = clamp(along(strip, doing.rider.dir === 1 ? lengthOf(strip) : 0))
      heading = Math.atan2(strip.by - strip.ay, strip.bx - strip.ax) + (doing.rider.dir === 1 ? 0 : Math.PI)
    }
    let best: { to: Point; room: number } | null = null
    // The first ways it looks are the ones it takes where they are bare; the rest are for a crowded floor.
    for (const bend of [0.8, -0.8, 1.6, -1.6, 2.4, -2.4, 0, Math.PI, 0.4, -0.4, 1.2, -1.2, 2, -2, 2.8, -2.8]) {
      if (best && best.room > 0 && ![0.8, -0.8, 1.6, -1.6, 2.4, -2.4, 0, Math.PI].includes(bend)) break
      const to = clamp({ x: from.x + Math.cos(heading + bend) * 260, y: from.y + Math.sin(heading + bend) * 260 })
      if (Math.hypot(to.x - from.x, to.y - from.y) < 180) continue
      const middle = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
      const fromToys = Math.min(...TOY_IDS.filter((id) => id !== 'car').map((id) => Math.min(Math.hypot(this.bodies[id].at.x - to.x, this.bodies[id].at.y - to.y), Math.hypot(this.bodies[id].at.x - middle.x, this.bodies[id].at.y - middle.y)) - TOY_SIZE[id].r))
      const fromTape = Math.min(Infinity, ...this.state.strips.map((strip) => Math.min(nearestOn(strip, to).off, nearestOn(strip, middle).off) - TAPE_WIDTH))
      // Ending on a toy is worse than ending beside tape: on a crowded floor it ends on no toy first.
      const room = fromToys > 0 ? Math.min(fromToys, fromTape) : fromToys - 1000
      if (!best || room > best.room + 20) best = { to, room }
    }
    return { from, to: best ? best.to : clamp({ x: (field.x0 + field.x1) / 2, y: (field.y0 + field.y1) / 2 }) }
  }
}
