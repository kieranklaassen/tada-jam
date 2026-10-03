import { vehicle as defOf } from './cycle'
import { KIND, Particles, type Landing } from './fx'
import { TruckMotion } from './motion'
import { LAYOUT, TOOL_HOME } from './props'
import { react } from './reactions'
import type { VehicleDef, VehicleId } from './roster'
import { Scene } from './scene'
import { dripScene, openDriedPatch, puddleScene, sendOffScene, shineScene } from './scenes'
import { keptForShowing } from './showing'
import { reliefAt, silhouette } from './silhouette'
import { WANTS, drumJammed, foamHat, launchFoam, tasteFor, type Taste } from './tastes'
import { GRID_W, allShiny, dab, decode, type Carried, type Hand, type Surface, type Tool } from './surface'
import * as voices from './voices'
import type { VoiceSpec } from './voices'
import { landedOnNext, markShown, sendOff, throughPuddle, washed, type WashState } from './washState'

// The game in play, with no renderer and no browser: what is in the bay, what
// is in the hand, and what each touch sets going. The Mount turns a pointer
// into a `Target` and calls in; the view and the speaker read what comes out.

/** What a finger is on, as the view's picker found it. */
export type Target =
  | { kind: 'tool'; tool: Tool }
  /** A patch of the vehicle in the bay, and the point of its side that was touched (vehicle x and y). */
  | { kind: 'truck'; col: number; row: number; x: number; y: number }
  | { kind: 'next' }
  | { kind: 'puddle' }
  /** The tap on the rack's long arm. It is not a tool. */
  | { kind: 'tap' }
  /** A point of the bare floor. */
  | { kind: 'floor'; x: number; z: number }
  | { kind: 'none' }

export type Sound = { spec: VoiceSpec; gain: number }

export type Vehicle = { def: VehicleDef; surface: Surface; motion: TruckMotion }

/** Where the tool in hand is, in the world, and what it is doing. */
export type ToolSpot = { x: number; y: number; z: number; working: boolean }

/** A rub lays a dab each time the finger has crossed this share of a patch, and a held hose sprays again this often. */
const DAB_EVERY = 0.55
const HOSE_EVERY = 0.2
/** Small sounds from things landing and popping are spaced at least this far apart. */
const PLIP_GAP = 0.07
/** Where a tool waits by the vehicle when no finger is down: above the cab, out of the way of the paint. */
const READY: readonly [number, number, number] = [-1.6, 2.95, 1.0]
/** A vehicle's like or dislike answers at most this often, so a rub sets it off again and again without piling it up. */
const FEEL_GAP = 1.1
/** The furthest the tap swings on its arm, in radians. */
const TAP_SWING = 0.6
/** Two taps on a tool within this long are one taking, never a taking and a hanging up. */
const TWICE = 1.2
/** The nozzle on the rack lets a drop go about this often, in seconds. */
const DRIP_EVERY = 7

export class Play {
  hand: Hand = 'finger'
  readonly particles: Particles
  /** Sounds to play this frame. The Mount drains it. */
  readonly sounds: Sound[] = []
  /** Things that reached the floor this frame. The view drains it into the floor's marks. */
  readonly marks: Landing[] = []
  /** Set when something a save holds has changed, and when it has to be saved at once. The Mount clears both. */
  dirty = false
  urgent = false
  readonly tool: ToolSpot = { x: 0, y: 0, z: 0, working: false }
  bay: Vehicle
  next: Vehicle
  /** The vehicle on its way out during a send-off, or null. */
  leaving: Vehicle | null = null
  seconds = 0
  /** How far the tap has swung on its arm, in radians. The view turns it by this. */
  tapAngle = 0
  private tapSpeed = 0
  private readonly motions = new Map<VehicleId, TruckMotion>()
  private scene: Scene | null = null
  private pressing: Extract<Target, { kind: 'truck' }> | null = null
  private lastDab = { x: 0, y: 0, at: -1 }
  private slide = 0
  private variant = 0
  private rise = 0
  private lastPlip = -1
  private tapIn = 2.5
  private pendingDrip = false
  private tookAt = -9
  /** What the cloth has picked up and not yet wiped off. Not saved: on load the cloth hangs clean on the rack. */
  private carried: Carried | null = null
  private readonly felt = new Map<Taste['id'], number>()
  /** Small things that happen a moment after a touch: the blast of a sneeze, the second chug. */
  private later: { at: number; run: () => void }[] = []

