import { Bits, type BitId } from './bits'
import { vehicle as defOf } from './cycle'
import { FACES, faceFor, isWrongUse, type FaceName } from './faces'
import { KIND, Particles, type Landing } from './fx'
import { TruckMotion } from './motion'
import { LAYOUT, TOOL_HOME, TOOL_MIDDLE } from './props'
import { queueMud, queueOf, queueSpot } from './queue'
import { react } from './reactions'
import type { VehicleDef, VehicleId } from './roster'
import { Scene } from './scene'
import { dripScene, openDriedPatch, puddleScene, sendOffScene, shineScene, softened } from './scenes'
import { keptForShowing } from './showing'
import { reliefAt, silhouette } from './silhouette'
import { bucketTop, floorSpot, wallSpot, type Spot } from './spots'
import { AT_DRUM, LIKED, drumJammed, foamHat, glanceAt, launchFoam, partHolds, tasteFor, type Taste } from './tastes'
import { GRID_W, allShiny, dab, dabCells, decode, tally, type Carried, type Hand, type Patch, type Surface, type Tool } from './surface'
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
  /** One of the two that wait in the yard: 0 is the head of the queue. */
  | { kind: 'queue'; place: number }
  /** A piece of the place that answers a touch: the roller brush, the pinwheel, the shelf, the lamp. */
  | { kind: 'bit'; bit: BitId }
  /** A point of the bare floor. */
  | { kind: 'floor'; x: number; z: number }
  /** The suds bucket under the sponge's place on the rack. */
  | { kind: 'bucket' }
  /** Nothing that answers by itself: the wall, the far yard, the sky. `at` is the point of the wall or the yard under the finger, when there is one. */
  | { kind: 'none'; at?: readonly [number, number, number] }

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
/** Within one rub a vehicle's like or dislike answers at most this often, so a rub sets it off again and again without piling it up. Every tap sets it off. */
const FEEL_GAP = 1.1
/** The furthest the tap swings on its arm, in radians. */
const TAP_SWING = 0.6
/** Two taps on a tool within this long are one taking, never a taking and a hanging up. */
const TWICE = 1.2
/** A vehicle makes a new face at most this often, so a rub does not flicker through them. */
const FACE_GAP = 0.55
/** Where one in the queue looks when it looks at the wash: straight ahead of it and a little down. */
const WATCHING = { side: 0.05, up: -0.08 }
/** How far the mixer's drum rocks round and back while it is left alone, in radians. */
const DRUM_ROCK = 0.2
/** How long after the game opens, or after a scene or a touch on the vehicle, the one at the door first tries to lick its nose; and the uneven gaps between its tries after that, in seconds. */
export const LICK_FIRST = 3.5
export const LICK_GAPS = [11, 15, 9, 13] as const
/** How far a jammed drum strains each way against the mud that holds it: a hair, and enough to be seen on the stripe of the drum. */
export const DRUM_STRAIN = 0.045
/** How long foam thrown by the sneeze is in the air before it lands on the one that waits, and how fast a blob of foam falls. */
const THROW = 1.0
const BLOB_FALL = 7.5 * 0.45
/** The floor a tool in hand can reach: in front of the vehicle in the bay, toward the child. Further back the vehicle is in the way. */
const FLOOR_FRONT = 1.35
/** The nozzle on the rack lets a drop go about this often, in seconds. */
const DRIP_EVERY = 7

export class Play {
  hand: Hand = 'finger'
  readonly particles: Particles
  /** Patches of the vehicle in the bay whose foam has just been piled up by the sponge, or whose mud the cloth has just pushed at. The view drains it: the foam there swells for a moment, the mud slides a little and comes back. */
  readonly swells: number[] = []
  /** Vehicles whose mud has just been shaken, as by braking. The view drains it and wobbles the lumps of mud on them. */
  readonly wobbles: VehicleId[] = []
  /** Sounds to play this frame. The Mount drains it. */
  readonly sounds: Sound[] = []
  /** Things that reached the floor this frame. The view drains it into the floor's marks. */
  readonly marks: Landing[] = []
  /** Where the jet of the hose hit the floor this frame. The view drains it: the foam lying there is pushed away along the floor. */
  readonly jets: { x: number; z: number }[] = []
  /** Set when something a save holds has changed, and when it has to be saved at once. The Mount clears both. */
  dirty = false
  urgent = false
  readonly tool: ToolSpot = { x: 0, y: 0, z: 0, working: false }
  bay: Vehicle
  next: Vehicle
  /** The two that wait their turn in the yard, the head of the queue first. They follow from who is in the bay and at the door. */
  queue: Vehicle[] = []
  /** The pieces of the place that move by themselves. */
  readonly bits = new Bits()
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
  /** Bubbles that have popped and clods that have landed, waiting for their sound: each is heard, a few a frame, so none waits long. */
  private pops: VoiceSpec[] = []
  private clacks: VoiceSpec[] = []
  private sentAt = -9
  private waits = false
  private ending = false
  private readonly glances = new Map<VehicleId, { side: number; up: number }>()
  private readonly aim: [number, number, number] = [0, 0, 0]
  private puddledAt = -9
  /** Which scene is running, or ran last. */
  private playing: 'send-off' | 'puddle' | 'shine' | 'drip' | null = null
  /** Where the jet of the hose is on the floor while a finger holds it there, and when it last sprayed; or null. */
  private spraying: { x: number; z: number; at: number } | null = null
  /** The patch of the vehicle in the bay that the last dab was on, or -1. The view lets a change spread out from it. */
  dabbed = -1
  private tapIn = 2.5
  private pendingDrip = false
  /** When the one at the door next tries to lick the mud off its own nose, and which gap comes after. */
  private lickAt = LICK_FIRST
  private licks = 0
  /** The showing that is owed was owed when the game was opened: it starts at the child's first touch and not by itself. */
  private atTouch = false
  private tookAt = -9
  /** What the cloth has picked up and not yet wiped off. Not saved: on load the cloth hangs clean on the rack. */
  private carried: Carried | null = null
  private readonly felt = new Map<Taste['id'], number>()
  private facedAt = -9
  private lastFace: FaceName = 'rest'
  /** Small things that happen a moment after a touch: the blast of a sneeze, the second chug. */
  private later: { at: number; run: () => void }[] = []

