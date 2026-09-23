import { ANIMALS, CLEARING, HOMES, clampToClearing, type AnimalKey, type AnimalSpec, type HomeKey, type Point } from './layout'
import { between, type Rng } from './rng'
import { reactionFor, type Reaction } from './rules'

// One animal's behaviour, frame by frame: wander, pause, yawn, get carried
// (dangling from the finger like a pendulum with its own weight), fly into
// a home, settle or be turned away physically, sleep, wake at dawn, and
// come out again. Pure and deterministic given the RNG, and allocation-free
// after construction because it runs every frame. The rigs in view/ read
// these fields to pose each animal in its own way.

export type Mode =
  | 'idle'
  | 'walk'
  | 'yawn'
  | 'trick'
  | 'held'
  | 'fall'
  | 'toHome'
  | 'react'
  | 'travel'
  | 'settle'
  | 'asleep'
  | 'wake'
  | 'exit'

export type BrainEvent =
  | 'land'
  | 'yawn'
  | 'trick'
  | 'settle'
  | 'bumped'
  | 'shiver'
  | 'splash'
  | 'shake'
  | 'slid'
  | 'tipped'
  | 'flop'
  | 'plop'
  | 'flap'
  | 'wake'
  | 'exit'
  | 'snore'

export interface BrainWorld {
  readonly rng: Rng
  readonly creatures: readonly Creature[]
  /** The child has been idle a while: animals stop and look toward home. */
  readonly gazeHome: boolean
  /** Carried animals look and lean toward home (the youngest children's default). */
  readonly leanWhenHeld: boolean
  occupied(home: HomeKey, except: Creature): boolean
  emit(event: BrainEvent, creature: Creature): void
}

type Motion = { stiffness: number; damping: number; turn: number; yawn: number; trick: number; breath: number }

/** Per-animal timing: how springy it lands, how fast it turns, how long it yawns and breathes. */
export const MOTION: Record<AnimalKey, Motion> = {
  owl: { stiffness: 200, damping: 11, turn: 2.2, yawn: 2.4, trick: 1.6, breath: 2.9 },
  fox: { stiffness: 300, damping: 13, turn: 6, yawn: 2.2, trick: 1.2, breath: 2.4 },
  rabbit: { stiffness: 380, damping: 12, turn: 8, yawn: 1.8, trick: 1.0, breath: 1.9 },
  bear: { stiffness: 120, damping: 8, turn: 1.6, yawn: 3.2, trick: 2.0, breath: 3.6 },
  fish: { stiffness: 420, damping: 9, turn: 7, yawn: 1.6, trick: 1.1, breath: 2.2 },
  songbird: { stiffness: 520, damping: 16, turn: 12, yawn: 1.6, trick: 1.3, breath: 1.5 },
}

/**
 * Reaction timelines: [in, out, end]. The animal is at the entrance until
 * `in`, travels out until `out`, and is back on its feet at `end`.
 */
export const REACT_TIMES: Record<Exclude<Reaction, 'settle'>, readonly [number, number, number]> = {
  bump: [0.4, 0.95, 1.35],
  shiver: [1.35, 1.8, 2.0],
  splash: [0.4, 0.95, 1.9],
  slide: [0.5, 1.1, 1.6],
  tip: [0.35, 1.0, 1.4],
  flop: [0.3, 0.85, 0.85],
  flyHome: [0.05, 0.55, 0.55],
}

export const TO_HOME_SECONDS = 0.5
export const SETTLE_SECONDS = 1.6
export const WAKE_SECONDS = 1.9
export const EXIT_SECONDS = 1.0
/** How long an animal stops and looks at its home after the child knocks on it. */
export const ANSWER_SECONDS = 2
const GRAVITY = 340
/** How high a carried animal's feet ride above the ground. */
export const CARRY_LIFT = 9
/**
 * The view looks down at 30 degrees (tan 30° ≈ 0.58), so someone standing nearer the child covers whoever is behind
 * them up to about 1.7 times their own height back.
 */
const VIEW_SLOPE = 0.58

