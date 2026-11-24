import { makeRng, type Rng } from './rng'
import type { Kind } from './things'

// How each character moves. Each has a tempo, a weight and a funniest part of
// its own, ways of being poked that no other has, and a way of being in the
// soup, the bath and the bed. The module returns numbers; the figures map them
// onto what is drawn.

export type Pose = {
  /** Up from the floor, in units. */
  lift: number
  /** 1 is at rest; below is squashed flat and wide. */
  squash: number
  lean: number
  /** Head tilt, and how far the head is up out of the collar. */
  tilt: number
  neck: number
  /** 0 shut, 1 open. */
  eyes: number
  /** 0 shut, 1 wide open. */
  mouth: number
  /** Up is surprised, down is cross. */
  brow: number
  /** The funniest part of this one: belly, neck, shoulders, tail, comb, ears. */
  part: number
}

export const REST: Readonly<Pose> = { lift: 0, squash: 1, lean: 0, tilt: 0, neck: 0, eyes: 1, mouth: 0, brow: 0, part: 0 }

type Curve = (p: number, pose: Pose) => void
const hump = (p: number) => Math.sin(Math.PI * Math.min(1, Math.max(0, p)))
const shake = (p: number, times: number) => Math.sin(p * Math.PI * 2 * times) * (1 - p)

export type Personality = {
  /** Breaths a minute over ten, and how deep. */
  breath: number
  depth: number
  /** Seconds between blinks, from and to. */
  blink: readonly [number, number]
  /** How quickly the eyes come round. */
  look: number
  idle: Curve
  pokes: readonly { name: string; seconds: number; curve: Curve }[]
  /** In the soup, in the bath and in bed, over seconds. */
  soup: (t: number, pose: Pose) => void
  bath: (t: number, pose: Pose) => void
  bed: (t: number, pose: Pose) => void
}

export type Character = Exclude<Kind, 'sock' | 'hat' | 'teapot'>

