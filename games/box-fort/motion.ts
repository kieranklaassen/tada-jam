import { below, type Rng } from './rng'

// How the three people of the house move, as plain numbers the view lays on
// their cardboard parts. Each has its own tempo, weight and funniest part,
// and no two share a curve:
// - the cat moves in quick starts and long holds; its head leads, its tail lags;
// - the baby moves all at once and overshoots, rocking back to rest;
// - the grandmother moves slowly from the head down, and her hands never stop.
// Time is the game's clock in seconds. An age is the seconds since a kick,
// and is very large for a kick that never came.

const clamp01 = (t: number): number => Math.min(1, Math.max(0, t))
/** Rises and falls once over `length` seconds: 0 outside. */
const pulse = (age: number, length: number): number => (age <= 0 || age >= length ? 0 : Math.sin((age / length) * Math.PI))
/** A wobble that dies away. */
const ring = (age: number, hertz: number, fade: number): number => (age < 0 || age > 6 / fade ? 0 : Math.sin(age * hertz * Math.PI * 2) * Math.exp(-age * fade))
/** The cat's way of getting somewhere: nearly there at once, then a long hold. */
const snap = (t: number): number => 1 - (1 - clamp01(t)) ** 4
/** The grandmother's way: slow to start and slow to stop. */
const ease = (t: number): number => { const c = clamp01(t); return c * c * (3 - 2 * c) }
/** The baby's way: past the mark and back. */
const fling = (t: number): number => { const c = clamp01(t); return 1 - Math.cos(c * Math.PI * 2.5) * (1 - c) }
/** Eyes shut for a moment, every `every` seconds. */
const blink = (time: number, every: number, offset: number): number => pulse(((time + offset) % every) - (every - 0.16), 0.16)

/** Picks what a character does next while nobody touches anything: one variant, a rest, another, never the same twice running. */
export class Director<V extends string> {
  current: V | null = null
  private from = 0
  private until: number
  private last: V | null = null

  constructor(private readonly variants: readonly V[], private readonly lasts: Record<V, number>, private readonly rest: readonly [number, number], private readonly rng: Rng, first: number) {
    this.until = first
  }

  /** How far through the current variant the character is, 0 to 1; 0 while it rests. */
  update(time: number): number {
    if (time >= this.until) {
      if (this.current === null) {
        const others = this.variants.filter((variant) => variant !== this.last)
        this.current = others[below(this.rng, others.length)]
        this.last = this.current
        this.from = time
        this.until = time + this.lasts[this.current]
      } else {
        this.current = null
        this.until = time + this.rest[0] + this.rng.next() * (this.rest[1] - this.rest[0])
      }
    }
    return this.current === null ? 0 : clamp01((time - this.from) / (this.until - this.from))
  }
}

// --- The cat ----------------------------------------------------------------

export const CAT_IDLES = ['flick', 'twitch', 'wash', 'yawn'] as const
export type CatIdle = (typeof CAT_IDLES)[number]
export const CAT_LASTS: Record<CatIdle, number> = { flick: 1.1, twitch: 0.7, wash: 2.6, yawn: 1.8 }
export const CAT_REST = [2.2, 4.5] as const

/** Where the cat is being shown: a stage of what it is doing (toy.ts, acts.ts). */
export type CatStage = string
/** How much of the cat a hole lets through. */
export type CatFit = 'eye' | 'paw' | 'head' | 'body'

export type CatIn = {
  time: number
  idle: CatIdle | null
  /** 0 to 1 through the idle variant. */
  idleAt: number
  stage: CatStage
  /** 0 to 1 through that stage. */
  p: number
  fit: CatFit
  /** Seconds since it was touched, since it showed at a hole, and since its paw last patted. */
  tapped: number
  shown: number
  patted: number
  /** 0 to 1: how closely it watches the blades. */
  watching: number
}

export type CatPose = {
  /** 0 on top of the box, 1 gone behind it. */
  drop: number
  /** 0 hidden inside, 1 at the hole. */
  out: number
  squash: number
  headRoll: number
  headDip: number
  /** 1 upright, below 1 laid flat, above 1 sprung. */
  ears: number
  earTurn: number
  tail: number
  /** 0 down, 1 at its face. */
  paw: number
  /** The paw that reaches through a hole: 0 inside, 1 out. */
  reach: number
  pat: number
  blink: number
  /** 0 shut, 1 mewing, 2 yawning. */
  mouth: 0 | 1 | 2
}

