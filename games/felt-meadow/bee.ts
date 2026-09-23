import { CHILD, groundY, PLOTS, STEM_HEIGHT } from './layout'
import { clamp, smoothstep, toward, wrapAngle } from './math'
import { Director, type PokeName } from './motion'

// The felt bee's brain. Its personality is a bumbler: it flies on a lazy,
// wobbling path, banks into turns, sizes a flower up before landing (a stall,
// a dip, and a rise), sips with three nods and a wiggle, crouches before it
// takes off, and celebrates a mixed seed with a barrel roll, then carries the
// new seed to an empty molehill and lets it go there. A tap startles it (a
// hop and a spin, a backward tumble, or a giggle behind its wings), and
// while it wanders it now and then glances at the child, does a waggle
// dance, or flies a little loop. It never rewards or waits for the child;
// while the guidance beckons toward an empty molehill it hovers beside it,
// looks at the child, then turns and dips toward the molehill. While a
// flower the child planted is opening it hovers off to one side and watches
// it too, and only visits it once it has opened.

export type Vec3 = { x: number; y: number; z: number }

export type BeeMode = 'wander' | 'notice' | 'approach' | 'hover' | 'land' | 'sip' | 'takeoff' | 'loop' | 'carry' | 'startle' | 'point'

export type BeeWorld = {
  /** Head of the bloomed flower at `plot` (bent by its stem), written into `out`; false if nothing is in bloom there. */
  flowerHead(plot: number, out: Vec3): boolean
  /** True while the flower at `plot` is opening or just open; the bee's own visits leave it to the child. */
  isNew(plot: number): boolean
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
  startle(variant: PokeName<'bee'>): void
}

/** The felt bee's size relative to its modelled parts; heights below are for this size. */
export const BEE_SCALE = 1.2
const SIT_HEIGHT = 3.5
const HOVER_HEIGHT = 8.5
const HOVER_SECONDS = 0.5
const LAND_SECONDS = 0.36
const SIP_SECONDS = 1.7
const SIP_POLLEN_AT = 0.85
const TAKEOFF_SECONDS = 0.32
const LOOP_SECONDS = 1.15
const NOTICE_SECONDS = 0.22
const CARRY_HEIGHT = 10
const FLOOR = 3.6
/** One look at the child and one dip toward the molehill. */
const POINT_BEAT = 2.8
/** The share of a beat spent looking at the child. */
const POINT_LOOK = 0.42
/** Where the bee beckons from: beside and behind the bare molehill, high enough that its dip never lays its face on the hole. */
const POINT_SIDE = 9
const POINT_BACK = 9
const POINT_HEIGHT = 14
const POINT_DIP = 3
/** How far to the side of a new flower the bee watches it from, clear of the petals and its own wobble. */
const WATCH_SIDE = 16

const target: Vec3 = { x: 0, y: 0, z: 0 }
const head: Vec3 = { x: 0, y: 0, z: 0 }
const dropAt: Vec3 = { x: 0, y: 0, z: 0 }