export const PERSONALITIES: Readonly<Record<Character, Personality>> = {
  butler: {
    breath: 2.2, depth: 0.012, blink: [2.4, 5], look: 9,
    idle: (p, o) => { o.lift += Math.abs(Math.sin(p * 2.6)) * 7; o.brow += 0.3 + Math.sin(p * 1.3) * 0.2; o.part += Math.sin(p * 2.6) },
    pokes: [
      { name: 'bow', seconds: 0.9, curve: (p, o) => { o.lean += hump(p) * 0.34; o.squash -= hump(p) * 0.06; o.brow += hump(p) } },
      { name: 'heels', seconds: 0.7, curve: (p, o) => { o.lift += Math.abs(Math.sin(p * Math.PI * 2)) * 26; o.mouth += hump(p) * 0.6 } },
      { name: 'tie', seconds: 0.8, curve: (p, o) => { o.neck += shake(p, 3) * 10; o.tilt += shake(p, 2) * 0.2; o.part += hump(p) * 2 } },
    ],
    soup: (t, o) => { o.lift += Math.sin(t * 2) * 3; o.brow += 0.6; o.mouth += 0.2; o.part += 1.5 },
    bath: (t, o) => { o.lift += Math.abs(Math.sin(t * 3.4)) * 12; o.mouth += 0.4; o.brow += 0.4 },
    bed: (t, o) => { o.eyes = 0.04; o.squash += Math.sin(t * 1.2) * 0.02; o.brow -= 0.2 },
  },
  king: {
    breath: 1.1, depth: 0.03, blink: [3.6, 7], look: 2.6,
    idle: (p, o) => { o.part += Math.sin(p * 1.1) * 0.6; o.tilt += Math.sin(p * 0.7) * 0.02; o.brow -= 0.2 },
    pokes: [
      { name: 'belly', seconds: 1.1, curve: (p, o) => { o.part += shake(p, 4) * 2.2; o.squash += shake(p, 4) * 0.05; o.brow -= hump(p) } },
      { name: 'harrumph', seconds: 1, curve: (p, o) => { o.squash += hump(p) * 0.08; o.neck -= hump(p) * 10; o.mouth += hump(p * 1.4); o.lean -= hump(p) * 0.06 } },
      { name: 'crown', seconds: 0.9, curve: (p, o) => { o.neck += hump(p) * 24; o.eyes += hump(p) * 0.4; o.brow += hump(p) * 1.2 } },
    ],
    soup: (t, o) => { o.lift += Math.sin(t * 1.3) * 5; o.lean += Math.sin(t * 0.9) * 0.06; o.brow -= 0.9; o.mouth += 0.15 + Math.max(0, Math.sin(t * 1.9)) * 0.4; o.part += Math.sin(t * 2.6) },
    bath: (t, o) => { o.mouth += 0.5 + Math.sin(t * 3) * 0.4; o.tilt += Math.sin(t * 1.5) * 0.14; o.brow += 0.6; o.eyes = 0.2 },
    bed: (t, o) => { o.eyes = 0; o.squash += Math.sin(t * 0.9) * 0.07; o.mouth += Math.max(0, Math.sin(t * 0.9)) * 0.7; o.part += Math.sin(t * 0.9) * 2 },
  },
  queen: {
    breath: 2.8, depth: 0.008, blink: [1.6, 3.4], look: 11,
    idle: (p, o) => { o.neck += Math.sin(p * 1.9) * 4; o.tilt += Math.sin(p * 0.6) * 0.05; o.part += Math.sin(p * 2.2) * 0.4 },
    pokes: [
      { name: 'neck', seconds: 0.8, curve: (p, o) => { o.neck += hump(p) * 40; o.eyes += hump(p) * 0.5; o.brow += hump(p) * 1.4 } },
      { name: 'recoil', seconds: 0.7, curve: (p, o) => { o.lean += hump(p) * 0.2; o.mouth += hump(p) * 0.9; o.squash += hump(p) * 0.05 } },
      { name: 'sniff', seconds: 0.9, curve: (p, o) => { o.tilt -= hump(p) * 0.26; o.eyes -= hump(p) * 0.8; o.neck += shake(p, 5) * 4 } },
    ],
    soup: (t, o) => { const taste = t % 4.4 > 3.2; o.brow += taste ? 0.1 : 1; o.mouth += taste ? 0.12 : 0.8; o.neck += taste ? -14 : 16 + Math.sin(t * 22) * 2; o.eyes = taste ? 0.3 : 1.3 },
    bath: (t, o) => { o.neck += 26 + Math.sin(t * 2) * 5; o.lean += Math.sin(t * 2) * 0.05; o.mouth += 0.35; o.brow += 1.1 },
    bed: (t, o) => { o.eyes = 0; o.neck += Math.sin(t * 1.6) * 8; o.mouth += Math.max(0, Math.sin(t * 1.6 + 1)) * 0.25; o.tilt += 0.16 },
  },
  gran: {
    breath: 1.9, depth: 0.018, blink: [2.8, 6], look: 5,
    idle: (p, o) => { o.part += Math.max(0, Math.sin(p * 0.9)) * 0.6; o.tilt += Math.sin(p * 1.2) * 0.07; o.mouth += 0.12 },
    pokes: [
      { name: 'cackle', seconds: 1.1, curve: (p, o) => { o.part += Math.abs(Math.sin(p * Math.PI * 6)) * 1.6 * (1 - p * 0.4); o.mouth += hump(p) * 1.1; o.eyes -= hump(p) * 0.9 } },
      { name: 'swat', seconds: 0.6, curve: (p, o) => { o.lean += shake(p, 1) * 0.28; o.brow -= hump(p) * 0.6; o.lift += hump(p) * 10 } },
      { name: 'pop-up', seconds: 0.8, curve: (p, o) => { o.lift += hump(p) * 34; o.eyes += hump(p) * 0.5; o.mouth += hump(p) * 0.5 } },
    ],
    soup: (t, o) => { o.part += Math.abs(Math.sin(t * 7)) * 1.2; o.mouth += 0.9; o.eyes = 0.15; o.lift += Math.abs(Math.sin(t * 3.5)) * 6 },
    bath: (t, o) => { o.lift += Math.sin(t * 2.4) * 9; o.mouth += 0.4 + Math.sin(t * 5) * 0.3; o.tilt += Math.sin(t * 2.4) * 0.2 },
    bed: (t, o) => { const giggle = t % 3.4 > 2.4; o.eyes = giggle ? 0.5 : 0; o.mouth += giggle ? 0.6 : 0.1; o.part += giggle ? Math.abs(Math.sin(t * 16)) : 0 },
  },
  cat: {
    breath: 1.5, depth: 0.014, blink: [4, 8], look: 3.6,
    idle: (p, o) => { o.part += Math.sin(p * 0.9) + Math.max(0, Math.sin(p * 2.3)) * 0.5; o.eyes -= 0.35 },
    pokes: [
      { name: 'arch', seconds: 0.9, curve: (p, o) => { o.squash += hump(p) * 0.22; o.part += hump(p) * 2; o.eyes += hump(p) * 0.6 } },
      { name: 'turn-away', seconds: 1, curve: (p, o) => { o.tilt += hump(p) * 0.5; o.eyes -= hump(p) } },
      { name: 'hiss', seconds: 0.6, curve: (p, o) => { o.mouth += hump(p); o.lean -= hump(p) * 0.14; o.brow -= hump(p) } },
    ],
    soup: (t, o) => { o.lift += Math.abs(Math.sin(t * 6)) * 7; o.mouth += 0.7; o.brow -= 1; o.part += Math.sin(t * 8) },
    bath: (t, o) => { o.squash -= 0.14; o.brow -= 1; o.eyes = 0.5; o.part -= 1.6; o.lean += Math.sin(t * 0.6) * 0.03 },
    bed: (t, o) => { o.eyes = 0; o.squash -= 0.2 + Math.sin(t) * 0.03; o.part += Math.sin(t * 0.5) * 0.4 },
  },
  hen: {
    breath: 4, depth: 0.02, blink: [0.9, 2.2], look: 16,
    idle: (p, o) => { const peck = p % 3.1; o.tilt += Math.round(Math.sin(p * 2.1) * 2) * 0.12; o.lean += peck < 0.3 ? hump(peck / 0.3) * 0.3 : 0; o.part += Math.sin(p * 5) * 0.3 },
    pokes: [
      { name: 'flap', seconds: 0.7, curve: (p, o) => { o.lift += hump(p) * 30; o.part += Math.sin(p * 40) * 1.6; o.mouth += hump(p) } },
      { name: 'freeze', seconds: 0.9, curve: (p, o) => { o.eyes += hump(p) * 0.7; o.neck += hump(p) * 14; o.squash += hump(p) * 0.12 } },
      { name: 'spin', seconds: 0.6, curve: (p, o) => { o.lean += shake(p, 3) * 0.3; o.brow += hump(p) } },
    ],
    soup: (t, o) => { o.tilt += Math.round(Math.sin(t * 5)) * 0.2; o.mouth += t % 0.5 < 0.2 ? 0.9 : 0; o.part += Math.sin(t * 14); o.eyes = 1.4 },
    bath: (t, o) => { o.squash += 0.12 + Math.sin(t * 3) * 0.04; o.part += 1.5; o.eyes = 1.2 },
    bed: (t, o) => { o.eyes = t % 2.8 > 2.5 ? 1 : 0; o.squash -= 0.1; o.neck -= 8; o.part += Math.sin(t * 2) * 0.2 },
  },
  piglet: {
    breath: 3, depth: 0.026, blink: [2, 4], look: 8,
    idle: (p, o) => { o.lift += Math.max(0, Math.sin(p * 3.6)) * 5; o.part += Math.sin(p * 3.6); o.mouth += 0.25 },
    pokes: [
      { name: 'bounce', seconds: 0.9, curve: (p, o) => { o.lift += Math.abs(Math.sin(p * Math.PI * 3)) * 26 * (1 - p); o.squash += shake(p, 3) * 0.16 } },
      { name: 'wriggle', seconds: 0.8, curve: (p, o) => { o.lean += shake(p, 5) * 0.2; o.part += shake(p, 5) * 2; o.mouth += hump(p) * 0.6 } },
      { name: 'flop', seconds: 1, curve: (p, o) => { o.squash -= hump(p) * 0.26; o.eyes -= hump(p) * 0.8; o.mouth += hump(p) * 0.4 } },
    ],
    soup: (t, o) => { o.lean += Math.sin(t * 4.4) * 0.12; o.mouth += 0.5; o.part += Math.sin(t * 9); o.eyes = 0.3 },
    bath: (t, o) => { o.lift += Math.abs(Math.sin(t * 4.6)) * 14; o.mouth += 0.7; o.part += Math.sin(t * 4.6) * 1.6 },
    bed: (t, o) => { o.eyes = 0; o.squash += Math.sin(t * 2.2) * 0.06; o.part += Math.sin(t * 2.2) * 0.8; o.lean += 0.1 },
  },
}

