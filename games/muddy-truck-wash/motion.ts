import { restPose, type TruckPose } from './pose'

// How each vehicle moves: a body on springs with its own weight and tempo,
// tyres that flatten under it, eyes that blink and look, and one funniest
// part. Every vehicle has its own numbers, so no two move alike. Pure: time
// comes in as steps of the attended clock, and chance from a seeded stream.

export type Personality = {
  /** How stiff and how damped the body's springs are: a heavy vehicle is soft and slow to settle. */
  stiffness: number
  damping: number
  /** How far a press pushes it, and how hard a poke kicks it. */
  give: number
  /** Breaths a second at rest, and how deep. */
  breath: number
  breathDepth: number
  /** Engine shake at idle: cycles a second and size. */
  idleRate: number
  idleSize: number
  /** Seconds between blinks, shortest and longest. */
  blink: readonly [number, number]
  /** How loosely the funniest part follows the body: its own spring, and how far a bounce throws it. */
  partStiffness: number
  partDamping: number
  partThrow: number
  /** The eyes dart (quick) or drift (slow) to a new place this many times a second. */
  glance: number
}

class Spring {
  value = 0
  speed = 0
  step(dt: number, target: number, stiffness: number, damping: number): void {
    // Semi-implicit Euler in small slices, so a long frame cannot blow it up.
    const slices = Math.max(1, Math.ceil(dt / 0.008)), h = dt / slices
    for (let i = 0; i < slices; i++) {
      this.speed += (stiffness * (target - this.value) - damping * this.speed) * h
      this.value += this.speed * h
    }
  }
}

export type Press = { x: number; y: number; force: number }

export class TruckMotion {
  readonly pose: TruckPose = restPose()
  /** Where it stands; the pose adds the sway of being rubbed. */
  homeX = 0
  homeZ = 0
  /** A feeling held for a while: lids squeezed, eyes crossed. They ease back by themselves. */
  squint = 0
  cross = 0
  /** Where the eyes are asked to look, or null to wander. */
  lookAt: { side: number; up: number } | null = null
  /** What it wants: where the thing it likes is. Left to itself it glances there every other look. */
  want: { side: number; up: number } | null = null
  /** Asked angle of the funniest part, on top of what the bounce throws it to. */
  partTarget = 0
  /** Height added to the body and the wheels alike: the whole vehicle off the floor, as in a hop. */
  hop = 0
  private readonly lift = new Spring()
  private readonly pitch = new Spring()
  private readonly lean = new Spring()
  private readonly sway = new Spring()
  private readonly part = new Spring()
  private readonly gazeSide = new Spring()
  private readonly gazeUp = new Spring()
  private press: Press | null = null
  private drag = 0
  private seed: number
  private blinkIn: number
  private blinking = 0
  private glanceIn = 1
  private wander = { side: 0.75, up: 0.1 }
  private glances = 0
  private seconds = 0
  private lastX: number | null = null
  private wheelSpeed = 0

  /** `partMax` is how far a hinged part can swing open: it stops there however hard it is thrown. */
  constructor(readonly who: Personality, readonly axles: readonly number[], seed: number, readonly partMax = Infinity) {
    this.seed = seed >>> 0 || 1
    this.blinkIn = who.blink[0] + this.random() * (who.blink[1] - who.blink[0])
    this.gazeSide.value = 0.75
    this.gazeUp.value = 0.1
  }

  private random(): number {
    let s = this.seed
    s ^= s << 13; s >>>= 0
    s ^= s >>> 17
    s ^= s << 5; s >>>= 0
    this.seed = s
    return s / 2 ** 32
  }

  /** A finger is pushing here (vehicle x and y), or has let go. `slide` is how fast it moves along the body. */
  hold(press: Press | null, slide = 0): void {
    this.press = press
    this.drag = slide
  }

  /** Sets the wheels spinning where it stands; they coast to a stop. */
  spinWheels(speed: number): void {
    this.wheelSpeed += speed
  }

  /** Throws the body up on its springs (or down, when negative). */
  jolt(speed: number): void {
    this.lift.speed += speed * this.who.give
  }

  /** Sets the funniest part going: a shove to a hinged part, a spin to a drum. */
  fling(speed: number): void {
    this.part.speed += speed
  }

  /** A knock: the body kicks away from the point and rings back. */
  kick(x: number, strength: number): void {
    this.lift.speed -= strength * 1.6 * this.who.give
    this.pitch.speed += -Math.sign(x || 1) * Math.min(1, Math.abs(x) / 2) * strength * 0.9 * this.who.give
    this.lean.speed -= strength * 0.5 * this.who.give
    this.part.speed += strength * this.who.partThrow * 6
  }

