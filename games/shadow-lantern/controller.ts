import { CoverageMeter, stirLevel, TAP_TURN, wakeRuleForAge, wakes, type CoverageResult, type Placed, type WakeRule } from './coverage'
import { buildCreature, type BuiltCreature, type CreatureKind } from './creatures'
import { blankDemoPose, DEMO_SECONDS, demoPose, GRIP_HEIGHT, HintScheduler, type Demo, type DemoPose, type GuidanceState } from './guidance'
import { GestureTracker, type Intent, type Point, type Target } from './input'
import {
  ANTICIPATE_S,
  blankPose,
  flightDepth,
  flightScale,
  PEEL_S,
  peelPose,
  PERSONALITIES,
  restPose,
  SETTLE_S,
  SILHOUETTE_S,
  SKY_HOMES,
  SKY_Z,
  skyDepth,
  skyScale,
  SPARK_Z,
  WAKE_Z,
  type CreaturePose,
  type Ring,
  type SleepPose,
} from './motion'
import { clampToStage, clearOfProscenium, LAMP, PIN_HEIGHT, SCREEN, shadowScale, STAGE, type CardPose, type Vec3 } from './projection'
import { SaveCadence } from './saveCadence'
import { SHAPE_KINDS, SHAPES, type ShapeKind } from './shapes'
import { clearSpot, slideReach, standBlocked, standsClash, standTooFront, type Stand } from './stands'
import { INVITE_SHAPE, normalizeAngle, serialize, wakeCreature, type SkyCreature, type TheatreState } from './state'

// The theatre while it is on screen: rules, touch, springs, coverage, the
// wake of each creature and its life in the sky, guidance, sound and saving.
// It knows nothing about rendering; the view reads its public fields every
// frame and hands it a projector for hit tests. Nothing in step() allocates.

export type Sound = {
  unlock(): void
  setActive(active: boolean): void
  /** A finger landed on a shape. */
  pick(): void
  /** A shape was set down; `height` is how far it fell (cm). */
  drop(height: number): void
  turn(): void
  /** A shape is sliding; speed in cm/s (called every frame while dragging). */
  slide(speed: number): void
  /** A dot of the outline fell into shadow; `fill` 0..1 tunes the note. */
  dot(fill: number): void
  /** Every frame, with the sleeper's stir (0..1): hum, slide level, room tone. */
  stir(level: number): void
  snuffle(kind: CreatureKind): void
  wake(kind: CreatureKind): void
  peel(): void
  voice(kind: CreatureKind): void
  lamp(): void
  sparkle(): void
  dispose(): void
}

export const silentSound: Sound = {
  unlock() {},
  setActive() {},
  pick() {},
  drop() {},
  turn() {},
  slide() {},
  dot() {},
  stir() {},
  snuffle() {},
  wake() {},
  peel() {},
  voice() {},
  lamp() {},
  sparkle() {},
  dispose() {},
}

/** How the view maps a screen point to a world ray. */
export type Projector = {
  /** The world ray under a canvas point (CSS px). Writes origin and a unit direction; false when unavailable. */
  ray(screen: Point, origin: Vec3, dir: Vec3): boolean
}

export type ShapeRuntime = {
  kind: ShapeKind
  /** What is drawn and measured. */
  pose: CardPose
  target: { x: number; z: number; angle: number }
  vx: number
  vz: number
  va: number
  liftV: number
  yawV: number
  heldBy: number | null
  grab: { dx: number; dz: number }
  pressAt: number
  pulseAt: number
  dropAt: number
  /** 0..1 guidance glow. */
  glow: number
}

export type Sleeper = {
  kind: CreatureKind
  built: BuiltCreature
  meter: CoverageMeter
  enterAt: number
  armed: boolean
  pose: SleepPose
  rings: Ring[]
  ringCount: number
  /** Per dot: seconds since it last fell into shadow (for a small flash), or -1. */
  dotLit: Float32Array
}

export type Waking = {
  kind: CreatureKind
  built: BuiltCreature
  start: number
  slot: number
  paper: 0 | 1
  pose: CreaturePose
  /** 0..1 opacity of the dark silhouette card as it fills in. */
  fillIn: number
}

/** A companion's trip from the turned page to its home in the sky. */
export type Flight = {
  start: number
  fromX: number
  fromY: number
  /** Half the creature's width and height at full size, to keep it in front of the frame while it crosses. */
  halfWidth: number
  halfHeight: number
}

export type Companion = {
  kind: CreatureKind
  slot: number
  paper: 0 | 1
  seed: number
  pose: CreaturePose
  reactAt: number
  flipped: boolean
  facingTarget: number
  rings: Ring[]
  ringCount: number
  /** Set while it drifts behind the moon; removed when done. */
  leavingAt: number
  /** Set while it is still on its way home; null once it has arrived. */
  flight: Flight | null
  /** When it landed short of its sky layer, and at what depth; −Infinity once settled. */
  settleAt: number
  settleFrom: number
}

/** Where a tap's little burst of stars lands: the sky (or the frame), the plank floor and meadow, or the lit screen. */
export type SparkSurface = 'sky' | 'floor' | 'screen'

