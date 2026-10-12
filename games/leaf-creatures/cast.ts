import { CAST, FERN, HEAPS, type CastId } from './clearing'
import type { Kind } from './parts'
import type { Rng } from './rng'
import { count, wayOf, type Thing } from './things'

// The three who are always in the frame, as plain numbers: the two wind
// children in the tree tops, holding their breath, and the toad on its stump,
// nodding off. Each moves like itself: the big child fills slowly and leaks,
// the small one copies it a beat late and in a hurry and stirs the air with
// an open hand, round and round, and the toad only ever sinks and starts. Each has fixed
// tastes about what wakes on the earth, and none of them has any about the
// child. The view draws these numbers; nothing here draws.

export type Wind = {
  /** Where the eyes point, each from -1 to 1, eased. */
  lookX: number
  lookY: number
  /** How full the cheeks are: about 0.7 breathed out, over 1 fit to burst. */
  puff: number
  /** 0 to 1: how hard it is blowing right now. */
  blow: number
  /** Seconds of blowing still to come, and seconds before it begins. */
  blowLeft: number
  blowIn: number
  /** 0 open, 1 shut. */
  blink: number
  nextBlink: number
  /** 0 to 1: how red it is with straining at something heavy. */
  strain: number
  /** 0 to 1: its hands are over its eyes; `peek` sinks them until the eyes show over them. */
  hide: number
  peek: number
  /** The whole child turned round itself, in radians: the small one's own spin at the sight of a roller. */
  whirl: number
  /** The hand it stirs the air with, in turns: only the small one's ever moves. */
  stir: number
}

export type Hat = { kind: Kind; look: number; turn: number; age: number }

export type Toad = {
  lookX: number
  lookY: number
  /** How far the lids have sunk: 0 wide awake, near 1 asleep. */
  lids: number
  /** The throat's slow pulse, in turns: a gulp at every whole turn. */
  throat: number
  /** Squashed under 0, stretched over 0: a croak, a start. */
  squash: number
  squashSpeed: number
  /** 0 to 1: flattened by a gust. */
  flat: number
  /** 0 to 1: glaring at a scuttler or a roller. */
  glare: number
  /** A part pressed on to it, worn as a hat until its next gulp. */
  hat: Hat | null
  /** Seconds before it croaks or starts at a creature again. */
  again: number
}

export type Fern = { sway: number; swaySpeed: number; /** 0 to 1: a frond sunk over whoever sleeps there. */ sunk: number }

/** How each wind child breathes: the big one slowly and deeply, the small one quick and shallow, a beat behind. */
export const BREATH = {
  big: { fill: 0.085, full: 1.16, empty: 0.74, blowFor: 1.5, delay: 0, look: 3.2, blinkEvery: [2.6, 5.5] },
  small: { fill: 0.17, full: 1.06, empty: 0.8, blowFor: 1.05, delay: 0.28, look: 7, blinkEvery: [1.4, 3.2] },
} as const

export type CastEvent = { who: CastId; what: 'leak' | 'blow' | 'gulp' }

/** How the three take a creature that wakes: fixed, so a child can learn it and try it on purpose. */
export type Taste = { big: 'light' | 'heavy' | 'plain'; small: 'spin' | 'afraid' | 'plain'; toad: 'like' | 'dislike' | 'plain' }

export function tasteOf(thing: Thing): Taste {
  const light = count(thing, 'feather') + count(thing, 'maple'), heavy = count(thing, 'twig') + count(thing, 'seed')
  const body = thing.parts.length - count(thing, 'cap'), way = wayOf(thing)
  return {
    // The big one likes what is mostly feathers and wings and strains at what is mostly twigs and seeds.
    big: body > 0 && light * 2 > body ? 'light' : body > 0 && heavy * 2 > body ? 'heavy' : 'plain',
    // The small one is afraid of legs and likes whatever rolls.
    small: count(thing, 'twig') >= 5 ? 'afraid' : way === 'round' ? 'spin' : 'plain',
    // The toad likes a slitherer and dislikes a scuttler and a roller.
    toad: way === 'willow' ? 'like' : way === 'twig' || way === 'round' ? 'dislike' : 'plain',
  }
}

export class Cast {
  readonly big: Wind = newWind(0.82)
  readonly small: Wind = newWind(0.95)
  readonly toad: Toad = { lookX: 0, lookY: 0, lids: 0.3, throat: 0.2, squash: 0, squashSpeed: 0, flat: 0, glare: 0, hat: null, again: 0 }
  readonly fern: Fern = { sway: 0, swaySpeed: 0, sunk: 0 }
  /** What happened in the last step that the toy answers: a leak sets a leaf loose, a blow starts the gust, a gulp sends the hat home. */
  readonly events: CastEvent[] = []