type V = { x: number; y: number; z: number }

function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k
}

function clamp01(k: number): number {
  return k < 0 ? 0 : k > 1 ? 1 : k
}

function ease(k: number): number {
  const u = clamp01(k)
  return u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2
}

function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

/** Yaw that faces from (x, z) toward (tx, tz); 0 faces the child (+z). */
export function yawToward(x: number, z: number, tx: number, tz: number): number {
  return Math.atan2(tx - x, tz - z)
}

const scratch: Point = { x: 0, z: 0 }

export class Creature {
  readonly key: AnimalKey
  readonly index: number
  readonly spec: AnimalSpec
  readonly motion: Motion
  mode: Mode = 'idle'
  /** Seconds in the current mode. */
  modeT = 0
  x = 0
  y = 0
  z = 0
  /** Planar speed, for gait. */
  speed = 0
  /** Gait phase in cycles (advances with distance walked). */
  gait = 0
  yaw = 0
  /** 0..1 how strongly it gazes toward its home. */
  look = 0
  lookYaw = 0
  /** Landing squash (+) and pickup stretch (-), as a spring. */
  squash = 0
  squashV = 0
  sleepiness = 0.3
  reaction: Reaction | null = null
  /** The home it was last carried into (for reactions and the view). */
  visiting: HomeKey | null = null
  /** Reaction stage: 0 at the entrance, 1 on the way out, 2 back on its feet. */
  stage = 0
  // held
  pivotX = 0
  pivotY = 0
  pivotZ = 0
  /** Pendulum angles (radians): sideways and front-back. */
  swingX = 0
  swingZ = 0
  private grabX = 0
  private grabY = 0
  private grabZ = 0
  private pivotVX = 0
  private pivotVZ = 0
  private swingVX = 0
  private swingVZ = 0
  private vx = 0
  private vy = 0
  private vz = 0
  // arcs
  private readonly from: V = { x: 0, y: 0, z: 0 }
  private readonly to: V = { x: 0, y: 0, z: 0 }
  private arcSeconds = 1
  private arcHeight = 0
  private readonly target: Point = { x: 0, z: 0 }
  /** Seconds this walk may take before the animal gives up on it (a neighbour may be standing on the spot). */
  private walkBudget = 0
  private idleFor = 1
  private nextYawn = 6
  private trickAfterLanding = false
  /** When it was last stirred in its sleep (on its own clock), or -1. */
  stirredAt = -1
  /** A wordless invitation yawn toward the child (first open). */
  inviting = false
  /** Seconds left looking at its home because the child knocked on it. */
  answering = 0
  /** Which of its two tricks is playing. They alternate, so a second tap never gets the same answer as the first. */
  trickVariant = 1
  /** This walk is a few steps out from behind someone, so it goes on even while everyone gazes home. */
  private sidestep = false
  /** Its own clock, for breathing and blinking. */
  clock = 0
  private lastBreath = 0

  constructor(key: AnimalKey, index: number, seed: number) {
    this.key = key
    this.index = index
    this.spec = ANIMALS[key]
    this.motion = MOTION[key]
    this.clock = seed * 1.7
    this.nextYawn = 5 + seed * 2.3
    // The forest opens calm: everyone stands where the child can see them, then they amble off one at a time.
    this.idleFor = 2.5 + seed * 6
  }

  // --- queries ----------------------------------------------------------------

  get asleep(): boolean {
    return this.mode === 'asleep' || this.mode === 'settle'
  }

  /** In a home: settling, sleeping, or waking. */
  get atHome(): boolean {
    return this.mode === 'asleep' || this.mode === 'settle' || this.mode === 'wake'
  }

  /** Free on the ground, walking about or pausing. */
  get roaming(): boolean {
    return this.mode === 'idle' || this.mode === 'walk' || this.mode === 'yawn' || this.mode === 'trick'
  }

  /** Can a finger pick it up right now? (`playful` is false at night.) */
  pickable(playful: boolean): boolean {
    if (!playful) return false
    return this.roaming || this.mode === 'fall' || this.mode === 'asleep' || this.mode === 'settle'
  }

