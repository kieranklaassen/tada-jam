// Character motion (KTD9). The two characters share no routine:
// - The wanderer is legato. Everything eases: weight shifts, a slow look
//   around, careful short steps with a waddle roll, and a lantern that swings
//   as a real pendulum driven by the body's acceleration.
// - The bird is staccato. Its head snaps between fixations, its tail flicks,
//   it never walks: it hops with a deep crouch and two quick flaps.
// Both write into preallocated pose objects so the frame loop allocates
// nothing.

export class Spring {
  value: number
  velocity = 0
  target: number
  stiffness: number
  damping: number

  constructor(value: number, stiffness: number, damping: number) {
    this.value = value
    this.target = value
    this.stiffness = stiffness
    this.damping = damping
  }

  step(dt: number): void {
    let left = Math.min(dt, 0.1)
    while (left > 1e-6) {
      const h = Math.min(left, 1 / 120)
      this.velocity += (this.stiffness * (this.target - this.value) - this.damping * this.velocity) * h
      this.value += this.velocity * h
      left -= h
    }
  }

  snap(value: number): void {
    this.value = value
    this.target = value
    this.velocity = 0
  }
}

/** Small deterministic generator, so a clock-driven capture looks the same every run. */
export class Rng {
  private seed: number

  constructor(seed: number) {
    this.seed = seed >>> 0 || 1
  }

  next(): number {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0
    return this.seed / 4294967296
  }

  range(a: number, b: number): number {
    return a + (b - a) * this.next()
  }

  /** An index below `count` that is not `last`, so a reaction never plays twice in a row. */
  other(count: number, last: number): number {
    const pick = Math.floor(this.next() * (count - 1))
    return pick < last ? pick : pick + 1
  }
}

/** How the wanderer answers a poke: looks out at the child, bows, or swings its lantern and watches it. */
export const GREETS = ['look-out', 'bow', 'swing'] as const
export type Greet = (typeof GREETS)[number]
const GREET_SECONDS = 1.3

/** How the bird answers a poke: an indignant ruffle, a puffed-up chest, or a bob with a flap. */
export const POKES = ['ruffle', 'puff', 'bob'] as const
export type Poke = (typeof POKES)[number]
const PUFF_SECONDS = 0.45

function wrapAngle(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a))
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

export type WandererPose = {
  x: number
  y: number
  z: number
  heading: number
  alpha: number
  bob: number
  squash: number
  lean: number
  roll: number
  headYaw: number
  headPitch: number
  /** 0: lantern hangs at the side; 1: held up and out toward the aim. */
  arm: number
  armYaw: number
  /** Lantern pendulum angles about the body's side and forward axes. */
  swingForward: number
  swingSide: number
  glow: number
  /** Extra tilt from a platform turning about x or z under the wanderer. */
  tiltAxis: 0 | 1 | 2
  tilt: number
}

const STRIDE = 0.15
/** The invitation opens with a look out at the child before the lantern turns to the door. */
export const LOOK_OUT_SECONDS = 0.6
const LANTERN_OMEGA2 = 70
const LANTERN_DAMPING = 3.2
/** Seconds for the lantern to swing from one side to the other. */
export const LANTERN_HALF_SWING = Math.PI / Math.sqrt(LANTERN_OMEGA2)

export class WandererMotion {
  readonly pose: WandererPose = {
    x: 0,
    y: 0,
    z: 0,
    heading: Math.PI / 4,
    alpha: 1,
    bob: 0,
    squash: 1,
    lean: 0,
    roll: 0,
    headYaw: 0,
    headPitch: 0,
    arm: 0,
    armYaw: 0,
    swingForward: 0,
    swingSide: 0,
    glow: 1,
    tiltAxis: 0,
    tilt: 0,
  }
  /** Set true on the frame a foot comes down. */
  stepped = false
  private readonly rng = new Rng(7)
  private readonly headYaw = new Spring(0, 26, 9)
  private readonly headPitch = new Spring(0, 26, 9)
  private readonly arm = new Spring(0, 36, 10)
  private readonly armYaw = new Spring(0, 30, 10)
  private readonly lean = new Spring(0, 60, 11)
  private readonly squash = new Spring(1, 220, 12)
  private readonly heading = new Spring(Math.PI / 4, 30, 10.5)
  private swingF = 0
  private swingFv = 0
  private swingS = 0
  private swingSv = 0
  private px = NaN
  private py = 0
  private pz = 0
  private vx = 0
  private vz = 0
  private phase = 0
  private lastPhaseStep = 0
  private nextLook = 1.5
  private idleYaw = 0
  private idlePitch = 0
  private aimFrom = -1
  private aimUntil = -1
  private lookOutAt = -1
  private aimX = 0
  private aimY = 0
  private aimZ = 0
  private anticipateAt = -1
  private greetAt = -1
  private greetKind: Greet = 'look-out'
  private lookBackAt = -1

