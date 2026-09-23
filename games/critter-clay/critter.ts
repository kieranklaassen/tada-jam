import {
  carriedPose,
  createPose,
  gaitPose,
  IDLE_SECONDS,
  idlePose,
  MAX_LEGS,
  profileFor,
  REACT_SECONDS,
  reactPose,
  resetPose,
  sleepPose,
  WAKE_HOP_AT,
  WAKE_SECONDS,
  wakePose,
  type GaitProfile,
  type Pose,
  type Routine,
} from './gait'
import { clampWalk, TURNTABLE, WAKE_LANDING, type Point } from './layout'
import { bodyLift, type Part, type Vec3 } from './parts'
import type { CritterSave } from './state'
import { advance, arrived, headingTo, pickTarget, random, steer, type Mover, type Random } from './wander'

// One critter while it is on screen: what it is doing (its mode), where it
// is, and the pose the rig draws. Modes layer the motion routines from
// gait.ts: sleeping and waking on the turntable, walking and idling on the
// bench, greeting a friend, reacting to a tap, watching a part being
// offered, dangling while carried. Switching mode cross-fades from the old
// pose so nothing snaps, and the clay only "boils" (stop-motion jitter)
// while the critter is actually moving.

export type Mode =
  | 'sleeping'
  | 'plopping'
  | 'squashing'
  | 'waking'
  | 'lyingDown'
  | 'walking'
  | 'idling'
  | 'greeting'
  | 'reacting'
  | 'watching'
  | 'carried'
  | 'landing'

export type CritterSound = {
  step(routine: Routine, voice: number, level: number): void
  voice(critter: Critter, kind: 'wake' | 'greet' | 'tap' | 'carry' | 'land' | 'yawn'): void
  thud(level: number): void
}

export const MAX_PARTS = 15

/** Where the rig last drew a critter, in world space: what hit tests, snapping, and shadows read. */
export type CritterWorld = {
  body: Vec3
  /** Rough radius of the body in world units, for finger hits. */
  bodyR: number
  nose: Vec3
  /** Centre of each part (parallel to save.parts). */
  parts: Float32Array
  /** Where each leg meets the ground, for contact shadows. */
  feet: Float32Array
  feetCount: number
}

function createWorld(): CritterWorld {
  return { body: [0, 0, 0], bodyR: 6, nose: [0, 0, 0], parts: new Float32Array(MAX_PARTS * 3), feet: new Float32Array(MAX_LEGS * 3), feetCount: 0 }
}
export const CARRY_HEIGHT = 15
const BLEND_SECONDS = 0.24
const PLOP_SECONDS = 0.55
const SQUASH_SECONDS = 0.5
const LIE_DOWN_SECONDS = 1.3
const LAND_SECONDS = 0.5
const TURN_TO_FRIEND = 0.35
const GREET_COOLDOWN = 7
const STEPS_PER_CYCLE: Record<Routine, number> = { inch: 1, pogo: 1, waddle: 2, lope: 3, trot: 2, scuttle: 3 }

const smooth = (t: number) => {
  const k = Math.min(1, Math.max(0, t))
  return k * k * (3 - 2 * k)
}

const mix = (a: number, b: number, k: number) => a + (b - a) * k

/** Move `pose` toward `from` by `k` (0 keeps pose, 1 is from). */
export function mixPose(pose: Pose, from: Pose, k: number): void {
  if (k <= 0) return
  pose.lift = mix(pose.lift, from.lift, k)
  pose.pitch = mix(pose.pitch, from.pitch, k)
  pose.roll = mix(pose.roll, from.roll, k)
  pose.yaw = mix(pose.yaw, from.yaw, k)
  pose.sx = mix(pose.sx, from.sx, k)
  pose.sy = mix(pose.sy, from.sy, k)
  pose.sz = mix(pose.sz, from.sz, k)
  pose.legSplay = mix(pose.legSplay, from.legSplay, k)
  pose.tail = mix(pose.tail, from.tail, k)
  pose.tailLift = mix(pose.tailLift, from.tailLift, k)
  pose.ear = mix(pose.ear, from.ear, k)
  pose.headNod = mix(pose.headNod, from.headNod, k)
  pose.headTilt = mix(pose.headTilt, from.headTilt, k)
  pose.mouth = mix(pose.mouth, from.mouth, k)
  pose.lookX = mix(pose.lookX, from.lookX, k)
  pose.lookY = mix(pose.lookY, from.lookY, k)
  pose.lids = mix(pose.lids, from.lids, k)
  for (let i = 0; i < MAX_LEGS; i++) {
    pose.legSwing[i] = mix(pose.legSwing[i], from.legSwing[i], k)
    pose.legBend[i] = mix(pose.legBend[i], from.legBend[i], k)
  }
}