  /** Someone up and about who stands nearer the child and hides most of this animal from view, or null. */
  hiddenBy(creatures: readonly Creature[]): Creature | null {
    for (const other of creatures) {
      if (other === this || !other.roaming) continue
      const dz = other.z - this.z
      if (dz <= 0) continue
      const overlap = 1 - Math.abs(other.x - this.x) / (this.spec.radius + other.spec.radius)
      const covered = (other.spec.size - dz * VIEW_SLOPE) / this.spec.size
      if (overlap > 0.3 && covered > 0.5) return other
    }
    return null
  }

  /** Is it certainly on its way to bed (so a save should call it asleep)? */
  get homeBound(): boolean {
    if (this.atHome || this.mode === 'travel') return true
    if (this.mode === 'toHome') return this.visiting === this.spec.home
    if (this.mode === 'react') return this.reaction === 'flop' || this.reaction === 'flyHome'
    return false
  }

  /** Where it would rest on the ground if everything stopped now (for saving). */
  restingPoint(out: Point): Point {
    out.x = this.mode === 'held' ? this.pivotX : this.x
    out.z = this.mode === 'held' ? this.pivotZ : this.z
    return clampToClearing(out, 4)
  }

  // --- commands ---------------------------------------------------------------

  placeAt(x: number, z: number): void {
    this.x = x
    this.z = z
    this.y = 0
    this.vx = this.vz = this.vy = 0
    this.reaction = null
    this.visiting = null
    this.setMode('idle')
  }

  sleepAtHome(): void {
    const bed = HOMES[this.spec.home].bed
    this.x = bed.x
    this.y = bed.y
    this.z = bed.z
    this.visiting = this.spec.home
    this.reaction = 'settle'
    this.setMode('asleep')
  }

  pickUp(): void {
    this.pivotX = this.grabX = this.x
    this.pivotY = this.grabY = this.y + this.spec.hang
    this.pivotZ = this.grabZ = this.z
    this.pivotVX = this.pivotVZ = 0
    this.swingX = this.swingZ = 0
    this.swingVX = this.swingVZ = 0
    this.squashV -= 3.4
    this.trickAfterLanding = false
    this.inviting = false
    this.answering = 0
    this.reaction = null
    this.visiting = null
    this.setMode('held')
  }

  /** The finger's point on the ground; the animal hangs below it at carry height. */
  setGrab(x: number, z: number, y = this.spec.hang + CARRY_LIFT): void {
    this.grabX = x
    this.grabZ = z
    this.grabY = y
  }

  /** Let go over open ground. A quick tap lands and then plays its trick. */
  drop(trick = false): void {
    if (this.mode !== 'held') return
    this.vx = this.pivotVX * 0.25
    this.vz = this.pivotVZ * 0.25
    this.vy = 0
    this.trickAfterLanding = trick
    this.setMode('fall')
  }

  /** Let go over a home: fly into its entrance. */
  sendTo(home: HomeKey): void {
    this.visiting = home
    this.reaction = null
    const mouth = HOMES[home].mouth
    this.startArc(mouth.x, mouth.y, mouth.z, TO_HOME_SECONDS, 7)
    this.setMode('toHome')
  }

  stir(): void {
    if (this.asleep) this.stirredAt = this.clock
  }

  invite(): void {
    if (this.mode === 'idle' || this.mode === 'walk') {
      this.inviting = true
      this.setMode('yawn')
    }
  }

  wake(): void {
    if (this.mode === 'asleep' || this.mode === 'settle') this.setMode('wake')
  }

  /**
   * The child knocked on its home while it was up and about: it perks up and looks at it at once. A yawn or a trick
   * plays out (cutting it short would snap the pose) while its head turns, and the look holds after it.
   */
  answer(): boolean {
    if (!this.roaming) return false
    const busy = this.mode === 'yawn' ? this.motion.yawn : this.mode === 'trick' ? this.motion.trick : 0
    this.answering = ANSWER_SECONDS + Math.max(0, busy - this.modeT)
    this.squashV -= 1.8
    if (this.mode === 'walk') {
      this.idleFor = 0.8
      this.setMode('idle')
    }
    return true
  }

