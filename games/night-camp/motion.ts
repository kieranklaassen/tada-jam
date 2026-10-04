import type { CamperFrame } from './frame'
import { seeded } from './terrain'
import type { CamperId } from './world'

// Every character moves like itself. Before any curve was written, each got a
// tempo, a weight and a funniest part, and its motion follows from those: the
// sleeper is slow and heavy and answers late, the small one is quick and
// light and bounces, the cook is brisk, the scout unhurried, the reader
// hesitant. No two share a breathing rhythm, an idle act or the shape of
// their answer to a poke, and a test holds that.
//
// Pure: numbers in, numbers out, on game time alone. The view maps the
// channels onto each figure's own parts. Nothing here asks, flashes or
// beckons: a character at idle is busy with its own affairs.

export type Mover = CamperId | 'dog' | 'frog' | 'mule'
export const MOVERS: readonly Mover[] = ['reader', 'sleeper', 'cook', 'scout', 'small', 'dog', 'frog', 'mule']

export type Personality = {
  /** Seconds for one breath. */
  readonly tempo: number
  /** 0 light to 1 heavy: how late and how slowly it answers. */
  readonly weight: number
  /** The part that is funniest when it moves. */
  readonly part: string
  /** How a breath runs over its length: a number from -1 to 1 for a phase from 0 to 1. */
  readonly breath: (phase: number) => number
  /** Its own idle act: the seconds between two of them, least and most, and how long one takes. */
  readonly idleEvery: readonly [number, number]
  readonly idleSeconds: number
  /** How the idle act swings over its length, for the acts that are one swing (a tail, an ear, a blink). A camper's act is drawn by the view from how far through it is. */
  readonly idle: (t: number) => number
  /** The answer to a poke: how long it takes, and how it runs, 0 to 1 and back to 0. */
  readonly pokeSeconds: number
  readonly poke: (t: number) => number
  /** How fast the head follows what it watches: larger is quicker. */
  readonly headSpeed: number
}

const TAU = Math.PI * 2
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
const smooth = (t: number) => { const x = clamp01(t); return x * x * (3 - 2 * x) }
/** Up from 0 to 1 by `a`, held until `b`, back down to 0 by 1. */
const rise = (t: number, a: number, b: number) => Math.min(smooth(t / a), 1 - smooth((t - b) / (1 - b)))