export function catPose(input: CatIn, out: CatPose): CatPose {
  const { time, idle, idleAt, stage, p, fit, tapped, shown, patted, watching } = input
  const resting = stage === 'top' && watching < 0.3
  const flick = resting && idle === 'flick' ? pulse(idleAt, 0.22) + pulse(idleAt - 0.45, 0.22) : 0
  const wash = resting && idle === 'wash' ? snap(idleAt * 6) * (1 - snap((idleAt - 0.82) * 6)) : 0
  const yawn = resting && idle === 'yawn' ? pulse(idleAt, 1) : 0
  out.drop = stage === 'drop' ? snap(p * 1.4) : stage === 'up' ? 1 - snap(p * 1.4) : stage === 'top' || stage === 'prick' ? 0 : 1
  out.out = stage === 'rise' ? snap(p) : stage === 'look' ? 1 : stage === 'back' ? 1 - snap(p) : 0
  out.squash = Math.sin(time * 1.3) * 0.012 + (stage === 'up' ? -pulse(p - 0.7, 0.3) * 0.12 : 0) + pulse(tapped, 0.3) * 0.06
  out.headRoll = wash * 0.25 + Math.sin(time * 0.45) * 0.03 * (1 - watching) + pulse(tapped, 0.5) * 0.28 + (stage === 'look' ? Math.sin(time * 0.8) * 0.05 : 0)
  out.headDip = wash * 0.07 + Math.sin(idleAt * 40) * wash * 0.012 - yawn * 0.04 + (stage === 'prick' ? -snap(p * 2) * 0.03 : 0)
  // Through a hole the ears lie flat, and spring up once the head is out.
  const sprung = fit === 'head' && stage === 'look' ? 1 + ring(shown, 5, 5) * 0.5 : 1
  out.ears = stage === 'rise' && fit === 'head' ? 1 - 0.75 * pulse(p * 0.9, 0.9) : stage === 'prick' ? 1 + snap(p * 3) * 0.18 : sprung + watching * 0.1
  out.earTurn = resting && idle === 'twitch' ? ring(idleAt * CAT_LASTS.twitch, 9, 6) * 0.35 : 0
  out.tail = Math.sin(time * 0.7) * 0.14 + flick * 0.55 + watching * Math.sin(time * 5.5) * 0.16
  out.paw = Math.max(wash, pulse(tapped, 0.45) * 0.7)
  out.reach = fit === 'paw' ? (stage === 'look' ? 1 : stage === 'rise' ? snap(p * 1.2 - 0.3) : stage === 'back' ? 1 - snap(p * 2) : 0) : 0
  out.pat = pulse(patted, 0.22)
  out.blink = Math.max(blink(time, 4.3, 0), yawn > 0.3 ? 1 : 0, stage === 'look' && fit === 'eye' ? pulse(shown - 1.9, 0.2) : 0)
  out.mouth = yawn > 0.25 ? 2 : pulse(tapped, 0.4) > 0 || (stage === 'look' && fit === 'head' && shown < 0.5) ? 1 : 0
  return out
}

// --- The baby ---------------------------------------------------------------

export const BABY_IDLES = ['rock', 'kick', 'gum', 'crane'] as const
export type BabyIdle = (typeof BABY_IDLES)[number]
export const BABY_LASTS: Record<BabyIdle, number> = { rock: 2.4, kick: 1.5, gum: 2.2, crane: 1.9 }
export const BABY_REST = [1.2, 2.8] as const

export type BabyIn = { time: number; idle: BabyIdle | null; idleAt: number; tapped: number; squealed: number; watching: number }

export type BabyPose = {
  rock: number
  bounce: number
  armL: number
  armR: number
  kick: number
  /** 0 to 1: the rattle brought to the mouth. */
  gum: number
  headTilt: number
  blink: number
  /** 0 smiling, 1 wide open, 2 a small round o. */
  mouth: 0 | 1 | 2
}

