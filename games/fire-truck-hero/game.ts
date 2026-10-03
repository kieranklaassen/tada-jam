// The game on the toy: the hose meets the things of a yard. No renderer and
// no DOM. This module joins the toy (toy.ts), the rules of a yard (world.ts),
// the saved state (save.ts), the scenes (scenes.ts) and the motion of every
// thing (yardMotion.ts). The Mount hands it touches and frames and asks it
// what to save; the stage draws what it holds and decides nothing.
//
// Water lands where the finger is, and what stands there takes it:
// - a thing of the yard gets a gulp, and the grid says what that does;
// - the bell on the gate rings, and its third ring opens the gate;
// - the truck takes no water;
// - open sand gets wet.
// A stream that crosses a thing fast is a sweep: the thing answers and keeps
// no water. Nothing is rated or counted for the child, and nothing a child
// does is refused.

import { cellOf } from './grid'
import { cellAt, levelOf, PUDDLE_AT } from './ground'
import type { Gulp } from './hose'
import { arcTo, nozzleFor } from './jet'
import { BELL, GATE, NOZZLE, PEEK_REACH_Z, PEEK_X, type Place } from './layout'
import { placeOf, targetAt } from './places'
import { deserializeSave, driveOn, serializeSave, withYard, yardOf, type Save } from './save'
import { Scene } from './scene'
import { driveScene, endedChannels, endingOf, onTheWay, restChannels, wormScene, type Channels, type Directions, type Mark, type OnTheWay } from './scenes'
import { THINGS, type Kind } from './things'
import { Toy, type Touched } from './toy'
import { honk as honkVoice, plip, splat, squelch, SPLAT_VARIANTS, type VoiceSpec } from './voices'
import { gulpOn, gulpOnGround, honk, rest as restYard, sweepOver, type Step, type Yard, type YardEvent } from './world'
import { arrangementsOf } from './yards'
import { YardMotion } from './yardMotion'
import { beeBuzz, beeLands, bellRing, cellVoice, drip, duckQuack, duckTapsFloor, gateSwings, onPlastic, petalOpens, showSpit, snailGlides, steamFades, truckRolls, wormPops } from './yardVoices'

/** A landing point that moves faster than this, in yard units a second, is sweeping. */
export const SWEEP_SPEED = 4.2
/** A thing answers a sweep at most this often, in seconds. */
export const SWEEP_AGAIN_S = 0.7
/** Rings it takes to open the gate. */
export const RINGS_TO_OPEN = 3
/** The latch drops again after this long without a ring, in seconds, so a passing sweep opens nothing. */
export const LATCH_DROPS_S = 3.5
/** How long a new yard waits untouched before the truck shows a thing the child has not met, in seconds. */
export const SHOW_AFTER_S = 1.6
/** The showings of one yard come this far apart, in seconds. */
export const SHOW_EVERY_S = 1.4
/** How long the hose must have been still before the truck's nozzle turns back to what wants water, in seconds. */
export const AT_REST_AFTER_S = 1.1

/** What the Mount should do about saving after a touch or a frame. */
export type SaveNeed = 'none' | 'soon' | 'now'

/** A small spit of water on its way to a thing the truck is showing. */
type Spit = { thing: number; landsAt: number }

export class Game extends Toy {
  save: Save
  yard: Yard
  /** The motion of everything in the yard on screen. */
  motion: YardMotion
  /** During a drive: the yard being left and its motion, which slide away. Null otherwise. */
  leaving: { yard: Yard; motion: YardMotion } | null = null
  /** The scene channels of the yard on screen. */
  readonly channels: Channels = restChannels()
  /** Rings of the bell so far, 0 to 2: how far the latch is lifted. */
  latch = 0
  /** Where a worm is up, or null. */
  wormAt: Place | null = null
  /** How much of a drop hangs from the nozzle's tip while the truck rests, 0 to 1. */
  hangingDrop = 0
  /** What the Mount should do about saving. It reads this and sets it back to 'none'. */
  needsSave: SaveNeed = 'none'
  private scene: Scene | null = null
  private skipSounds = false
  private lastRingAt = -Infinity
  private lastSweep = { thing: -2, at: -Infinity }
  private lastGroundSweepAt = -Infinity
  private readonly launchSpeed = new Map<number, number>()
  private stillSince = 0
  private nextShowAt = Infinity
  private readonly spits: Spit[] = []
  private clock = 0
  private putts = 0
  private tapsHeard = 0