  // --- the step ---------------------------------------------------------------

  step(dt: number, world: BrainWorld): void {
    this.modeT += dt
    this.clock += dt
    this.stepSquash(dt)
    this.answering = Math.max(0, this.answering - dt)
    const up = this.mode === 'idle' || this.mode === 'walk'
    const wantLook = (up && world.gazeHome) || (this.roaming && this.answering > 0) || (world.leanWhenHeld && this.mode === 'held') ? 1 : 0
    this.look += (wantLook - this.look) * (1 - Math.exp(-dt * 3))
    const home = HOMES[this.spec.home].mouth
    this.lookYaw = yawToward(this.x, this.z, home.x, home.z)

    switch (this.mode) {
      case 'idle':
        return this.stepIdle(dt, world)
      case 'walk':
        return this.stepWalk(dt, world)
      case 'yawn':
        this.speed *= Math.exp(-dt * 8)
        if (this.inviting) this.faceToward(0, dt)
        if (this.modeT >= this.motion.yawn) this.endPause(world)
        return
      case 'trick':
        this.speed *= Math.exp(-dt * 8)
        if (this.modeT >= this.motion.trick) this.endPause(world)
        return
      case 'held':
        return this.stepHeld(dt)
      case 'fall':
        return this.stepFall(dt, world)
      case 'toHome':
        return this.stepToHome(world)
      case 'react':
        return this.stepReact(world)
      case 'travel':
        return this.stepTravel(world)
      case 'settle': {
        const bed = HOMES[this.spec.home].bed
        const k = ease(this.modeT / 0.5)
        this.x = lerp(this.from.x, bed.x, k)
        this.y = lerp(this.from.y, bed.y, k)
        this.z = lerp(this.from.z, bed.z, k)
        this.faceToward(0, dt)
        if (this.modeT >= SETTLE_SECONDS) this.setMode('asleep')
        return
      }
      case 'asleep': {
        const breath = Math.floor(this.clock / this.motion.breath)
        if (breath !== this.lastBreath) {
          this.lastBreath = breath
          world.emit('snore', this)
        }
        return
      }
      case 'wake':
        if (this.modeT >= WAKE_SECONDS) this.startExit(world)
        return
      case 'exit':
        this.followArc(this.modeT / EXIT_SECONDS)
        if (this.modeT >= EXIT_SECONDS) {
          this.y = 0
          this.squashV += 2.5
          world.emit('land', this)
          this.idleFor = between(world.rng, 0.8, 2)
          this.setMode('idle')
        }
        return
      default: {
        const unreachable: never = this.mode
        return unreachable
      }
    }
  }

  // --- modes ------------------------------------------------------------------

  private setMode(mode: Mode): void {
    this.mode = mode
    this.modeT = 0
    this.stage = 0
    this.sidestep = false
  }

  private stepSquash(dt: number): void {
    const { stiffness, damping } = this.motion
    const steps = Math.max(1, Math.ceil(dt / (1 / 240)))
    const h = dt / steps
    for (let i = 0; i < steps; i++) {
      this.squashV += (-stiffness * this.squash - damping * this.squashV) * h
      this.squash += this.squashV * h
    }
  }

  private faceToward(yaw: number, dt: number): void {
    const diff = wrapAngle(yaw - this.yaw)
    this.yaw = wrapAngle(this.yaw + diff * (1 - Math.exp(-dt * this.motion.turn)))
  }

