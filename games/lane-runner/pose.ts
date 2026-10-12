import type { Figure } from './figures'
import { makeRng, type Rng } from './rng'

// What a motion hands the view: a `Pose` of plain numbers for one figure, and
// the three small tools every motion is made of. Plaques are stiff: a figure
// bends only at its joints, gives a little as a whole when it lands, and
// turns only in its own plane or about its upright, so every plaque always
// stands facing the child or lies flat on the board.

export type PartPose = {
  /** Pegs the joint is moved from its place at rest, and radians the plaque is turned beyond its turn at rest. */
  dx: number
  dy: number
  turn: number
  show: boolean
}

export class Pose {
  /** Pegs the whole figure is moved from where it stands: to the right, up, and along the trail. */
  x = 0
  y = 0
  s = 0
  /** Radians the figure is turned about its upright, like a card: 0 faces the child, half a turn shows its back. */
  spin = 0
  /** Radians it leans or wheels in its own plane, about its middle. */
  tilt = 0
  /** Drawn the other way round, left for right. */
  flip = false
  /** How much it gives: 1 is its own size. */
  sx = 1
  sy = 1
  /** Where the eyes look, -1 to 1 each way, and whether they are shut. */
  lookX = 0
  lookY = 0
  shut = false
  readonly parts: Record<string, PartPose> = {}
  private readonly figure: Figure

  constructor(figure: Figure) {
    this.figure = figure
    for (const part of figure.parts) this.parts[part.name] = { dx: 0, dy: 0, turn: 0, show: !part.hidden }
  }

  /** Back to standing at rest, with only the parts that show at rest. */
  clear(): void {
    this.x = this.y = this.s = this.spin = this.tilt = this.lookX = this.lookY = 0
    this.sx = this.sy = 1
    this.shut = this.flip = false
    for (const part of this.figure.parts) {
      const at = this.parts[part.name]
      at.dx = at.dy = at.turn = 0
      at.show = !part.hidden
    }
  }
}

/** A weight on a spring: pulled to where it should be, it overshoots and settles. A kick sets it off. */
export class Spring {
  at = 0
  speed = 0
  private readonly stiffness: number
  private readonly damping: number

  constructor(stiffness: number, damping: number) {
    this.stiffness = stiffness
    this.damping = damping
  }

  step(seconds: number, to = 0): number {
    // Small steps, so a stiff spring stays steady on a long frame.
    let left = seconds
    while (left > 0) {
      const h = Math.min(left, 1 / 240)
      this.speed += ((to - this.at) * this.stiffness - this.speed * this.damping) * h
      this.at += this.speed * h
      left -= h
    }
    return this.at
  }

  /** Sets it swinging: `by` is about how far it would swing out with nothing to slow it, so a kick is written in the same measure the spring is read in. */
  kick(by: number): void {
    this.speed += by * Math.sqrt(this.stiffness)
  }
}

/** Something that comes round now and then: a blink, a glance, a dip of the neck. Each has its own stream of chance. */
export class Now {
  private next: number
  private readonly rng: Rng
  private readonly from: number
  private readonly to: number

  constructor(seed: number, from: number, to: number) {
    this.rng = makeRng(seed)
    this.from = from
    this.to = to
    this.next = from + this.rng.next() * (to - from)
  }

  /** Whether it has come round; if so, the next one is set. */
  due(t: number): boolean {
    if (t < this.next) return false
    this.next = t + this.from + this.rng.next() * (this.to - this.from)
    return true
  }

  roll(): number {
    return this.rng.next()
  }
}

/** Something that lasts a while: `left` seconds of it. */
export class Spell {
  left = 0
  private length = 1

  start(seconds: number): void {
    this.left = seconds
    this.length = seconds
  }

  stop(): void {
    this.left = 0
  }

  /** Runs down by `seconds`, and returns how far through it is, 0 to 1, or -1 when it is over. */
  step(seconds: number): number {
    if (this.left <= 0) return -1
    this.left = Math.max(0, this.left - seconds)
    return 1 - this.left / this.length
  }

  get on(): boolean {
    return this.left > 0
  }
}

export const TAU = Math.PI * 2
export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))
export const ease = (t: number): number => t * t * (3 - 2 * t)
/** 0 up to 1 and back to 0 over `p` from 0 to 1. */
export const arc = (p: number): number => Math.sin(Math.PI * clamp(p, 0, 1))
