import { HEAD, STEP } from './layout'
import { LOCK_ROOT, clippingBox, tuftPose, type Point } from './poses'
import { TICK, ease, type Spring } from './puppet'
import type { Rng } from './rng'
import type { Clipping, Salon } from './world'

// How the hair and the loose things move: the lock swings and bounces from
// its root, each tuft of the mane leans and springs on its own, a cut piece
// falls to where it will lie, fluff floats up, and the scissors open and
// close in the hand. The model (world.ts) says how long everything is and
// where it lies; this says only how it gets there. Pure numbers, in fixed
// steps, from a seeded stream.

const G = 2600
/** The most puffs of fluff in the air at once. */
export const MOST_PUFFS = 12

export type Tuft = { lean: Spring; stretch: Spring; frizz: number }
/** A piece in the air, on its way to where the model already has it. */
export type Flight = { x: number; y: number; vx: number; vy: number; turn: number; spin: number; toX: number; toY: number; bounced: boolean }
/** A puff of fluff, or the fluff ball a rubbed piece rolls up into. */
export type Puff = { x: number; y: number; vx: number; vy: number; r: number; age: number; life: number; hue: string; rolls: boolean }
type Later = { at: number; run: () => void }

export class Hair {
  private readonly rng: Rng
  private time = 0
  private later: Later[] = []

  /** The lock: its swing in radians from straight down, and its length as a share of what the model says. */
  readonly lockSwing: Spring = { x: 0, v: 0 }
  readonly lockStretch: Spring = { x: 1, v: 0 }
  /** 1 while the lock is fanned out by a ruffle, falling back to 0. */
  lockFlutter = 0
  readonly tufts: Tuft[]
  /** What the fingers hold by its hair, and where the finger is. */
  private held: { what: 'lock' | number; to: Point } | null = null
  /** The piece carried in the fingers, and where. */
  carried: { piece: Clipping; at: Point } | null = null
  readonly flights = new Map<Clipping, Flight>()
  readonly puffs: Puff[] = []
  /** The scissors: where the finger is, how far the blades are open (0 shut, 1 open), and how much of them shows. */
  readonly scissors = { at: { x: 0, y: 0 }, open: { x: 0, v: 0 } as Spring, shown: 0, inHand: false }

  constructor(tufts: number, rng: Rng) {
    this.rng = rng
    this.tufts = Array.from({ length: tufts }, () => ({ lean: { x: 0, v: 0 }, stretch: { x: 1, v: 0 }, frizz: 0 }))
  }

  // --- What the finger does -------------------------------------------------

  catchLock(to: Point): void {
    this.held = { what: 'lock', to }
    // Caught: it squashes under the finger.
    this.lockStretch.x = 0.93
  }

  catchTuft(index: number, to: Point): void {
    this.held = { what: index, to }
    const tuft = this.tufts[index]
    if (tuft) tuft.stretch.x = 0.9
  }

  /** The finger moved with hair in it. */
  follow(to: Point): void {
    if (this.held) this.held.to = to
    if (this.carried) this.carried.at = to
  }

  /** The hair was let go: it drops with a bounce and swings. */
  letGo(): void {
    const held = this.held
    this.held = null
    if (!held) return
    if (held.what === 'lock') this.lockStretch.v += 2.2
    else { const tuft = this.tufts[held.what]; if (tuft) tuft.stretch.v += 2.6 }
  }

  /** Which tuft is in the fingers, or nothing. */
  get holdsTuft(): number | null {
    return this.held && this.held.what !== 'lock' ? this.held.what : null
  }

  /** The offset of the finger from where the held hair is rooted, or nothing: how the head knows which way it is pulled. */
  get pull(): Point | null {
    const held = this.held
    if (!held) return null
    const root = held.what === 'lock' ? LOCK_ROOT : { x: HEAD.x, y: HEAD.y }
    return { x: held.to.x - root.x, y: held.to.y - root.y }
  }

  // --- What happens to the hair ---------------------------------------------

  /** The lock was cut: the stump twangs up. */
  lockSnipped(): void {
    this.lockStretch.x = 0.72
    this.lockStretch.v = 3
    this.lockSwing.v += this.rng.pick([-1, 1]) * 2.4
  }

  /** The lock was plucked: one slow swing. */
  lockPlucked(side: number): void {
    this.lockSwing.v += (side >= 0 ? 1 : -1) * 3.4
  }

  lockRuffled(): void {
    this.lockFlutter = 1
  }

  tuftSnipped(index: number, where: Point, hue: string): void {
    const tuft = this.tufts[index]
    if (tuft) { tuft.stretch.x = 0.7; tuft.stretch.v = 4 }
    this.fluff(where, hue, 5)
  }

  /** A tuft boings, and the tufts next to it ripple outwards, each a little later and a little less. */
  tuftPoked(index: number): void {
    const tuft = this.tufts[index]
    if (tuft) tuft.stretch.v += 5
    for (let step = 1; step < this.tufts.length; step++) for (const side of [-1, 1]) {
      const other = this.tufts[index + side * step]
      if (!other) continue
      this.later.push({ at: this.time + step * 0.07, run: () => { other.lean.v += (side * 3.2) / step; other.stretch.v += 2 / step } })
    }
  }

  /** The whole mane frizzes into a ball, and sinks back. */
  maneFrizzed(): void {
    for (const tuft of this.tufts) { tuft.frizz = 1; tuft.lean.v += this.rng.range(-4, 4) }
  }

  /** A few puffs of fluff float up from a point. */
  fluff(from: Point, hue: string, count: number): void {
    for (let i = 0; i < count && this.puffs.length < MOST_PUFFS; i++) {
      this.puffs.push({ x: from.x + this.rng.range(-10, 10), y: from.y + this.rng.range(-8, 8), vx: this.rng.range(-40, 40), vy: this.rng.range(-110, -50), r: this.rng.range(5, 11), age: 0, life: this.rng.range(0.7, 1.2), hue, rolls: false })
    }
  }