  constructor(public state: WashState, seed = 0x77a5) {
    this.particles = new Particles(seed)
    this.bay = this.stand(state.bay.who, state.bay.cells, LAYOUT.bay)
    this.next = this.stand(state.next.who, state.next.cells, LAYOUT.door)
    this.rest()
    // A first visit that opens on dried mud has not had its showing yet.
    this.pendingDrip = !state.shown.includes('drip') && openDriedPatch(this.bay) !== null
  }

  /** The vehicles to draw, each with its pose. */
  get onStage(): Vehicle[] {
    return this.leaving ? [this.bay, this.next, this.leaving] : [this.bay, this.next]
  }

  get sceneRunning(): boolean {
    return this.scene?.running ?? false
  }

  /** Puts a vehicle of the roster on a spot, with the surface a save holds for it. */
  stand(who: VehicleId, cells: string, at: { x: number; z: number }): Vehicle {
    const def = defOf(who)
    let motion = this.motions.get(who)
    if (!motion) {
      motion = new TruckMotion(def.moves, def.wheels.map((wheel) => wheel.x), 0x9e37 + this.motions.size * 7919, def.partSwing * 1.1)
      this.motions.set(who, motion)
    }
    motion.homeX = at.x
    motion.homeZ = at.z
    // Its want is always visible: left to itself it keeps glancing at what it likes.
    motion.want = WANTS[who]
    return { def, surface: decode(cells) ?? silhouette(def), motion }
  }

  say(spec: VoiceSpec, gain = 1): void {
    this.sounds.push({ spec, gain })
  }

  /** A finger lands. Any touch ends a scene at once, and is then answered as a touch. */
  press(target: Target): void {
    this.scene?.finish()
    if (target.kind === 'tool') return this.take(target.tool)
    if (target.kind === 'next') return this.sendOff()
    if (target.kind === 'puddle') return this.puddle()
    if (target.kind === 'tap') return this.swingTap()
    if (target.kind === 'floor') return this.onFloor(target.x, target.z)
    if (target.kind !== 'truck') {
      // The wall, or nothing at all: still a knock, so no tap lands in silence.
      this.say(voices.plip(0.9), 0.5)
      return
    }
    this.pressing = target
    this.rise = 0
    this.slide = 0
    this.touch(target, true)
  }

  /** The finger moves, still down. `speed` is how fast it travels over the vehicle, in units a second. */
  drag(target: Target, speed: number): void {
    if (this.sceneRunning) return
    if (target.kind === 'tool' && this.hand !== target.tool && !this.pressing) return this.take(target.tool)
    if (target.kind !== 'truck') {
      // Off the vehicle the tool waits at its edge; the press on the body is let go.
      if (this.pressing) this.bay.motion.hold(null)
      this.pressing = null
      this.tool.working = false
      return
    }
    this.slide = speed
    const cell = (this.bay.def.side.x1 - this.bay.def.side.x0) / GRID_W
    const far = Math.hypot(target.x - this.lastDab.x, target.y - this.lastDab.y) >= cell * DAB_EVERY
    const fresh = !this.pressing
    this.pressing = target
    if (fresh || far) this.touch(target, fresh)
    else this.follow(target)
  }

  /** The finger lifts, or the touch is taken away. The tool stays in hand, where it was let go. */
  release(): void {
    this.pressing = null
    this.bay.motion.hold(null)
    this.bay.motion.lookAt = null
    this.tool.working = false
  }