  constructor(play: (voice: VoiceSpec) => void, raw: unknown, childAge: number | null, private readonly seed = 1) {
    super(play)
    this.save = deserializeSave(raw, childAge)
    this.yard = yardOf(this.save)
    this.motion = new YardMotion(this.yard, seed)
    this.settle()
  }

  // --- Touch ---------------------------------------------------------------

  /** The finger lands. A scene that is playing ends first, and the touch is then an ordinary touch. */
  override press(touched: Touched, now: number): void {
    this.clock = now
    this.endScene()
    this.touched(now)
    if (touched.truck) {
      this.apply(honk(this.yard), now)
      this.truck.honk()
      this.play(honkVoice())
      return
    }
    super.press(touched, now)
  }

  // --- Frames ----------------------------------------------------------------

  override step(seconds: number, now: number): void {
    this.clock = now
    super.step(seconds, now)
    if (this.hose.holding) {
      this.touched(now)
      this.sweep(now)
    }
    if (this.hose.flying.length > 0) this.stillSince = now
    if (this.latch > 0 && now - this.lastRingAt > LATCH_DROPS_S) {
      this.latch = 0
      this.motion.latchDown()
    }
    // The duck's beak on a dry floor is heard a few times after a touch, and then it taps in silence: an idle yard goes quiet.
    if (this.motion.duck.tapped && this.tapsHeard++ < 3) this.say(duckTapsFloor())
    this.show(now)
    this.scene?.update(now)
    if (this.scene && !this.scene.running) this.scene = null
    this.atRest(seconds, now)
    this.motion.step(seconds, this.yard, this.channels)
    this.leaving?.motion.step(seconds, this.leaving.yard, this.leaving.motion.ownChannels)
  }

  /** The hose's stream stopped: the wheel runs down. Called by the toy's step through the hose. */
  protected override rested(): void {
    this.apply(restYard(this.yard), this.clock)
    this.motion.runDown()
  }

  /** The game goes to rest: a scene lands at its end, and water in the air lands silently, so nothing is lost. */
  override rest(): void {
    this.endScene()
    this.skipSounds = true
    for (const gulp of this.hose.clear()) this.land(gulp)
    this.skipSounds = false
    this.drops.clear()
    this.spits.length = 0
  }

  /** A scene is playing: the Mount keeps the idle ladder down meanwhile. */
  get sceneRunning(): boolean {
    return this.scene !== null
  }

  /** Where the truck is on its way to the next yard, or null when it stands in its place. */
  get way(): OnTheWay | null {
    return this.leaving ? onTheWay(this.channels) : null
  }

  /** What an idle child is shown: the thing that wants water, or the bell once the want is met. */
  get wants(): Place {
    return this.yard.met ? BELL : placeOf(this.yard, this.yard.want)
  }

  /** How wide the thing an idle child is shown is, so the glow goes round it and is not hidden under it. */
  get wantsReach(): number {
    if (this.yard.met) return 0.85
    const kind = this.yard.things[this.yard.want]?.kind
    return kind === 'pool' ? 1.66 : kind === 'seed' ? 1.2 : 1.32
  }

  /** The kind of thing that wants water in the yard beyond the gate: what shows over the fence. */
  get waits(): Kind | null {
    const plan = arrangementsOf(this.save.next.place)[this.save.next.arrangement]
    return plan?.things[plan.want]?.kind ?? null
  }

  /** What goes to storage: the yard as it stands, with nothing in the air. */
  snapshot(): Save {
    return serializeSave(withYard(this.save, this.yard))
  }

  // --- Water -----------------------------------------------------------------

  protected override leave(gulp: Gulp): void {
    super.leave(gulp)
    this.launchSpeed.set(gulp.id, this.hose.aimSpeed)
  }

  /** A gulp arrives. What stands where it lands takes it. */
  protected override land(gulp: Gulp): void {
    const { x, z } = gulp.arc.to
    const fast = (this.launchSpeed.get(gulp.id) ?? 0) > SWEEP_SPEED
    this.launchSpeed.delete(gulp.id)
    const target = targetAt(this.yard, x, z)
    if (target.on === 'thing') {
      // Water thrown in passing is the sweep, which was answered as the stream crossed.
      if (fast) return
      this.apply(gulpOn(this.yard, target.index), this.clock)
    } else if (target.on === 'bell') {
      this.ring(this.clock)
    } else if (target.on === 'truck') {
      // The truck takes no water. A cat on its roof goes on washing her paw.
      const cat = this.yard.things.findIndex((thing) => thing.spot === 'roof')
      if (cat >= 0) this.apply(gulpOn(this.yard, cat), this.clock)
      else this.say(onPlastic(this.variants.next(3)))
    } else {
      this.landOnSand(x, z, fast)
      // The one who waits beyond the fence is touchable too: water by the fence in front of it makes it hop.
      // The snail's shell waits on the gate's left post; the others wait further along the fence.
      const peekX = this.waits === 'patch' ? GATE.x - GATE.half : PEEK_X
      if (z < PEEK_REACH_Z && Math.abs(x - peekX) < 1.7 && this.waits) this.peekHop()
    }
  }

