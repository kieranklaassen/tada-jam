import { groundY, PLOTS } from './layout'

// The felt bee's brain. Its personality is a bumbler: it flies on a lazy,
// wobbling path, banks into turns, sizes a flower up before landing (a stall,
// a dip, and a rise), sips with three nods and a wiggle, crouches before it
// takes off, and celebrates a mixed seed with a barrel roll, then carries the
// new seed to an empty molehill and lets it go there. A tap startles it into
// a hop and a spin. It never rewards or waits for the child; while the meadow
// is idle and a molehill is empty it hovers over that molehill, pointing with
// its whole body.

export type Vec3 = { x: number; y: number; z: number }

export type BeeMode = 'wander' | 'notice' | 'approach' | 'hover' | 'land' | 'sip' | 'takeoff' | 'loop' | 'carry' | 'startle' | 'point'

export type BeeWorld = {
  /** Head of the bloomed flower at `plot` (bent by its stem), written into `out`; false if nothing is in bloom there. */
  flowerHead(plot: number, out: Vec3): boolean
  /** True when the flower at `plot` would add a colour the bee is not carrying. */
  wouldMix(plot: number): boolean
  readyToMix(): boolean
  /** Where the mixed seed should land (beside an empty molehill if there is one), written into `out`. */
  dropSpot(out: Vec3): void
  /** An empty molehill to hover over while the child is idle, or -1. */
  pointAt: number
  /** Seconds of wandering between visits the bee chooses for itself. */
  visitEvery: number
}

export type BeeEvents = {
  land(plot: number): void
  sip(plot: number): void
  takeoff(plot: number): void
  drop(at: Vec3): void
  startle(): void
}

const SIT_HEIGHT = 2.4
const HOVER_HEIGHT = 7.5
const HOVER_SECONDS = 0.5
const LAND_SECONDS = 0.36
const SIP_SECONDS = 1.7
const SIP_POLLEN_AT = 0.85
const TAKEOFF_SECONDS = 0.32
const LOOP_SECONDS = 1.15
const STARTLE_SECONDS = 0.95
const NOTICE_SECONDS = 0.22
const CARRY_HEIGHT = 9

const target: Vec3 = { x: 0, y: 0, z: 0 }
const head: Vec3 = { x: 0, y: 0, z: 0 }
const dropAt: Vec3 = { x: 0, y: 0, z: 0 }

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value))
}

function easeInOut(t: number): number {
  const k = clamp(t, 0, 1)
  return k * k * (3 - 2 * k)
}

export class Bee {
  x = -20
  y = 24
  z = 6
  vx = 0
  vy = 0
  vz = 0
  yaw = 0.4
  pitch = 0
  roll = 0
  /** Accumulated wing phase (radians); the view flaps the wings with it. */
  wingPhase = 0
  /** 0 folded on the back .. 1 fully spread. */
  wingSpread = 1
  /** Squash spring: positive is flattened, negative is stretched. */
  squash = 0
  squashV = 0
  /** 0..1 nod of the head while sipping. */
  headDip = 0
  /** 0..1 while the two pollen balls merge into a seed under the bee during the loop. */
  merge = 0
  /** Flight speed, for the buzz. */
  speed = 0
  mode: BeeMode = 'wander'
  modeT = 0
  plot = -1
  t = 0
  private jitter = 1
  private lastPlot = -1
  private pending = -1
  private hoverFrom: Vec3 = { x: 0, y: 0, z: 0 }
  readonly carryTo: Vec3 = { x: 0, y: 0, z: 0 }
  private readonly events: BeeEvents

  constructor(events: BeeEvents) {
    this.events = events
  }

  /** The child tapped a bloomed flower: the bee notices and bumbles over. */
  call(plot: number, world: BeeWorld): void {
    if (!world.flowerHead(plot, head)) return
    if (this.mode === 'loop' || this.mode === 'carry') {
      this.pending = plot
      return
    }
    if ((this.mode === 'sip' || this.mode === 'land' || this.mode === 'hover') && this.plot === plot) {
      this.kick(-0.25)
      return
    }
    if (this.mode === 'sip' || this.mode === 'land') {
      this.pending = plot
      this.enter('takeoff')
      return
    }
    this.plot = plot
    this.enter('notice')
  }