  /** Face a direction (radians about +y, 0 facing +z). Eased, never snapped. */
  face(heading: number): void {
    this.heading.target = this.heading.value + wrapAngle(heading - this.heading.value)
  }

  /** Carried round by a turning platform: the body turns with it, exactly. */
  turnWith(delta: number): void {
    this.heading.value += delta
    this.heading.target += delta
  }

  /** Hold the lantern toward a point for a while (curiosity at the unreachable, or the first-open invitation). */
  aim(x: number, y: number, z: number, now: number, seconds: number): void {
    this.aimX = x
    this.aimY = y
    this.aimZ = z
    this.aimFrom = now
    this.aimUntil = now + seconds
  }

  /** The first-open invitation: a look out at the child, then the lantern held toward the door, so the child's eyes follow. */
  invite(x: number, y: number, z: number, now: number): void {
    this.lookOutAt = now
    this.aim(x, y, z, now + LOOK_OUT_SECONDS, 2.2)
  }

  /** A small lean back before the first step. */
  anticipate(now: number): void {
    this.anticipateAt = now
  }

  /** The last step lands: a soft settle. */
  land(): void {
    this.squash.velocity -= 1.3
  }

  /** Tapped: the first time it looks out at the child, then one of its greetings, never the same one twice running. */
  greet(now: number, choice?: Greet): Greet {
    const kind = choice ?? (this.greetAt < 0 ? 'look-out' : GREETS[this.rng.other(GREETS.length, GREETS.indexOf(this.greetKind))])
    this.greetAt = now
    this.greetKind = kind
    switch (kind) {
      case 'look-out':
        this.squash.velocity += 1.1
        break
      case 'bow':
        this.squash.velocity -= 0.9
        break
      case 'swing':
        this.swingSv += this.swingS >= 0 ? -5 : 5
        this.squash.velocity += 0.5
        break
      default: {
        const unreachable: never = kind
        return unreachable
      }
    }
    return kind
  }

  /** At the door: one look back over the shoulder. */
  lookBack(now: number): void {
    this.lookBackAt = now
  }

  /** Arrive in a diorama: land with a squash and start fresh. */
  arrive(x: number, y: number, z: number): void {
    this.px = x
    this.py = y
    this.pz = z
    this.vx = 0
    this.vz = 0
    this.swingF = 0.25
    this.swingFv = 0
    this.swingS = 0
    this.swingSv = 0
    this.squash.snap(1)
    this.squash.velocity = -2.2
  }