export const PERSONALITIES: Readonly<Record<Mover, Personality>> = {
  // Hesitant and bookish: shallow even breaths, a page turned now and then, and when poked the book comes up slowly and stays up.
  reader: {
    tempo: 3.1, weight: 0.45, part: 'the book', breath: (p) => Math.sin(p * TAU) * 0.6,
    idleEvery: [5.5, 9], idleSeconds: 0.9, idle: (t) => smooth(t),
    pokeSeconds: 1.7, poke: (t) => rise(t, 0.3, 0.72), headSpeed: 3,
  },
  // Slow and heavy: a long breath in and a quick fall, a twitch of the bobble, and a late, rolling answer that overshoots once.
  sleeper: {
    tempo: 4.6, weight: 1, part: 'the enormous bag', breath: (p) => (p < 0.7 ? -1 + 2 * smooth(p / 0.7) : 1 - 2 * smooth((p - 0.7) / 0.3)),
    idleEvery: [7, 12], idleSeconds: 0.5, idle: (t) => Math.sin(clamp01(t) * Math.PI),
    pokeSeconds: 2.3, poke: (t) => (t < 0.14 ? 0 : Math.sin(clamp01((t - 0.14) / 0.86) * Math.PI) * (1 + 0.22 * Math.sin(clamp01((t - 0.14) / 0.86) * TAU * 1.5))), headSpeed: 1.2,
  },
  // Brisk: chesty breaths with a hold, a twirl of the spoon, and a salute that snaps up and snaps down.
  cook: {
    tempo: 2.5, weight: 0.3, part: 'the pan and the moustache', breath: (p) => Math.max(-1, Math.min(1, Math.sin(p * TAU) * 1.5)),
    idleEvery: [3.5, 6], idleSeconds: 1.2, idle: (t) => clamp01(t) ** 2,
    pokeSeconds: 0.9, poke: (t) => rise(t, 0.12, 0.82), headSpeed: 6,
  },
  // Unhurried: slow even breaths, a feather in the wind, and a hat that lifts and settles with no bounce at all.
  scout: {
    tempo: 3.8, weight: 0.8, part: 'the hat', breath: (p) => Math.sin(p * TAU) * 0.8,
    idleEvery: [4.5, 8], idleSeconds: 2.2, idle: (t) => Math.sin(clamp01(t) * TAU) * 0.5 + 0.5 * Math.sin(clamp01(t) * Math.PI),
    pokeSeconds: 1.9, poke: (t) => Math.sin(clamp01(t) * Math.PI) ** 2, headSpeed: 2,
  },
  // Quick and light: fast little breaths, ears that wiggle, and an answer in three bounces, each smaller than the last.
  small: {
    tempo: 1.7, weight: 0.15, part: 'the ears of the hood', breath: (p) => Math.sin(p * TAU),
    idleEvery: [2.5, 5], idleSeconds: 0.6, idle: (t) => Math.abs(Math.sin(clamp01(t) * TAU * 1.5)) * (1 - clamp01(t)),
    pokeSeconds: 1.15, poke: (t) => Math.abs(Math.sin(clamp01(t) * Math.PI * 3)) * (1 - clamp01(t)) ** 0.8, headSpeed: 9,
  },
  // The dog: panting, a tail with a mind of its own, and one whole spin.
  dog: {
    tempo: 1.1, weight: 0.3, part: 'the tail', breath: (p) => (p % 0.5 < 0.25 ? 1 : -1) * Math.sin(p * TAU * 2) ** 2,
    idleEvery: [3, 7], idleSeconds: 0.7, idle: (t) => Math.sin(clamp01(t) * TAU * 3) * (1 - clamp01(t)),
    pokeSeconds: 0.75, poke: (t) => clamp01(t) * (1 - smooth((t - 0.9) / 0.1)), headSpeed: 8,
  },
  // The frog: a throat that swells and holds, a slow blink, and two hops: one into the pool and one back out.
  frog: {
    tempo: 2.2, weight: 0.2, part: 'the throat', breath: (p) => (p < 0.25 ? smooth(p / 0.25) : p < 0.6 ? 1 : 1 - smooth((p - 0.6) / 0.4)) * 2 - 1,
    idleEvery: [6, 11], idleSeconds: 0.3, idle: (t) => (clamp01(t) < 0.5 ? 1 : 0),
    pokeSeconds: 1.5, poke: (t) => Math.abs(Math.sin(clamp01(t) * TAU)), headSpeed: 4,
  },
  // The mule: the slowest breath of all, an ear that flicks by itself, and, after thinking about it, a bray in two heaves.
  mule: {
    tempo: 5.4, weight: 0.9, part: 'the ears', breath: (p) => Math.sin(p * TAU) * 0.5,
    idleEvery: [4, 9], idleSeconds: 0.45, idle: (t) => Math.sin(clamp01(t) * Math.PI) ** 0.5,
    pokeSeconds: 1.55, poke: (t) => Math.max(Math.sin(clamp01((t - 0.2) / 0.4) * Math.PI) * 0.7, Math.sin(clamp01((t - 0.55) / 0.45) * Math.PI)), headSpeed: 1.5,
  },
}

type Acting = { idleStart: number; idleNext: number; idleSize: number; pokedAt: number; head: number; watch: number; watchUntil: number; phase: number }

/**
 * Runs the cast on game time. Idle acts come at seeded moments of each
 * character's own, never in step with another's, and two in a row are never
 * the same size. A poke starts the character's own answer at once and cannot
 * be queued: a poke during an answer starts it again from the top.
 */