  /**
   * `found` says the state is a game that was put away and is opened again, and not a first visit: nothing plays when
   * it is opened, so a first showing that is still owed waits for the child's first touch.
   */
  constructor(public state: WashState, seed = 0x77a5, found = false) {
    this.particles = new Particles(seed)
    this.bay = this.stand(state.bay.who, state.bay.cells, LAYOUT.bay)
    this.next = this.stand(state.next.who, state.next.cells, LAYOUT.door)
    this.queue = queueOf(state.bay.who, state.next.who).map((who, place) => this.wait(who, place))
    this.rest()
    this.wants()
    // A first visit that opens on dried mud has not had its showing yet.
    this.pendingDrip = !state.shown.includes('drip') && openDriedPatch(this.bay) !== null
    this.atTouch = found && this.pendingDrip
  }

  /** What the cloth in hand has on it: a beard of foam it is pushing, mud it has picked up, or nothing. */
  get clothWears(): 'foam' | 'mud' | null {
    if (this.hand !== 'cloth' || !this.carried) return null
    return this.carried.patch === 'm' ? 'mud' : 'foam'
  }

  /**
   * A want belongs to where a vehicle stands. In the bay or at the door it glances at the tool it likes, wherever that
   * tool is: on the rack, or in the child's hand. The mixer glances back at its own drum. In the queue each glances at the wash.
   */
  private wants(): void {
    for (const who of [this.bay, this.next]) {
      const liked = LIKED[who.def.id]
      if (!liked) {
        who.motion.want = AT_DRUM
        continue
      }
      let want = this.glances.get(who.def.id)
      if (!want) this.glances.set(who.def.id, (want = { side: 0, up: 0 }))
      const home = TOOL_HOME[liked], middle = TOOL_MIDDLE[liked]
      this.aim[0] = this.hand === liked ? this.tool.x : home[0] + middle[0]
      this.aim[1] = this.hand === liked ? this.tool.y : home[1] + middle[1]
      this.aim[2] = this.hand === liked ? this.tool.z : home[2] + middle[2]
      who.motion.want = glanceAt(who.def, who.motion.homeX, who.motion.homeZ, this.aim, want)
    }
    for (const who of this.queue) if (who.def.id !== this.leaving?.def.id) who.motion.want = WATCHING
  }

  /**
   * What the one at the door does by itself now and then while nothing else is going on: it goes cross-eyed at the mud
   * on its own nose and puts its tongue out to reach it. It is about its mud and not about waiting or about the child,
   * it makes no sound, and it changes nothing.
   */
  private idles(): void {
    if (this.seconds < this.lickAt) return
    // Not over a scene or under a finger: it waits for a quiet moment, and takes its time again after one.
    if (this.sceneRunning || this.pressing || tally(this.next.surface).mud === 0) {
      this.lickAt = this.seconds + LICK_FIRST
      return
    }
    this.next.motion.express(FACES.lick)
    this.lickAt = this.seconds + LICK_GAPS[this.licks++ % LICK_GAPS.length]
  }

  /** The vehicles to draw, each with its pose. */
  get onStage(): Vehicle[] {
    const on = this.leaving ? [this.bay, this.next, this.leaving] : [this.bay, this.next]
    // One that has just left is drawn as it left until it is gone; after that it is the one at the back of the queue.
    for (const who of this.queue) if (!on.some((other) => other.def.id === who.def.id)) on.push(who)
    return on
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
    motion.turn = 0
    motion.ground = 0
    motion.place()
    return { def, surface: decode(cells) ?? silhouette(def), motion }
  }

  /** Stands a vehicle of the roster at a place in the queue, in what it wears while it waits. */
  wait(who: VehicleId, place: number): Vehicle {
    const waiting = this.stand(who, '', queueSpot(place))
    waiting.surface = queueMud(who)
    waiting.motion.turn = queueSpot(place).turn
    waiting.motion.ground = queueSpot(place).ground
    // It stands turned toward the bay, so straight ahead is the wash: left to itself it keeps glancing there.
    waiting.motion.want = WATCHING
    waiting.motion.place()
    return waiting
  }

  say(spec: VoiceSpec, gain = 1): void {
    if (this.ending) return
    this.sounds.push({ spec, gain })
  }

  /**
   * A touch ends the scene that is playing: every beat lands where it was going, at once. What the beats still to
   * come would have sounded and thrown is left out, since the things that would have made those sounds are already
   * where they were going: a horn from a vehicle that has gone would be heard and not seen.
   */
  private endScene(): void {
    if (!this.sceneRunning) return
    this.ending = true
    this.particles.quiet = true
    this.scene?.finish()
    this.particles.quiet = false
    this.ending = false
  }

