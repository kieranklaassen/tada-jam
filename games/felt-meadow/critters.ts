import { BURROW, CHILD, plotAt, SNAIL_PATH } from './layout'
import { seeded, spring, STEADY_STEP, toward, wrapAngle, type Spring } from './math'
import { Director, type PokeName } from './motion'

// Two small felt neighbours with their own ways of moving. The snail is slow
// and heavy and says everything with its eye stalks. It glides by
// peristalsis: its body stretches forward, then the tail catches up, and its
// eye stalks bob out of step with each other. Tapped, it tucks in and peeks
// out one eye at a time, or its eyes shoot up tall in surprise, or it
// shivers in its shell and pops both eyes out at once. Now and then it stops
// to turn its eyes to the child, stretches long, or wobbles its stalks.
// The mouse is tiny and quick and says everything with its nose, head, and
// tail. It darts and freezes: quick bouncy scurries, a stop to sniff with a
// twitching nose, and now and then it sits up to look around. Tapped, it
// leaps and runs home, or bolts upright squeaking and scurries off, or
// chases its own tail and then runs home. While it is still, it may glance
// at the child, wash its face, or flick its tail. A tap on its burrow while
// it is home brings it out to see.

export type SnailMode = 'glide' | 'turn' | 'poked'

const SNAIL_CYCLE = 2.4
const SNAIL_STEP = 2.9
/** How long a tucked-in snail stays hidden before it peeks. */
const TUCKED = 2.6

function angleTo(fromX: number, fromZ: number, yaw: number, x: number, z: number): number {
  const want = Math.atan2(x - fromX, z - fromZ)
  return wrapAngle(want - yaw)
}

export class Snail {
  x = 44
  z = SNAIL_PATH.z
  /** +1 heading right, -1 heading left. */
  dir = -1
  yaw = -Math.PI / 2
  /** Body length factor: 1 at rest, longer while reaching forward, short while hiding. */
  stretch = 1
  /** Peristalsis phase, 0..1 through one stretch-and-catch-up cycle. */
  cycle = 0
  readonly eyeLeft: Spring = { x: 1, v: 0 }
  readonly eyeRight: Spring = { x: 1, v: 0 }
  readonly shellTilt: Spring = { x: 0, v: 0 }
  /** 0..1 eye stalks turned toward the child. */
  eyeLook = 0
  /** Extra wobble of the eye stalks, 0..1. */
  wobble = 0
  /** Shell shiver angle. */
  shiver = 0
  mode: SnailMode = 'glide'
  modeT = 0
  t = 0
  readonly motion = new Director('snail', 2)
  private turnFrom = 0

  /** Eyes tucked in: a tap now only keeps it in its shell a little longer. */
  hidden(): boolean {
    return this.mode === 'poked' && this.motion.poke === 'tuck-and-peek' && this.motion.t < TUCKED
  }

  /** Tapped: one of its surprises (never the same twice running), or null if it is already tucked in. */
  poke(): PokeName<'snail'> | null {
    if (this.hidden()) {
      this.motion.t = Math.min(this.motion.t, 0.4)
      return null
    }
    this.motion.interrupt()
    const variant = this.motion.trigger('poke')
    this.mode = 'poked'
    this.modeT = 0
    this.shellTilt.v += variant === 'tall-eyes' ? -4 : 6
    return variant
  }