  private landOnSand(x: number, z: number, fast: boolean): void {
    const cell = cellAt(x, z)
    const before = cell < 0 ? 0 : this.yard.ground[cell]
    const was = levelOf(before)
    const variant = this.variants.next(SPLAT_VARIANTS)
    if (was === 'mud') this.say(squelch(variant))
    else if (was === 'puddle') this.say(plip(variant))
    else if (!fast) this.say(splat(this.paint.at(x, z).damp / 255, variant))
    const step = gulpOnGround(this.yard, x, z)
    this.apply(step, this.clock, { x, z })
    if (cell < 0) return
    const now = levelOf(this.yard.ground[cell])
    if (before < PUDDLE_AT && now !== 'damp') this.paint.puddle(x, z)
    if (now === 'mud' && was !== 'mud') this.paint.mud(x, z)
  }

  private peekHop(): void {
    this.motion.peeked()
    const kind = this.waits
    if (kind === 'pool') this.say(duckQuack(this.variants.next(3)))
    else if (kind === 'seed') this.say(beeBuzz(true))
    else this.say(drip(this.variants.next(3)))
  }

  /** A fast stream crosses a thing: it answers, and keeps no water. On open sand the sweep is a line and a whisper. */
  private sweep(now: number): void {
    if (this.hose.aimSpeed <= SWEEP_SPEED) return
    const target = targetAt(this.yard, this.hose.aim.x, this.hose.aim.z)
    if (target.on === 'thing') {
      if (this.lastSweep.thing === target.index && now - this.lastSweep.at < SWEEP_AGAIN_S) return
      this.lastSweep = { thing: target.index, at: now }
      this.apply(sweepOver(this.yard, target.index), now)
    } else if (target.on === 'ground' && now - this.lastGroundSweepAt > SWEEP_AGAIN_S) {
      this.lastGroundSweepAt = now
      this.say(cellVoice(cellOf('patch', 'sweep').voice, 0, this.variants.next(3)))
    }
  }

  // --- What the rules said -----------------------------------------------------

  /** Takes a step of the rules: the yard, its sounds, its motion, its scenes, and what to save. */
  private apply(step: Step, now: number, at?: Place): void {
    const before = this.yard
    this.yard = step.yard
    if (step.yard !== before) this.need('soon')
    for (const event of step.events) this.hear(event, before, now, at)
  }

  private hear(event: YardEvent, before: Yard, now: number, at?: Place): void {
    if (event.type === 'result') {
      if (event.thing >= 0) {
        const thing = this.yard.things[event.thing]
        const fullness = Math.min(1, (thing?.gulps ?? 0) / THINGS[event.kind].fill)
        this.say(cellVoice(cellOf(event.kind, event.action).voice, fullness, this.variants.next(3)))
        this.motion.result(event.thing, event.action, this.yard)
        this.around(event.thing, event.kind, event.action)
        // What a neighbour passes on is seen on the ground on its way.
        if (event.action === 'neighbour') this.runOff(before, event.thing)
      } else if (event.action === 'neighbour' && event.cell !== undefined) {
        // An overflow with nothing below it: a tongue of water on the sand beside the pool.
        const x = (event.cell % 16) + 0.5, z = Math.floor(event.cell / 16) + 0.5
        this.paint.splash(x, z, 1.2, 0.9)
        if (levelOf(this.yard.ground[event.cell]) !== 'damp') this.paint.puddle(x, z)
      }
    } else if (event.type === 'moved') {
      this.motion.moved(event.thing, before, this.yard)
      this.need('now')
    } else if (event.type === 'secret') {
      this.need('now')
      if (event.id === 'worm' && at) this.startWorm(at, now)
      else this.motion.secret(event.id, this.yard)
    } else if (event.type === 'want-met') {
      this.startEnding(now)
    } else if (event.type === 'honk') {
      this.motion.honked(this.yard)
    }
  }