  private take(tool: Tool): void {
    if (this.hand === tool) {
      // A second tap straight after taking it is a small child tapping twice: the tool stays in hand and says so again.
      if (this.seconds - this.tookAt < TWICE) {
        this.say(voices.take[tool](), 0.6)
        return
      }
      // Later, a tap on the tool in hand hangs it up again. A cloth that goes back to the rack is clean.
      this.hand = 'finger'
      this.carried = null
      this.say(voices.take.back())
      return
    }
    this.hand = tool
    this.carried = null
    this.tookAt = this.seconds
    this.say(voices.take[tool]())
    this.rest()
  }

  /** Puts the tool spot where a tool waits: by the vehicle when one is in hand. */
  private rest(): void {
    const home = this.hand === 'finger' ? TOOL_HOME.sponge : READY
    this.tool.x = this.hand === 'finger' ? home[0] : LAYOUT.bay.x + home[0]
    this.tool.y = home[1]
    this.tool.z = home[2]
    this.tool.working = false
  }

  private follow(target: Extract<Target, { kind: 'truck' }>): void {
    const motion = this.bay.motion
    this.tool.x = motion.homeX + target.x
    this.tool.y = target.y
    // The tool works on the surface that is really there: a wheel stands prouder than a door.
    this.tool.z = motion.homeZ + reliefAt(this.bay.def, target.col, target.row)
    this.tool.working = true
    motion.lookAt = { side: 0.95 + Math.max(-1, Math.min(1, target.x / 2)) * 0.25, up: Math.max(-0.3, Math.min(0.5, (target.y - 1.5) * 0.3)) }
  }

  /** The surface of the vehicle in the bay, into the live vehicle and the save. */
  setBaySurface(surface: Surface): void {
    if (surface === this.bay.surface) return
    this.bay.surface = surface
    this.state = washed(this.state, surface)
    this.dirty = true
  }

  /** One dab at the target: the surface changes, and the touch is answered for what it met. */
  private touch(target: Extract<Target, { kind: 'truck' }>, landed: boolean): void {
    const bay = this.bay
    const result = dab(bay.surface, this.hand, target.col, target.row, this.carried)
    if (!result.met.length) return
    this.carried = result.carries
    const wasShiny = allShiny(bay.surface)
    this.setBaySurface(result.surface)
    this.variant = (this.variant + 1 + (this.particles.random() < 0.3 ? 1 : 0)) % 4
    if (this.hand === 'cloth') this.rise = Math.min(1, this.rise + 0.12)
    const reaction = react(this.hand, result.met[0], { speed: Math.min(1, this.slide / 6), variant: this.variant, rise: this.rise })
    for (const spec of reaction.voices) this.say(spec)
    const wx = bay.motion.homeX + target.x, wz = bay.motion.homeZ + reliefAt(bay.def, target.col, target.row) + 0.04
    for (const b of reaction.bursts) {
      // A glint sits on the paint; everything else is thrown from it.
      if (b.kind === KIND.glint) for (let i = 0; i < b.count; i++) this.particles.emit(b.kind, wx + (this.particles.random() - 0.5) * 0.7, target.y + (this.particles.random() - 0.5) * 0.6, wz + 0.05, 0, 0, 0, b.size, b.life)
      else this.particles.burst(b.kind, b.count, wx, target.y, wz, b.speed, b.up, b.size, b.life)
    }
    bay.motion.hold({ x: target.x, y: target.y, force: reaction.force }, this.slide)
    if (landed) bay.motion.kick(target.x, reaction.kick)
    this.lastDab = { x: target.x, y: target.y, at: this.seconds }
    this.follow(target)
    // The vehicle's own opinion of this tool on this part of it.
    const taste = tasteFor(bay.def, this.hand, target.x, target.y)
    if (taste && this.seconds - (this.felt.get(taste.id) ?? -9) >= FEEL_GAP) {
      this.felt.set(taste.id, this.seconds)
      this.feel(taste, bay)
    }
    // The dab that leaves every patch shiny sets off the shine. The finger is let go of, so the scene is not ended by its own touch.
    if (!wasShiny && allShiny(bay.surface)) {
      this.release()
      this.start(shineScene(this, bay, target.x))
    }
  }