  /** A finger lands. Any touch ends a scene at once, and is then answered as a touch. */
  press(target: Target): void {
    // A second tap on the vehicle at the door straight after the first is a small child tapping twice: the send-off plays on, and the tap gets a toot.
    // By then the save has made that vehicle the one in the bay, though it still stands at the door, so the tap may come as either.
    if ((target.kind === 'next' || target.kind === 'truck') && this.sceneRunning && this.playing === 'send-off' && this.seconds - this.sentAt < TWICE) {
      this.say(voices.horn(this.bay.def.horn.low, this.bay.def.horn.high, this.bay.def.horn.hold * 0.5, 'plain'), 0.5)
      return
    }
    // The same for the puddle: a second tap straight after the first only splashes again in sound, and the trip through it plays on, so two quick taps are one trip.
    if (target.kind === 'puddle' && this.sceneRunning && this.playing === 'puddle' && this.seconds - this.puddledAt < TWICE) {
      this.say(voices.plip(0.2), 0.6)
      return
    }
    this.endScene()
    this.spraying = null
    // The first showing comes before the child's own try. A touch that would reach the vehicle before it has played
    // starts it instead, with a knock, so that no hose softens the dried patch the showing is about before the showing has shown it.
    if (this.showing()) {
      this.say(voices.plip(0.9), 0.5)
      return
    }
    if (target.kind === 'tool') return this.take(target.tool)
    if (target.kind === 'next') return this.sendOff()
    if (target.kind === 'puddle') return this.puddle()
    if (target.kind === 'tap') return this.swingTap()
    if (target.kind === 'queue') return this.nudge(target.place)
    if (target.kind === 'bit') return this.knock(target.bit)
    if (target.kind === 'floor') return this.onFloor(target.x, target.z)
    if (target.kind === 'bucket') return this.poke('bucket', bucketTop())
    if (target.kind !== 'truck') {
      // The window and the pipe on the back wall each have a small answer of their own.
      const onWall = target.kind === 'none' && target.at && Math.abs(target.at[2] - LAYOUT.wall.z) < 0.2 ? wallSpot(target.at[0], target.at[1]) : null
      if (onWall && target.kind === 'none' && target.at) return this.poke(onWall, target.at)
      // The wall, or nothing at all: still a knock, and a puff where the finger was, so no tap lands unheard or unseen.
      this.say(voices.plip(0.9), 0.5)
      if (target.kind === 'none' && target.at) this.particles.burst(KIND.dust, 2, target.at[0], target.at[1], target.at[2], 0.3, 0.2, 0.22, 0.5)
      return
    }
    this.pressing = target
    this.rise = 0
    this.slide = 0
    this.touch(target, true)
  }

  /**
   * A finger comes down so soon and so near after a rub that the touch takes it for the same rub carrying on and
   * reports no press. To the game a finger that comes down is a touch of its own, wherever it lands: it ends a
   * scene, and it is answered. What the rub had done is done already, so nothing of it is lost.
   */
  land(target: Target): void {
    this.press(target)
  }

  /** A second finger or a palm comes down while one finger is working. It does no work, and it is a touch: it ends a scene, and it gets a soft knock. */
  extra(): void {
    this.endScene()
    this.say(voices.plip(0.9), 0.35)
  }

  /** The finger moves, still down. `speed` is how fast it travels over the vehicle, in units a second. */
  drag(target: Target, speed: number): void {
    // A scene is not rubbed through, but for one: the shine starts under the cloth that set it off, and that rub goes on being answered, squeak and glint, while the vehicle shows off.
    if (this.sceneRunning && !(this.shining && target.kind === 'truck')) return
    // A finger still down from before a showing is due: its first move starts the showing, and lays no dab, so the hose in hand does not get to the dried patch first.
    if (this.showing()) return
    if (target.kind === 'floor' && this.spraying && this.hand === 'hose' && target.z >= FLOOR_FRONT) {
      // The jet is rubbed along the floor: it sprays again for every stretch it covers.
      const moved = Math.hypot(target.x - this.spraying.x, target.z - this.spraying.z)
      this.tool.x = target.x
      this.tool.z = target.z
      if (moved >= 0.3) this.onFloor(target.x, target.z)
      return
    }
    if (target.kind !== 'truck') {
      this.spraying = null
      // Off the vehicle the tool waits at its edge; the press on the body is let go.
      if (this.pressing) this.bay.motion.hold(null)
      this.pressing = null
      this.tool.working = false
      return
    }
    this.spraying = null
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
    this.spraying = null
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
    this.waits = this.hand !== 'finger'
  }

  /** The tool in hand is waiting by the vehicle, off the paint: it is drawn there, and a touch on it there is a touch on that tool. */
  get toolWaits(): boolean {
    return this.hand !== 'finger' && this.waits
  }