const HIT_SLOP_CM = 1.6
/** Ground further back than this is hidden behind the hills and bushes, so the sky takes the tap. */
const GROUND_BACK = -10
const SPRING_STEP = 1 / 120
const WAKE_HOLD_S = 0.32
const ENTER_S = 1.8
/** Behind the moon, where an eighth companion's oldest friend goes to rest. */
export const MOON = { x: 62, y: 46, z: SKY_Z - 8 }
const LEAVE_S = 3.2
const HINT_BUDGET_MS = 0.6
const SEARCH_AFTER_S = 0.6
/** How much of its speed a set-down stand keeps when its foot meets the stage. */
const FLOOR_BOUNCE = 0.45
/** Moves smaller than this (cm or radians) are the springs settling: no stand can be carried into another by them. */
const SETTLING = 1e-6

function blankRings(): Ring[] {
  return [0, 1, 2, 3].map(() => ({ x: 0, y: 0, r: 0, alpha: 0 }))
}

function smooth(t: number): number {
  const k = t < 0 ? 0 : t > 1 ? 1 : t
  return k * k * (3 - 2 * k)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export class TheatreController {
  readonly state: TheatreState
  readonly shapes: ShapeRuntime[]
  readonly rule: WakeRule
  sleeper: Sleeper | null = null
  waking: Waking | null = null
  readonly companions: Companion[] = []
  readonly coverage: CoverageResult = { fill: 0, spill: 0 }
  /** Smoothed 0..1 stir of the sleeper as its outline fills. */
  stir = 0
  readonly guidance: GuidanceState = { demo: null, demoNumber: -1, glow: 0, invite: null }
  demo: Demo | null = null
  readonly demoPose: DemoPose = blankDemoPose()
  /** Seconds of attended play; stands still while the theatre is put away. */
  t = 0
  lampFlareAt = -Infinity
  /** A tap on nothing in particular: where its stars fly (z is the plane they fly in) and when. */
  readonly spark: { x: number; y: number; z: number; at: number; surface: SparkSurface } = { x: 0, y: 0, z: 0, at: -Infinity, surface: 'sky' }
  /** Stars that spring off the outline's edge the moment the shadow opens its eye: centre and half-size on the screen (cm). */
  readonly wakeBurst = { x: 0, y: 0, rx: 0, ry: 0, at: -Infinity }
  snuffleAt = -Infinity
  /** Bumped whenever the set of creatures changes, so the view can reassign meshes. */
  version = 0
  /** Index of the shape doing the first-open invite hop. */
  readonly inviteShape = SHAPE_KINDS.indexOf(INVITE_SHAPE)

  private readonly sound: Sound
  private readonly cadence: SaveCadence
  private readonly tracker: GestureTracker
  private readonly scheduler: HintScheduler
  private projector: Projector | null = null
  private readonly screens = new Map<number, Point>()
  private readonly placed: Placed[]
  /** Each shape's target as a stand, so a turn or a set-down can be checked against where the others are going. */
  private readonly aims: Stand[]
  private readonly crowds: (readonly Stand[])[]
  private readonly spot = { x: 0, z: 0 }
  private readonly measured: Float64Array
  private readonly prevCovered = new Uint8Array(512)
  private holdFor = 0
  private nextSleeperAt = -1
  private searchFor: CreatureKind | null = null
  private searchDone = false
  private demoReadyAt = Infinity
  private lastDotSound = -Infinity
  private peelSoundAt = -1
  private readonly origin: Vec3 = { x: 0, y: 0, z: 0 }
  private readonly dir: Vec3 = { x: 0, y: 0, z: 0 }
  private readonly clamped = { x: 0, z: 0 }

  constructor(state: TheatreState, options: { save: (state: TheatreState) => void; sound?: Sound; childAge?: number | null; everTouched?: boolean }) {
    this.state = state
    this.sound = options.sound ?? silentSound
    this.rule = wakeRuleForAge(options.childAge ?? null)
    this.cadence = new SaveCadence(() => options.save(serialize(this.state)))
    this.tracker = new GestureTracker((at) => this.hitTest(at))
    this.scheduler = new HintScheduler(0, options.everTouched ?? false)
    this.shapes = state.shapes.map((shape) => ({
      kind: shape.kind,
      pose: { x: shape.x, z: shape.z, angle: shape.angle, yaw: 0, lift: 0 },
      target: { x: shape.x, z: shape.z, angle: shape.angle },
      vx: 0,
      vz: 0,
      va: 0,
      liftV: 0,
      yawV: 0,
      heldBy: null,
      grab: { dx: 0, dz: 0 },
      pressAt: -Infinity,
      pulseAt: -Infinity,
      dropAt: -Infinity,
      glow: 0,
    }))
    this.placed = this.shapes.map((shape) => ({ kind: shape.kind, pose: shape.pose }))
    this.aims = this.shapes.map((shape) => ({ kind: shape.kind, pose: shape.target }))
    this.crowds = [this.placed, this.aims]
    this.standApart()
    this.measured = new Float64Array(this.shapes.length * 3).fill(NaN)
    this.state.sky.forEach((creature, index) => this.companions.push(this.companion(creature, index * 2.3)))
    this.setSleeper(state.sleeping, -ENTER_S)
  }

  setProjector(projector: Projector): void {
    this.projector = projector
  }

  /** Attended and visible: sound and time run. Otherwise everything pauses where it is. */
  setRunning(running: boolean): void {
    this.sound.setActive(running)
    if (!running) this.pause()
  }

  dispose(): void {
    this.cadence.settle(performance.now())
    this.sound.dispose()
  }

  /** The theatre was put away or hidden mid-anything: every gesture ends where it is. */
  pause(): void {
    this.tracker.reset()
    for (const shape of this.shapes) if (shape.heldBy !== null) this.release(shape, false)
    this.screens.clear()
    this.cadence.settle(performance.now())
  }

  // --- the frame ---------------------------------------------------------------

  step(dt: number): void {
    this.t += dt
    const t = this.t
    this.stepShapes(dt)
    const sleeper = this.sleeper
    if (sleeper) this.stepSleeper(sleeper, dt)
    else if (this.nextSleeperAt >= 0 && t >= this.nextSleeperAt) {
      this.nextSleeperAt = -1
      this.setSleeper(this.state.sleeping, t)
    }
    if (this.waking) this.stepWaking(this.waking)
    this.stepCompanions(dt)
    this.stepGuidance()
    this.sound.stir(this.sleeper ? this.stir : 0)
    if (!this.anyHeld()) this.cadence.settle(performance.now())
  }

  private stepShapes(dt: number): void {
    const t = this.t
    const invite = this.guidance.invite
    // Explicit springs this stiff diverge on a slow frame, so they run in fixed small steps.
    const substeps = Math.max(1, Math.ceil(dt / SPRING_STEP))
    const h = dt / substeps
    for (let i = 0; i < this.shapes.length; i++) {
      const shape = this.shapes[i]
      const pose = shape.pose
      const held = shape.heldBy !== null
      if (held) this.followFinger(shape)
      const pressed = t - shape.pressAt < 0.18 ? 0.5 : 0
      const hop = invite !== null && i === this.inviteShape ? Math.sin(invite * Math.PI) * 2.6 * (1 - invite * 0.3) : 0
      const liftTarget = held ? 1.4 : pressed + hop
      for (let s = 0; s < substeps; s++) {
        // Position: a stiff critically damped spring while held, softer when free.
        // A stand meets the others as solid paper: each move that would carry
        // it into one stops there, so it slides along whatever it meets.
        const w = held ? 26 : 16
        shape.vx += (w * w * (shape.target.x - pose.x) - 2 * w * shape.vx) * h
        shape.vz += (w * w * (shape.target.z - pose.z) - 2 * w * shape.vz) * h
        if (!this.moveStand(i, 'x', pose.x + shape.vx * h)) shape.vx = 0
        if (!this.moveStand(i, 'z', pose.z + shape.vz * h)) shape.vz = 0
        // Turning overshoots a touch, like stiff card on a pin.
        const wa = 13
        shape.va += (wa * wa * (shape.target.angle - pose.angle) - 2 * 0.52 * wa * shape.va) * h
        if (!this.moveStand(i, 'angle', pose.angle + shape.va * h)) shape.va = 0
        // The card swings on its wire against the direction of travel, and settles with a wobble.
        const yawTarget = Math.max(-0.45, Math.min(0.45, -shape.vx * 0.012 + shape.vz * 0.004))
        const wy = 11
        shape.yawV += (wy * wy * (yawTarget - pose.yaw) - 2 * 0.28 * wy * shape.yawV) * h
        if (!this.moveStand(i, 'yaw', pose.yaw + shape.yawV * h)) shape.yawV = 0
        // Lift: up while held, a pressed card rises a little, and a set-down card bounces on its foot.
        const wl = held ? 18 : 15
        shape.liftV += (wl * wl * (liftTarget - pose.lift) - 2 * (held ? 0.9 : 0.32) * wl * shape.liftV) * h
        pose.lift += shape.liftV * h
        if (pose.lift < 0) {
          pose.lift = 0
          if (shape.liftV < 0) shape.liftV *= -FLOOR_BOUNCE
        }
      }
      if (held) this.sound.slide(Math.hypot(shape.vx, shape.vz))
    }
  }

  /**
   * Set one of shape i's pose values, unless that carries its stand into
   * another stand it was clear of, or too near the screen. Returns false
   * (and leaves the pose as it was) when blocked.
   */
  private moveStand(i: number, key: 'x' | 'z' | 'angle' | 'yaw', value: number): boolean {
    const stand = this.placed[i]
    const pose = stand.pose
    const was = pose[key]
    pose[key] = value
    if (Math.abs(value - was) < SETTLING) return true
    let blocked = false
    if (standTooFront(stand)) {
      pose[key] = was
      blocked = !standTooFront(stand)
      pose[key] = value
    }
    for (let j = 0; j < this.placed.length && !blocked; j++) {
      if (j === i || !standsClash(stand, this.placed[j])) continue
      pose[key] = was
      blocked = !standsClash(stand, this.placed[j])
      pose[key] = value
    }
    if (blocked) pose[key] = was
    return !blocked
  }

  /**
   * Where shape i was aimed (a tap-turn, a twist, a saved layout) meets
   * another stand or the screen: it steps aside to the nearest clear place.
   * Returns false when there is none.
   */
  private settleTarget(i: number): boolean {
    const shape = this.shapes[i]
    if (!standBlocked(this.aims[i], this.placed, i) && !standBlocked(this.aims[i], this.aims, i)) return true
    if (!clearSpot(shape.kind, shape.target.x, shape.target.z, shape.target.angle, this.crowds, i, this.spot)) return false
    shape.target.x = this.spot.x
    shape.target.z = this.spot.z
    return true
  }

  /** A saved layout from before stands kept apart may have two in one place: each steps aside, and starts where it stands. */
  private standApart(): void {
    for (let i = 0; i < this.shapes.length; i++) {
      const shape = this.shapes[i]
      if (standBlocked(this.aims[i], this.aims, i) && clearSpot(shape.kind, shape.target.x, shape.target.z, shape.target.angle, [this.aims], i, this.spot)) {
        shape.target.x = this.spot.x
        shape.target.z = this.spot.z
      }
      shape.pose.x = shape.target.x
      shape.pose.z = shape.target.z
    }
    this.syncState()
  }

  private followFinger(shape: ShapeRuntime): void {
    const screen = shape.heldBy === null ? undefined : this.screens.get(shape.heldBy)
    if (!screen || !this.projector) return
    const hit = this.planeHit(screen, PIN_HEIGHT + GRIP_HEIGHT)
    if (!hit) return
    const at = clampToStage(hit.x + shape.grab.dx, hit.z + shape.grab.dz, this.clamped)
    if (Math.abs(at.x - shape.target.x) + Math.abs(at.z - shape.target.z) > 0.01) {
      shape.target.x = at.x
      shape.target.z = at.z
      this.cadence.change(performance.now())
    }
  }

  private movedSinceMeasure(): boolean {
    let moved = false
    for (let i = 0; i < this.shapes.length; i++) {
      const pose = this.shapes[i].pose
      const j = i * 3
      if (!(Math.abs(pose.x - this.measured[j]) < 1e-3 && Math.abs(pose.z - this.measured[j + 1]) < 1e-3 && Math.abs(pose.angle - this.measured[j + 2]) < 1e-4)) {
        moved = true
        this.measured[j] = pose.x
        this.measured[j + 1] = pose.z
        this.measured[j + 2] = pose.angle
      }
    }
    return moved
  }

  private stepSleeper(sleeper: Sleeper, dt: number): void {
    const t = this.t
    const entered = t - sleeper.enterAt >= ENTER_S
    if (this.movedSinceMeasure()) {
      sleeper.meter.measure(this.placed, this.coverage)
      const covered = sleeper.meter.dotCovered
      let fresh = 0
      for (let d = 0; d < covered.length; d++) {
        if (covered[d] && !this.prevCovered[d]) {
          fresh++
          sleeper.dotLit[d] = 0
        }
        this.prevCovered[d] = covered[d]
      }
      if (fresh > 0 && entered && t - this.lastDotSound > 0.07) {
        this.lastDotSound = t
        this.sound.dot(this.coverage.fill)
      }
    }
    for (let d = 0; d < sleeper.dotLit.length; d++) if (sleeper.dotLit[d] >= 0) sleeper.dotLit[d] = sleeper.dotLit[d] > 1 ? -1 : sleeper.dotLit[d] + dt
    const target = entered ? stirLevel(this.coverage, this.rule) : 0
    const snuffle = Math.max(0, 1 - (t - this.snuffleAt) / 1.2)
    this.stir += (Math.max(target, snuffle * 0.8) - this.stir) * Math.min(1, dt * 3)
    const personality = PERSONALITIES[sleeper.kind]
    personality.sleep(t, this.stir, sleeper.pose)
    sleeper.ringCount = personality.rings(t, this.stir, sleeper.rings)
    if (entered && sleeper.armed && !this.anyHeld() && wakes(this.coverage, this.rule)) {
      this.holdFor += dt
      if (this.holdFor >= WAKE_HOLD_S) this.startWake(sleeper)
    } else this.holdFor = 0
  }

  private stepWaking(waking: Waking): void {
    const t = this.t
    const e = t - waking.start
    const personality = PERSONALITIES[waking.kind]
    const pose = waking.pose
    const { center, bounds } = waking.built
    restPose(pose)
    pose.x = center.x
    pose.y = center.y
    pose.z = WAKE_Z
    pose.scale = 1
    const openAt = SILHOUETTE_S
    const peelAt = openAt + ANTICIPATE_S
    const flyAt = peelAt + PEEL_S
    const hinge = bounds.x0 - center.x
    if (e < openAt) {
      waking.fillIn = smooth(e / SILHOUETTE_S)
      pose.dark = 1
      pose.eye = 0
      pose.facing = 1
    } else if (e < peelAt) {
      waking.fillIn = 1
      pose.dark = 1
      pose.facing = 1
      const k = (e - openAt) / ANTICIPATE_S
      pose.eye = smooth(k * 2.2)
      personality.anticipate(k, pose)
    } else if (e < flyAt) {
      waking.fillIn = 1
      pose.facing = 1
      peelPose((e - peelAt) / PEEL_S, hinge, pose)
    } else {
      // The page has turned: from here it is a companion on its way home, so
      // the next outline can wake at any moment without cutting its trip short.
      // The turned card is mirrored about its tail edge: the same picture as
      // an unturned card facing the other way.
      const fromX = center.x + 2 * hinge
      const companion = this.companion(waking, 0)
      companion.pose.facing = -1
      companion.facingTarget = SKY_HOMES[waking.slot].x >= fromX ? 1 : -1
      companion.flight = { start: waking.start + flyAt, fromX, fromY: center.y, halfWidth: (bounds.x1 - bounds.x0) / 2, halfHeight: (bounds.y1 - bounds.y0) / 2 }
      this.companions.push(companion)
      this.waking = null
      this.version++
    }
  }

  /** Poses a companion on its way home; returns false once it has arrived and should idle this frame. */
  private stepFlight(c: Companion, flight: Flight, dt: number): boolean {
    const personality = PERSONALITIES[c.kind]
    const k = (this.t - flight.start) / personality.gaitSeconds
    if (k >= 1) {
      c.flight = null
      c.seed = -this.t
      if (Math.abs(c.pose.z - skyDepth(c.slot)) > 0.01) {
        c.settleAt = this.t
        c.settleFrom = c.pose.z
      }
      this.version++
      this.sound.voice(c.kind)
      return false
    }
    const pose = c.pose
    const home = SKY_HOMES[c.slot]
    restPose(pose)
    personality.gait(k, flight.fromX, flight.fromY, home.x, home.y, pose)
    pose.scale = flightScale(c.kind, k)
    pose.z = flightDepth(k, pose.x, pose.y, flight.halfWidth * pose.scale, flight.halfHeight * pose.scale, skyDepth(c.slot))
    pose.facing += (c.facingTarget - pose.facing) * Math.min(1, dt * 5)
    c.ringCount = 0
    return true
  }

  private stepCompanions(dt: number): void {
    const t = this.t
    for (let i = this.companions.length - 1; i >= 0; i--) {
      const c = this.companions[i]
      if (c.flight && this.stepFlight(c, c.flight, dt)) continue
      const personality = PERSONALITIES[c.kind]
      const pose = c.pose
      const home = SKY_HOMES[c.slot]
      const facing = pose.facing
      restPose(pose)
      pose.facing = facing
      personality.idle(t + c.seed, home.x, home.y, pose)
      pose.z = skyDepth(c.slot)
      if (c.settleAt > -Infinity) {
        const u = (t - c.settleAt) / SETTLE_S
        if (u >= 1) c.settleAt = -Infinity
        else pose.z = lerp(c.settleFrom, pose.z, smooth(u))
      }
      pose.scale = skyScale(c.kind)
      if (c.reactAt > -Infinity) {
        const k = (t - c.reactAt) / personality.reactSeconds
        if (k >= 1) c.reactAt = -Infinity
        else if (personality.react(k, pose) && !c.flipped) {
          c.flipped = true
          c.facingTarget = -c.facingTarget
        }
      }
      if (c.kind === 'fish' && c.reactAt === -Infinity) c.facingTarget = Math.cos((t + c.seed) * 0.55) >= 0 ? 1 : -1
      pose.facing += (c.facingTarget - pose.facing) * Math.min(1, dt * 5)
      c.ringCount = personality.skyRings(t + c.seed, c.rings)
      if (c.leavingAt > -Infinity) {
        const k = (t - c.leavingAt) / LEAVE_S
        if (k >= 1) {
          this.companions.splice(i, 1)
          this.version++
          continue
        }
        const u = smooth(k)
        pose.x = lerp(pose.x, MOON.x, u)
        pose.y = lerp(pose.y, MOON.y, u) + Math.sin(u * Math.PI) * 4
        pose.z = lerp(skyDepth(c.slot), MOON.z, u)
        pose.scale = skyScale(c.kind) * (1 - u * 0.7)
        c.ringCount = 0
      }
    }
  }

  private stepGuidance(): void {
    const t = this.t
    const g = this.scheduler.state(t, this.guidance)
    const sleeper = this.sleeper
    const ready = sleeper !== null && t - sleeper.enterAt >= ENTER_S && !this.waking
    // Search as soon as the stage is still, so the move is ready long before the first demonstration.
    if (ready && this.scheduler.idleFor(t) >= SEARCH_AFTER_S && this.searchFor !== sleeper.kind) {
      this.searchFor = sleeper.kind
      this.searchDone = false
      sleeper.meter.beginSearch(this.placed, true)
    }
    if (ready && this.searchFor === sleeper.kind && !this.searchDone && sleeper.meter.continueSearch(HINT_BUDGET_MS)) {
      this.searchDone = true
      this.demoReadyAt = t
      this.demo = this.makeDemo(sleeper)
    }
    // A demonstration found late waits for the next one rather than starting halfway through the move.
    const windowStart = g.demo === null ? -Infinity : t - g.demo * DEMO_SECONDS
    const playing = ready && g.demo !== null && this.demo !== null && this.searchDone && windowStart >= this.demoReadyAt - 1e-6
    if (playing) demoPose(this.demo!, g.demo!, this.demoPose)
    else this.demoPose.opacity = 0
    const hinted = playing ? this.demo!.index : -1
    for (let i = 0; i < this.shapes.length; i++) this.shapes[i].glow = ready ? g.glow * (i === hinted ? 1 : 0.45) : 0
  }

  private makeDemo(sleeper: Sleeper): Demo | null {
    const best = sleeper.meter.best
    if (best) {
      const from = this.shapes[best.index].pose
      return { index: best.index, from: { ...from, yaw: 0, lift: 0 }, to: { x: best.x, z: best.z, angle: best.angle, yaw: 0, lift: 0 }, turn: best.angle - from.angle }
    }
    // Nothing clearly better: carry the shape whose shadow is furthest from
    // the outline to where its shadow would land on the outline's middle.
    const { center } = sleeper.built
    let index = 0
    let far = -Infinity
    this.shapes.forEach((shape, i) => {
      const k = shadowScale(shape.pose.z)
      const d = Math.abs(LAMP.x + (shape.pose.x - LAMP.x) * k - center.x)
      if (d > far) {
        far = d
        index = i
      }
    })
    const z = 21
    const x = Math.max(STAGE.xMin, Math.min(STAGE.xMax, LAMP.x + (center.x - LAMP.x) / shadowScale(z)))
    const { kind } = this.shapes[index]
    const from = this.shapes[index].pose
    // The middle is often where another stand already is: the shown rest steps
    // aside to the nearest place this one can stand, and the shown slide stops
    // where the stand would, the same as setting it down there.
    if (!clearSpot(kind, x, z, from.angle, this.crowds, index, this.spot)) return null
    const k = slideReach(kind, from.x, from.z, this.spot.x, this.spot.z, from.angle, this.crowds, index)
    const to = { x: from.x + (this.spot.x - from.x) * k, z: from.z + (this.spot.z - from.z) * k, angle: from.angle, yaw: 0, lift: 0 }
    return { index, from: { ...from, yaw: 0, lift: 0 }, to, turn: 0 }
  }

  // --- creatures ---------------------------------------------------------------

  private setSleeper(kind: CreatureKind, enterAt: number): void {
    const built = buildCreature(kind)
    this.sleeper = {
      kind,
      built,
      meter: new CoverageMeter(built),
      enterAt,
      armed: false,
      pose: { sx: 1, sy: 1, dx: 0, dy: 0, roll: 0, part: 0, partLift: 0 },
      rings: blankRings(),
      ringCount: 0,
      dotLit: new Float32Array(built.dots.length).fill(-1),
    }
    this.prevCovered.fill(0)
    this.measured.fill(NaN)
    this.holdFor = 0
    this.searchFor = null
    this.demo = null
    this.version++
  }

  private companion({ kind, slot, paper }: SkyCreature, seed: number): Companion {
    const pose = blankPose()
    pose.facing = SKY_HOMES[slot].x > 0 ? -1 : 1
    return { kind, slot, paper, seed, pose, reactAt: -Infinity, flipped: false, facingTarget: pose.facing, rings: blankRings(), ringCount: 0, leavingAt: -Infinity, flight: null, settleAt: -Infinity, settleFrom: 0 }
  }

  private startWake(sleeper: Sleeper): void {
    const t = this.t
    const { arrived, departed } = wakeCreature(this.state)
    if (departed) {
      const leaving = this.companions.find((c) => c.slot === departed.slot && c.leavingAt === -Infinity)
      if (leaving) leaving.leavingAt = t
    }
    this.waking = { kind: sleeper.kind, built: sleeper.built, start: t, slot: arrived.slot, paper: arrived.paper, pose: blankPose(), fillIn: 0 }
    const { center, bounds } = sleeper.built
    this.wakeBurst.x = center.x
    this.wakeBurst.y = center.y
    this.wakeBurst.rx = (bounds.x1 - bounds.x0) / 2
    this.wakeBurst.ry = (bounds.y1 - bounds.y0) / 2
    this.wakeBurst.at = t + SILHOUETTE_S
    this.sleeper = null
    this.nextSleeperAt = t + SILHOUETTE_S + ANTICIPATE_S + 0.4
    this.stir = 0
    this.demo = null
    this.searchFor = null
    this.version++
    this.cadence.change(performance.now(), true)
    this.sound.wake(sleeper.kind)
    this.peelSoundAt = t + SILHOUETTE_S + ANTICIPATE_S
  }

  /** Called by the view each frame after step() so timed one-shot sounds fire in order. */
  flushTimedSounds(): void {
    if (this.peelSoundAt >= 0 && this.t >= this.peelSoundAt) {
      this.peelSoundAt = -1
      this.sound.peel()
    }
  }

  // --- touch -------------------------------------------------------------------

  pointerDown(pointerId: number, at: Point, timeStamp: number): void {
    this.sound.unlock()
    this.scheduler.touch(this.t)
    this.clearGuidance()
    this.screens.set(pointerId, { x: at.x, y: at.y })
    this.handle(this.tracker.down(pointerId, at, timeStamp))
  }

  pointerMove(pointerId: number, at: Point): void {
    const screen = this.screens.get(pointerId)
    if (!screen) return
    screen.x = at.x
    screen.y = at.y
    const intents = this.tracker.move(pointerId, at)
    if (intents.length > 0) {
      this.scheduler.touch(this.t)
      this.handle(intents)
    }
  }

  pointerUp(pointerId: number, at: Point, timeStamp: number): void {
    this.scheduler.touch(this.t)
    this.handle(this.tracker.up(pointerId, at, timeStamp))
    this.screens.delete(pointerId)
  }

  pointerCancel(pointerId: number): void {
    this.handle(this.tracker.cancel(pointerId))
    this.screens.delete(pointerId)
  }

  private clearGuidance(): void {
    this.demo = null
    this.searchFor = null
    this.demoPose.opacity = 0
  }

  private handle(intents: Intent[]): void {
    for (const intent of intents) {
      switch (intent.type) {
        case 'press':
          this.press(intent.target, intent.at)
          break
        case 'tap':
          if (intent.target.kind === 'shape') this.turnShape(this.shapes[intent.target.index], TAP_TURN)
          break
        case 'dragStart':
          if (intent.target.kind === 'shape') this.pickUp(this.shapes[intent.target.index], intent.pointerId, intent.at)
          break
        case 'dragMove':
          break
        case 'dragEnd':
          if (intent.target.kind === 'shape') {
            const shape = this.shapes[intent.target.index]
            if (shape.heldBy === intent.pointerId) this.release(shape, true)
          }
          break
        case 'twist': {
          const shape = this.shapes[intent.index]
          shape.target.angle -= intent.delta
          // A twist stops where the card would turn into a neighbour.
          if (standBlocked(this.aims[intent.index], this.placed, intent.index)) shape.target.angle += intent.delta
          this.arm()
          this.cadence.change(performance.now())
          break
        }
        case 'cancelAll':
          for (const shape of this.shapes) if (shape.heldBy !== null) this.release(shape, false)
          break
        default: {
          const unreachable: never = intent
          void unreachable
        }
      }
    }
  }

  private press(target: Target, at: Point): void {
    const t = this.t
    switch (target.kind) {
      case 'shape': {
        const shape = this.shapes[target.index]
        shape.pressAt = t
        this.sound.pick()
        break
      }
      case 'sky': {
        const c = this.companions[target.index]
        if (c && !c.flight && c.reactAt === -Infinity && c.leavingAt === -Infinity) {
          c.reactAt = t
          c.flipped = false
          this.sound.voice(c.kind)
        }
        break
      }
      case 'sleeper':
        this.snuffleAt = t
        if (this.sleeper) this.sound.snuffle(this.sleeper.kind)
        break
      case 'lamp':
        this.lampFlareAt = t
        this.sound.lamp()
        break
      case 'backdrop': {
        if (this.projector && this.projector.ray(at, this.origin, this.dir)) this.placeSpark(t)
        this.sound.sparkle()
        break
      }
      default: {
        const unreachable: never = target
        void unreachable
      }
    }
  }

  private pickUp(shape: ShapeRuntime, pointerId: number, at: Point): void {
    if (shape.heldBy !== null) return
    const hit = this.planeHit(at, PIN_HEIGHT + GRIP_HEIGHT)
    shape.grab.dx = hit ? shape.target.x - hit.x : 0
    shape.grab.dz = hit ? shape.target.z - hit.z : 0
    shape.heldBy = pointerId
    this.sound.pick()
  }

  private release(shape: ShapeRuntime, withSound: boolean): void {
    shape.heldBy = null
    shape.dropAt = this.t
    // Set down where the stand can get to: short of whatever stands between it and the finger.
    const i = this.shapes.indexOf(shape)
    const pose = shape.pose
    const target = shape.target
    const k = slideReach(shape.kind, pose.x, pose.z, target.x, target.z, target.angle, this.crowds, i)
    target.x = pose.x + (target.x - pose.x) * k
    target.z = pose.z + (target.z - pose.z) * k
    this.settleTarget(i)
    if (withSound) this.sound.drop(shape.pose.lift)
    this.arm()
    this.cadence.change(performance.now(), true)
  }

  private turnShape(shape: ShapeRuntime, by: number): void {
    shape.target.angle += by
    // Turned into a neighbour, it steps aside; with nowhere to go it stays as it was.
    if (!this.settleTarget(this.shapes.indexOf(shape))) shape.target.angle -= by
    shape.pulseAt = this.t
    this.sound.turn()
    this.arm()
    this.syncState()
    this.cadence.change(performance.now(), true)
  }

  private arm(): void {
    if (this.sleeper && this.t - this.sleeper.enterAt >= ENTER_S) this.sleeper.armed = true
    this.syncState()
  }

  /** Copy the shapes' targets into the saved state (angles kept unwrapped at runtime, normalized in the save). */
  private syncState(): void {
    for (let i = 0; i < this.shapes.length; i++) {
      const shape = this.shapes[i]
      const saved = this.state.shapes[i]
      saved.x = shape.target.x
      saved.z = shape.target.z
      saved.angle = normalizeAngle(shape.target.angle)
    }
  }

  anyHeld(): boolean {
    for (const shape of this.shapes) if (shape.heldBy !== null) return true
    return false
  }

  private anyFlying(): boolean {
    for (const c of this.companions) if (c.flight || c.settleAt > -Infinity) return true
    return false
  }

  // --- hit tests ---------------------------------------------------------------

  private planeHit(screen: Point, height: number): { x: number; z: number } | null {
    if (!this.projector || !this.projector.ray(screen, this.origin, this.dir)) return null
    if (Math.abs(this.dir.y) < 1e-4) return null
    const k = (height - this.origin.y) / this.dir.y
    if (k <= 0) return null
    this.clamped.x = this.origin.x + this.dir.x * k
    this.clamped.z = this.origin.z + this.dir.z * k
    return this.clamped
  }

  /** A tap on nothing in particular: the burst goes on the first surface along the last ray, wherever the finger landed. */
  private placeSpark(t: number): void {
    const o = this.origin
    const d = this.dir
    const spark = this.spark
    const toFloor = d.y < 0 ? -o.y / d.y : Infinity
    const toScreen = d.z < 0 ? -o.z / d.z : Infinity
    const sx = o.x + d.x * toScreen
    const sy = o.y + d.y * toScreen
    if (toScreen < toFloor && sy > 0 && clearOfProscenium(sx, sy, 0) < 0) {
      const onScreen = sx > SCREEN.left && sx < SCREEN.right && sy > SCREEN.bottom && sy < SCREEN.top
      spark.surface = onScreen ? 'screen' : 'sky'
      spark.z = onScreen ? SPARK_Z.screen : SPARK_Z.proscenium
      const k = (spark.z - o.z) / d.z
      spark.x = o.x + d.x * k
      spark.y = o.y + d.y * k
    } else if (toFloor < Infinity && o.z + d.z * toFloor > GROUND_BACK) {
      spark.surface = 'floor'
      spark.x = o.x + d.x * toFloor
      spark.y = 0
      spark.z = o.z + d.z * toFloor
    } else {
      const hit = this.rayToPlaneZ(SPARK_Z.sky)
      if (!hit) return
      spark.surface = 'sky'
      spark.x = hit.x
      spark.y = hit.y
      spark.z = SPARK_Z.sky
    }
    spark.at = t
  }

  private rayToPlaneZ(z: number): { x: number; y: number } | null {
    if (Math.abs(this.dir.z) < 1e-4) return null
    const k = (z - this.origin.z) / this.dir.z
    if (k <= 0) return null
    return { x: this.origin.x + this.dir.x * k, y: this.origin.y + this.dir.y * k }
  }

  hitTest(at: Point): Target {
    if (!this.projector || !this.projector.ray(at, this.origin, this.dir)) return { kind: 'backdrop' }
    const o = this.origin
    const d = this.dir
    // Shapes: the nearest card (or its stick) along the ray.
    let best = -1
    let bestK = Infinity
    for (let i = 0; i < this.shapes.length; i++) {
      const pose = this.shapes[i].pose
      if (Math.abs(d.z) < 1e-4) continue
      const k = (pose.z - o.z) / d.z
      if (k <= 0 || k >= bestK) continue
      const hx = o.x + d.x * k
      const hy = o.y + d.y * k
      const spec = SHAPES[this.shapes[i].kind]
      const ru = hx - pose.x
      const rv = hy - (PIN_HEIGHT + pose.lift)
      const c = Math.cos(pose.angle)
      const s = Math.sin(pose.angle)
      const u = ru * c + rv * s
      const v = -ru * s + rv * c
      const onCard = spec.inside(u, v) || Math.hypot(u - spec.center.x, v - spec.center.y) < spec.radius * 0.75 + HIT_SLOP_CM
      const onStick = Math.abs(hx - pose.x) < HIT_SLOP_CM + 0.4 && hy > -1 && hy < PIN_HEIGHT
      if (onCard || onStick) {
        best = i
        bestK = k
      }
    }
    if (best >= 0) return { kind: 'shape', index: best }
    // The lamp.
    const lk = (LAMP.x - o.x) * d.x + (LAMP.y - o.y) * d.y + (LAMP.z - o.z) * d.z
    if (lk > 0 && Math.hypot(o.x + d.x * lk - LAMP.x, o.y + d.y * lk - LAMP.y, o.z + d.z * lk - LAMP.z) < 5.5) return { kind: 'lamp' }
    // The sleeping outline on the screen.
    const onScreen = this.rayToPlaneZ(0)
    if (onScreen && this.sleeper) {
      const b = this.sleeper.built.bounds
      if (onScreen.x > b.x0 - 1 && onScreen.x < b.x1 + 1 && onScreen.y > b.y0 - 1 && onScreen.y < b.y1 + 1) return { kind: 'sleeper' }
    }
    // Companions in the sky, each in the plane it is drawn in: one that landed
    // short of its layer is still settling back onto it, well in front of it.
    let nearest = -1
    let nearestD = 9
    this.companions.forEach((c, index) => {
      if (c.flight) return
      const at = this.rayToPlaneZ(c.pose.z)
      if (!at) return
      const dist = Math.hypot(at.x - c.pose.x, at.y - c.pose.y)
      if (dist < nearestD) {
        nearest = index
        nearestD = dist
      }
    })
    if (nearest >= 0) return { kind: 'sky', index: nearest }
    return { kind: 'backdrop' }
  }

  // --- for the view ------------------------------------------------------------

  /** 0..1 flash of a shape just tapped. */
  pulse(shape: ShapeRuntime): number {
    const k = (this.t - shape.pulseAt) / 0.4
    return k < 0 || k > 1 ? 0 : Math.sin(k * Math.PI)
  }

  /** 0..1 squash of a shape just set down. */
  landing(shape: ShapeRuntime): number {
    const k = (this.t - shape.dropAt) / 0.35
    return k < 0 || k > 1 ? 0 : Math.sin(k * Math.PI) * (1 - k)
  }

  /** 0..1 how far the current sleeper's outline has drifted in. */
  enterProgress(): number {
    return this.sleeper ? smooth((this.t - this.sleeper.enterAt) / ENTER_S) : 0
  }

  lampFlare(): number {
    const k = (this.t - this.lampFlareAt) / 0.9
    return k < 0 || k > 1 ? 0 : Math.sin(k * Math.PI) * (1 - k * 0.5)
  }

  /** Seconds the theatre has been untouched and still (for half-rate rendering at rest). */
  restingFor(): number {
    if (this.anyHeld() || this.waking || this.anyFlying() || this.guidance.demo !== null || this.guidance.invite !== null) return 0
    return this.scheduler.idleFor(this.t)
  }
}