  /** The tap is not a tool: touched, it swings on its arm with a clink and gives no water. */
  private swingTap(): void {
    this.say(voices.clink())
    // One knock gives it one swing's worth: knocked again and again it does not swing higher and higher.
    this.tapSpeed = this.tapAngle >= 0 ? 3.2 : -3.2
  }

  /** A tool on the bare floor does its own thing there too: the hose wets it, the sponge leaves suds, anything else knocks up a little dust. */
  private onFloor(x: number, z: number): void {
    const p = this.particles
    if (this.hand === 'hose') {
      this.say(voices.spray(this.variant, false))
      p.burst(KIND.drop, 7, x, 0.3, z, 1.4, 1.6, 0.07, 0.8)
    } else if (this.hand === 'sponge') {
      this.say(voices.scrub(0.3, this.variant))
      p.burst(KIND.blob, 2, x, 0.25, z, 0.4, 0.6, 0.15, 0.8)
      p.burst(KIND.bubble, 3, x, 0.25, z, 0.4, 0.6, 0.11, 1.2)
    } else {
      this.say(voices.poke.knock(), 0.5)
      p.burst(KIND.dust, 3, x, 0.12, z, 0.7, 0.4, 0.26, 0.6)
    }
    this.variant = (this.variant + 1) % 4
  }

  private after(seconds: number, run: () => void): void {
    this.later.push({ at: this.seconds + seconds, run })
  }