  /** Tapped: a startled hop and a spin, then back to bumbling. */
  poke(): void {
    if (this.mode === 'sip' || this.mode === 'land') this.events.takeoff(this.plot)
    this.pending = -1
    this.kick(0.35)
    this.enter('startle')
    this.events.startle()
  }

  sitting(): boolean {
    return this.mode === 'land' || this.mode === 'sip' || (this.mode === 'takeoff' && this.modeT < TAKEOFF_SECONDS * 0.4)
  }

  step(dt: number, world: BeeWorld): void {
    this.t += dt
    this.modeT += dt
    const t = this.t
    let flap = 26
    let spread = 1
    this.headDip = 0
    this.merge = 0

    switch (this.mode) {
      case 'wander': {
        this.wanderTarget(target)
        this.fly(target, 22, dt)
        if (world.readyToMix()) {
          this.enter('loop')
          break
        }
        if (world.pointAt >= 0) {
          this.enter('point')
          break
        }
        if (this.modeT > world.visitEvery + this.jitter) {
          const choice = this.chooseFlower(world)
          if (choice >= 0) {
            this.plot = choice
            this.enter('approach')
          } else this.modeT -= 1.5
        }
        break
      }
      case 'point': {
        const plot = world.pointAt
        if (plot < 0 || world.readyToMix()) {
          this.enter('wander')
          break
        }
        const p = PLOTS[plot]
        const sway = Math.sin(t * 1.7)
        target.x = p.x + sway * 3.2
        target.z = p.z + 3 + Math.sin(t * 3.4) * 1.2
        target.y = groundY(p.x, p.z) + 13 + Math.sin(t * 2.3) * 1.1
        this.fly(target, 20, dt)
        this.pitch += (0.42 - this.pitch) * Math.min(1, dt * 4)
        break
      }
      case 'notice': {
        // A little "oh!": a hop up and a quick turn toward the flower.
        this.vy += 30 * dt
        this.damp(dt, 3)
        this.integrate(dt)
        flap = 34
        if (world.flowerHead(this.plot, head)) this.faceToward(head.x, head.z, dt, 14)
        if (this.modeT >= NOTICE_SECONDS) this.enter('approach')
        break
      }
      case 'approach': {
        if (!world.flowerHead(this.plot, head)) {
          this.enter('wander')
          break
        }
        target.x = head.x
        target.y = head.y + HOVER_HEIGHT
        target.z = head.z + 1.5
        this.fly(target, 34, dt)
        const distance = Math.hypot(target.x - this.x, target.y - this.y, target.z - this.z)
        if (distance < 1.6) {
          this.hoverFrom.x = this.x
          this.hoverFrom.y = this.y
          this.hoverFrom.z = this.z
          this.enter('hover')
        }
        break
      }
      case 'hover': {
        // Anticipation: stall, dip, rise, as if sizing the flower up.
        if (!world.flowerHead(this.plot, head)) {
          this.enter('wander')
          break
        }
        const k = this.modeT / HOVER_SECONDS
        const dip = -Math.sin(clamp(k / 0.6, 0, 1) * Math.PI) * 1.8 + Math.sin(clamp((k - 0.6) / 0.4, 0, 1) * Math.PI) * 0.9
        this.x += (head.x - this.x) * Math.min(1, dt * 8)
        this.z += (head.z + 1.5 - this.z) * Math.min(1, dt * 8)
        this.y += (head.y + HOVER_HEIGHT + dip - this.y) * Math.min(1, dt * 14)
        this.vx = this.vy = this.vz = 0
        flap = 38
        this.pitch += (0.3 - this.pitch) * Math.min(1, dt * 6)
        if (k >= 1) this.enter('land')
        break
      }
      case 'land': {
        if (!world.flowerHead(this.plot, head)) {
          this.enter('takeoff')
          break
        }
        const k = easeInOut(this.modeT / LAND_SECONDS)
        this.x = head.x
        this.z = head.z + 0.6
        this.y = head.y + HOVER_HEIGHT + (SIT_HEIGHT - HOVER_HEIGHT) * k * k
        flap = 30
        spread = 1 - k * 0.3
        if (this.modeT >= LAND_SECONDS) {
          this.kick(0.32)
          this.events.land(this.plot)
          this.enter('sip')
        }
        break
      }
      case 'sip': {
        if (!world.flowerHead(this.plot, head)) {
          this.enter('takeoff')
          break
        }
        const k = this.modeT / SIP_SECONDS
        this.x = head.x
        this.z = head.z + 0.6
        this.y = head.y + SIT_HEIGHT
        this.headDip = Math.abs(Math.sin(clamp((k - 0.08) / 0.8, 0, 1) * Math.PI * 3))
        this.roll = Math.sin(this.modeT * 9) * 0.12 * (1 - k)
        this.pitch += (0.18 + this.headDip * 0.15 - this.pitch) * Math.min(1, dt * 10)
        flap = 9
        spread = 0.45 + Math.sin(this.modeT * 5) * 0.08
        if (this.modeT - dt < SIP_SECONDS * SIP_POLLEN_AT && this.modeT >= SIP_SECONDS * SIP_POLLEN_AT) this.events.sip(this.plot)
        if (this.modeT >= SIP_SECONDS) this.enter('takeoff')
        break
      }
      case 'takeoff': {
        const k = this.modeT / TAKEOFF_SECONDS
        if (k < 0.4) {
          this.squash += (0.22 - this.squash) * Math.min(1, dt * 20)
          spread = 0.5
          flap = 14
          if (world.flowerHead(this.plot, head)) {
            this.x = head.x
            this.z = head.z + 0.6
            this.y = head.y + SIT_HEIGHT - k * 1.2
          }
        } else {
          if (this.modeT - dt < TAKEOFF_SECONDS * 0.4) {
            this.events.takeoff(this.plot)
            this.kick(-0.4)
            this.vy = 26
          }
          this.damp(dt, 2)
          this.integrate(dt)
          flap = 36
        }
        if (k >= 1) {
          this.lastPlot = this.plot
          if (this.pending >= 0) {
            this.plot = this.pending
            this.pending = -1
            this.enter('notice')
          } else if (world.readyToMix()) this.enter('loop')
          else this.enter('wander')
        }
        break
      }
      case 'loop': {
        const k = clamp(this.modeT / LOOP_SECONDS, 0, 1)
        this.vx *= 1 - Math.min(1, dt * 5)
        this.vz *= 1 - Math.min(1, dt * 5)
        this.vy = Math.sin(k * Math.PI) * 9 - 2
        this.integrate(dt)
        this.roll = easeInOut(k) * Math.PI * 2
        this.merge = k
        flap = 40
        if (k >= 1) {
          this.roll = 0
          world.dropSpot(this.carryTo)
          this.enter('carry')
        }
        break
      }
      case 'carry': {
        this.merge = 1
        target.x = this.carryTo.x
        target.y = this.carryTo.y + CARRY_HEIGHT
        target.z = this.carryTo.z
        this.fly(target, 26, dt)
        flap = 32
        if (Math.hypot(target.x - this.x, target.z - this.z) < 2.2 && Math.abs(target.y - this.y) < 3) {
          dropAt.x = this.x
          dropAt.y = this.y - 3.2
          dropAt.z = this.z
          this.kick(-0.3)
          this.events.drop(dropAt)
          this.vy = 14
          if (this.pending >= 0) {
            this.plot = this.pending
            this.pending = -1
            this.enter('notice')
          } else this.enter('wander')
        }
        break
      }
      case 'startle': {
        const k = clamp(this.modeT / STARTLE_SECONDS, 0, 1)
        if (this.modeT < 0.08) this.vy = 0
        else if (this.modeT - dt < 0.08) this.vy = 42
        this.vy -= 30 * dt
        this.damp(dt, 1.5)
        this.integrate(dt)
        this.yaw += dt * Math.PI * 2 * 1.6 * (1 - k)
        flap = 44
        if (k >= 1) this.enter('wander')
        break
      }
      default: {
        const unreachable: never = this.mode
        return unreachable
      }
    }

    const floor = groundY(this.x, this.z) + 3
    if (!this.sitting() && this.y < floor) {
      this.y = floor
      if (this.vy < 0) this.vy = 0
    }
    this.wingSpread += (spread - this.wingSpread) * Math.min(1, dt * 12)
    this.wingPhase += dt * flap * Math.PI * 2 * 0.5
    this.squashV += (-170 * this.squash - 9 * this.squashV) * dt
    this.squash += this.squashV * dt
    this.speed = Math.hypot(this.vx, this.vy, this.vz)
    if (this.mode !== 'loop' && this.mode !== 'sip') this.roll *= 1 - Math.min(1, dt * 3)
  }