export class Cast {
  private readonly acting: Record<Mover, Acting>
  private readonly next: () => number
  private now = 0

  constructor(seed: number) {
    this.next = seeded(seed)
    const make = (who: Mover): Acting => {
      const [least, most] = PERSONALITIES[who].idleEvery
      return { idleStart: -Infinity, idleNext: least * 0.4 + this.next() * most, idleSize: 1, pokedAt: -Infinity, head: 0, watch: 0, watchUntil: -Infinity, phase: this.next() }
    }
    this.acting = { reader: make('reader'), sleeper: make('sleeper'), cook: make('cook'), scout: make('scout'), small: make('small'), dog: make('dog'), frog: make('frog'), mule: make('mule') }
  }

  /** A finger landed on this character. */
  poke(who: Mover): void {
    this.acting[who].pokedAt = this.now
  }

  /** Whether a character is in the middle of its answer to a poke. */
  busy(who: Mover): boolean {
    return this.now - this.acting[who].pokedAt < PERSONALITIES[who].pokeSeconds
  }

  /** Turn a character's head by an angle, in radians, for so many seconds. The heavy ones get round to it late. */
  watch(who: Mover, angle: number, seconds: number): void {
    const acting = this.acting[who]
    acting.watch = angle
    acting.watchUntil = this.now + seconds
  }

  /** Advance by a step of game time, in seconds. */
  step(dt: number): void {
    this.now += dt
    for (const who of MOVERS) {
      const acting = this.acting[who], own = PERSONALITIES[who]
      if (this.now >= acting.idleNext) {
        acting.idleStart = this.now
        const [least, most] = own.idleEvery
        acting.idleNext = this.now + own.idleSeconds + least + this.next() * (most - least)
        // Two acts in a row are never the same size: a full one is followed by a smaller one, and the other way round.
        acting.idleSize = acting.idleSize > 0.8 ? 0.55 + this.next() * 0.2 : 0.9 + this.next() * 0.1
      }
      const target = this.now < acting.watchUntil ? acting.watch : 0
      acting.head += (target - acting.head) * (1 - Math.exp(-own.headSpeed * dt))
    }
  }

  /** -1 to 1: where a character is in its breath. */
  breath(who: Mover): number {
    const own = PERSONALITIES[who]
    return own.breath((this.now / own.tempo + this.acting[who].phase) % 1)
  }

  /** How far through its idle act a character is, from 0 to 1; 0 between acts. A smaller act is a shorter one. */
  idleProgress(who: Mover): number {
    const own = PERSONALITIES[who], acting = this.acting[who], t = (this.now - acting.idleStart) / (own.idleSeconds * acting.idleSize)
    return t > 0 && t < 1 ? t : 0
  }

  /** The idle act as one swing, shaped the character's own way; 0 between acts. */
  idle(who: Mover): number {
    const t = this.idleProgress(who)
    return t > 0 ? PERSONALITIES[who].idle(t) * this.acting[who].idleSize : 0
  }

  /** 0 to 1: the answer to a poke, shaped its own way; 0 when there is none. */
  poked(who: Mover): number {
    const own = PERSONALITIES[who], t = (this.now - this.acting[who].pokedAt) / own.pokeSeconds
    return t >= 0 && t < 1 ? own.poke(t) : 0
  }

  /** How far through its answer a character is, 0 to 1, or 1 when there is none: for an answer that travels, like a hop or a spin. */
  pokeProgress(who: Mover): number {
    const t = (this.now - this.acting[who].pokedAt) / PERSONALITIES[who].pokeSeconds
    return t >= 0 && t < 1 ? t : 1
  }

  head(who: Mover): number {
    return this.acting[who].head
  }

  camper(who: CamperId): CamperFrame {
    return { breath: this.breath(who), head: this.head(who), idle: this.idleProgress(who), poke: this.poked(who) }
  }
}