  update(dt: number, now: number, x: number, y: number, z: number, walking: boolean, riding: boolean): void {
    const pose = this.pose
    this.stepped = false
    if (Number.isNaN(this.px)) this.arrive(x, y, z)
    const safeDt = Math.max(dt, 1e-3)
    const nvx = (x - this.px) / safeDt
    const nvz = (z - this.pz) / safeDt
    const ax = (nvx - this.vx) / safeDt
    const az = (nvz - this.vz) / safeDt
    const dist = Math.hypot(x - this.px, z - this.pz) + Math.abs(y - this.py) * 0.5
    this.vx += (nvx - this.vx) * Math.min(1, dt * 18)
    this.vz += (nvz - this.vz) * Math.min(1, dt * 18)
    this.px = x
    this.py = y
    this.pz = z

    this.heading.step(dt)
    const h = this.heading.value
    const fx = Math.sin(h)
    const fz = Math.cos(h)
    // Acceleration in the body frame drives the lantern pendulum backwards.
    const aForward = clamp(ax * fx + az * fz, -30, 30)
    const aSide = clamp(ax * fz - az * fx, -30, 30)

    // Gait: short steps; each half-cycle is one footfall.
    if (walking) {
      this.phase += (dist / STRIDE) * Math.PI
      const step = Math.floor(this.phase / Math.PI)
      if (step !== this.lastPhaseStep) {
        this.lastPhaseStep = step
        this.stepped = true
      }
    } else {
      this.phase += (Math.round(this.phase / Math.PI) * Math.PI - this.phase) * Math.min(1, dt * 10)
    }
    const gait = walking ? 1 : 0
    const stepWave = Math.sin(this.phase)
    pose.bob = Math.abs(stepWave) * 0.03 * gait
    const breath = Math.sin(now * 2.2) * 0.014
    const sway = Math.sin(now * 0.63) * 0.035

    // Looking around: slow, eased glances every few seconds while standing.
    if (now >= this.nextLook) {
      this.nextLook = now + this.rng.range(2.4, 5.2)
      this.idleYaw = this.rng.range(-0.95, 0.95)
      this.idlePitch = this.rng.range(-0.12, 0.22)
    }
    const aiming = now >= this.aimFrom && now < this.aimUntil
    let yawTarget = walking ? 0 : this.idleYaw
    let pitchTarget = walking ? 0.05 : this.idlePitch
    let armTarget = riding ? 0.28 : 0
    let armYawTarget = 0
    if (aiming) {
      const dx = this.aimX - x
      const dz = this.aimZ - z
      const rel = wrapAngle(Math.atan2(dx, dz) - h)
      yawTarget = clamp(rel, -1.1, 1.1)
      pitchTarget = clamp(Math.atan2(this.aimY - (y + 0.45), Math.hypot(dx, dz)) * 0.8, -0.35, 0.5)
      armTarget = 1
      armYawTarget = clamp(rel, -0.9, 0.9)
    }
    const greet = now - this.greetAt
    const greeting = greet >= 0 && greet < GREET_SECONDS
    let greetLean = 0
    let greetRoll = 0
    // The camera sits toward +x +z: out of the diorama, at the child.
    const toCamera = wrapAngle(Math.PI / 4 - h)
    const toChild = clamp(toCamera, -1.2, 1.2)
    if (greeting) {
      switch (this.greetKind) {
        case 'look-out':
          yawTarget = toChild
          pitchTarget = 0.28
          armTarget = Math.max(armTarget, 0.75)
          break
        case 'bow': {
          const dip = Math.sin(Math.min(1, greet / 0.9) * Math.PI)
          yawTarget = toChild * 0.7
          pitchTarget = -0.45 * dip
          greetLean = 0.22 * dip
          armTarget = Math.max(armTarget, 0.35)
          break
        }
        case 'swing':
          // Eyes on the lantern at head height, the body swaying along with it.
          yawTarget = clamp(this.swingS * 1.4, -1, 1)
          pitchTarget = 0.05
          armTarget = Math.max(armTarget, 1)
          greetRoll = clamp(this.swingS * 0.35, -0.2, 0.2) * (1 - greet / GREET_SECONDS)
          break
        default: {
          const unreachable: never = this.greetKind
          return unreachable
        }
      }
    }
    const out = now - this.lookOutAt
    if (out >= 0 && out < LOOK_OUT_SECONDS) {
      yawTarget = toChild
      pitchTarget = 0.22
      armTarget = Math.max(armTarget, 0.2)
    }
    const back = now - this.lookBackAt
    if (back >= 0 && back < 0.9) {
      yawTarget = clamp(toCamera, -1.9, 1.9)
      pitchTarget = 0.12
    }
    this.headYaw.target = yawTarget
    this.headPitch.target = pitchTarget
    this.arm.target = armTarget
    this.armYaw.target = armYawTarget

    let leanTarget = walking ? 0.1 : greetLean
    const anticipation = now - this.anticipateAt
    if (anticipation >= 0 && anticipation < 0.16) leanTarget = -0.16
    if (riding) leanTarget -= clamp(aForward * 0.012, -0.2, 0.2)
    this.lean.target = leanTarget

    this.headYaw.step(dt)
    this.headPitch.step(dt)
    this.arm.step(dt)
    this.armYaw.step(dt)
    this.lean.step(dt)
    this.squash.target = 1 + breath
    this.squash.step(dt)

    // Pendulum: gravity pulls it home, the body's acceleration pushes it back.
    const substeps = Math.max(1, Math.ceil(dt / (1 / 120)))
    const hh = Math.min(dt, 0.1) / substeps
    const idleDrive = Math.sin(now * 1.3) * 0.6
    for (let i = 0; i < substeps; i++) {
      const accF = -LANTERN_OMEGA2 * Math.sin(this.swingF) - LANTERN_DAMPING * this.swingFv - aForward * 1.4 + idleDrive * 0.2
      const accS = -LANTERN_OMEGA2 * Math.sin(this.swingS) - LANTERN_DAMPING * this.swingSv + aSide * 1.4 + idleDrive
      this.swingFv += accF * hh
      this.swingSv += accS * hh
      this.swingF += this.swingFv * hh
      this.swingS += this.swingSv * hh
    }

    pose.x = x
    pose.y = y
    pose.z = z
    pose.heading = h
    pose.squash = this.squash.value
    pose.lean = this.lean.value
    pose.roll = stepWave * 0.11 * gait + sway * (1 - gait) + greetRoll + (riding ? clamp(-aSide * 0.01, -0.15, 0.15) : 0)
    pose.headYaw = this.headYaw.value
    pose.headPitch = this.headPitch.value
    pose.arm = this.arm.value
    pose.armYaw = this.armYaw.value
    pose.swingForward = clamp(this.swingF, -1.1, 1.1)
    pose.swingSide = clamp(this.swingS, -1.1, 1.1)
    const flicker = Math.sin(now * 17.3) * 0.04 + Math.sin(now * 7.1 + 1.3) * 0.05 + Math.sin(now * 31.7) * 0.025
    pose.glow = 1 + flicker + (aiming ? 0.25 : 0) + (greeting ? 0.35 * Math.sin((greet / GREET_SECONDS) * Math.PI) : 0)
  }
}

