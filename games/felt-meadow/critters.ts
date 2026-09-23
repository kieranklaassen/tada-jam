import { BURROW, plotAt, SNAIL_PATH } from './layout'

// Two small felt neighbours with their own ways of moving. The snail glides
// by peristalsis: its body stretches forward, then the tail catches up, and
// its eye stalks bob out of step with each other; tapped, it pulls its eyes
// in and hides, then peeks out one eye at a time. The mouse darts and
// freezes: quick bouncy scurries, a stop to sniff with a twitching nose, and
// now and then it sits up on its hind legs to look around; tapped, it leaps,
// spins, and runs for its burrow, then peeks out a while later.

type Spring = { x: number; v: number }

function spring(s: Spring, target: number, dt: number, stiffness: number, damping: number): number {
  s.v += (stiffness * (target - s.x) - damping * s.v) * dt
  s.x += s.v * dt
  return s.x
}

function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type SnailMode = 'glide' | 'turn' | 'hide' | 'peek'

const SNAIL_CYCLE = 2.4
const SNAIL_STEP = 2.9

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
  mode: SnailMode = 'glide'
  modeT = 0
  t = 0
  private turnFrom = 0

  poke(): void {
    if (this.mode === 'hide') {
      this.modeT = Math.min(this.modeT, 0.4)
      return
    }
    this.mode = 'hide'
    this.modeT = 0
    this.shellTilt.v += 6
  }

  step(dt: number): void {
    this.t += dt
    this.modeT += dt
    let eyeL = 1
    let eyeR = 1
    let stretchTarget = 1
    switch (this.mode) {
      case 'glide': {
        this.cycle = (this.cycle + dt / SNAIL_CYCLE) % 1
        const reach = Math.max(0, Math.sin(this.cycle * Math.PI * 2))
        stretchTarget = 1 + reach * 0.16
        this.x += this.dir * reach * SNAIL_STEP * dt
        if ((this.dir > 0 && this.x > SNAIL_PATH.right) || (this.dir < 0 && this.x < SNAIL_PATH.left)) {
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
      case 'hide': {
        eyeL = eyeR = 0
        stretchTarget = 0.62
        if (this.modeT > 2.6) {
          this.mode = 'peek'
          this.modeT = 0
        }
        break
      }
      case 'peek': {
        eyeL = this.modeT > 0.1 ? 1 : 0
        eyeR = this.modeT > 0.75 ? 1 : 0
        stretchTarget = this.modeT > 0.9 ? 1 : 0.75
        if (this.modeT > 1.6) {
          this.mode = 'glide'
          this.modeT = 0
        }
        break
      }
      default: {
        const unreachable: never = this.mode
        return unreachable
      }
    }
    const hiding = this.mode === 'hide'
    spring(this.eyeLeft, eyeL, dt, hiding ? 420 : 55, hiding ? 30 : 6)
    spring(this.eyeRight, eyeR, dt, hiding ? 420 : 50, hiding ? 30 : 5.5)
    spring(this.shellTilt, hiding ? 0.18 : 0, dt, 90, 7)
    this.stretch += (stretchTarget - this.stretch) * Math.min(1, dt * (hiding ? 16 : 3))
  }
}

export type MouseMode = 'home' | 'emerge' | 'dart' | 'freeze' | 'rear' | 'flee' | 'dive'

const MOUSE_AREA = { left: 18, right: 76, far: -40, near: -18 }

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
  mode: MouseMode = 'home'
  modeT = 0
  t = 0
  private duration = 5
  private darts = 0
  private tx = BURROW.x
  private tz = BURROW.z
  private speed = 34
  private readonly random: () => number

  constructor(seed = 7) {
    this.random = seeded(seed)
  }

  visible(): boolean {
    return this.mode !== 'home'
  }

  poke(): void {
    if (this.mode === 'home' || this.mode === 'dive' || this.mode === 'flee') return
    this.enter('flee', 0.3)
    this.tx = BURROW.x
    this.tz = BURROW.z
  }

  step(dt: number): void {
    this.t += dt
    this.modeT += dt
    let rearTarget = 0
    let stretchTarget = 0
    this.hop = 0
    this.sniff = 0
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
        this.yaw += Math.atan2(Math.sin(want - this.yaw), Math.cos(want - this.yaw)) * Math.min(1, dt * 14)
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
        this.sniff = 0.5 + 0.5 * Math.sin(this.modeT * Math.PI * 2 * 9)
        this.look = Math.sin(this.modeT * 2.2) * 0.45
        if (this.modeT >= this.duration) this.pickTarget()
        break
      case 'rear':
        rearTarget = this.modeT < this.duration - 0.25 ? 1 : 0
        this.look = Math.sin(this.modeT * 3.1) * 0.7
        this.sniff = 0.5 + 0.5 * Math.sin(this.modeT * Math.PI * 2 * 7)
        if (this.modeT >= this.duration) this.pickTarget()
        break
      case 'flee': {
        // A startled leap (stretch up), then a spin toward the burrow and a fast run.
        stretchTarget = this.modeT < 0.18 ? 0.5 : 0.25
        this.hop = this.modeT < 0.3 ? Math.sin((this.modeT / 0.3) * Math.PI) * 4 : 0
        const want = Math.atan2(BURROW.x - this.x, BURROW.z - this.z)
        this.yaw += Math.atan2(Math.sin(want - this.yaw), Math.cos(want - this.yaw)) * Math.min(1, dt * 18)
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
          this.enter('home', 7 + this.random() * 9)
        }
        break
      default: {
        const unreachable: never = this.mode
        return unreachable
      }
    }
    this.rear += (rearTarget - this.rear) * Math.min(1, dt * 7)
    this.stretch += (stretchTarget - this.stretch) * Math.min(1, dt * 12)
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
        if (plotAt(this.tx, this.tz, 4) < 0) break
      }
    }
    this.mode = 'dart'
    this.modeT = 0
  }
}