  private stepIdle(dt: number, world: BrainWorld): void {
    this.speed *= Math.exp(-dt * 8)
    this.separate(world)
    // Idle animals turn their faces to the child; gazing ones turn toward home.
    const faceYaw = this.look > 0.3 ? this.lookYaw * 0.8 : Math.max(-0.7, Math.min(0.7, this.yaw))
    this.faceToward(faceYaw, dt)
    // Nobody spends the evening where the child can't see them.
    const hider = this.modeT > 0.4 ? this.hiddenBy(world.creatures) : null
    if (hider) return this.stepAside(hider)
    if (world.gazeHome || this.answering > 0) return
    this.nextYawn -= dt
    if (this.nextYawn <= 0) {
      this.nextYawn = between(world.rng, 9, 17) * (1 - 0.35 * this.sleepiness)
      world.emit('yawn', this)
      this.setMode('yawn')
      return
    }
    if (this.crowded(world)) this.idleFor = Math.min(this.idleFor, 0.5)
    this.idleFor -= dt
    if (this.idleFor <= 0) this.pickTarget(world)
  }

  /** A neighbour is standing close enough that this animal would rather walk somewhere roomier. */
  private crowded(world: BrainWorld): boolean {
    for (const other of world.creatures) {
      if (other === this || !other.roaming) continue
      if (Math.hypot(this.x - other.x, this.z - other.z) < (this.spec.radius + other.spec.radius) * 1.5) return true
    }
    return false
  }

  private endPause(world: BrainWorld): void {
    this.inviting = false
    this.idleFor = between(world.rng, 0.6, 1.8)
    this.setMode('idle')
  }

  /** A spot across the clearing with room around it, away from where the others stand or are heading. */
  private pickTarget(world: BrainWorld): void {
    let best = -Infinity
    let bestX = this.x
    let bestZ = this.z
    for (let attempt = 0; attempt < 8; attempt++) {
      const angle = world.rng() * Math.PI * 2
      const r = Math.sqrt(world.rng()) * 0.9
      const tx = CLEARING.x + Math.cos(angle) * CLEARING.rx * r
      const tz = CLEARING.z + Math.sin(angle) * CLEARING.rz * r
      if (Math.hypot(tx - this.x, tz - this.z) < 14) continue
      let room = Infinity
      for (const other of world.creatures) {
        if (other === this || !other.roaming) continue
        const ox = other.mode === 'walk' ? other.target.x : other.x
        const oz = other.mode === 'walk' ? other.target.z : other.z
        room = Math.min(room, Math.hypot(tx - ox, tz - oz) - other.spec.radius)
      }
      if (room > best) {
        best = room
        bestX = tx
        bestZ = tz
      }
    }
    this.target.x = bestX
    this.target.z = bestZ
    this.walkBudget = 2 + (2 * Math.hypot(this.target.x - this.x, this.target.z - this.z)) / this.spec.walkSpeed
    this.setMode('walk')
  }

  /** A few steps sideways, out from behind whoever is hiding it, toward whichever side has room. */
  private stepAside(hider: Creature): void {
    const gap = (this.spec.radius + hider.spec.radius) * 1.3
    let side = this.x > hider.x || (this.x === hider.x && this.index % 2 === 0) ? 1 : -1
    scratch.x = hider.x + side * gap
    scratch.z = this.z
    clampToClearing(scratch, 2)
    if (Math.abs(scratch.x - (hider.x + side * gap)) > 1) {
      side = -side
      scratch.x = hider.x + side * gap
      scratch.z = this.z
      clampToClearing(scratch, 2)
    }
    this.target.x = scratch.x
    this.target.z = scratch.z
    this.walkBudget = 3
    this.setMode('walk')
    this.sidestep = true
  }