  private follow(target: Extract<Target, { kind: 'truck' }>): void {
    const motion = this.bay.motion
    this.waits = false
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
    this.dabbed = target.row * GRID_W + target.col
    const wasShiny = allShiny(bay.surface)
    this.setBaySurface(result.surface)
    this.variant = (this.variant + 1 + (this.particles.random() < 0.3 ? 1 : 0)) % 4
    if (this.hand === 'cloth') this.rise = Math.min(1, this.rise + 0.12)
    // The cloth on soft mud or on a smear: the mud there slides a little under it and comes back.
    if (this.hand === 'cloth' && (result.met[0] === 's' || result.met[0] === 'm') && this.swells.length < 32) this.swells.push(target.row * GRID_W + target.col)
    // The sponge on foam, or laying it on dry paint: the foam there stands up taller for a moment.
    if (this.hand === 'sponge' && (result.met[0] === 'b' || result.met[0] === 'f' || result.met[0] === 'd') && this.swells.length < 32) this.swells.push(target.row * GRID_W + target.col)
    const reaction = react(this.hand, result.met[0], { speed: Math.min(1, this.slide / 6), variant: this.variant, rise: this.rise })
    for (const spec of reaction.voices) this.say(spec)
    const wx = bay.motion.homeX + target.x, wz = bay.motion.homeZ + reliefAt(bay.def, target.col, target.row) + 0.04
    for (const b of reaction.bursts) {
      // A glint sits on the paint; everything else is thrown from it.
      if (b.kind === KIND.glint) for (let i = 0; i < b.count; i++) this.particles.emit(b.kind, wx + (this.particles.random() - 0.5) * 0.7, target.y + (this.particles.random() - 0.5) * 0.6, wz + 0.05, 0, 0, 0, b.size, b.life)
      // The jet pushes foam off the vehicle the way it points: down and toward the nose, away from the nozzle, which is held to the tail side of where it lands.
      else if (b.kind === KIND.blob && this.hand === 'hose') for (let i = 0; i < b.count; i++) this.particles.emit(b.kind, wx + (this.particles.random() - 0.5) * 0.3, target.y + (this.particles.random() - 0.5) * 0.3, wz, -1.1 - this.particles.random() * 0.9, -0.2 - this.particles.random() * 0.5, 0.5 + this.particles.random() * 0.4, b.size * (0.7 + this.particles.random() * 0.6), b.life)
      // A crack or a dent is left exactly where the finger was.
      else if (b.kind === KIND.crack || b.kind === KIND.dent) this.particles.emit(b.kind, wx, target.y, wz + 0.03, 0, 0, 0, b.size, b.life)
      else this.particles.burst(b.kind, b.count, wx, target.y, wz, b.speed, b.up, b.size, b.life)
    }
    const met = result.met[0]
    // Soft mud slumps under water and squelches under a finger: its lumps wobble.
    if ((met === 's' || met === 'm') && (this.hand === 'hose' || this.hand === 'finger') && !this.wobbles.includes(bay.def.id)) this.wobbles.push(bay.def.id)
    // Water on wet paint sheets off the sills: drops bounce up from the sill under the jet.
    if (this.hand === 'hose' && met === 'w') for (let i = 0; i < 4; i++) this.particles.emit(KIND.drop, wx + (this.particles.random() - 0.5) * 0.8, bay.def.side.y0 + 0.5, wz + 0.1, (this.particles.random() - 0.5) * 1.2, 1.6 + this.particles.random() * 1.2, 0.4 + this.particles.random() * 0.5, 0.06, 0.9)
    // The dab that leaves every patch shiny sets off the shine, before the vehicle's own like is felt: the scene turns a drum
    // once, so a drum is stopped where it is first, and a like felt from here on gives it no spin of its own.
    const shines = !wasShiny && allShiny(bay.surface)
    if (shines) {
      bay.motion.stillPart()
      this.audience()
      this.start('shine', shineScene(this, bay, target.x))
    }
    bay.motion.hold({ x: target.x, y: target.y, force: reaction.force }, this.slide)
    if (landed) bay.motion.kick(target.x, reaction.kick)
    this.lastDab = { x: target.x, y: target.y, at: this.seconds }
    this.follow(target)
    // The vehicle's own opinion of this tool on this part of it.
    let taste = tasteFor(bay.def, this.hand, target.x, target.y, target)
    // The tipper likes foam on it: a touch sets that off where it met foam or left foam, with any hand, and nowhere else.
    // A dab covers the patch under the finger and those beside it: foam met or left on any of them counts.
    const isFoam = (patch: Patch): boolean => patch === 'b' || patch === 'f'
    if (taste?.id === 'foam-toot' && !result.met.some(isFoam) && !dabCells(target.col, target.row).some((cell) => isFoam(bay.surface[cell]))) taste = null
    // Every tap on the part sets it off, every time; within one rub it comes again only after a moment.
    if (taste && (landed || this.seconds - (this.felt.get(taste.id) ?? -9) >= FEEL_GAP)) {
      this.felt.set(taste.id, this.seconds)
      this.facedAt = this.seconds
      this.feel(taste, bay)
    } else if (!taste) {
      // Its face at what just happened to it: the right use pleases, the wrong use gets the joke.
      const name = faceFor(this.hand, result.met[0], landed)
      if (this.seconds - this.facedAt >= FACE_GAP || (name !== this.lastFace && isWrongUse(this.hand, result.met[0]) && landed)) this.pull(bay, name, wx, target.y, wz)
    }
    // The finger is let go of when the shine has started, so the scene is not ended by its own touch.
    if (shines) this.release()
  }

  /** The vehicle makes a face, with the small noise and the bits that go with it. */
  private pull(who: Vehicle, name: FaceName, wx: number, y: number, wz: number): void {
    const m = who.motion, horn = who.def.horn, p = this.particles
    this.facedAt = this.seconds
    this.lastFace = name
    m.express(FACES[name])
    const nose = m.homeX + who.def.mouth.at[0]
    if (name === 'squirm') {
      // The sponge only scratches: grit jumps off under it.
      this.say(voices.face.squirm(horn.high), 0.8)
      p.burst(KIND.crumb, 3, wx, y, wz, 1.2, 0.9, 0.05, 1.0)
    } else if (name === 'yuck') this.say(voices.face.yuck(horn.low), 0.8)
    else if (name === 'snort') {
      // The dust gets up its nose: a sneeze that blows a puff off the front of it. The two on the hill look.
      this.say(voices.face.snort())
      this.audience()
      p.burst(KIND.dust, 5, nose - 0.2, 1.0, m.homeZ + 0.3, 1.6, 0.4, 0.34, 0.7)
      p.burst(KIND.crumb, 3, nose - 0.1, 1.0, m.homeZ + 0.3, 1.4, 0.8, 0.06, 1.2)
    } else if (name === 'flinch') {
      // Cold water: it jumps, and the drops fly off it.
      this.say(voices.face.brr(horn.high))
      p.burst(KIND.drop, 8, wx, y, wz, 2.4, 2.0, 0.07, 0.8)
    } else if (name === 'peek') this.say(voices.face.peek(horn.high), 0.8)
    else if (name === 'sputter') {
      // The mud has run down to its lip: it blows it off in three wet puffs, out ahead of it.
      this.say(voices.face.sputter(horn.low), 0.9)
      const lip = who.def.mouth.at
      for (let i = 0; i < 3; i++) this.after(i * 0.085, () => {
        for (let k = 0; k < 2; k++) p.emit(KIND.splat, nose - 0.1, lip[1] + 0.05, m.homeZ + lip[2] + (p.random() - 0.5) * 0.5, -1.6 - p.random() * 1.2, 0.9 + p.random() * 0.8, 0.5 + p.random() * 0.5, 0.08, 1.2)
      })
    } else if (name === 'giggle') this.say(voices.feel.giggle(horn.high), 0.7)
    else if (name === 'aah') this.say(voices.face.aah(horn.low), 0.6)
  }