export type BirdPose = {
  x: number
  y: number
  z: number
  heading: number
  alpha: number
  bob: number
  squash: number
  pitch: number
  headYaw: number
  headPitch: number
  headTilt: number
  /** Wing beat angle; 0 is folded. */
  wing: number
  tail: number
  /** 0..1 feathers fluffed up: the whole body swells. */
  puff: number
}

export class BirdMotion {
  readonly pose: BirdPose = {
    x: 0,
    y: 0,
    z: 0,
    heading: 0,
    alpha: 1,
    bob: 0,
    squash: 1,
    pitch: 0,
    headYaw: 0,
    headPitch: 0,
    headTilt: 0,
    wing: 0,
    tail: 0,
    puff: 0,
  }
  /** Set true on the frame a wing comes down (for the flap sound). */
  flapped = false
  private readonly rng = new Rng(29)
  // Snappy: a fixation change completes in well under a tenth of a second.
  private readonly headYaw = new Spring(0, 900, 48)
  private readonly headPitch = new Spring(0, 900, 48)
  private readonly headTilt = new Spring(0, 500, 26)
  private readonly tail = new Spring(0, 520, 14)
  private readonly squash = new Spring(1, 520, 15)
  private readonly pitch = new Spring(0, 300, 20)
  // Underdamped: the feathers settle with a jiggle.
  private readonly puff = new Spring(0, 160, 9)
  private puffUntil = -1
  private pokeAt = -1
  private pokeKind: Poke = 'ruffle'
  private nextSaccade = 0.4
  private nextFlick = 2.2
  private nextPeck = 4
  private peckAt = -10
  private lookUntil = -1
  private lookX = 0
  private lookY = 0
  private lookZ = 0
  private flapUntil = -1
  private flapPhase = 0
  private crouchUntil = -1

  /** Fix the gaze on a point for a moment (discrete snap, then hold). */
  lookAt(x: number, y: number, z: number, now: number, seconds = 1.2): void {
    this.lookX = x
    this.lookY = y
    this.lookZ = z
    this.lookUntil = now + seconds
    this.nextSaccade = Math.min(this.nextSaccade, now)
  }

  isLooking(now: number): boolean {
    return now < this.lookUntil
  }

  /** Deep crouch before a hop (anticipation). */
  crouch(now: number): void {
    this.crouchUntil = now + 0.09
    this.squash.target = 0.72
  }

  /** Beat the wings for a while (hop, hover, excitement). */
  flap(now: number, seconds: number): void {
    this.flapUntil = Math.max(this.flapUntil, now + seconds)
  }

  /** Touch down: squash, tail up. */
  land(): void {
    this.squash.velocity -= 3.2
    this.tail.velocity += 9
  }

  /** Someone stepped on its back: a firm squash and an indignant tail flick. */
  stepOn(): void {
    this.squash.velocity -= 1.6
    this.tail.velocity += 5
  }