function copyPose(to: Pose, from: Pose): void {
  resetPose(to)
  mixPose(to, from, 1)
  to.advance = from.advance
}

export type WorldView = {
  t: number
  awake: readonly Critter[]
  /** A part being carried toward the bench: critters nearby stop and watch it. */
  offer: Point | null
  /** While the child is idle and the sleeper is ready, friends turn to watch it. */
  cheer: Point | null
  turntableAngle: number
  sound: CritterSound
}

export class Critter {
  readonly save: CritterSave
  profile: GaitProfile
  /** The resting height of the body centre above the ground, on its legs. */
  standLift: number
  mode: Mode
  modeT = 0
  /** Seconds this critter has existed on screen (drives breathing so neighbours don't breathe in sync). */
  age = 0
  readonly pose = createPose()
  readonly world = createWorld()
  private readonly fromPose = createPose()
  private blend = 1
  readonly mover: Mover
  /** Height of the surface under the critter: the turntable top or the bench. */
  ground = 0
  private phase = 0
  private walk = 0
  private readonly target: Point = { x: 0, z: 0 }
  private readonly rand: Random
  private idleFor = 3
  partner: Critter | null = null
  cooldown = 2
  /** Squash spring: positive squashes, kicked by attaching, landing, and taps. */
  wobble = 0
  private wobbleV = 0
  /** Seconds since each part was pressed on (parallel to save.parts). */
  readonly partAge: number[] = []
  /** Which part is being pulled and how far (0..1 before it pops). */
  pull: { index: number; amount: number; x: number; z: number } | null = null
  /** A part that was tapped wiggles for a moment. */
  poke: { index: number; t: number } | null = null
  private blinkIn: number
  private blinkT = -1
  /** Where the eyes look, in local look units, eased toward a target. */
  lookX = 0
  lookY = 0
  private stir = -1
  readonly carryAt: Point = { x: 0, z: 0 }
  private readonly from: Point = { x: 0, z: 0 }
  private fromGround = 0
  private fromHeading = 0
  /** 0..1 stop-motion boil strength. */
  boil = 0
  gone = false
  /** Bumped when the critter moved and its save is stale. */
  drifted = false

  constructor(save: CritterSave, mode: Mode) {
    this.save = save
    this.profile = profileFor(save.parts, save.seed)
    this.standLift = bodyLift(save.parts)
    this.mode = mode
    this.rand = { s: save.seed >>> 0 }
    this.mover = { x: save.x, z: save.z, heading: save.heading }
    for (let i = 0; i < save.parts.length; i++) this.partAge.push(10)
    this.blinkIn = 1.5 + random(this.rand) * 3
    this.age = random(this.rand) * 10
    if (mode === 'sleeping' || mode === 'plopping') this.placeOnTurntable()
    if (mode === 'plopping') this.ground = TURNTABLE.height + 26
  }

  get sleeping(): boolean {
    return this.mode === 'sleeping' || this.mode === 'plopping' || this.mode === 'squashing'
  }

  get awake(): boolean {
    return !this.sleeping && this.mode !== 'waking' && this.mode !== 'lyingDown'
  }

  get parts(): readonly Part[] {
    return this.save.parts
  }

  placeOnTurntable(): void {
    this.mover.x = TURNTABLE.x
    this.mover.z = TURNTABLE.z
    this.ground = TURNTABLE.height
  }