  /** The tap is not a tool: touched, it swings on its arm with a clink and gives no water. */
  private swingTap(): void {
    this.say(voices.clink())
    // One knock gives it one swing's worth: knocked again and again it does not swing higher and higher.
    this.tapSpeed = this.tapAngle >= 0 ? 3.2 : -3.2
  }

  /** One of the two that wait is touched: it hops where it stands and toots. Nothing about a wash changes. */
  private nudge(place: number): void {
    const who = this.queue[place]
    if (!who) return
    const m = who.motion, horn = who.def.horn
    this.say(voices.horn(horn.low, horn.high, horn.hold * 0.6, 'plain'), 0.55)
    m.express(place === 0 ? FACES.boing : FACES.giggle)
    m.blink()
    // It hops: wheels and all leave the hill, and it comes down with a thump and a puff of dust. Touched again in the air it only toots.
    const air = m.jump(2.6)
    if (air > 0) this.after(air, () => {
      this.say(voices.place.thump(), 0.6)
      m.kick(0, 0.9)
      this.particles.burst(KIND.dust, 4, m.homeX, m.ground + 0.2, m.homeZ + 0.6, 0.9, 0.3, 0.3, 0.7)
    })
  }

  /** A piece of the place is touched: the roller spins up and throws a little spray, the pinwheel whirls, the lamp swings, the shelf's things jump and the jar lets a bubble go. */
  private knock(bit: BitId): void {
    const fresh = this.bits.poke(bit), p = this.particles
    if (bit === 'roller') {
      this.say(voices.place.whirr(), fresh ? 1 : 0.5)
      const { x, z, y1 } = LAYOUT.roller
      if (fresh) for (let i = 0; i < 6; i++) this.after(i * 0.06, () => p.emit(i % 2 ? KIND.mist : KIND.bubble, x + (p.random() - 0.5) * 0.5, y1 - 0.3 - p.random() * 0.9, z + 0.45, (p.random() - 0.5) * 2.2, 0.8 + p.random(), 0.5, i % 2 ? 0.3 : 0.11, 1.1))
    } else if (bit === 'pinwheel') {
      this.say(voices.place.flutter(), fresh ? 1 : 0.5)
    } else if (bit === 'lamp') {
      this.say(voices.place.tink(), fresh ? 1 : 0.5)
    } else {
      this.say(voices.place.clinks(), fresh ? 1 : 0.5)
      const { x, y } = LAYOUT.shelf
      if (fresh) for (let i = 0; i < 3; i++) this.after(0.16 + i * 0.09, () => p.emit(KIND.bubble, x + 0.08, y + 0.62, LAYOUT.wall.z + 0.3, (p.random() - 0.5) * 0.5, 0.9 + p.random() * 0.5, 0.25, 0.1 + p.random() * 0.05, 1.6 + p.random()))
    }
  }

  /** The two in the queue look at the bay at a sneeze, a cough, a siren and the start of a shine, one after the other, and blink. They make no face at it: a vehicle's faces are for what is on it and what touches it. */
  private audience(): void {
    this.queue.forEach((who, place) => this.after(0.25 + place * 0.2, () => {
      who.motion.lookAt = WATCHING
      who.motion.blink()
      this.after(1.3, () => { who.motion.lookAt = null })
    }))
  }