  /** Tapped or refusing: a quick head tilt and a ruffle. */
  ruffle(now: number): void {
    this.headTilt.velocity += 16
    this.tail.velocity -= 10
    this.squash.velocity += 2.4
    this.nextSaccade = now + 0.25
  }

  /** Tapped: the first time a ruffle, then one of its answers, never the same one twice running. */
  poke(now: number, choice?: Poke): Poke {
    const kind = choice ?? (this.pokeAt < 0 ? 'ruffle' : POKES[this.rng.other(POKES.length, POKES.indexOf(this.pokeKind))])
    this.pokeAt = now
    this.pokeKind = kind
    switch (kind) {
      case 'ruffle':
        this.ruffle(now)
        break
      case 'puff':
        this.puff.target = 1
        this.puffUntil = now + PUFF_SECONDS
        this.tail.velocity += 12
        this.headTilt.velocity -= 10
        break
      case 'bob':
        this.crouch(now)
        this.flap(now, 0.24)
        this.pitch.velocity -= 5
        break
      default: {
        const unreachable: never = kind
        return unreachable
      }
    }
    return kind
  }

  update(dt: number, now: number, x: number, y: number, z: number, heading: number, hovering: boolean): void {
    const pose = this.pose
    this.flapped = false
    if (now >= this.nextSaccade) {
      this.nextSaccade = now + this.rng.range(0.45, 1.35)
      if (now < this.lookUntil) {
        const dx = this.lookX - x
        const dz = this.lookZ - z
        this.headYaw.target = clamp(wrapAngle(Math.atan2(dx, dz) - heading), -1.6, 1.6)
        this.headPitch.target = clamp(Math.atan2(this.lookY - (y + 0.6), Math.hypot(dx, dz)), -0.6, 0.6)
      } else {
        this.headYaw.target = this.rng.range(-1.3, 1.3)
        this.headPitch.target = this.rng.range(-0.3, 0.25)
      }
      this.headTilt.target = this.rng.next() < 0.3 ? this.rng.range(-0.35, 0.35) : 0
    }
    if (now >= this.nextFlick) {
      this.nextFlick = now + this.rng.range(1.8, 4.6)
      this.tail.velocity += this.rng.next() < 0.5 ? 7 : -7
    }
    if (now >= this.nextPeck && !hovering) {
      this.nextPeck = now + this.rng.range(5, 9)
      this.peckAt = now
    }
    if (this.crouchUntil >= 0 && now >= this.crouchUntil) {
      this.crouchUntil = -1
      this.squash.target = 1
      this.squash.velocity += 4
    }
    if (this.puffUntil >= 0 && now >= this.puffUntil) {
      this.puffUntil = -1
      this.puff.target = 0
    }

    const flapping = hovering || now < this.flapUntil
    if (flapping) {
      const before = Math.sin(this.flapPhase)
      this.flapPhase += dt * Math.PI * 2 * 7.5
      if (before > 0 && Math.sin(this.flapPhase) <= 0) this.flapped = true
    } else {
      this.flapPhase += (Math.round(this.flapPhase / (Math.PI * 2)) * Math.PI * 2 - this.flapPhase) * Math.min(1, dt * 14)
    }

    const peck = now - this.peckAt
    this.pitch.target = peck >= 0 && peck < 0.35 ? Math.sin((peck / 0.35) * Math.PI) * 0.45 : flapping ? -0.15 : 0
    this.headYaw.step(dt)
    this.headPitch.step(dt)
    this.headTilt.step(dt)
    this.tail.step(dt)
    this.squash.step(dt)
    this.pitch.step(dt)
    this.puff.step(dt)

    pose.x = x
    pose.y = y
    pose.z = z
    pose.heading = heading
    pose.bob = hovering ? Math.sin(now * 7.5 * Math.PI * 2) * 0.03 + 0.05 : Math.max(0, Math.sin(now * 3.1)) * 0.008
    pose.squash = this.squash.value
    pose.pitch = this.pitch.value
    pose.headYaw = this.headYaw.value
    pose.headPitch = this.headPitch.value
    pose.headTilt = this.headTilt.value
    pose.wing = flapping ? 0.55 + Math.sin(this.flapPhase) * 0.6 : 0
    pose.tail = this.tail.value
    pose.puff = this.puff.value
  }
}