  setMode(mode: Mode): void {
    copyPose(this.fromPose, this.pose)
    this.blend = 0
    this.mode = mode
    this.modeT = 0
  }

  /** Parts changed: the gait, idle, and voice follow the new shape. */
  refresh(): void {
    this.profile = profileFor(this.save.parts, this.save.seed)
    this.standLift = bodyLift(this.save.parts)
    while (this.partAge.length < this.save.parts.length) this.partAge.push(0)
    this.partAge.length = this.save.parts.length
  }

  partAttached(): void {
    this.refresh()
    this.partAge[this.partAge.length - 1] = 0
    this.kick(0.35)
    if (this.sleeping) this.stir = 0
  }

  partRemoved(index: number): void {
    this.partAge.splice(index, 1)
    this.refresh()
    this.kick(-0.3)
    if (this.sleeping) this.stir = 0
  }

  kick(amount: number): void {
    this.wobbleV += amount * 14
  }

  /** A tap on the sleeping body: it stirs and mumbles but stays asleep. */
  nudge(): void {
    this.stir = 0
    this.kick(0.25)
  }

  wake(): void {
    this.from.x = this.mover.x
    this.from.z = this.mover.z
    this.fromGround = this.ground
    this.fromHeading = this.mover.heading
    this.setMode('waking')
  }

  lieDown(): void {
    this.from.x = this.mover.x
    this.from.z = this.mover.z
    this.fromGround = this.ground
    this.fromHeading = this.mover.heading
    this.setMode('lyingDown')
  }

  pickUp(): void {
    this.carryAt.x = this.mover.x
    this.carryAt.z = this.mover.z
    this.partner = null
    this.setMode('carried')
  }

  setDown(): void {
    this.from.x = this.carryAt.x
    this.from.z = this.carryAt.z
    clampWalk(this.carryAt, 2, this.target)
    this.setMode('landing')
  }

  squashAway(): void {
    this.setMode('squashing')
  }

  react(): void {
    this.partner = null
    this.setMode('reacting')
  }

  greet(partner: Critter): void {
    this.partner = partner
    this.setMode('greeting')
  }

  update(dt: number, world: WorldView): void {
    this.modeT += dt
    this.age += dt
    this.cooldown = Math.max(0, this.cooldown - dt)
    for (let i = 0; i < this.partAge.length; i++) this.partAge[i] += dt
    if (this.poke) {
      this.poke.t += dt
      if (this.poke.t > 0.7) this.poke = null
    }
    const pose = this.pose
    let moving = false
    switch (this.mode) {
      case 'sleeping':
        sleepPose(this.age, pose)
        this.placeOnTurntable()
        this.mover.heading = world.turntableAngle
        break
      case 'plopping': {
        sleepPose(this.age, pose)
        const k = Math.min(1, this.modeT / PLOP_SECONDS)
        this.ground = TURNTABLE.height + 26 * (1 - k * k)
        this.mover.heading = world.turntableAngle
        moving = true
        if (k >= 1) {
          this.ground = TURNTABLE.height
          this.kick(0.9)
          world.sound.thud(0.8)
          this.setMode('sleeping')
        }
        break
      }
      case 'squashing': {
        sleepPose(this.age, pose)
        const k = smooth(this.modeT / SQUASH_SECONDS)
        pose.sy *= 1 - 0.94 * k
        pose.sx *= 1 + 0.7 * k
        pose.sz *= 1 + 0.7 * k
        moving = true
        if (this.modeT >= SQUASH_SECONDS) this.gone = true
        break
      }
      case 'waking':
        this.updateWaking(world)
        moving = true
        break
      case 'lyingDown':
        this.updateLyingDown(world)
        moving = true
        break
      case 'walking':
        moving = this.updateWalking(dt, world)
        break
      case 'idling':
        this.walk = Math.max(0, this.walk - dt * 3)
        gaitPose(this.profile, this.phase, this.walk, pose)
        if (this.walk > 0) {
          this.phase = (this.phase + this.profile.cadence * dt * this.walk) % 1
          moving = true
        }
        idlePose(this.profile.idle, this.modeT, pose)
        moving = moving || this.modeT < IDLE_SECONDS[this.profile.idle]
        if (this.watchOrCheer(world)) break
        if (this.modeT > this.idleFor) this.startWalking(null)
        break
      case 'greeting':
        moving = this.updateGreeting(dt, world)
        break
      case 'reacting':
        resetPose(pose)
        reactPose(this.profile.temperament, this.modeT, pose)
        advance(this.mover, pose.advance * 5 * dt)
        moving = true
        if (this.modeT > REACT_SECONDS[this.profile.temperament]) this.startIdling()
        break
      case 'watching':
        moving = this.updateWatching(dt, world)
        break
      case 'carried':
        carriedPose(this.modeT, pose)
        this.mover.x = this.carryAt.x
        this.mover.z = this.carryAt.z
        this.ground = CARRY_HEIGHT - this.standLift
        moving = true
        break
      case 'landing': {
        resetPose(pose)
        const k = Math.min(1, this.modeT / LAND_SECONDS)
        const start = CARRY_HEIGHT - this.standLift
        this.ground = start * (1 - k * k)
        this.mover.x = this.from.x + (this.target.x - this.from.x) * smooth(k)
        this.mover.z = this.from.z + (this.target.z - this.from.z) * smooth(k)
        pose.legSwing.fill(0.3 * (1 - k))
        pose.sy = 1 + 0.1 * (1 - k)
        moving = true
        if (k >= 1) {
          this.ground = 0
          this.kick(1)
          world.sound.thud(0.7)
          world.sound.voice(this, 'land')
          this.drifted = true
          this.startIdling()
        }
        break
      }
      default: {
        const unreachable: never = this.mode
        return unreachable
      }
    }
    this.finish(dt, world, moving)
  }