  /** A tool on the bare floor does its own thing there too: the hose wets it, the sponge leaves suds, anything else knocks up a little dust. */
  private onFloor(x: number, z: number): void {
    const p = this.particles
    // A pool or the drain under the finger answers as itself. Under the hose it does too, and the jet lands as it does anywhere on the floor.
    const spot = floorSpot(x, z)
    if (spot) this.poke(spot, [x, 0, z])
    if (spot && this.hand !== 'hose') return
    if (this.hand === 'hose') {
      // The jet wets the floor and pushes whatever foam lies there away along it.
      this.say(voices.spray(this.variant, false))
      p.burst(KIND.drop, 7, x, 0.3, z, 1.4, 1.6, 0.07, 0.8)
      if (this.jets.length < 8) this.jets.push({ x, z })
      // In front of the vehicle the nozzle goes there and its jet is seen to land; while the finger stays, it keeps spraying.
      if (z >= FLOOR_FRONT) {
        this.waits = false
        this.tool.x = x
        this.tool.y = 0.04
        this.tool.z = z
        this.tool.working = true
        this.spraying = { x, z, at: this.seconds }
      }
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

  /**
   * A thing of the place that stands still is touched: it gives a small answer of its own, where the finger is, and
   * changes nothing of a wash.
   */
  private poke(spot: Spot, at: readonly [number, number, number]): void {
    const p = this.particles, [x, y, z] = at
    if (spot === 'pool') {
      // Standing water: a plop, and a crown of drops jumps up round the finger.
      this.say(voices.place.plop())
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        p.emit(KIND.drop, x + Math.cos(a) * 0.14, 0.05, z + Math.sin(a) * 0.09, Math.cos(a) * 0.9, 2.2 + p.random() * 0.7, Math.sin(a) * 0.5, 0.1, 0.8)
      }
    } else if (spot === 'drain') {
      // The drain glugs, and bubbles come up through the grate.
      this.say(voices.place.glug())
      for (let i = 0; i < 5; i++) this.after(0.05 + i * 0.09, () => p.emit(KIND.bubble, x + (p.random() - 0.5) * 0.6, 0.12, z + (p.random() - 0.5) * 0.2, (p.random() - 0.5) * 0.4, 0.9 + p.random() * 0.6, 0.15, 0.16 + p.random() * 0.08, 1.1 + p.random() * 0.5))
    } else if (spot === 'window') {
      // The glass squeaks under the finger and gleams where it was.
      this.say(voices.place.squeak())
      p.emit(KIND.glint, x, y, z + 0.06, 0, 0, 0, 0.5, 0.7)
    } else if (spot === 'pipe') {
      // The pipe rings hollow, and the drops that hung under it are shaken off.
      this.say(voices.place.bonk())
      for (let i = 0; i < 3; i++) this.after(i * 0.08, () => p.emit(KIND.drop, x + (i - 1) * 0.3 + (p.random() - 0.5) * 0.1, LAYOUT.pipe.y - LAYOUT.pipe.r - 0.03, LAYOUT.wall.z + 0.2, 0, 0, 0, 0.1, 1.2))
    } else {
      // The bucket slops: suds heave up out of it and bubbles get away.
      this.say(voices.place.slosh())
      for (let i = 0; i < 3; i++) p.emit(KIND.blob, x + (p.random() - 0.5) * 0.5, y + 0.1, z + 0.25, (p.random() - 0.5) * 0.9, 1.6 + p.random() * 0.6, 0.4, 0.2, 1.0)
      for (let i = 0; i < 4; i++) this.after(i * 0.06, () => p.emit(KIND.bubble, x + (p.random() - 0.5) * 0.5, y + 0.15, z + 0.1, (p.random() - 0.5) * 0.5, 0.9 + p.random() * 0.6, 0.2, 0.1 + p.random() * 0.06, 1.2 + p.random() * 0.6))
    }
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
      m.express(FACES.giggle)
      for (let i = 0; i < 6; i++) p.emit(KIND.bubble, x - 1.0, 2.75, z + 0.98, (p.random() - 0.5) * 0.6, 1.2 + p.random(), 0.2, 0.13 + p.random() * 0.08, 1.4 + p.random())
    } else if (taste.id === 'sneeze') {
      // A breath in, then a sneeze that throws the bed up and launches whatever foam is on it, over to the one that waits.
      this.say(voices.feel.sneeze())
      m.squint = 1.5
      m.jolt(0.8)
      m.express({ ...FACES.gasp, seconds: 0.36 })
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
      this.audience()
      this.after(0.36, () => {
        m.express(FACES.snort)
        m.fling(24)
        m.kick(-2, 1.6)
        p.burst(KIND.dust, 4, x + def.side.x0, 1.2, z + 0.6, 1.2, 0.4, 0.4, 0.7)
        for (let i = 0; i < Math.min(14, launched.flew * 2); i++) {
          const x0 = x + 0.6 + p.random() * 1.4, z0 = z + (p.random() - 0.5)
          if (!hat) {
            p.emit(KIND.blob, x0, 2.2, z0, 2.4 + p.random() * 1.6, 3.2 + p.random() * 1.4, -0.3, 0.2, 2.2)
            continue
          }
          // Each blob is thrown to land on the one that waits, and lives exactly as long as its flight: it ends where it lands.
          const t = THROW * (0.92 + p.random() * 0.08)
          const xt = waiting.motion.homeX + waiting.def.side.x0 + 0.3 + p.random() * 1.5, yt = 1.5 + p.random() * 0.7, zt = waiting.motion.homeZ + (p.random() - 0.5) * 1.2
          p.emit(KIND.blob, x0, 2.2, z0, (xt - x0) / t, (yt - 2.2) / t + 0.5 * BLOB_FALL * t, (zt - z0) / t, 0.2, t)
        }
      })
      if (hat) {
        const before = waiting.surface, landed: number[] = []
        for (let cell = 0; cell < hat.length; cell++) if (hat[cell] !== before[cell]) landed.push(cell)
        this.after(0.36 + THROW, () => {
          // The foam lands on the patches it was thrown at, as the save holds them now: whatever else has happened to the vehicle meanwhile (the puddle, a send-off) stays as it is.
          const held = this.next.def.id === waiting.def.id ? this.state.next.cells : this.bay.def.id === waiting.def.id ? this.state.bay.cells : null
          const truth = held ? decode(held) : null
          const live = this.next.def.id === waiting.def.id ? this.next : this.bay.def.id === waiting.def.id ? this.bay : waiting
          const surface = live.surface.slice()
          for (const cell of landed) surface[cell] = truth ? truth[cell] : hat[cell]
          live.surface = surface
          live.motion.kick(0, 0.6)
          live.motion.blink()
          this.say(voices.plip(0.9), 0.7)
          p.burst(KIND.bubble, 4, live.motion.homeX + live.def.side.x0 + 1.0, 2.0, live.motion.homeZ + 0.5, 0.6, 0.5, 0.11, 1.2)
        })
      }
    } else if (taste.id === 'ladder-whoop') {
      // The ladder shoots up, the siren whoops, and it squirts a small arc back from its roof.
      this.say(voices.feel.whoop())
      this.audience()
      m.partTarget = def.partSwing
      m.express({ ...FACES.proud, seconds: 1.1 })
      this.after(FEEL_GAP + 0.2, () => { if (this.seconds - (this.felt.get('ladder-whoop') ?? -9) > FEEL_GAP) m.partTarget = 0 })
      for (let i = 0; i < 8; i++) this.after(0.2 + i * 0.04, () => p.emit(KIND.drop, x - 0.85, 2.2, z + 0.5, -0.4 + p.random() * 0.2, 2.6, 1.6 + p.random() * 0.4, 0.08, 1.6))
    } else if (taste.id === 'soap-eyes') {
      // It squeezes its eyes shut and blows bubbles through its grille. Bewildered, never hurt.
      this.say(voices.feel.raspberry())
      m.squint = 1.6
      m.express(FACES.yuck)
      m.kick(-2, 0.7)
      for (let i = 0; i < 7; i++) this.after(0.1 + i * 0.05, () => p.emit(KIND.bubble, x + def.side.x0 - 0.1, 0.95, z + (p.random() - 0.5) * 0.8, -1.2 - p.random(), 0.3, 0.4, 0.1 + p.random() * 0.07, 1.2))
    } else if (taste.id === 'polish-purr') {
      // It purrs in chugs, and the flap on its exhaust lifts with each one.
      this.say(voices.feel.chugs())
      m.express(FACES.aah)
      for (let i = 0; i < 3; i++) this.after(i * 0.17, () => {
        m.fling(11)
        m.jolt(0.25)
        p.emit(KIND.dust, x - 1.1, 2.95, z + 0.2, 0, 0.8, 0, 0.22, 0.6)
      })
    } else if (taste.id === 'pipe-cough') {
      // A cough, a ring of steam, the flap clacking.
      this.say(voices.feel.cough())
      this.audience()
      m.cross = 0.9
      m.express(FACES.snort)
      for (const delay of [0, 0.2]) this.after(delay, () => { m.fling(18); m.kick(-1.1, 0.8) })
      // One ring out of the top of the pipe, rising and widening, with the air showing through its middle.
      this.after(0.22, () => p.emit(KIND.ring, x - 1.1, 3.05, z + 0.2, 0, 1.1, 0, 0.5, 1.3))
    } else if (taste.id === 'drum-turn') {
      if (drumJammed(def, who.surface)) {
        // Dried mud jams the drum: it creaks and twitches until that mud is wet.
        this.say(voices.feel.creak())
        m.express(FACES.squirm)
        m.fling(0.9)
        this.after(0.2, () => m.fling(-0.9))
        m.kick(1, 0.5)
      } else {
        // The drum turns, and what is on it spirals off it: foam in blobs, soft mud in splats, water in drops, a shine in glints, dust from dull paint.
        // While the shine is turning it once, a touch gives it no spin of its own: it is turning already, and it turns once.
        this.say(voices.feel.rumble())
        if (!this.shining) m.fling(8)
        m.express(FACES.giggle)
        const holds = partHolds(def, who.surface)
        const kind = holds === 'f' ? KIND.blob : holds === 's' ? KIND.splat : holds === 'w' ? KIND.drop : holds === 'p' ? KIND.glint : holds === 'c' ? KIND.crumb : KIND.dust
        for (let i = 0; i < 10; i++) {
          // Round the drum once and a quarter, each one let go a little further out and thrown along the way the drum turns.
          const a = (i / 8) * Math.PI * 2, out = 0.7 + i * 0.045
          this.after(i * 0.05, () => p.emit(kind, x + 1.0 + Math.cos(a) * out, 2.05 + Math.sin(a) * out, z + 1.0, kind === KIND.glint ? 0 : Math.cos(a) * 0.5 - Math.sin(a) * 1.5, kind === KIND.glint ? 0 : Math.sin(a) * 0.5 + Math.cos(a) * 1.5 + 0.5, 0.3, kind === KIND.glint ? 0.45 : kind === KIND.blob ? 0.14 : kind === KIND.dust ? 0.26 : 0.1, 0.9))
        }
      }
    } else {
      // Ticklish: the wheels spin and foam flies off the tyres.
      this.say(voices.feel.giggle(def.horn.high))
      m.spinWheels(20)
      m.express(FACES.giggle)
      m.squint = 0.9
      for (const delay of [0, 0.12, 0.24, 0.36]) this.after(delay, () => m.kick((p.random() - 0.5) * 3, 0.5))
      for (const wheel of def.wheels) for (let i = 0; i < 4; i++) this.after(i * 0.07, () => p.emit(KIND.blob, x + wheel.x, wheel.r, z + 1.0, (p.random() - 0.5) * 4, 2 + p.random() * 2, 0.6, 0.13, 1.3))
    }
  }