  private stepWalk(dt: number, world: BrainWorld): void {
    if (world.gazeHome && !this.sidestep) {
      this.setMode('idle')
      return
    }
    const dx = this.target.x - this.x
    const dz = this.target.z - this.z
    const distance = Math.hypot(dx, dz)
    if (distance < 1.5 || this.modeT > this.walkBudget || this.nextYawn <= 0) {
      this.idleFor = between(world.rng, 1.2, 4)
      this.setMode('idle')
      return
    }
    // Curve around anyone in the way rather than shouldering through them.
    let ax = dx / distance
    let az = dz / distance
    for (const other of world.creatures) {
      if (other === this || !other.roaming) continue
      const ox = this.x - other.x
      const oz = this.z - other.z
      const d = Math.hypot(ox, oz)
      const room = (this.spec.radius + other.spec.radius) * 1.7
      if (d < room && d > 0.001) {
        const push = ((room - d) / room) * 1.6
        ax += (ox / d) * push
        az += (oz / d) * push
      }
    }
    const want = Math.atan2(ax, az)
    this.faceToward(want, dt)
    const heading = wrapAngle(want - this.yaw)
    const aligned = Math.max(0, Math.cos(heading))
    const targetSpeed = this.spec.walkSpeed * (1 - 0.3 * this.sleepiness) * aligned * Math.min(1, distance / 6)
    this.speed += (targetSpeed - this.speed) * (1 - Math.exp(-dt * 5))
    this.x += Math.sin(this.yaw) * this.speed * dt
    this.z += Math.cos(this.yaw) * this.speed * dt
    this.gait += (this.speed * dt) / this.stride()
    this.separate(world)
    this.nextYawn -= dt * 0.5
  }

  /** Distance covered in one gait cycle. */
  stride(): number {
    return this.spec.size * 0.9
  }

  private separate(world: BrainWorld): void {
    const creatures = world.creatures
    for (let i = 0; i < creatures.length; i++) {
      const other = creatures[i]
      // Someone who just tumbled out of a home lands solid, so a bystander shuffles aside.
      const landed = other.mode === 'react' && other.stage === 2
      if (other === this || !(other.roaming || other.mode === 'fall' || landed)) continue
      const dx = this.x - other.x
      const dz = this.z - other.z
      const min = this.spec.radius + other.spec.radius
      const d = Math.hypot(dx, dz)
      if (d > 0.001 && d < min) {
        const push = ((min - d) / d) * 0.5
        this.x += dx * push
        this.z += dz * push
      }
    }
    clampToClearing(this, 0)
  }

  private stepHeld(dt: number): void {
    const w = this.spec.weight
    const k = 1 - Math.exp(-dt * lerp(28, 8, w))
    const nx = this.pivotX + (this.grabX - this.pivotX) * k
    const nz = this.pivotZ + (this.grabZ - this.pivotZ) * k
    this.pivotY += (this.grabY - this.pivotY) * (1 - Math.exp(-dt * lerp(16, 6, w)))
    const vx = dt > 0 ? (nx - this.pivotX) / dt : 0
    const vz = dt > 0 ? (nz - this.pivotZ) / dt : 0
    const ax = dt > 0 ? (vx - this.pivotVX) / dt : 0
    const az = dt > 0 ? (vz - this.pivotVZ) / dt : 0
    this.pivotX = nx
    this.pivotZ = nz
    this.pivotVX = vx
    this.pivotVZ = vz
    // A pendulum hanging from the finger: heavier animals swing slower and further.
    const stiffness = lerp(95, 26, w)
    const damping = lerp(9, 2.6, w)
    const drive = lerp(0.0012, 0.0036, w)
    const steps = Math.max(1, Math.ceil(dt / (1 / 240)))
    const h = dt / steps
    for (let i = 0; i < steps; i++) {
      this.swingVX += (-stiffness * this.swingX - damping * this.swingVX + ax * drive) * h
      this.swingVZ += (-stiffness * this.swingZ - damping * this.swingVZ + az * drive) * h
      this.swingX += this.swingVX * h
      this.swingZ += this.swingVZ * h
    }
    this.swingX = Math.max(-1.1, Math.min(1.1, this.swingX))
    this.swingZ = Math.max(-1.1, Math.min(1.1, this.swingZ))
    const hang = this.spec.hang
    this.x = this.pivotX - Math.sin(this.swingX) * hang
    this.z = this.pivotZ - Math.sin(this.swingZ) * hang
    this.y = Math.max(0, this.pivotY - hang * Math.cos(this.swingX) * Math.cos(this.swingZ))
    this.speed = Math.hypot(vx, vz)
    this.faceToward(this.look > 0.3 ? this.lookYaw * 0.55 * this.look : 0, dt)
  }