/** One character's motion: idle, blinks and pokes, without a variant twice running. */
export class Mover {
  private readonly rng: Rng
  private readonly self: Personality
  private time: number
  private blinkAt: number
  private poke: { at: number; variant: number } | null = null
  private last = -1
  readonly pose: Pose = { ...REST }

  constructor(readonly kind: Character, seed: number) {
    this.self = PERSONALITIES[kind]
    this.rng = makeRng(seed)
    this.time = this.rng.next() * 10
    this.blinkAt = this.time + this.self.blink[0]
  }

  get look(): number {
    return this.self.look
  }

  /** Returns which variant, so the voice can follow it. */
  touch(): number {
    const count = this.self.pokes.length
    let variant = Math.floor(this.rng.next() * count)
    if (variant === this.last) variant = (variant + 1) % count
    this.last = variant
    this.poke = { at: this.time, variant }
    return variant
  }

  update(step: number, where: 'home' | 'soup' | 'bath' | 'bed'): Pose {
    this.time += step
    const pose = Object.assign(this.pose, REST), self = this.self
    pose.squash += Math.sin(this.time * self.breath) * self.depth
    if (where === 'home') self.idle(this.time, pose)
    else self[where](this.time, pose)
    if (this.poke) {
      const { seconds, curve } = self.pokes[this.poke.variant]
      const p = (this.time - this.poke.at) / seconds
      if (p >= 1) this.poke = null
      else curve(p, pose)
    }
    if (this.time > this.blinkAt) {
      const into = this.time - this.blinkAt
      pose.eyes *= Math.abs(into - 0.07) / 0.07
      if (into > 0.14) this.blinkAt = this.time + self.blink[0] + this.rng.next() * (self.blink[1] - self.blink[0])
    }
    pose.eyes = Math.min(1.6, Math.max(0, pose.eyes))
    pose.mouth = Math.min(1.2, Math.max(0, pose.mouth))
    return pose
  }
}

/** A spring: where it is, and how fast it is going. */
export type Spring = { x: number; v: number }
export function springTo(spring: Spring, to: number, stiffness: number, damping: number, step: number): void {
  // Small fixed steps, so a slow frame does not shake the spring apart.
  for (let left = step; left > 0; left -= 1 / 120) {
    const dt = Math.min(left, 1 / 120)
    spring.v += (stiffness * (to - spring.x) - damping * spring.v) * dt
    spring.x += spring.v * dt
  }
}