export function babyPose(input: BabyIn, out: BabyPose): BabyPose {
  const { time, idle, idleAt, tapped, squealed, watching } = input
  const calm = watching < 0.3 && squealed > 1.2 && tapped > 0.8
  const rock = calm && idle === 'rock' ? Math.sin(idleAt * Math.PI * 4) * pulse(idleAt, 1) : 0
  const kick = calm && idle === 'kick' ? Math.sin(idleAt * Math.PI * 6) * pulse(idleAt, 1) : 0
  const gum = calm && idle === 'gum' ? fling(idleAt * 3) * (1 - clamp01((idleAt - 0.8) * 5)) : 0
  const crane = calm && idle === 'crane' ? fling(idleAt * 2.5) * (1 - clamp01((idleAt - 0.75) * 4)) : 0
  const squeal = squealed < 1.1 ? fling(squealed * 2.2) * (1 - clamp01((squealed - 0.7) * 2.5)) : 0
  out.rock = rock * 0.1 + ring(tapped, 3.2, 3.5) * 0.07 + crane * 0.06
  out.gum = gum
  out.bounce = Math.abs(Math.sin(time * 2.1)) * 0.012 + squeal * 0.09 + pulse(tapped, 0.25) * 0.05
  // The rattle is in the arm away from the fort, which stays down. In a squeal the other arm points: up and towards the fort, steeply enough that it lies across no face.
  out.armL = Math.min(2.4, squeal * 0.3 + ring(tapped, 9, 4) * 0.7 + Math.sin(time * 1.9 + 1) * 0.05)
  out.armR = Math.min(2.4, squeal * 2.2 + Math.sin(time * 1.7) * 0.05 + watching * 0.2)
  out.kick = kick * 0.5 + squeal * Math.sin(time * 30) * 0.25
  out.headTilt = crane * 0.3 + rock * 0.1 + Math.sin(time * 0.9) * 0.04
  out.blink = blink(time, 3.1, 1.3)
  out.mouth = squeal > 0.15 ? 1 : gum > 0.5 || watching > 0.6 ? 2 : 0
  return out
}

// --- The grandmother --------------------------------------------------------

export const GRAN_IDLES = ['nod', 'peer', 'slip', 'hum'] as const
export type GranIdle = (typeof GRAN_IDLES)[number]
export const GRAN_LASTS: Record<GranIdle, number> = { nod: 4.2, peer: 3, slip: 3.4, hum: 2.8 }
export const GRAN_REST = [3, 6] as const

export type GranIn = { time: number; idle: GranIdle | null; idleAt: number; tapped: number; startled: number; watching: number }

export type GranPose = {
  /** Forward, towards the fort; below 0 is back into the chair. */
  lean: number
  headNod: number
  headTilt: number
  /** How far the glasses have slid or jumped: above 0 is up. */
  glasses: number
  brow: number
  needleL: number
  needleR: number
  blink: number
  /** 0 a flat smile, 1 a round o, 2 humming. */
  mouth: 0 | 1 | 2
}

export function granPose(input: GranIn, out: GranPose): GranPose {
  const { time, idle, idleAt, tapped, startled, watching } = input
  const calm = watching < 0.3 && startled > 1.6
  // She nods off slowly and comes up with a jerk.
  const nod = calm && idle === 'nod' ? (idleAt < 0.8 ? ease(idleAt / 0.8) : 1 - snap((idleAt - 0.8) * 12)) : 0
  const peer = calm && idle === 'peer' ? ease(idleAt * 3) * (1 - ease((idleAt - 0.7) * 3.3)) : 0
  const slip = calm && idle === 'slip' ? (idleAt < 0.75 ? ease(idleAt / 0.75) : 1 - snap((idleAt - 0.75) * 10)) : 0
  const hum = calm && idle === 'hum' ? pulse(idleAt, 1) : 0
  const start = startled < 1.4 ? 1 - ease(startled / 1.4) : 0
  // The hands slow down while she sleeps and race when she is touched.
  const speed = 3 * (1 - nod * 0.8) + pulse(tapped, 0.5) * 22
  out.lean = peer * 0.16 + watching * 0.1 - start * 0.07 - nod * 0.03
  out.headNod = nod * 0.32 + peer * 0.08 - start * 0.06
  out.headTilt = hum * Math.sin(idleAt * Math.PI * 6) * 0.09 + Math.sin(time * 0.35) * 0.015
  out.glasses = -slip * 0.07 + (startled < 0.9 ? Math.abs(ring(startled, 2.6, 3.2)) * 0.2 : 0)
  out.brow = start * 0.9 + peer * 0.5 + watching * 0.3
  out.needleL = Math.sin(time * speed) * 0.22
  out.needleR = Math.sin(time * speed + 2.1) * 0.22
  out.blink = Math.max(blink(time, 5.2, 2.7), nod > 0.55 ? 1 : 0)
  out.mouth = start > 0.3 ? 1 : hum > 0.1 || pulse(tapped, 0.5) > 0 ? 2 : 0
  return out
}