  /** A rubbed piece rolls up into a fluff ball that rolls away under the chair. */
  rollAway(from: Point, hue: string): void {
    this.puffs.push({ x: from.x, y: from.y, vx: (HEAD.x - from.x) * 1.1, vy: 0, r: 13, age: 0, life: 0.9, hue, rolls: true })
  }

  /** A piece is on its way from a point to where the model has it: it falls, bounces once and lies still. */
  fly(piece: Clipping, from: Point, toss = 0): void {
    const box = clippingBox(piece)
    const seconds = Math.max(0.16, Math.sqrt((2 * Math.max(20, box.y - from.y)) / G))
    this.flights.set(piece, { x: from.x, y: from.y, vx: (box.x - from.x) / seconds, vy: -toss, turn: this.rng.range(-0.6, 0.6), spin: this.rng.range(-9, 9), toX: box.x, toY: box.y, bounced: false })
  }

  scissorsIn(at: Point): void {
    this.scissors.at = at
    this.scissors.inHand = true
    // They arrive open.
    this.scissors.open.x = 0.2
    this.scissors.open.v = 9
  }

  scissorsMove(at: Point): void {
    this.scissors.at = at
  }

  /** The blades close, and spring open again while they are in the hand. */
  scissorsClose(): void {
    this.scissors.open.x = 0
    this.scissors.open.v = 0
  }

  scissorsOut(): void {
    this.scissors.inHand = false
  }

  /** Nothing is moving any more: every spring is at rest and nothing is in the air. */
  get settled(): boolean {
    const still = (s: Spring, at: number): boolean => Math.abs(s.x - at) < 0.002 && Math.abs(s.v) < 0.01
    return this.held === null && this.carried === null && this.flights.size === 0 && this.puffs.length === 0 && this.later.length === 0
      && still(this.lockStretch, 1) && Math.abs(this.lockSwing.x) < 0.02 && Math.abs(this.lockSwing.v) < 0.05 && this.lockFlutter === 0 && this.tufts.every((t) => still(t.stretch, 1) && t.frizz === 0)
  }

  // --- Time -----------------------------------------------------------------

  step(dt: number, salon: Salon): void {
    let left = dt
    while (left > 1e-9) {
      const tick = Math.min(TICK, left)
      left -= tick
      this.tick(tick, salon)
    }
  }

  private tick(dt: number, salon: Salon): void {
    this.time += dt
    const due = this.later.filter((item) => item.at <= this.time)
    this.later = this.later.filter((item) => item.at > this.time)
    for (const item of due) item.run()

    // The lock: towards the finger while it is held, and a slow pendulum when it is free.
    const held = this.held
    if (held?.what === 'lock') {
      const angle = Math.atan2(held.to.x - LOCK_ROOT.x, Math.max(30, held.to.y - LOCK_ROOT.y))
      ease(this.lockSwing, Math.max(-1, Math.min(1, angle)), 320, 30, dt)
      ease(this.lockStretch, 1, 260, 24, dt)
    } else {
      // A longer lock swings more slowly.
      const length = Math.max(30, salon.lock * STEP)
      ease(this.lockSwing, 0, G / length, 1.5, dt)
      ease(this.lockStretch, 1, 230, 9, dt)
    }
    this.lockFlutter = Math.max(0, this.lockFlutter - dt / 0.7)

    this.tufts.forEach((tuft, index) => {
      const steps = salon.mane[index] ?? 0
      const pose = tuftPose(index, steps, this.tufts.length)
      // At rest it only sways a little; where it flops to is part of its pose.
      let lean = 0.03 * Math.sin(this.time * (0.7 + 0.11 * index) + index * 1.7)
      let stiffness = 70, damping = 4.2
      if (held && held.what === index) {
        const root = { x: HEAD.x + pose.base.x, y: HEAD.y + pose.base.y }
        const towards = Math.atan2(held.to.x - root.x, -(held.to.y - root.y))
        lean = Math.max(-1.1, Math.min(1.1, wrap(towards - pose.angle)))
        stiffness = 300
        damping = 28
      }
      ease(tuft.lean, lean, stiffness, damping, dt)
      ease(tuft.stretch, 1, 210, held && held.what === index ? 24 : 8.5, dt)
      tuft.frizz = Math.max(0, tuft.frizz - dt / 1.3)
    })

    for (const [piece, flight] of this.flights) {
      flight.vy += G * dt
      flight.x += flight.vx * dt
      flight.y += flight.vy * dt
      flight.turn += flight.spin * dt
      if (flight.y >= flight.toY) {
        if (flight.bounced || flight.vy < 260) { this.flights.delete(piece); continue }
        flight.bounced = true
        flight.y = flight.toY
        flight.vy *= -0.28
        flight.vx = 0
        flight.x = flight.toX
        flight.spin *= 0.3
      }
    }

    for (const puff of this.puffs) {
      puff.age += dt
      puff.x += puff.vx * dt
      puff.y += puff.vy * dt
      if (!puff.rolls) { puff.vy *= 1 - 1.6 * dt; puff.vx *= 1 - 1.2 * dt }
    }
    for (let i = this.puffs.length - 1; i >= 0; i--) if (this.puffs[i].age >= this.puffs[i].life) this.puffs.splice(i, 1)

    const s = this.scissors
    ease(s.open, 1, 520, 30, dt)
    s.shown = Math.max(0, Math.min(1, s.shown + (s.inHand ? dt : -dt) / 0.09))
  }
}

function wrap(angle: number): number {
  let a = angle
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}
