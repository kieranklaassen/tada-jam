import { CoverageMeter, stirLevel, TAP_TURN, wakeRuleForAge, wakes, type CoverageResult, type Placed, type WakeRule } from './coverage'
import { buildCreature, type BuiltCreature, type CreatureKind } from './creatures'
import { blankDemoPose, demoPose, GRIP_HEIGHT, HintScheduler, IDLE_BEFORE_GLOW, type Demo, type DemoPose, type GuidanceState } from './guidance'
import { GestureTracker, type Intent, type Point, type Target } from './input'
import {
  ANTICIPATE_S,
  blankPose,
  PEEL_S,
  peelPose,
  PERSONALITIES,
  restPose,
  SILHOUETTE_S,
  SKY_HOMES,
  SKY_SCALE,
  SKY_Z,
  type CreaturePose,
  type Ring,
  type SleepPose,
} from './motion'
import { clampToStage, LAMP, PIN_HEIGHT, shadowScale, STAGE, type CardPose, type Vec3 } from './projection'
import { SaveCadence } from './saveCadence'
import { SHAPES, type ShapeKind } from './shapes'
import { normalizeAngle, serialize, wakeCreature, type TheatreState } from './state'

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
  pose: CreaturePose
  /** 0..1 opacity of the dark silhouette card as it fills in. */
  fillIn: number
  facingTarget: number
  arrived: boolean
}

export type Companion = {
  kind: CreatureKind
  slot: number
  seed: number
  pose: CreaturePose
  reactAt: number
  flipped: boolean
  facingTarget: number
  rings: Ring[]
  ringCount: number
  /** Set while it drifts behind the moon; removed when done. */
  leavingAt: number
}