  /** What the animals and the air round a thing do about a result: a quack, a buzz, drops flung off a wheel or a wet cat. */
  private around(index: number, kind: Kind, action: 'gulp' | 'fill' | 'too-much' | 'sweep' | 'neighbour'): void {
    const at = placeOf(this.yard, index)
    if (kind === 'pool' && (action === 'fill' || action === 'too-much')) this.say(duckQuack(this.variants.next(3)))
    else if (kind === 'seed' && action !== 'neighbour') this.say(beeBuzz(true))
    else if (kind === 'wheel' && (action === 'fill' || action === 'too-much')) this.drops.burst(at.x, 1.3, at.z, action === 'fill' ? 6 : 12, action === 'fill' ? 2.2 : 3.6)
    else if (kind === 'cat' && action === 'fill') this.drops.burst(at.x, 0.9, at.z, 10, 2.4)
  }

  /** Water passed on from one thing to another shows on the sand between them. */
  private runOff(before: Yard, to: number): void {
    const from = before.things.findIndex((thing, index) => thing.kind === 'pool' && before.runsTo === to && index !== to && thing.gulps >= THINGS.pool.fill)
    if (from < 0) return
    const a = placeOf(this.yard, from), b = placeOf(this.yard, to)
    for (let i = 1; i <= 6; i++) this.paint.splash(a.x + ((b.x - a.x) * i) / 7, a.z + ((b.z - a.z) * i) / 7, 1.4, 0.55)
  }

  // --- The bell and the way on -------------------------------------------------

  private ring(now: number): void {
    this.latch += 1
    this.lastRingAt = now
    this.say(bellRing(this.latch))
    this.motion.rang(this.latch)
    if (this.latch >= RINGS_TO_OPEN) this.driveOn(now)
  }

  /** The gate opens and the truck rolls on. The next yard is in the state from this moment: a put-away in the middle finds it there. */
  private driveOn(now: number): void {
    this.endScene()
    const left = this.yard
    const leftMotion = this.motion
    this.latch = 0
    this.wormAt = null
    this.scene = new Scene(driveScene(this.directions()))
    this.scene.start(now, () => {
      this.save = driveOn(withYard(this.save, left), left)
      this.yard = yardOf(this.save)
      this.need('now')
    })
    leftMotion.ownChannels = { ...this.channels }
    this.leaving = { yard: left, motion: leftMotion }
    this.truck.lightTurns()
    this.motion = new YardMotion(this.yard, this.seed + this.save.turn)
    // The yard that slides in is whole from its first frame: every thing in its place.
    this.motion.settle(this.yard, restChannels())
    Object.assign(this.channels, restChannels())
    this.putts = 0
  }

  /** The truck stands in the new yard. */
  private arrive(): void {
    this.leaving = null
    Object.assign(this.channels, restChannels())
    this.paint.fromGround(this.yard.ground)
    this.settle()
  }

  // --- Scenes ------------------------------------------------------------------

  private startEnding(now: number): void {
    const kind = this.yard.things[this.yard.want]?.kind
    if (!kind) return
    this.endScene()
    const beats = endingOf(kind, this.directions())
    this.scene = new Scene(beats)
    this.scene.start(now, () => {
      // The outcome: the want is met and the position has moved. Saved at once.
      this.save = withYard(this.save, this.yard)
      this.need('now')
    })
  }

  private startWorm(at: Place, now: number): void {
    if (this.scene) return
    this.wormAt = { x: at.x, z: at.z }
    for (const channel of ['wormUp', 'wormLooks', 'wormDown'] as const) this.channels[channel] = 0
    this.scene = new Scene(wormScene(this.directions()))
    // The mud that brought it up is already in the yard. Saved at once, with the yard.
    this.scene.start(now, () => this.need('now'))
  }

  /** A touch, or going to rest: the scene lands at its end, silently. */
  private endScene(): void {
    if (!this.scene) return
    this.skipSounds = true
    this.scene.finish()
    this.skipSounds = false
    this.scene = null
  }

  private directions(): Directions {
    return {
      set: (channel, value) => { this.channels[channel] = value },
      mark: (mark, n = 0) => this.marked(mark, n),
    }
  }

  private marked(mark: Mark, n: number): void {
    if (mark === 'arrived') return this.arrive()
    if (mark === 'worm-gone') this.wormAt = null
    const voices: Partial<Record<Mark, () => VoiceSpec>> = {
      drip: () => drip(n),
      'steam-fades': steamFades,
      quack: () => duckQuack(n),
      'duck-shakes': () => duckQuack(2),
      petal: () => petalOpens(n),
      'bee-lands': beeLands,
      'leaf-drip': () => drip(2),
      'snail-glides': snailGlides,
      'worm-pops': wormPops,
      'gate-swings': gateSwings,
      putt: () => truckRolls(this.putts++),
    }
    const voice = voices[mark]
    if (voice) this.say(voice())
  }