  private start(playing: 'send-off' | 'puddle' | 'shine' | 'drip', beats: ConstructorParameters<typeof Scene>[0], outcome: () => void = () => {}): void {
    this.playing = playing
    this.scene = new Scene(beats)
    this.scene.start(this.seconds, outcome)
  }

  /** The scene that is running is the shine. */
  private get shining(): boolean {
    return this.playing === 'shine' && this.sceneRunning
  }

  /** The child sends the vehicle in the bay off as it is, and the one that waits rolls in. */
  private sendOff(): void {
    this.sentAt = this.seconds
    this.release()
    // The tool in hand goes up out of the lane, so nothing drives through it, and a cloth forgets what it had on it from the vehicle that is leaving.
    this.rest()
    this.carried = null
    const leaving = this.bay, incoming = this.next
    const result = sendOff(this.state)
    // The head of the queue is the newcomer: it stays where it waits, in what it wears there, until the scene takes it round to the door.
    const head = this.queue[0]
    const newcomer: Vehicle = head && head.def.id === result.state.next.who
      ? { def: head.def, motion: head.motion, surface: head.surface }
      : this.wait(result.state.next.who, 0)
    const arriving = decode(result.state.next.cells) ?? newcomer.surface
    const line = queueOf(result.state.bay.who, result.state.next.who).map((who, place) => {
      const from = this.queue.findIndex((waiting) => waiting.def.id === who)
      // One that was already waiting keeps its place until the scene moves it up; the one that leaves joins at the back later.
      return { who: from >= 0 ? this.queue[from] : { def: defOf(who), motion: leaving.motion, surface: queueMud(who) }, from, place }
    })
    const beats = sendOffScene(this, leaving, incoming, newcomer, arriving, line)
    // The first vehicle that rolls in with dried mud is shown what water does to it. That is a scene of its own, which starts
    // when this one is over and is marked and saved when it starts: ending the send-off early, or putting the game away
    // during it, does not lose the showing.
    this.pendingDrip = !result.state.shown.includes('drip')
    this.start('send-off', beats, () => {
      this.state = result.state
      this.leaving = leaving
      this.bay = incoming
      this.next = newcomer
      this.queue = line.map((entry) => entry.who)
      this.dirty = true
      this.urgent = true
    })
  }