const HIT_SLOP_CM = 1.6
const SPRING_STEP = 1 / 120
const WAKE_HOLD_S = 0.32
const ENTER_S = 1.8
/** Behind the moon, where an eighth companion's oldest friend goes to rest. */
export const MOON = { x: 62, y: 46, z: SKY_Z - 8 }
const LEAVE_S = 3.2
const HINT_BUDGET_MS = 0.6

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
  readonly spark = { x: 0, y: 0, z: 0, at: -Infinity }
  snuffleAt = -Infinity
  /** Bumped whenever the set of creatures changes, so the view can reassign meshes. */
  version = 0
  /** Index of the shape doing the first-open invite hop. */
  readonly inviteShape = 3

  private readonly sound: Sound
  private readonly cadence: SaveCadence
  private readonly tracker: GestureTracker
  private readonly scheduler: HintScheduler
  private projector: Projector | null = null
  private readonly screens = new Map<number, Point>()
  private readonly placed: Placed[]
  private readonly measured: Float64Array
  private readonly prevCovered = new Uint8Array(512)
  private holdFor = 0
  private nextSleeperAt = -1
  private searchFor: CreatureKind | null = null
  private searchDone = false
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
    this.measured = new Float64Array(this.shapes.length * 3).fill(NaN)
    this.state.sky.forEach((creature, index) => this.companions.push(this.companion(creature.kind, creature.slot, index * 2.3)))
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
    if (this.waking) this.stepWaking(this.waking, dt)
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
        const w = held ? 26 : 16
        shape.vx += (w * w * (shape.target.x - pose.x) - 2 * w * shape.vx) * h
        shape.vz += (w * w * (shape.target.z - pose.z) - 2 * w * shape.vz) * h
        pose.x += shape.vx * h
        pose.z += shape.vz * h
        // Turning overshoots a touch, like stiff card on a pin.
        const wa = 13
        shape.va += (wa * wa * (shape.target.angle - pose.angle) - 2 * 0.52 * wa * shape.va) * h
        pose.angle += shape.va * h
        // The card swings on its wire against the direction of travel, and settles with a wobble.
        const yawTarget = Math.max(-0.45, Math.min(0.45, -shape.vx * 0.012 + shape.vz * 0.004))
        const wy = 11
        shape.yawV += (wy * wy * (yawTarget - pose.yaw) - 2 * 0.28 * wy * shape.yawV) * h
        pose.yaw += shape.yawV * h
        // Lift: up while held, a pressed card rises a little, and a set-down card bounces.
        const wl = held ? 18 : 15
        shape.liftV += (wl * wl * (liftTarget - pose.lift) - 2 * (held ? 0.9 : 0.32) * wl * shape.liftV) * h
        pose.lift += shape.liftV * h
      }
      if (held) this.sound.slide(Math.hypot(shape.vx, shape.vz))
    }
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

  private stepWaking(waking: Waking, dt: number): void {
    const t = this.t
    const e = t - waking.start
    const personality = PERSONALITIES[waking.kind]
    const pose = waking.pose
    const { center, bounds } = waking.built
    restPose(pose)
    pose.x = center.x
    pose.y = center.y
    pose.z = 0.3
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
      // After the page turn the card is mirrored about its tail edge: the same
      // picture as an unturned card facing the other way.
      const fromX = center.x + 2 * hinge
      const home = SKY_HOMES[waking.slot]
      if (waking.facingTarget === 0) {
        waking.facingTarget = home.x >= fromX ? 1 : -1
        waking.pose.facing = -1
      }
      const k = Math.min(1, (e - flyAt) / personality.gaitSeconds)
      personality.gait(k, fromX, center.y, home.x, home.y, pose)
      pose.z = lerp(0.3, SKY_Z, smooth(k * 1.3))
      pose.scale = lerp(1, SKY_SCALE, smooth(k * 1.15))
      if (k >= 1 && !waking.arrived) {
        waking.arrived = true
        const companion = this.companion(waking.kind, waking.slot, 0)
        companion.pose.facing = pose.facing
        companion.facingTarget = waking.facingTarget
        companion.seed = -t
        this.companions.push(companion)
        this.waking = null
        this.version++
        this.sound.voice(waking.kind)
        return
      }
    }
    if (waking.facingTarget !== 0) pose.facing += (waking.facingTarget - pose.facing) * Math.min(1, dt * 5)
  }

  private stepCompanions(dt: number): void {
    const t = this.t
    for (let i = this.companions.length - 1; i >= 0; i--) {
      const c = this.companions[i]
      const personality = PERSONALITIES[c.kind]
      const pose = c.pose
      const home = SKY_HOMES[c.slot]
      const facing = pose.facing
      restPose(pose)
      pose.facing = facing
      personality.idle(t + c.seed, home.x, home.y, pose)
      pose.z = SKY_Z
      pose.scale = SKY_SCALE
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
        pose.z = lerp(SKY_Z, MOON.z, u)
        pose.scale = SKY_SCALE * (1 - u * 0.7)
        c.ringCount = 0
      }
    }
  }

  private stepGuidance(): void {
    const t = this.t
    const g = this.scheduler.state(t, this.guidance)
    const sleeper = this.sleeper
    const ready = sleeper !== null && t - sleeper.enterAt >= ENTER_S && !this.waking
    if (ready && this.scheduler.idleFor(t) >= IDLE_BEFORE_GLOW - 1 && this.searchFor !== sleeper.kind) {
      this.searchFor = sleeper.kind
      this.searchDone = false
      sleeper.meter.beginSearch(this.placed, true)
    }
    if (ready && this.searchFor === sleeper.kind && !this.searchDone && sleeper.meter.continueSearch(HINT_BUDGET_MS)) {
      this.searchDone = true
      this.demo = this.makeDemo(sleeper)
    }
    const playing = ready && g.demo !== null && this.demo !== null && this.searchDone
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
    const from = this.shapes[index].pose
    return { index, from: { ...from, yaw: 0, lift: 0 }, to: { x, z, angle: from.angle, yaw: 0, lift: 0 }, turn: 0 }
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

  private companion(kind: CreatureKind, slot: number, seed: number): Companion {
    const pose = blankPose()
    pose.facing = SKY_HOMES[slot].x > 0 ? -1 : 1
    return { kind, slot, seed, pose, reactAt: -Infinity, flipped: false, facingTarget: pose.facing, rings: blankRings(), ringCount: 0, leavingAt: -Infinity }
  }

  private startWake(sleeper: Sleeper): void {
    const t = this.t
    const { arrived, departed } = wakeCreature(this.state)
    if (departed) {
      const leaving = this.companions.find((c) => c.slot === departed.slot && c.leavingAt === -Infinity)
      if (leaving) leaving.leavingAt = t
    }
    this.waking = { kind: sleeper.kind, built: sleeper.built, start: t, slot: arrived.slot, pose: blankPose(), fillIn: 0, facingTarget: 0, arrived: false }
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
        if (c && c.reactAt === -Infinity && c.leavingAt === -Infinity) {
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
        const hit = this.projector && this.projector.ray(at, this.origin, this.dir) ? this.rayToPlaneZ(SKY_Z) : null
        if (hit) {
          this.spark.x = hit.x
          this.spark.y = hit.y
          this.spark.z = SKY_Z
          this.spark.at = t
        }
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
    if (withSound) this.sound.drop(shape.pose.lift)
    this.arm()
    this.cadence.change(performance.now(), true)
  }

  private turnShape(shape: ShapeRuntime, by: number): void {
    shape.target.angle += by
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
    // Companions in the sky.
    const inSky = this.rayToPlaneZ(SKY_Z)
    if (inSky) {
      let nearest = -1
      let nearestD = 9
      this.companions.forEach((c, index) => {
        const dist = Math.hypot(inSky.x - c.pose.x, inSky.y - c.pose.y)
        if (dist < nearestD) {
          nearest = index
          nearestD = dist
        }
      })
      if (nearest >= 0) return { kind: 'sky', index: nearest }
    }
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
    if (this.anyHeld() || this.waking || this.guidance.demo !== null || this.guidance.invite !== null) return 0
    return this.scheduler.idleFor(this.t)
  }
}