  private stepFall(dt: number, world: BrainWorld): void {
    this.vy -= GRAVITY * dt
    this.y += this.vy * dt
    this.x += this.vx * dt
    this.z += this.vz * dt
    this.vx *= Math.exp(-dt * 3)
    this.vz *= Math.exp(-dt * 3)
    this.swingX *= Math.exp(-dt * 8)
    this.swingZ *= Math.exp(-dt * 8)
    if (this.y > 0) return
    const impact = -this.vy
    this.y = 0
    this.vy = 0
    this.squashV += Math.min(5, impact * 0.05)
    scratch.x = this.x
    scratch.z = this.z
    clampToClearing(scratch, 3)
    this.x = scratch.x
    this.z = scratch.z
    world.emit('land', this)
    if (this.trickAfterLanding) {
      this.trickAfterLanding = false
      this.trickVariant = 1 - this.trickVariant
      world.emit('trick', this)
      this.setMode('trick')
    } else {
      this.idleFor = between(world.rng, 0.8, 2.2)
      this.setMode('idle')
    }
  }

  private startArc(x: number, y: number, z: number, seconds: number, height: number): void {
    this.from.x = this.x
    this.from.y = this.y
    this.from.z = this.z
    this.to.x = x
    this.to.y = y
    this.to.z = z
    this.arcSeconds = seconds
    this.arcHeight = height
  }

  private followArc(k: number): void {
    const u = clamp01(k)
    const e = ease(u)
    this.x = lerp(this.from.x, this.to.x, e)
    this.z = lerp(this.from.z, this.to.z, e)
    this.y = lerp(this.from.y, this.to.y, e) + Math.sin(u * Math.PI) * this.arcHeight
  }

  private stepToHome(world: BrainWorld): void {
    this.swingX *= 0.9
    this.swingZ *= 0.9
    this.followArc(this.modeT / TO_HOME_SECONDS)
    if (this.modeT < TO_HOME_SECONDS) return
    const home = this.visiting ?? this.spec.home
    const reaction = reactionFor(this.key, home, world.occupied(home, this))
    this.swingX = this.swingZ = 0
    if (reaction === 'settle') return this.beginSettle(world)
    this.reaction = reaction
    this.setMode('react')
    this.beginReaction(reaction, home, world)
  }

  private beginSettle(world: BrainWorld): void {
    this.from.x = this.x
    this.from.y = this.y
    this.from.z = this.z
    this.visiting = this.spec.home
    this.reaction = 'settle'
    this.squashV += 2
    world.emit('settle', this)
    this.setMode('settle')
  }

  private beginReaction(reaction: Exclude<Reaction, 'settle'>, home: HomeKey, world: BrainWorld): void {
    switch (reaction) {
      case 'bump':
        this.squashV += 3
        return world.emit('bumped', this)
      case 'shiver':
        return world.emit('shiver', this)
      case 'splash':
        return world.emit('splash', this)
      case 'slide':
        return
      case 'tip':
        return world.emit('tipped', this)
      case 'flop':
        return world.emit('flop', this)
      case 'flyHome':
        if (home === 'pond') world.emit('splash', this)
        return world.emit('flap', this)
      default: {
        const unreachable: never = reaction
        return unreachable
      }
    }
  }