  private updateWaking(world: WorldView): void {
    const t = this.modeT
    wakePose(t, this.pose)
    if (t < WAKE_HOP_AT) {
      this.mover.heading = world.turntableAngle
      return
    }
    const k = smooth((t - WAKE_HOP_AT) / (WAKE_SECONDS - WAKE_HOP_AT))
    this.mover.x = this.from.x + (WAKE_LANDING.x - this.from.x) * k
    this.mover.z = this.from.z + (WAKE_LANDING.z - this.from.z) * k
    this.ground = this.fromGround * (1 - k)
    this.mover.heading = this.fromHeading + wrap(0.4 - this.fromHeading) * k
    if (t >= WAKE_SECONDS) {
      this.ground = 0
      this.kick(0.8)
      world.sound.thud(0.6)
      this.drifted = true
      this.startIdling()
    }
  }

  private updateLyingDown(world: WorldView): void {
    const t = this.modeT
    const hop = Math.min(1, t / 0.55)
    this.mover.x = this.from.x + (TURNTABLE.x - this.from.x) * smooth(hop)
    this.mover.z = this.from.z + (TURNTABLE.z - this.from.z) * smooth(hop)
    this.ground = this.fromGround + (TURNTABLE.height - this.fromGround) * smooth(hop) + 5 * Math.sin(Math.PI * hop)
    this.mover.heading = this.fromHeading + wrap(world.turntableAngle - this.fromHeading) * smooth(hop)
    sleepPose(this.age, this.pose)
    const settle = smooth((t - 0.45) / (LIE_DOWN_SECONDS - 0.45))
    this.pose.lids = 1 - settle
    this.pose.legSplay = settle
    this.pose.mouth = Math.sin(Math.PI * smooth((t - 0.5) / 0.6)) * 0.9
    if (t >= LIE_DOWN_SECONDS) {
      this.placeOnTurntable()
      this.setMode('sleeping')
    }
  }

  private startWalking(towards: Point | null): void {
    if (towards) clampWalk(towards, 5, this.target)
    else pickTarget(this.mover, this.rand, this.target)
    this.partner = null
    if (this.mode !== 'walking') this.setMode('walking')
  }

  private startIdling(): void {
    this.idleFor = IDLE_SECONDS[this.profile.idle] + 0.8 + random(this.rand) * 2.4
    this.setMode('idling')
  }