  step(dt: number): void {
    this.t += dt
    this.modeT += dt
    this.motion.step(dt, this.mode === 'glide')
    let eyeL = 1
    let eyeR = 1
    let stretchTarget = 1
    let look = 0
    let wobble = 0
    let shiver = 0
    let tucking = false
    switch (this.mode) {
      case 'glide': {
        const delight = this.motion.delight
        let pace = 1
        if (delight !== null) {
          const k = this.motion.progress()
          const hump = Math.sin(Math.PI * k)
          switch (delight) {
            case 'glance':
              // Stops, and turns both eyes to the child.
              pace = 0
              look = k < 0.85 ? 1 : 0
              eyeL = eyeR = 1 + 0.12 * hump
              break
            case 'long-stretch':
              // Stretches out long and tall, holds it, and sags back.
              pace = 0
              stretchTarget = 1 + 0.3 * hump * this.motion.amp
              eyeL = eyeR = 1 + 0.35 * hump
              break
            case 'eye-wobble':
              wobble = hump
              break
            default: {
              const unreachable: never = delight
              return unreachable
            }
          }
        }
        this.cycle = (this.cycle + (dt / SNAIL_CYCLE) * pace) % 1
        const reach = Math.max(0, Math.sin(this.cycle * Math.PI * 2)) * pace
        if (pace > 0) stretchTarget = 1 + reach * 0.16
        this.x += this.dir * reach * SNAIL_STEP * dt
        if ((this.dir > 0 && this.x > SNAIL_PATH.right) || (this.dir < 0 && this.x < SNAIL_PATH.left)) {
          this.motion.interrupt()
          this.mode = 'turn'
          this.modeT = 0
          this.turnFrom = this.yaw
        }
        break
      }
      case 'turn': {
        const k = Math.min(1, this.modeT / 3.6)
        const eased = k * k * (3 - 2 * k)
        this.yaw = this.turnFrom + Math.PI * eased * (this.dir > 0 ? -1 : 1)
        this.z = SNAIL_PATH.z - Math.sin(eased * Math.PI) * 3
        stretchTarget = 1 + Math.sin(this.modeT * 2.6) * 0.05
        if (k >= 1) {
          this.dir = -this.dir as 1 | -1
          this.yaw = this.dir > 0 ? Math.PI / 2 : -Math.PI / 2
          this.mode = 'glide'
          this.modeT = 0
        }
        break
      }
      case 'poked': {
        const variant = this.motion.poke
        if (variant === null) {
          this.mode = 'glide'
          this.modeT = 0
          break
        }
        const t = this.motion.t
        const k = this.motion.progress()
        switch (variant) {
          case 'tuck-and-peek': {
            // In it goes; then one eye, a pause, the other eye, and out.
            const peek = t - TUCKED
            tucking = peek < 0
            eyeL = peek > 0.1 ? 1 : 0
            eyeR = peek > 0.75 ? 1 : 0
            stretchTarget = peek < 0 ? 0.62 : peek > 0.9 ? 1 : 0.75
            break
          }
          case 'tall-eyes': {
            // The eyes shoot up tall and the body leans back, then it all sags back down.
            const up = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4
            eyeL = eyeR = 1 + 0.65 * up * this.motion.amp
            stretchTarget = 1 - 0.14 * up
            look = up * 0.6
            break
          }
          case 'shiver-in': {
            // Pulls in and trembles in its shell, then both eyes pop out at once.
            tucking = k < 0.72
            eyeL = eyeR = tucking ? 0 : 1.1
            stretchTarget = tucking ? 0.68 : 1
            shiver = tucking && k > 0.12 ? Math.sin(t * 46) * 0.07 * this.motion.amp : 0
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
    spring(this.eyeLeft, eyeL, dt, tucking ? 420 : 55, tucking ? 30 : 6, STEADY_STEP)
    spring(this.eyeRight, eyeR, dt, tucking ? 420 : 50, tucking ? 30 : 5.5, STEADY_STEP)
    spring(this.shellTilt, tucking ? 0.18 : 0, dt, 90, 7)
    this.stretch = toward(this.stretch, stretchTarget, dt, tucking ? 16 : 3)
    this.eyeLook = toward(this.eyeLook, look, dt, 2.5)
    this.wobble = toward(this.wobble, wobble, dt, 3)
    this.shiver = shiver
  }

  /** Signed turn from the snail's heading toward the child, for the eye stalks. */
  childSide(): number {
    return angleTo(this.x, this.z, this.yaw, CHILD.x, CHILD.z)
  }
}

export type MouseMode = 'home' | 'emerge' | 'dart' | 'freeze' | 'rear' | 'poked' | 'flee' | 'dive'

/** Right of the molehills and clear of them, so the mouse never crowds the one the meadow is pointing at. */
const MOUSE_AREA = { left: 52, right: 76, far: -30, near: 10 }
const MOUSE_PLOT_BERTH = 9
/** After a knock on its burrow, the mouse comes out this many seconds later. */
const KNOCK_ANSWER = 0.35
/** It stays in at least this long after going home, knock or no knock. */
const KNOCK_MIN_HOME = 1.2

export class Mouse {
  x = BURROW.x
  z = BURROW.z
  yaw = Math.PI
  /** 0 hidden in the burrow .. 1 fully out. */
  out = 0
  /** Vertical bounce of the scurry. */
  hop = 0
  /** Nose twitch, 0..1. */
  sniff = 0
  /** 0 on four feet .. 1 sitting up. */
  rear = 0
  /** Stretch along the body while darting or leaping. */
  stretch = 0
  /** Head turn relative to the body. */
  look = 0
  /** 0..1 face washing: the head bobs and rolls between the paws. */
  groom = 0
  /** Extra tail swing, radians. */
  tailFlick = 0
  mode: MouseMode = 'home'
  modeT = 0
  t = 0
  readonly motion: Director<'mouse'>
  private duration = 5
  private darts = 0
  private tx = BURROW.x
  private tz = BURROW.z
  private speed = 34
  private pokeVariant: PokeName<'mouse'> = 'leap-home'
  private readonly random: () => number

  constructor(seed = 7) {
    this.random = seeded(seed)
    this.motion = new Director('mouse', seed + 1)
  }

  visible(): boolean {
    return this.mode !== 'home'
  }

  /** Tapped: one of its frights (never the same twice running), or null if it is already on its way home. */
  poke(): PokeName<'mouse'> | null {
    if (this.mode === 'home' || this.mode === 'dive' || this.mode === 'flee' || this.mode === 'poked') return null
    this.motion.interrupt()
    const variant = this.motion.trigger('poke')
    this.pokeVariant = variant
    if (variant === 'leap-home') this.runHome()
    else this.enter('poked', this.motion.seconds)
    return variant
  }

  /**
   * Its burrow was tapped: if it is home, it comes out to see a moment later
   * (never straight back out after running in). Returns true if it will.
   */
  knock(): boolean {
    if (this.mode !== 'home') return false
    this.duration = Math.max(KNOCK_MIN_HOME, Math.min(this.duration, this.modeT + KNOCK_ANSWER))
    return true
  }

  step(dt: number): void {
    this.t += dt
    this.modeT += dt
    this.motion.step(dt, (this.mode === 'freeze' || this.mode === 'rear') && this.out >= 1)
    let rearTarget = 0
    let stretchTarget = 0
    let groom = 0
    this.hop = 0
    this.sniff = 0
    this.tailFlick = 0
    switch (this.mode) {
      case 'home':
        this.out = 0
        if (this.modeT > this.duration) this.enter('emerge', 0.55)
        break
      case 'emerge':
        this.out = Math.min(1, this.modeT / this.duration)
        this.look = Math.sin(this.modeT * 9) * 0.3
        if (this.modeT >= this.duration) {
          this.darts = 3 + Math.floor(this.random() * 3)
          this.pickTarget()
        }
        break
      case 'dart': {
        const dx = this.tx - this.x
        const dz = this.tz - this.z
        const distance = Math.hypot(dx, dz)
        const want = Math.atan2(dx, dz)
        this.yaw += wrapAngle(want - this.yaw) * Math.min(1, dt * 14)
        const step = Math.min(distance, this.speed * dt)
        if (distance > 1e-3) {
          this.x += (dx / distance) * step
          this.z += (dz / distance) * step
        }
        this.hop = Math.abs(Math.sin(this.modeT * Math.PI * 13)) * 0.9
        stretchTarget = 0.22
        this.look *= 0.8
        if (distance < 0.6) {
          if (this.darts <= 0) this.enter('dive', 0.35)
          else if (this.random() < 0.3) this.enter('rear', 1.4)
          else this.enter('freeze', 0.6 + this.random() * 1.1)
        }
        break
      }
      case 'freeze':
      case 'rear': {
        const rearing = this.mode === 'rear'
        rearTarget = rearing && this.modeT < this.duration - 0.25 ? 1 : 0
        this.look = rearing ? Math.sin(this.modeT * 3.1) * 0.7 : Math.sin(this.modeT * 2.2) * 0.45
        this.sniff = 0.5 + 0.5 * Math.sin(this.modeT * Math.PI * 2 * (rearing ? 7 : 9))
        const delight = this.motion.delight
        if (delight !== null) {
          const k = this.motion.progress()
          switch (delight) {
            case 'glance': {
              // Turns its head to the child and holds still, nose going.
              const toward = Math.max(-1.1, Math.min(1.1, angleTo(this.x, this.z, this.yaw, CHILD.x, CHILD.z)))
              this.look = toward * Math.min(1, Math.sin(Math.PI * k) * 3)
              break
            }
            case 'wash-face':
              rearTarget = 0.78
              groom = Math.min(1, Math.sin(Math.PI * k) * 2.5)
              this.sniff = 0
              this.look *= 0.2
              break
            case 'tail-flick':
              this.tailFlick = Math.sin(k * Math.PI * 6) * 0.9 * (1 - k) * this.motion.amp
              this.hop = k < 0.2 ? Math.sin((k / 0.2) * Math.PI) * 0.8 : 0
              break
            default: {
              const unreachable: never = delight
              return unreachable
            }
          }
        } else if (this.modeT >= this.duration) this.pickTarget()
        break
      }
      case 'poked': {
        const k = Math.min(1, this.modeT / this.duration)
        switch (this.pokeVariant) {
          case 'stand-and-squeak':
            // Bolts upright, nose going like mad, then scurries off (not home).
            rearTarget = 1
            stretchTarget = k < 0.15 ? 0.45 : 0
            this.hop = k < 0.15 ? Math.sin((k / 0.15) * Math.PI) * 1.4 : 0
            this.sniff = 0.5 + 0.5 * Math.sin(this.modeT * Math.PI * 2 * 16)
            this.look = Math.sin(this.modeT * 13) * 0.3
            if (k >= 1) {
              this.darts = Math.max(this.darts, 2)
              this.pickTarget()
            }
            break
          case 'tail-chase':
            // Spins round after its own tail, then runs home.
            this.yaw += dt * Math.PI * 2 * 2.2 * (1 - k * 0.5)
            this.hop = Math.abs(Math.sin(this.modeT * Math.PI * 10)) * 0.7
            stretchTarget = 0.3
            this.tailFlick = 0.8
            if (k >= 1) this.runHome()
            break
          case 'leap-home':
            this.runHome()
            break
          default: {
            const unreachable: never = this.pokeVariant
            return unreachable
          }
        }
        break
      }
      case 'flee': {
        // A startled leap (stretch up), then a spin toward the burrow and a fast run.
        stretchTarget = this.modeT < 0.18 ? 0.5 : 0.25
        this.hop = this.modeT < 0.3 ? Math.sin((this.modeT / 0.3) * Math.PI) * 4 : 0
        const want = Math.atan2(BURROW.x - this.x, BURROW.z - this.z)
        this.yaw += wrapAngle(want - this.yaw) * Math.min(1, dt * 18)
        if (this.modeT >= this.duration) {
          this.darts = 0
          this.speed = 62
          this.mode = 'dart'
          this.modeT = 0
        }
        break
      }
      case 'dive':
        this.out = 1 - Math.min(1, this.modeT / this.duration)
        stretchTarget = 0.3
        if (this.modeT >= this.duration) {
          this.x = BURROW.x
          this.z = BURROW.z
          this.speed = 34
          this.enter('home', 4 + this.random() * 6)
        }
        break
      default: {
        const unreachable: never = this.mode
        return unreachable
      }
    }
    this.rear = toward(this.rear, rearTarget, dt, 7)
    this.stretch = toward(this.stretch, stretchTarget, dt, 12)
    this.groom = toward(this.groom, groom, dt, 10)
  }

  private runHome(): void {
    this.enter('flee', 0.3)
    this.tx = BURROW.x
    this.tz = BURROW.z
  }

  private enter(mode: MouseMode, duration: number): void {
    this.mode = mode
    this.modeT = 0
    this.duration = duration
  }

  private pickTarget(): void {
    this.darts -= 1
    if (this.darts <= 0) {
      this.tx = BURROW.x
      this.tz = BURROW.z
    } else {
      for (let tries = 0; tries < 8; tries++) {
        this.tx = MOUSE_AREA.left + this.random() * (MOUSE_AREA.right - MOUSE_AREA.left)
        this.tz = MOUSE_AREA.far + this.random() * (MOUSE_AREA.near - MOUSE_AREA.far)
        if (plotAt(this.tx, this.tz, MOUSE_PLOT_BERTH) < 0) break
      }
    }
    this.mode = 'dart'
    this.modeT = 0
  }
}