  /** The eyes shut now and open again. */
  blink(): void {
    this.blinking = 0.16
  }

  step(dt: number): TruckPose {
    const who = this.who, pose = this.pose
    this.seconds += dt
    const press = this.press
    const push = press ? press.force * who.give : 0
    const before = this.lift.speed
    this.lift.step(dt, -0.07 * push, who.stiffness, who.damping)
    this.pitch.step(dt, press ? -press.x * 0.022 * push : 0, who.stiffness * 0.9, who.damping)
    this.lean.step(dt, -0.035 * push, who.stiffness * 1.1, who.damping)
    this.sway.step(dt, Math.max(-0.12, Math.min(0.12, this.drag * 0.035)) * who.give, who.stiffness * 0.7, who.damping * 0.8)
    // The funniest part is thrown by the body's own jolts and settles on its own spring.
    const jolt = (this.lift.speed - before) / Math.max(dt, 1e-3)
    this.part.speed += Math.max(-40, Math.min(40, -jolt)) * who.partThrow * dt
    this.part.step(dt, this.partTarget, who.partStiffness, who.partDamping)
    // A hinged part hits its stops and bounces off them a little.
    if (who.partStiffness > 0 && this.part.value > this.partMax) {
      this.part.value = this.partMax
      this.part.speed *= -0.3
    } else if (who.partStiffness > 0 && this.part.value < 0) {
      this.part.value = 0
      this.part.speed *= -0.3
    }

    const breath = Math.sin(this.seconds * who.breath * Math.PI * 2) * who.breathDepth
    const shake = Math.sin(this.seconds * who.idleRate * Math.PI * 2) * who.idleSize
    pose.x = this.homeX + this.sway.value
    // Wheels roll with the ground they cover: forward is -x, and half a unit is about a wheel's radius.
    if (this.lastX !== null) pose.wheelSpin -= (this.homeX - this.lastX) / 0.5
    this.lastX = this.homeX
    pose.wheelSpin += this.wheelSpeed * dt
    this.wheelSpeed *= Math.exp(-dt * 1.8)
    pose.z = this.homeZ
    pose.hop = this.hop
    pose.lift = this.lift.value + breath + shake
    pose.pitch = this.pitch.value
    pose.lean = this.lean.value + shake * 0.6
    // A hinged part rests shut; a drum (no spring of its own) turns freely and coasts.
    pose.part = who.partStiffness > 0 ? Math.max(0, this.part.value) : this.part.value
    // Tyres carry the body: flatter under the end that is pushed down.
    for (let i = 0; i < this.axles.length; i++) {
      const load = -this.lift.value * 1.4 + this.pitch.value * -this.axles[i] * 0.55 - breath * 1.2
      pose.squash[i] = Math.max(0, Math.min(0.3, 0.035 + load))
    }

    // Eyes: a look that is asked for, or a wander of their own; and blinks.
    this.glanceIn -= dt
    if (this.glanceIn <= 0) {
      this.glanceIn = (0.6 + this.random() * 1.4) / who.glance
      this.glances += 1
      const roam = { side: 0.35 + this.random() * 0.75, up: -0.12 + this.random() * 0.4 }
      this.wander = this.want && this.glances % 2 === 0 ? this.want : roam
    }
    const look = this.lookAt ?? this.wander
    this.gazeSide.step(dt, look.side, 90 * who.glance, 14 * Math.sqrt(who.glance))
    this.gazeUp.step(dt, look.up, 90 * who.glance, 14 * Math.sqrt(who.glance))
    pose.gazeSide = this.gazeSide.value
    pose.gazeUp = this.gazeUp.value
    this.blinkIn -= dt
    if (this.blinkIn <= 0) {
      this.blinkIn = who.blink[0] + this.random() * (who.blink[1] - who.blink[0])
      this.blink()
    }
    this.blinking = Math.max(0, this.blinking - dt)
    const shut = this.blinking > 0 ? Math.sin((this.blinking / 0.16) * Math.PI) : 0
    this.squint = Math.max(0, this.squint - dt * 0.9)
    this.cross = Math.max(0, this.cross - dt * 0.7)
    pose.lid = Math.max(shut, Math.min(1, this.squint))
    pose.cross = Math.min(1, this.cross)
    return pose
  }
}