  private updateWalking(dt: number, world: WorldView): boolean {
    if (this.watchOrCheer(world)) return true
    this.walk = Math.min(1, this.walk + dt * 2.5)
    const profile = this.profile
    const before = this.phase
    this.phase = (this.phase + profile.cadence * dt) % 1
    gaitPose(profile, this.phase, this.walk, this.pose)
    const steps = STEPS_PER_CYCLE[profile.routine]
    if (Math.floor(this.phase * steps) !== Math.floor(before * steps)) world.sound.step(profile.routine, profile.voice, this.walk)
    const turnRate = profile.routine === 'scuttle' ? 4 : profile.routine === 'inch' ? 1.2 : 2.4
    this.steerAround(world, turnRate, dt)
    advance(this.mover, profile.speed * this.pose.advance * dt)
    this.drifted = true
    if (arrived(this.mover, this.target) || this.modeT > 14) this.startIdling()
    return true
  }

  private steerAround(world: WorldView, turnRate: number, dt: number): void {
    let count = 0
    for (const other of world.awake) if (other !== this) neighbours[count++] = other.mover
    this.mover.heading = steer(this.mover, this.target, neighbours, count, turnRate, dt)
  }

  private updateGreeting(dt: number, world: WorldView): boolean {
    const partner = this.partner
    const pose = this.pose
    resetPose(pose)
    if (partner) {
      const want = headingTo(this.mover, partner.mover)
      this.mover.heading += wrap(want - this.mover.heading) * Math.min(1, dt * 9)
    }
    if (this.modeT < TURN_TO_FRIEND) {
      pose.lids = 1.15
      return true
    }
    const t = this.modeT - TURN_TO_FRIEND
    if (t < dt * 1.5) world.sound.voice(this, 'greet')
    reactPose(this.profile.temperament, t, pose)
    advance(this.mover, pose.advance * 5 * dt)
    if (t > REACT_SECONDS[this.profile.temperament]) this.afterGreeting()
    return true
  }

  /** What each temperament does once it has said hello. */
  private afterGreeting(): void {
    const partner = this.partner
    this.cooldown = GREET_COOLDOWN + random(this.rand) * 4
    this.partner = null
    if (!partner) return this.startIdling()
    const away = headingTo(partner.mover, this.mover)
    switch (this.profile.temperament) {
      case 'shy':
        scratchPoint.x = this.mover.x + Math.sin(away) * 30
        scratchPoint.z = this.mover.z + Math.cos(away) * 30
        return this.startWalking(scratchPoint)
      case 'curious':
        scratchPoint.x = partner.mover.x - Math.sin(away) * 12
        scratchPoint.z = partner.mover.z - Math.cos(away) * 12
        return this.startWalking(scratchPoint)
      case 'bouncy':
        return this.startWalking(null)
      case 'bold':
        return this.startIdling()
      default: {
        const unreachable: never = this.profile.temperament
        return unreachable
      }
    }
  }

  /** Stop and watch a part being offered, or the sleeper while friends cheer it on. Returns true while watching. */
  private watchOrCheer(world: WorldView): boolean {
    const focus = this.focusOf(world)
    if (!focus) return false
    this.setMode('watching')
    return true
  }

  private focusOf(world: WorldView): Point | null {
    const offer = world.offer
    if (offer && Math.hypot(offer.x - this.mover.x, offer.z - this.mover.z) < 30) return offer
    return world.cheer
  }

  private updateWatching(dt: number, world: WorldView): boolean {
    const focus = this.focusOf(world)
    this.walk = Math.max(0, this.walk - dt * 3)
    const pose = this.pose
    gaitPose(this.profile, this.phase, this.walk, pose)
    if (!focus) {
      this.startIdling()
      return true
    }
    const want = headingTo(this.mover, focus)
    this.mover.heading += wrap(want - this.mover.heading) * Math.min(1, dt * 5)
    const eager = smooth(this.modeT / 0.4)
    pose.pitch += 0.14 * eager
    pose.lids = 1 + 0.25 * eager
    pose.ear += 0.7 * eager
    pose.mouth = 0.3 * eager
    if (focus === world.cheer) pose.lift += 0.9 * Math.abs(Math.sin(this.modeT * 6.5)) * eager
    else pose.sz *= 1 + 0.05 * eager
    return this.walk > 0 || this.modeT < 0.5
  }