  /**
   * Starts the first showing if it is due: the vehicle in the bay has dried mud on its nose and no child has yet been
   * shown what water does to it. It is marked and saved as it starts. Returns whether it started.
   */
  private showing(): boolean {
    if (!this.pendingDrip) return false
    this.pendingDrip = false
    this.atTouch = false
    const patch = openDriedPatch(this.bay)
    if (!patch) return false
    const drip = dripScene(this, this.bay, patch)
    this.start('drip', drip.beats, () => {
      // The save takes the softened patch now, on the grid as it holds it: foam still in the air toward this vehicle is in that grid already and stays there.
      this.state = washed(markShown(this.state, 'drip'), softened(decode(this.state.bay.cells) ?? this.bay.surface, drip.soften))
      this.dirty = true
      this.urgent = true
    })
    return true
  }

  /** The vehicle that waits goes through the puddle. When the puddle has no more to add it only splashes. */
  private puddle(): void {
    this.puddledAt = this.seconds
    const after = throughPuddle(this.state)
    const surface = after === this.state ? null : (decode(after.next.cells) ?? this.next.surface)
    this.start('puddle', puddleScene(this, this.next, surface), () => {
      if (after === this.state) return
      this.state = after
      this.dirty = true
      this.urgent = true
    })
  }

  /** One frame of attended time. */
  step(dt: number): void {
    this.seconds += dt
    // The first showing waits for the scene before it to be over and for the finger to be off the vehicle. One that was
    // owed when the game was opened waits for a touch: nothing plays by itself on load.
    if (!this.sceneRunning && !this.pressing && !this.atTouch) this.showing()
    this.scene?.update(this.seconds)
    if (this.later.length) {
      const due = this.later.filter((cue) => cue.at <= this.seconds)
      if (due.length) {
        this.later = this.later.filter((cue) => cue.at > this.seconds)
        for (const cue of due) cue.run()
      }
    }
    // A held hose keeps spraying where it points, on the vehicle and on the floor.
    if (this.pressing && this.hand === 'hose' && this.seconds - this.lastDab.at >= HOSE_EVERY) this.touch(this.pressing, false)
    if (this.spraying && this.hand === 'hose' && this.seconds - this.spraying.at >= HOSE_EVERY * 1.5) this.onFloor(this.spraying.x, this.spraying.z)
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
    this.wants()
    this.idles()
    for (const who of this.onStage) {
      // The mixer's want: its drum rocks while it is left alone. Where dried mud has jammed it, it keeps trying:
      // the drum strains a hair each way against the mud and cannot turn.
      if (who.def.partSpins) {
        const jammed = drumJammed(who.def, who.surface), showsOff = this.shining && who === this.bay
        who.motion.rock = jammed || showsOff ? 0 : DRUM_ROCK
        who.motion.strain = jammed && !showsOff ? DRUM_STRAIN : 0
      }
      who.motion.step(dt)
    }
    this.bits.step(dt)
    this.particles.step(dt, (landing) => {
      if (landing.kind !== KIND.bubble) this.marks.push(landing)
      const size = Math.min(1, landing.size / 0.18)
      // Each thing lands with its own sound: a bubble pops, dried mud clacks, soft mud slaps, water and foam plip.
      // Every bubble has its pop and every clod its clack. Water, foam and soft mud that land together are heard a moment apart, and the ones between go unheard.
      if (landing.kind === KIND.bubble) this.pops.push(voices.pop(size))
      else if (landing.kind === KIND.crumb) this.clacks.push(voices.clack(size))
      else if (this.seconds - this.lastPlip >= PLIP_GAP) {
        this.lastPlip = this.seconds
        this.say(landing.kind === KIND.splat ? voices.slap(size) : voices.plip(size), 0.5)
      }
    })
    // A few pops and a clack or two each frame: a heap of foam going is a fizz, and nothing is still popping long after its bubble has gone.
    for (let i = 0; i < 3 && this.pops.length; i++) this.say(this.pops.shift()!, 0.4)
    for (let i = 0; i < (this.clacks.length > 6 ? 2 : 1) && this.clacks.length; i++) this.say(this.clacks.shift()!, 0.5)
  }
}