  private enter(mode: BeeMode): void {
    this.mode = mode
    this.modeT = 0
    if (mode === 'wander') this.jitter = (((Math.sin(this.t * 12.9898) * 43758.5453) % 1) + 1) % 1 * 2
  }

  private kick(amount: number): void {
    this.squashV += amount * 14
  }

  private chooseFlower(world: BeeWorld): number {
    let best = -1
    let bestScore = -Infinity
    for (let plot = 0; plot < PLOTS.length; plot++) {
      if (!world.flowerHead(plot, head)) continue
      let score = Math.sin(plot * 7.1 + this.t * 0.37)
      if (world.wouldMix(plot)) score += 2
      if (plot === this.lastPlot) score -= 3
      if (score > bestScore) {
        bestScore = score
        best = plot
      }
    }
    return best
  }

  private wanderTarget(out: Vec3): void {
    const t = this.t
    out.x = 44 * Math.sin(t * 0.13) + 16 * Math.sin(t * 0.31 + 1)
    out.z = -6 + 16 * Math.sin(t * 0.17 + 2)
    out.y = groundY(out.x, out.z) + 17 + 3 * Math.sin(t * 0.5)
  }

  /** Steer toward a point with arrival, plus a bumbling wobble; bank into turns. */
  private fly(to: Vec3, maxSpeed: number, dt: number): void {
    const t = this.t
    const wobbleX = Math.sin(t * 2.3) * 2.2 + Math.sin(t * 5.1) * 0.7
    const wobbleY = Math.sin(t * 3.1 + 1) * 1.6
    const dx = to.x + wobbleX - this.x
    const dy = to.y + wobbleY - this.y
    const dz = to.z - this.z
    const distance = Math.hypot(dx, dy, dz)
    const desired = Math.min(maxSpeed, distance * 2.4)
    const scale = distance > 1e-4 ? desired / distance : 0
    const ax = (dx * scale - this.vx) * 3.2
    const ay = (dy * scale - this.vy) * 3.6
    const az = (dz * scale - this.vz) * 3.2
    this.vx += ax * dt
    this.vy += ay * dt
    this.vz += az * dt
    this.integrate(dt)
    const horizontal = Math.hypot(this.vx, this.vz)
    if (horizontal > 2) this.faceToward(this.x + this.vx, this.z + this.vz, dt, 4)
    const lateral = (ax * Math.cos(this.yaw) - az * Math.sin(this.yaw)) / 60
    this.roll += (clamp(-lateral, -0.6, 0.6) - this.roll) * Math.min(1, dt * 4)
    this.pitch += (clamp(-this.vy / 60, -0.3, 0.3) + clamp(horizontal / 90, 0, 0.25) - this.pitch) * Math.min(1, dt * 4)
  }

  private faceToward(x: number, z: number, dt: number, rate: number): void {
    const want = Math.atan2(x - this.x, z - this.z)
    const delta = Math.atan2(Math.sin(want - this.yaw), Math.cos(want - this.yaw))
    this.yaw += delta * Math.min(1, dt * rate)
  }

  private damp(dt: number, rate: number): void {
    const k = 1 - Math.min(1, dt * rate)
    this.vx *= k
    this.vz *= k
  }

  private integrate(dt: number): void {
    this.x += this.vx * dt
    this.y += this.vy * dt
    this.z += this.vz * dt
  }
}