function easeInOut(t: number): number {
  return smoothstep(0, 1, t)
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
  /** 0..1 wings swung forward over its mouth (a giggle). */
  wingCover = 0
  readonly motion = new Director('bee', 5)
  mode: BeeMode = 'wander'
  modeT = 0
  plot = -1
  t = 0
  /** True from a flower tap until the visit it asked for is over, the sip and any mix and drop included. */
  answering = false
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
    this.answering = true
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

  /** Tapped: one of its startles (never the same twice running), then back to bumbling. */
  poke(): void {
    if (this.mode === 'sip' || this.mode === 'land') this.events.takeoff(this.plot)
    this.pending = -1
    this.motion.interrupt()
    const variant = this.motion.trigger('poke')
    this.kick(variant === 'giggle' ? -0.2 : 0.35)
    this.enter('startle')
    this.events.startle(variant)
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
    let cover = 0
    this.headDip = 0
    this.merge = 0
    const watching = this.mode === 'wander' ? this.newFlower(world) : -1
    if (watching >= 0) this.motion.interrupt()
    this.motion.step(dt, this.mode === 'wander' && world.pointAt < 0 && watching < 0)

    switch (this.mode) {
      case 'wander': {
        const delight = this.motion.delight
        if (watching >= 0) {
          this.watchSpot(watching, target)
          const far = Math.hypot(target.x - this.x, target.z - this.z) > 5
          this.fly(target, 22, dt, far)
          if (!far) {
            const p = PLOTS[watching]
            this.faceToward(p.x, p.z, dt, 5)
            this.pitch = toward(this.pitch, 0.12, dt, 5)
          }
          flap = 22
        } else {
          this.wanderTarget(target)
          this.fly(target, delight === 'glance' ? 5 : 22, dt, delight === null || delight === 'waggle-dance')
        }
        if (delight !== null) {
          const k = this.motion.progress()
          const amp = this.motion.amp
          switch (delight) {
            case 'glance': {
              // Stops to look at the child, and nods twice.
              this.faceToward(CHILD.x, CHILD.z, dt, 6)
              const nod = k > 0.35 && k < 0.75 ? Math.max(0, Math.sin(((k - 0.35) / 0.4) * Math.PI * 2)) : 0
              this.pitch = toward(this.pitch, -0.24 + nod * 0.22 * amp, dt, 8)
              flap = 20
              spread = 0.85
              break
            }
            case 'waggle-dance': {
              // The bee's own dance: the whole body waggles side to side on the straight run.
              this.roll = Math.sin(this.modeT * Math.PI * 2 * 6) * 0.5 * amp * Math.sin(Math.PI * k)
              flap = 34
              break
            }
            case 'loop-de-loop': {
              // A little vertical loop on its way, nose up and over.
              const angle = Math.PI * 2 * easeInOut(k)
              const before = Math.PI * 2 * easeInOut(Math.max(0, k - dt / this.motion.seconds))
              const radius = 4.2 * amp
              const rise = radius * (Math.cos(before) - Math.cos(angle))
              const ahead = radius * (Math.sin(angle) - Math.sin(before))
              this.y += rise
              this.x += Math.sin(this.yaw) * ahead
              this.z += Math.cos(this.yaw) * ahead
              this.pitch = -angle
              flap = 40
              break
            }
            default: {
              const unreachable: never = delight
              return unreachable
            }
          }
        }
        if (world.readyToMix()) {
          this.enter('loop')
          break
        }
        if (world.pointAt >= 0) {
          this.enter('point')
          break
        }
        if (watching < 0 && this.modeT > world.visitEvery + this.jitter) {
          const choice = this.chooseFlower(world)
          if (choice >= 0) {
            this.plot = choice
            this.enter('approach')
          } else this.modeT -= 1.5
        }
        break
      }
      case 'point': {
        // Joint attention: turn to the child with a little bounce, then turn
        // to the bare molehill and dip toward it, as if to say "down there".
        // It hovers behind and beside the molehill, so from the child's side
        // it never covers the hole, its glow, or the felt hand that plants there.
        const plot = world.pointAt
        if (plot < 0 || world.readyToMix()) {
          this.enter('wander')
          break
        }
        const p = PLOTS[plot]
        const side = p.x > 0 ? -1 : 1
        const beat = (this.modeT % POINT_BEAT) / POINT_BEAT
        const before = (Math.max(0, this.modeT - dt) % POINT_BEAT) / POINT_BEAT
        const looking = beat < POINT_LOOK
        if (before > beat) this.kick(0.2)
        else if (before < POINT_LOOK && !looking) this.kick(-0.16)
        const dip = looking ? 0 : Math.sin(((beat - POINT_LOOK) / (1 - POINT_LOOK)) * Math.PI)
        target.x = p.x + side * POINT_SIDE + Math.sin(t * 1.3) * 0.8
        target.z = p.z - POINT_BACK
        target.y = groundY(p.x, p.z) + POINT_HEIGHT - dip * POINT_DIP
        const far = Math.hypot(target.x - this.x, target.z - this.z) > 6
        this.fly(target, 18, dt, far)
        if (far) break
        if (looking) {
          this.faceToward(CHILD.x, CHILD.z, dt, 7)
          this.pitch = toward(this.pitch, -0.24, dt, 6)
        } else {
          this.faceToward(p.x, p.z, dt, 7)
          this.pitch = toward(this.pitch, 0.2 + dip * 0.5, dt, 6)
        }
        flap = looking ? 22 : 30
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
        this.x = toward(this.x, head.x, dt, 8)
        this.z = toward(this.z, head.z + 1.5, dt, 8)
        this.y = toward(this.y, head.y + HOVER_HEIGHT + dip, dt, 14)
        this.vx = this.vy = this.vz = 0
        flap = 38
        this.pitch = toward(this.pitch, 0.3, dt, 6)
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
        this.pitch = toward(this.pitch, 0.18 + this.headDip * 0.15, dt, 10)
        flap = 9
        spread = 0.45 + Math.sin(this.modeT * 5) * 0.08
        if (this.modeT - dt < SIP_SECONDS * SIP_POLLEN_AT && this.modeT >= SIP_SECONDS * SIP_POLLEN_AT) this.events.sip(this.plot)
        if (this.modeT >= SIP_SECONDS) this.enter('takeoff')
        break
      }
      case 'takeoff': {
        const k = this.modeT / TAKEOFF_SECONDS
        if (k < 0.4) {
          this.squash = toward(this.squash, 0.22, dt, 20)
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
          dropAt.y = this.y - 3.2 * BEE_SCALE
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
        const variant = this.motion.poke
        if (variant === null) {
          this.enter('wander')
          break
        }
        const k = this.motion.progress()
        const before = clamp((this.motion.t - dt) / this.motion.seconds, 0, 1)
        switch (variant) {
          case 'spin-hop': {
            if (this.modeT < 0.08) this.vy = 0
            else if (this.modeT - dt < 0.08) this.vy = 42 * this.motion.amp
            this.vy -= 30 * dt
            this.damp(dt, 1.5)
            this.integrate(dt)
            this.yaw += dt * Math.PI * 2 * 1.6 * (1 - k)
            flap = 44
            break
          }
          case 'tumble': {
            // Bowled over backwards: a somersault that bounces up, then settles.
            if (this.modeT - dt <= 0) this.vy = 28 * this.motion.amp
            this.vy -= 36 * dt
            this.damp(dt, 2.5)
            this.integrate(dt)
            this.pitch = -Math.PI * 2 * easeInOut(k / 0.75)
            if (before < 0.75 && k >= 0.75) this.kick(0.3)
            flap = 42
            break
          }
          case 'giggle': {
            // Turns to the child, wings over its mouth, and shakes with giggles; then flings them open.
            const hold = 1 - Math.min(1, dt * 6)
            this.vx *= hold
            this.vy *= hold
            this.vz *= hold
            this.integrate(dt)
            this.faceToward(CHILD.x, CHILD.z, dt, 9)
            this.pitch = toward(this.pitch, -0.22, dt, 6)
            cover = k < 0.62 ? 1 : 0
            const shakes = 5 * this.motion.seconds
            if (k > 0.1 && k < 0.6 && Math.floor(before * shakes) !== Math.floor(k * shakes)) this.kick(0.16 * this.motion.amp)
            this.roll = k < 0.62 ? Math.sin(this.motion.t * Math.PI * 2 * 5) * 0.12 : this.roll
            if (before < 0.62 && k >= 0.62) this.kick(0.34)
            flap = k < 0.62 ? 5 : 30
            spread = k < 0.62 ? 0.7 : 1
            break
          }
          default: {
            const unreachable: never = variant
            return unreachable
          }
        }
        break
      }
      default: {
        const unreachable: never = this.mode
        return unreachable
      }
    }

    const floor = groundY(this.x, this.z) + FLOOR
    if (!this.sitting() && this.y < floor) {
      this.y = floor
      if (this.vy < 0) this.vy = 0
    }
    this.pitch = wrapAngle(this.pitch)
    this.wingCover = toward(this.wingCover, cover, dt, 14)
    this.wingSpread = toward(this.wingSpread, spread, dt, 12)
    this.wingPhase += dt * flap * Math.PI * 2 * 0.5
    this.squashV += (-170 * this.squash - 9 * this.squashV) * dt
    this.squash += this.squashV * dt
    this.speed = Math.hypot(this.vx, this.vy, this.vz)
    if (this.mode !== 'loop' && this.mode !== 'sip') this.roll *= 1 - Math.min(1, dt * 3)
  }

  private enter(mode: BeeMode): void {
    if (mode !== 'wander') this.motion.interrupt()
    if (mode === 'wander' || mode === 'point' || mode === 'startle') this.answering = false
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
      if (world.isNew(plot) || !world.flowerHead(plot, head)) continue
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

  private newFlower(world: BeeWorld): number {
    for (let plot = 0; plot < PLOTS.length; plot++) if (world.isNew(plot)) return plot
    return -1
  }

  /** Off to the side of a new flower (the side the bee is on, so it never crosses), a little behind it and above where its head opens. */
  private watchSpot(plot: number, out: Vec3): void {
    const p = PLOTS[plot]
    const side = this.x >= p.x ? 1 : -1
    out.x = p.x + side * WATCH_SIDE + Math.sin(this.t * 1.1) * 0.8
    out.z = p.z - 3
    out.y = groundY(p.x, p.z) + STEM_HEIGHT + 4
  }

  private wanderTarget(out: Vec3): void {
    const t = this.t
    out.x = 44 * Math.sin(t * 0.13) + 16 * Math.sin(t * 0.31 + 1)
    out.z = -6 + 16 * Math.sin(t * 0.17 + 2)
    out.y = groundY(out.x, out.z) + 17 + 3 * Math.sin(t * 0.5)
  }

  /** Steer toward a point with arrival, plus a bumbling wobble; bank into turns, facing where it flies unless `facing` is false. */
  private fly(to: Vec3, maxSpeed: number, dt: number, facing = true): void {
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
    if (!facing) return
    const horizontal = Math.hypot(this.vx, this.vz)
    if (horizontal > 2) this.faceToward(this.x + this.vx, this.z + this.vz, dt, 4)
    const lateral = (ax * Math.cos(this.yaw) - az * Math.sin(this.yaw)) / 60
    this.roll = toward(this.roll, clamp(-lateral, -0.6, 0.6), dt, 4)
    this.pitch = toward(this.pitch, clamp(-this.vy / 60, -0.3, 0.3) + clamp(horizontal / 90, 0, 0.25), dt, 4)
  }

  private faceToward(x: number, z: number, dt: number, rate: number): void {
    const want = Math.atan2(x - this.x, z - this.z)
    const delta = wrapAngle(want - this.yaw)
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