  /**
   * `at` is the thing that last answered the child, which everyone looks at, or null (never the finger itself); `toadAt` is what the toad looks at, when a creature has made it croak or start; `lies` is what lies on the earth waiting
   * for eyes, or null; `stirred` says something just happened, which opens the toad's eyes; `sleeper` whether
   * anyone sleeps under the fern.
   */
  step(dt: number, at: { x: number; y: number } | null, lies: { x: number; y: number } | null, stirred: boolean, sleeper: boolean, rng: Rng, toadAt: { x: number; y: number } | null = at): void {
    this.events.length = 0
    for (const who of ['big', 'small'] as const) {
      const wind = this[who], breath = BREATH[who], home = CAST[who]
      const ease = Math.min(1, dt * breath.look)
      // With no touch to look at, the big one stares at what lies on the earth, waiting for eyes, and the small one keeps its eyes on the heap of round leaves.
      const to = at ?? (who === 'big' ? lies : HEAPS.round)
      const tx = to ? clamp((to.x - home.x) / 420) : 0.55
      const ty = to ? clamp((to.y - home.y) / 380) : 0.7
      wind.lookX += (tx - wind.lookX) * ease
      wind.lookY += (ty - wind.lookY) * ease
      wind.nextBlink -= dt
      if (wind.nextBlink <= 0) { wind.blink = 1; wind.nextBlink = breath.blinkEvery[0] + rng.next() * (breath.blinkEvery[1] - breath.blinkEvery[0]) }
      wind.blink = Math.max(0, wind.blink - dt * 7)
      if (who === 'small') wind.stir += dt * (0.7 + 1.6 * Math.min(1, Math.abs(wind.whirl)))
      if (wind.blowIn > 0) {
        wind.blowIn -= dt
        // The breath in before the blow: the cheeks fill fast.
        wind.puff += (breath.full + 0.14 - wind.puff) * Math.min(1, dt * 9)
        if (wind.blowIn <= 0) { wind.blowLeft = breath.blowFor; this.events.push({ who, what: 'blow' }) }
      } else if (wind.blowLeft > 0) {
        wind.blowLeft = Math.max(0, wind.blowLeft - dt)
        wind.blow += (1 - wind.blow) * Math.min(1, dt * 16)
        wind.puff += (breath.empty - 0.06 - wind.puff) * Math.min(1, dt * 2.4)
      } else {
        wind.blow += (0 - wind.blow) * Math.min(1, dt * 6)
        // Holding its breath: it fills until it cannot, and a little gets out.
        wind.puff += breath.fill * dt
        if (wind.puff >= breath.full) { wind.puff = breath.empty; this.events.push({ who, what: 'leak' }) }
      }
    }
    const toad = this.toad, ease = Math.min(1, dt * 2.2)
    // Under a hat it looks up at it, cross-eyed.
    toad.lookX += ((toad.hat ? 0 : toadAt ? clamp((toadAt.x - CAST.toad.x) / 500) : 0.2) - toad.lookX) * ease
    toad.lookY += ((toad.hat ? -1 : toadAt ? clamp((toadAt.y - CAST.toad.y) / 300) : 0.5) - toad.lookY) * ease
    // The toad wants to doze: its lids sink until something stirs.
    if (stirred || toad.hat || toad.glare > 0.2) toad.lids = Math.min(toad.lids, 0.05)
    else toad.lids = Math.min(0.86, toad.lids + dt * 0.13)
    const before = toad.throat
    toad.throat += dt * (0.3 + 0.2 * (1 - toad.lids))
    if (Math.floor(toad.throat) !== Math.floor(before)) this.events.push({ who: 'toad', what: 'gulp' })
    if (toad.hat) toad.hat.age += dt
    toad.flat = Math.max(0, toad.flat - dt * 0.8)
    toad.glare = Math.max(0, toad.glare - dt * 0.4)
    toad.again = Math.max(0, toad.again - dt)
    spring(toad, 'squash', 'squashSpeed', 90, 9, dt)
    spring(this.fern, 'sway', 'swaySpeed', 40, 3.5, dt)
    this.fern.sunk += ((sleeper ? 1 : 0) - this.fern.sunk) * Math.min(1, dt * 3)
  }

  /** One wind child starts to blow after a quick breath in. With `whatever`, it does so whatever it was doing: a puff it was in the middle of is cut short. */
  breatheIn(who: 'big' | 'small', whatever = false): void {
    const wind = this[who]
    if (!whatever && (wind.blowIn > 0 || wind.blowLeft > 0.3)) return
    wind.blowLeft = 0
    wind.blowIn = 0.12 + BREATH[who].delay
  }

  /** The gust reaches the toad and the fern: the one is flattened, every time, and the other bends. */
  flatten(): void {
    this.toad.flat = 1
    this.toad.lids = 0
    this.fern.swaySpeed += 2.4
  }

  /** A touch on one of them: each answers as itself and nothing in the game changes. */
  touch(who: CastId | 'fern'): void {
    if (who === 'toad') { this.toad.squashSpeed = -5; this.toad.lids = 0 }
    else if (who === 'fern') this.fern.swaySpeed += (this.fern.sway >= 0 ? 1 : -1) * 3
    else this.puffOnce(who)
  }

  /** The held breath gets out at once, in one short puff. */
  puffOnce(who: 'big' | 'small'): void {
    const wind = this[who]
    wind.blowIn = 0
    wind.blowLeft = 0.45
    wind.blink = 1
  }

  /** The toad starts upright and glares, or sinks into a low croak. */
  toadStarts(): void {
    this.toad.squashSpeed = 4.5; this.toad.glare = 1; this.toad.lids = 0
  }

  toadCroaks(): void {
    this.toad.squashSpeed = -3.5
  }
}

function newWind(puff: number): Wind {
  return { lookX: 0, lookY: 0.6, puff, blow: 0, blowLeft: 0, blowIn: 0, blink: 0, nextBlink: 1 + puff, strain: 0, hide: 0, peek: 0, whirl: 0, stir: 0 }
}

function clamp(value: number): number {
  return Math.max(-1, Math.min(1, value))
}

function spring<K extends string, V extends string>(on: Record<K | V, number>, value: K, speed: V, stiff: number, damp: number, dt: number): void {
  on[speed] += (-stiff * on[value] - damp * on[speed]) * dt
  on[value] += on[speed] * dt
}

/** Whether a stage point is on the fern, which answers a touch with a sway. */
export function onFern(x: number, y: number): boolean {
  const dx = (x - FERN.x) / FERN.rx, dy = (y - (FERN.y - 60)) / FERN.ry
  return dx * dx + dy * dy <= 1
}