  private finish(dt: number, world: WorldView, moving: boolean): void {
    const pose = this.pose
    if (this.blend < 1) {
      this.blend = Math.min(1, this.blend + dt / BLEND_SECONDS)
      mixPose(pose, this.fromPose, 1 - smooth(this.blend))
    }
    if (this.stir >= 0) {
      this.stir += dt
      const k = Math.max(0, 1 - this.stir / 1.1)
      pose.roll += 0.2 * Math.sin(this.stir * 8) * k
      pose.mouth += 0.5 * k
      pose.headNod -= 0.15 * k
      if (this.stir > 1.1) this.stir = -1
    }
    if (this.pull) {
      const dx = this.pull.x - this.mover.x
      const dz = this.pull.z - this.mover.z
      const d = Math.hypot(dx, dz) || 1
      const lean = this.pull.amount * 0.18
      const c = Math.cos(this.mover.heading)
      const s = Math.sin(this.mover.heading)
      pose.pitch += lean * ((dx / d) * s + (dz / d) * c)
      pose.roll -= lean * ((dx / d) * c - (dz / d) * s)
      pose.lids = Math.min(pose.lids, 1) * (1 - 0.5 * this.pull.amount) + (this.sleeping ? 0 : 0.5 * this.pull.amount)
    }
    // squash spring
    this.wobbleV += (-this.wobble * 170 - this.wobbleV * 11) * dt
    this.wobble += this.wobbleV * dt
    // blinking (awake only)
    if (!this.sleeping && this.mode !== 'lyingDown') {
      this.blinkIn -= dt
      if (this.blinkIn <= 0 && this.blinkT < 0) {
        this.blinkT = 0
        this.blinkIn = 2.2 + random(this.rand) * 3.5
      }
      if (this.blinkT >= 0) {
        this.blinkT += dt
        const k = Math.sin(Math.min(1, this.blinkT / 0.16) * Math.PI)
        pose.lids *= 1 - k
        if (this.blinkT > 0.16) this.blinkT = -1
      }
    }
    // eyes follow a focus: an offered part, a friend, or the way it walks
    let lookX = pose.lookX
    let lookY = pose.lookY
    const focus = this.mode === 'watching' ? this.focusOf(world) : this.partner?.mover ?? null
    if (focus) {
      const rel = wrap(headingTo(this.mover, focus) - this.mover.heading)
      lookX += Math.max(-1, Math.min(1, rel * 1.4))
      lookY += 0.2
    }
    const ease = Math.min(1, dt * 12)
    this.lookX += (lookX - this.lookX) * ease
    this.lookY += (lookY - this.lookY) * ease
    const boilTarget = moving || this.wobble * this.wobble > 0.0004 || this.pull ? 1 : 0
    this.boil += (boilTarget - this.boil) * Math.min(1, dt * (boilTarget ? 10 : 2.5))
  }
}

/** Reused list of the other walkers, so steering allocates nothing per frame. */
const neighbours: Mover[] = []
const scratchPoint: Point = { x: 0, z: 0 }

function wrap(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle))
}

/** Friends close enough to greet: pairs of awake critters that are free and not cooling down. */
export function findGreetings(critters: readonly Critter[], radius: number, visit: (a: Critter, b: Critter) => void): void {
  for (let i = 0; i < critters.length; i++) {
    const a = critters[i]
    if (!free(a)) continue
    for (let j = i + 1; j < critters.length; j++) {
      const b = critters[j]
      if (!free(b)) continue
      if (Math.hypot(a.mover.x - b.mover.x, a.mover.z - b.mover.z) < radius) {
        visit(a, b)
        break
      }
    }
  }
}

function free(critter: Critter): boolean {
  return (critter.mode === 'walking' || critter.mode === 'idling') && critter.cooldown <= 0 && critter.modeT > 0.5
}