  private stepReact(world: BrainWorld): void {
    const reaction = this.reaction
    if (reaction === null || reaction === 'settle') return this.endReaction(world)
    const home = HOMES[this.visiting ?? this.spec.home]
    const times = REACT_TIMES[reaction]
    const tIn = times[0]
    const tOut = times[1]
    const tEnd = times[2]
    const t = this.modeT
    const mouth = home.mouth
    const door = home.door
    if (this.stage === 0) {
      // At the entrance: lean in, sink into the water, cling to the trunk, or perch on the nest.
      const push = reaction === 'bump' ? 0.07 * Math.sin(clamp01(t / 0.3) * Math.PI * 0.5) : reaction === 'shiver' ? 0.05 : 0
      this.x = lerp(mouth.x, home.at.x, push)
      this.z = lerp(mouth.z, home.at.z, push)
      this.y = reaction === 'splash' ? -this.spec.size * 0.45 * Math.sin(clamp01(t / tIn) * Math.PI * 0.5) : reaction === 'shiver' ? mouth.y * 0.2 : mouth.y
      if (t < tIn) return
      this.stage = 1
      switch (reaction) {
        case 'slide':
          world.emit('slid', this)
          this.startArc(mouth.x + 1, 0, mouth.z + 3, tOut - tIn, 0)
          break
        case 'flyHome':
          this.startArc(lerp(mouth.x, door.x, 0.4), mouth.y + 8, lerp(mouth.z, door.z, 0.4), tOut - tIn, 3)
          break
        default:
          this.startArc(door.x, 0, door.z, tOut - tIn, reaction === 'splash' ? 10 : reaction === 'bump' ? 9 : 6)
      }
    }
    if (this.stage === 1) {
      const k = (t - tIn) / (tOut - tIn)
      if (reaction === 'slide') {
        const u = clamp01(k)
        this.x = lerp(this.from.x, this.to.x, u)
        this.z = lerp(this.from.z, this.to.z, u)
        this.y = lerp(this.from.y, 0, u * u)
      } else this.followArc(k)
      if (t < tOut) return
      this.stage = 2
      if (reaction === 'flyHome') return this.beginTravel()
      this.y = 0
      this.squashV += 3.2
      world.emit('land', this)
      if (reaction === 'flop') return this.beginTravel()
      if (reaction === 'splash') world.emit('shake', this)
    }
    if (t >= tEnd) this.endReaction(world)
  }

  private endReaction(world: BrainWorld): void {
    this.visiting = null
    this.reaction = null
    this.idleFor = between(world.rng, 1.8, 3)
    this.look = 1
    this.setMode('idle')
  }

  private beginTravel(): void {
    const mouth = HOMES[this.spec.home].mouth
    const distance = Math.hypot(mouth.x - this.x, mouth.z - this.z)
    if (this.spec.kind === 'fish') this.startArc(mouth.x, mouth.y, mouth.z, Math.max(1.2, distance / 34), 0)
    else this.startArc(mouth.x, mouth.y, mouth.z, Math.min(2.6, Math.max(1.2, distance / 48)), 12 + distance * 0.12)
    this.yaw = Math.atan2(mouth.x - this.x, mouth.z - this.z)
    this.visiting = this.spec.home
    this.reaction = this.spec.kind === 'fish' ? 'flop' : 'flyHome'
    this.setMode('travel')
  }

  private stepTravel(world: BrainWorld): void {
    const k = this.modeT / this.arcSeconds
    if (this.spec.kind === 'fish') {
      const u = clamp01(k)
      this.x = lerp(this.from.x, this.to.x, u)
      this.z = lerp(this.from.z, this.to.z, u)
      // Wriggling hops across the grass, then one last leap into the water.
      this.y = u < 0.85 ? Math.abs(Math.sin(u * Math.PI * 9)) * 1.6 : Math.sin(((u - 0.85) / 0.15) * Math.PI) * 5
      this.gait = u * 9
      this.speed = this.spec.walkSpeed
    } else {
      this.followArc(k)
      this.gait = this.modeT * 3
    }
    if (k < 1) return
    if (this.spec.kind === 'fish') world.emit('plop', this)
    this.beginSettle(world)
  }

  private startExit(world: BrainWorld): void {
    const home = HOMES[this.spec.home]
    scratch.x = lerp(home.door.x, CLEARING.x, 0.35) + between(world.rng, -6, 6)
    scratch.z = lerp(home.door.z, CLEARING.z, 0.35) + between(world.rng, -4, 4)
    clampToClearing(scratch, 6)
    this.startArc(scratch.x, 0, scratch.z, EXIT_SECONDS, this.spec.kind === 'bird' ? 10 : 6)
    this.yaw = Math.atan2(scratch.x - this.x, scratch.z - this.z)
    this.visiting = null
    this.reaction = null
    this.sleepiness = 0.15
    this.nextYawn = between(world.rng, 10, 20)
    world.emit('exit', this)
    this.setMode('exit')
  }
}