  /** A like or a dislike, set off by the touch that just landed. What it changes is saved at once. */
  private feel(taste: Taste, who: Vehicle): void {
    const def = who.def, m = who.motion, p = this.particles
    const x = m.homeX, z = m.homeZ
    if (taste.id === 'foam-toot') {
      // The bed bounces and the stack toots out bubbles.
      this.say(voices.feel.foamToot(def.horn.low))
      m.fling(3.2)
      for (let i = 0; i < 6; i++) p.emit(KIND.bubble, x - 1.0, 2.75, z + 0.98, (p.random() - 0.5) * 0.6, 1.2 + p.random(), 0.2, 0.13 + p.random() * 0.08, 1.4 + p.random())
    } else if (taste.id === 'sneeze') {
      // A breath in, then a sneeze that throws the bed up and launches whatever foam is on it, over to the one that waits.
      this.say(voices.feel.sneeze())
      m.squint = 1.5
      m.jolt(0.8)
      const launched = launchFoam(def, who.surface), waiting = this.next
      // Until the first showing has played, no foam lands on the dried patch it needs.
      const hat = launched.flew ? foamHat(waiting.surface, launched.flew, keptForShowing(waiting.def, waiting.surface, this.state.shown)) : null
      // Both ends of the throw go into the save now; the foam is seen to land a moment later.
      this.setBaySurface(launched.surface)
      if (hat) {
        this.state = landedOnNext(this.state, hat)
        this.dirty = true
        this.urgent = true
      }
      this.after(0.36, () => {
        m.fling(24)
        m.kick(-2, 1.6)
        p.burst(KIND.dust, 4, x + def.side.x0, 1.2, z + 0.6, 1.2, 0.4, 0.4, 0.7)
        for (let i = 0; i < Math.min(14, launched.flew * 2); i++) p.emit(KIND.blob, x + 0.6 + p.random() * 1.4, 2.2, z + (p.random() - 0.5), 2.4 + p.random() * 1.6, 3.2 + p.random() * 1.4, -0.3, 0.2, 2.2)
      })
      if (hat) this.after(1.2, () => { waiting.surface = hat; waiting.motion.kick(0, 0.6); waiting.motion.blink() })
    } else if (taste.id === 'ladder-whoop') {
      // The ladder shoots up, the siren whoops, and it squirts a small arc back from its roof.
      this.say(voices.feel.whoop())
      m.partTarget = def.partSwing
      this.after(FEEL_GAP + 0.2, () => { if (this.seconds - (this.felt.get('ladder-whoop') ?? -9) > FEEL_GAP) m.partTarget = 0 })
      for (let i = 0; i < 8; i++) this.after(0.2 + i * 0.04, () => p.emit(KIND.drop, x - 0.85, 2.2, z + 0.5, -0.4 + p.random() * 0.2, 2.6, 1.6 + p.random() * 0.4, 0.08, 1.6))
    } else if (taste.id === 'soap-eyes') {
      // It squeezes its eyes shut and blows bubbles through its grille. Bewildered, never hurt.
      this.say(voices.feel.raspberry())
      m.squint = 1.6
      m.kick(-2, 0.7)
      for (let i = 0; i < 7; i++) this.after(0.1 + i * 0.05, () => p.emit(KIND.bubble, x + def.side.x0 - 0.1, 0.95, z + (p.random() - 0.5) * 0.8, -1.2 - p.random(), 0.3, 0.4, 0.1 + p.random() * 0.07, 1.2))
    } else if (taste.id === 'polish-purr') {
      // It purrs in chugs, and the flap on its exhaust lifts with each one.
      this.say(voices.feel.chugs())
      for (let i = 0; i < 3; i++) this.after(i * 0.17, () => {
        m.fling(11)
        m.jolt(0.25)
        p.emit(KIND.dust, x - 1.1, 2.95, z + 0.2, 0, 0.8, 0, 0.22, 0.6)
      })
    } else if (taste.id === 'pipe-cough') {
      // A cough, a ring of steam, the flap clacking.
      this.say(voices.feel.cough())
      m.cross = 0.9
      for (const delay of [0, 0.2]) this.after(delay, () => { m.fling(18); m.kick(-1.1, 0.8) })
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2
        this.after(0.22, () => p.emit(KIND.dust, x - 1.1 + Math.cos(a) * 0.12, 3.0, z + 0.2 + Math.sin(a) * 0.12, Math.cos(a) * 0.7, 0.9, Math.sin(a) * 0.7, 0.3, 1.0))
      }
    } else if (taste.id === 'drum-turn') {
      if (drumJammed(def, who.surface)) {
        // Dried mud jams the drum: it creaks and twitches until that mud is wet.
        this.say(voices.feel.creak())
        m.fling(0.9)
        this.after(0.2, () => m.fling(-0.9))
        m.kick(1, 0.5)
      } else {
        // The drum turns, and what is on it goes round with it.
        this.say(voices.feel.rumble())
        m.fling(8)
        const kind = this.hand === 'hose' ? KIND.drop : this.hand === 'cloth' ? KIND.glint : this.hand === 'sponge' ? KIND.bubble : KIND.dust
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2
          this.after(i * 0.05, () => p.emit(kind, x + 1.0 + Math.cos(a) * 0.95, 2.05 + Math.sin(a) * 0.95, z + 1.0, kind === KIND.glint ? 0 : Math.cos(a) * 1.6, kind === KIND.glint ? 0 : Math.sin(a) * 1.6 + 0.6, 0.3, kind === KIND.glint ? 0.45 : 0.1, 0.9))
        }
      }
    } else {
      // Ticklish: the wheels spin and foam flies off the tyres.
      this.say(voices.feel.giggle(def.horn.high))
      m.spinWheels(20)
      m.squint = 0.9
      for (const delay of [0, 0.12, 0.24, 0.36]) this.after(delay, () => m.kick((p.random() - 0.5) * 3, 0.5))
      for (const wheel of def.wheels) for (let i = 0; i < 4; i++) this.after(i * 0.07, () => p.emit(KIND.blob, x + wheel.x, wheel.r, z + 1.0, (p.random() - 0.5) * 4, 2 + p.random() * 2, 0.6, 0.13, 1.3))
    }
  }

  private start(beats: ConstructorParameters<typeof Scene>[0], outcome: () => void = () => {}): void {
    this.scene = new Scene(beats)
    this.scene.start(this.seconds, outcome)
  }

  /** The child sends the vehicle in the bay off as it is, and the one that waits rolls in. */
  private sendOff(): void {
    this.release()
    // The tool in hand goes up out of the lane, so nothing drives through it, and a cloth forgets what it had on it from the vehicle that is leaving.
    this.rest()
    this.carried = null
    const leaving = this.bay, incoming = this.next
    let result = sendOff(this.state)
    const newcomer = this.stand(result.state.next.who, result.state.next.cells, { x: LAYOUT.door.x + 7, z: LAYOUT.door.z })
    // The first vehicle that rolls in with dried mud is shown what water does to it: marked now, played after it stops.
    const patch = result.state.shown.includes('drip') ? null : openDriedPatch(incoming)
    const beats = sendOffScene(this, leaving, incoming, newcomer)
    if (patch) {
      result = { ...result, state: markShown(result.state, 'drip') }
      const from = beats.reduce((end, beat) => Math.max(end, beat.at + beat.lasts), 0)
      const after = dripScene(this, incoming, patch)
      result.state = washed(result.state, after.surface)
      for (const beat of after.beats) beats.push({ ...beat, at: beat.at + from })
    }
    this.start(beats, () => {
      this.state = result.state
      this.leaving = leaving
      this.bay = incoming
      this.next = newcomer
      this.dirty = true
      this.urgent = true
    })
  }

  /** The vehicle that waits goes through the puddle. When the puddle has no more to add it only splashes. */
  private puddle(): void {
    const after = throughPuddle(this.state)
    const surface = after === this.state ? null : (decode(after.next.cells) ?? this.next.surface)
    this.start(puddleScene(this, this.next, surface), () => {
      if (after === this.state) return
      this.state = after
      this.dirty = true
      this.urgent = true
    })
  }

  /** One frame of attended time. */
  step(dt: number): void {
    this.seconds += dt
    if (this.pendingDrip && !this.sceneRunning) {
      this.pendingDrip = false
      const patch = openDriedPatch(this.bay)
      if (patch) {
        const drip = dripScene(this, this.bay, patch)
        this.start(drip.beats, () => {
          this.state = washed(markShown(this.state, 'drip'), drip.surface)
          this.dirty = true
          this.urgent = true
        })
      }
    }
    this.scene?.update(this.seconds)
    if (this.later.length) {
      const due = this.later.filter((cue) => cue.at <= this.seconds)
      if (due.length) {
        this.later = this.later.filter((cue) => cue.at > this.seconds)
        for (const cue of due) cue.run()
      }
    }
    // A held hose keeps spraying where it points.
    if (this.pressing && this.hand === 'hose' && this.seconds - this.lastDab.at >= HOSE_EVERY) this.touch(this.pressing, false)
    // The nozzle lets a drop go now and then while it hangs on the rack: it falls to the floor under it.
    this.tapIn -= dt
    if (this.tapIn <= 0) {
      this.tapIn = DRIP_EVERY * (0.7 + this.particles.random() * 0.6)
      if (this.hand !== 'hose') this.particles.emit(KIND.drop, TOOL_HOME.hose[0], TOOL_HOME.hose[1] - 0.56, TOOL_HOME.hose[2], 0, 0, 0, 0.09, 3)
    }
    // The tap hangs: a swing dies away by itself.
    if (this.tapAngle !== 0 || this.tapSpeed !== 0) {
      this.tapSpeed += (-38 * this.tapAngle - 1.6 * this.tapSpeed) * dt
      this.tapAngle += this.tapSpeed * dt
      // It can only swing so far on its arm.
      if (Math.abs(this.tapAngle) > TAP_SWING) {
        this.tapAngle = Math.sign(this.tapAngle) * TAP_SWING
        this.tapSpeed *= -0.3
      }
      if (Math.abs(this.tapAngle) < 1e-3 && Math.abs(this.tapSpeed) < 1e-2) this.tapAngle = this.tapSpeed = 0
    }
    for (const who of this.onStage) who.motion.step(dt)
    this.particles.step(dt, (landing) => {
      if (landing.kind !== KIND.bubble) this.marks.push(landing)
      if (this.seconds - this.lastPlip < PLIP_GAP) return
      this.lastPlip = this.seconds
      const size = Math.min(1, landing.size / 0.18)
      this.say(landing.kind === KIND.bubble ? voices.pop(size) : voices.plip(size), 0.5)
    })
  }
}