  // --- The first showing of a new thing ---------------------------------------

  /** The truck shows a thing the child has not met: one small spit, and the thing answers at half size. Never after a touch. */
  private show(now: number): void {
    while (this.spits.length > 0 && this.spits[0].landsAt <= now) {
      const spit = this.spits.shift()!
      const thing = this.yard.things[spit.thing]
      if (!thing) continue
      this.say(cellVoice(cellOf(thing.kind, 'gulp').voice, 0, 0))
      this.motion.shown(spit.thing, this.yard)
    }
    if (now < this.nextShowAt || this.leaving || this.scene) return
    const index = this.yard.things.findIndex((thing) => !this.save.seen.includes(thing.kind))
    if (index < 0) {
      this.nextShowAt = Infinity
      return
    }
    // It is shown once: the mark is saved as the showing starts.
    this.save = { ...this.save, seen: [...this.save.seen, this.yard.things[index].kind] }
    this.need('now')
    const arc = arcTo(NOZZLE, placeOf(this.yard, index))
    const { turn, tilt } = nozzleFor(arc)
    this.truck.aim(turn, tilt)
    this.truck.gulp(false)
    this.drops.spit(arc)
    this.say(showSpit())
    this.spits.push({ thing: index, landsAt: now + arc.seconds })
    this.nextShowAt = now + SHOW_EVERY_S
    this.stillSince = now
  }

  /** The child is acting: nothing is shown any more, and what stands in this yard counts as met. */
  private touched(now: number): void {
    this.stillSince = now
    this.tapsHeard = 0
    if (this.nextShowAt === Infinity) return
    this.nextShowAt = Infinity
    const met = this.yard.things.map((thing) => thing.kind).filter((kind) => !this.save.seen.includes(kind))
    if (met.length === 0) return
    this.save = { ...this.save, seen: [...this.save.seen, ...new Set<Kind>(met)] }
    this.need('soon')
  }

  // --- The truck at rest -------------------------------------------------------

  /** The truck's want shows all the time: at rest its nozzle turns to what wants water and a drop hangs from its tip. */
  private atRest(seconds: number, now: number): void {
    const resting = !this.hose.holding && !this.leaving && now - this.stillSince > AT_REST_AFTER_S && !this.yard.met
    if (resting) {
      const { turn, tilt } = nozzleFor(arcTo(NOZZLE, this.wants))
      this.truck.aim(turn, tilt)
    }
    // With the fire out it settles: its nozzle comes round to the front and droops.
    if (this.channels.settle > 0 && !this.hose.holding && now - this.stillSince > AT_REST_AFTER_S) this.truck.aim(0.2, -0.2)
    this.hangingDrop = Math.min(1, Math.max(0, this.hangingDrop + (resting ? seconds / 1.2 : -seconds / 0.15)))
    // It leans toward a flame with its roof light turning.
    this.truck.eager(!this.leaving && this.yard.things.some((thing) => thing.kind === 'fire' && thing.gulps < THINGS.fire.fill))
  }

  // --- Housekeeping ------------------------------------------------------------

  /** Sets the game up from the state as it was left: nothing eases in and no scene replays. */
  private settle(): void {
    this.paint.fromGround(this.yard.ground)
    Object.assign(this.channels, restChannels())
    const kind = this.yard.things[this.yard.want]?.kind
    if (this.yard.met && kind) for (const channel of endedChannels(kind)) this.channels[channel] = 1
    // How far the snail had glided is short-lived: it is found on its patch, out.
    this.channels.glide = 0
    this.motion.settle(this.yard, this.channels)
    this.latch = 0
    this.stillSince = this.clock
    // A yard found with its want met has been played: nothing in it is shown.
    this.nextShowAt = this.yard.met || this.yard.things.every((thing) => this.save.seen.includes(thing.kind)) ? Infinity : this.clock + SHOW_AFTER_S
  }

  private say(voice: VoiceSpec): void {
    if (!this.skipSounds) this.play(voice)
  }

  private need(need: SaveNeed): void {
    if (need === 'now' || this.needsSave === 'none') this.needsSave = need
  }

  /** The ground of the yard is the toy's sand. */
  override get ground() {
    return this.yard?.ground ?? super.ground
  }

  override set ground(next) {
    if (this.yard) this.yard = this.yard.ground === next ? this.yard : { ...this.yard, ground: next }
    else super.ground = next
  }
}
