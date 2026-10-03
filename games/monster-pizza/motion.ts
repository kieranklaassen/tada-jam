import { CHARACTERS, type Customer } from './customers'
import { restPose, type Pose } from './pose'
import { makeRng, type Rng } from './rng'
import { spring, stepSpring, type Spring } from './spring'

// Every customer moves like itself. A personality is its resting life, its
// blink, how fast its eyes turn, and its own variants of each action; a
// director plays them for one customer, never the same variant twice in a
// row. Pure: it returns numbers, and the art turns them into a drawing.

/** What an action adds to the resting pose. */
export type Delta = { lift?: number; squash?: number; lean?: number; mouth?: number; tongue?: number; part?: number; lookX?: number; lookY?: number; blink?: number }

export type Action = { name: string; lasts: number; at(t: number): Delta }
export type ActionKind = 'react' | 'poke' | 'delight'

export type Personality = {
  /** Its resting life at game time `now`. */
  idle(now: number): Delta
  /** Seconds between blinks, as a range, and how long one takes. */
  blinkEvery: [number, number]
  blinkLasts: number
  /** The spring its eyes turn on. */
  look: { stiffness: number; damping: number }
  /** Seconds between idle delights, as a range. */
  delightEvery: [number, number]
  actions: Record<ActionKind, Action[]>
}

const TAU = Math.PI * 2
const clamp01 = (t: number): number => Math.min(1, Math.max(0, t))
/** Up and back down once over the stretch. */
const hump = (t: number): number => Math.sin(clamp01(t) * Math.PI)
/** 0 to 1 between `a` and `b`. */
const ramp = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a))
/** Up by `a`, held, and down again from `b`. */
const hold = (t: number, a: number, b: number): number => Math.min(ramp(t, 0, a), 1 - ramp(t, b, 1))
/** `n` swings that die away. */
const wobble = (t: number, n: number): number => Math.sin(t * TAU * n) * (1 - clamp01(t))

export const PERSONALITIES: Record<Customer, Personality> = {
  // Small, quick and springy: everything is a bounce, and the eye stalk leads.
  bim: {
    idle: (now) => ({ squash: 0.035 * Math.sin(now * TAU * 0.95), part: 0.5 * Math.sin(now * TAU * 0.4) + 0.2 * Math.sin(now * TAU * 1.3), lean: 0.02 * Math.sin(now * TAU * 0.47) }),
    blinkEvery: [1.4, 3.2], blinkLasts: 0.11, look: { stiffness: 220, damping: 16 }, delightEvery: [3.5, 6],
    actions: {
      react: [
        { name: 'bim-hop', lasts: 0.42, at: (t) => ({ lift: 46 * hump(t), squash: -0.1 * hump(t) + 0.12 * hump(ramp(t, 0.8, 1)), part: wobble(t, 2) }) },
        { name: 'bim-stalk-snap', lasts: 0.5, at: (t) => ({ part: -1.2 * hump(ramp(t, 0, 0.3)) + wobble(ramp(t, 0.3, 1), 3), mouth: 0.5 * hump(t) }) },
      ],
      poke: [
        { name: 'bim-boing', lasts: 0.7, at: (t) => ({ squash: 0.26 * wobble(t, 4), lift: 20 * Math.abs(wobble(t, 4)), part: 1.4 * wobble(t, 5), blink: hold(t, 0.1, 0.3) }) },
        { name: 'bim-spin-eye', lasts: 0.8, at: (t) => ({ lookX: Math.cos(t * TAU * 2), lookY: Math.sin(t * TAU * 2), part: 0.6 * wobble(t, 2), mouth: 0.6 * hump(t) }) },
      ],
      delight: [
        { name: 'bim-peek', lasts: 1.2, at: (t) => ({ part: 1.5 * hold(t, 0.2, 0.7), lean: 0.1 * hold(t, 0.2, 0.7) }) },
        { name: 'bim-double-hop', lasts: 0.9, at: (t) => ({ lift: 30 * Math.abs(Math.sin(t * TAU)), squash: -0.06 * Math.abs(Math.sin(t * TAU)) }) },
        { name: 'bim-stalk-loop', lasts: 1.1, at: (t) => ({ part: Math.sin(t * TAU * 2) * hump(t), lookY: -0.6 * hump(t) }) },
      ],
    },
  },
  // Huge, slow and heavy: he moves late, and his belly goes on moving after he has stopped.
  grum: {
    idle: (now) => ({ squash: 0.028 * Math.sin(now * TAU * 0.27), part: 0.25 * Math.sin(now * TAU * 0.27 - 1.1) }),
    blinkEvery: [3.5, 7], blinkLasts: 0.3, look: { stiffness: 30, damping: 9 }, delightEvery: [6, 10],
    actions: {
      react: [
        { name: 'grum-rumble', lasts: 1.1, at: (t) => ({ squash: 0.08 * hump(ramp(t, 0.15, 0.6)), part: 1.2 * wobble(ramp(t, 0.3, 1), 2.5), mouth: 0.4 * hold(t, 0.3, 0.7) }) },
        { name: 'grum-lick', lasts: 1.3, at: (t) => ({ mouth: 0.6 * hold(t, 0.2, 0.8), tongue: hump(ramp(t, 0.2, 0.9)), lean: 0.05 * hold(t, 0.3, 0.8) }) },
      ],
      poke: [
        { name: 'grum-jelly', lasts: 1.6, at: (t) => ({ part: 1.8 * wobble(t, 3.5), squash: 0.05 * wobble(t, 3.5), lookY: 0.8 * hold(t, 0.1, 0.6) }) },
        { name: 'grum-slow-turn', lasts: 1.5, at: (t) => ({ lean: -0.09 * hold(t, 0.3, 0.75), lookX: -0.9 * hold(t, 0.2, 0.8), part: 0.8 * wobble(ramp(t, 0.5, 1), 2) }) },
      ],
      delight: [
        { name: 'grum-yawn', lasts: 2.4, at: (t) => ({ mouth: hold(t, 0.3, 0.7), blink: hold(t, 0.3, 0.75), squash: -0.05 * hold(t, 0.3, 0.7) }) },
        { name: 'grum-belly-swell', lasts: 2, at: (t) => ({ part: 1.4 * hold(t, 0.4, 0.6), squash: 0.04 * hold(t, 0.4, 0.6) }) },
        { name: 'grum-settle', lasts: 1.8, at: (t) => ({ squash: 0.07 * hump(ramp(t, 0, 0.4)), part: wobble(ramp(t, 0.4, 1), 2) }) },
      ],
    },
  },
  // Tall, thin and jittery: never quite still, the neck does the talking and the antennae spark.
  fizz: {
    idle: (now) => ({ squash: 0.012 * Math.sin(now * TAU * 1.4) + 0.008 * Math.sin(now * TAU * 3.7), lean: 0.012 * Math.sin(now * TAU * 2.3), part: 0.3 * Math.sin(now * TAU * 5.1) * (Math.sin(now * TAU * 0.35) > 0.6 ? 1 : 0.1) }),
    blinkEvery: [0.9, 2.2], blinkLasts: 0.08, look: { stiffness: 320, damping: 14 }, delightEvery: [3, 5],
    actions: {
      react: [
        { name: 'fizz-neck-up', lasts: 0.45, at: (t) => ({ squash: -0.16 * hump(t), part: Math.sin(t * TAU * 6) * 0.8, mouth: 0.5 * hump(t) }) },
        { name: 'fizz-shiver', lasts: 0.5, at: (t) => ({ lean: 0.04 * Math.sin(t * TAU * 9) * (1 - t), part: Math.sin(t * TAU * 9) }) },
      ],
      poke: [
        { name: 'fizz-zap', lasts: 0.6, at: (t) => ({ squash: -0.22 * hump(ramp(t, 0, 0.25)) + 0.06 * wobble(ramp(t, 0.25, 1), 5), part: 1.6 * Math.sin(t * TAU * 8) * (1 - t), blink: -0.5 * hump(t) }) },
        { name: 'fizz-duck', lasts: 0.7, at: (t) => ({ squash: 0.3 * hold(t, 0.15, 0.5), lookY: -0.9 * hold(t, 0.15, 0.6), part: -0.8 * hold(t, 0.15, 0.5) }) },
      ],
      delight: [
        { name: 'fizz-look-about', lasts: 1, at: (t) => ({ lookX: Math.sign(Math.sin(t * TAU * 2.5)) * 0.9, squash: -0.05 * hump(t) }) },
        { name: 'fizz-antenna-wave', lasts: 0.9, at: (t) => ({ part: Math.sin(t * TAU * 3) * 1.3 }) },
        { name: 'fizz-stretch', lasts: 1.1, at: (t) => ({ squash: -0.2 * hold(t, 0.3, 0.6), lookY: -0.7 * hold(t, 0.3, 0.6) }) },
      ],
    },
  },
  // Round, furry and sleepy: slow lids, a sag, and ears that arrive after the rest of her.
  mops: {
    idle: (now) => ({ squash: 0.04 * Math.sin(now * TAU * 0.33), blink: 0.3 + 0.12 * Math.sin(now * TAU * 0.11), part: 0.12 * Math.sin(now * TAU * 0.33 - 1.9) }),
    blinkEvery: [2.5, 5], blinkLasts: 0.42, look: { stiffness: 46, damping: 10 }, delightEvery: [5, 9],
    actions: {
      react: [
        { name: 'mops-ears-up', lasts: 0.9, at: (t) => ({ part: 1.1 * hold(t, 0.25, 0.6) + 0.4 * wobble(ramp(t, 0.6, 1), 2), blink: -0.3 * hold(t, 0.1, 0.7) }) },
        { name: 'mops-sniff', lasts: 1, at: (t) => ({ lean: 0.08 * hold(t, 0.3, 0.7), squash: 0.03 * Math.sin(t * TAU * 5) * hold(t, 0.2, 0.8), part: 0.4 * hump(t) }) },
      ],
      poke: [
        { name: 'mops-flop', lasts: 1.2, at: (t) => ({ squash: 0.16 * hump(ramp(t, 0, 0.4)), part: -0.9 * hump(ramp(t, 0.05, 0.5)) + 0.9 * wobble(ramp(t, 0.5, 1), 2), blink: hold(t, 0.1, 0.4) }) },
        { name: 'mops-shake', lasts: 1.1, at: (t) => ({ lean: 0.1 * wobble(t, 4), part: 1.2 * wobble(ramp(t, 0.08, 1), 4) }) },
      ],
      delight: [
        { name: 'mops-doze', lasts: 3, at: (t) => ({ blink: 0.7 * hold(t, 0.3, 0.8), squash: 0.07 * hold(t, 0.3, 0.8), part: -0.5 * hold(t, 0.4, 0.8), lean: 0.05 * hold(t, 0.4, 0.8) }) },
        { name: 'mops-ear-flap', lasts: 1.3, at: (t) => ({ part: Math.abs(Math.sin(t * TAU * 2)) * hump(t) }) },
        { name: 'mops-stretch', lasts: 2, at: (t) => ({ squash: -0.09 * hold(t, 0.35, 0.65), mouth: 0.7 * hold(t, 0.35, 0.65), part: 0.6 * hold(t, 0.4, 0.7) }) },
      ],
    },
  },
  // A soft blob: it sags and gathers itself, and its tongue has a life of its own.
  ooze: {
    idle: (now) => ({ squash: 0.05 * Math.pow(Math.sin(now * TAU * 0.21), 3) + 0.02 * Math.sin(now * TAU * 0.5), lean: 0.03 * Math.sin(now * TAU * 0.16) }),
    blinkEvery: [2, 4.5], blinkLasts: 0.2, look: { stiffness: 70, damping: 7 }, delightEvery: [4, 7],
    actions: {
      react: [
        { name: 'ooze-slurp', lasts: 0.8, at: (t) => ({ mouth: 0.5 * hold(t, 0.2, 0.7), tongue: hump(ramp(t, 0.1, 0.8)) * (0.7 + 0.3 * Math.sin(t * TAU * 3)), squash: 0.05 * hump(t) }) },
        { name: 'ooze-quiver', lasts: 0.9, at: (t) => ({ squash: 0.1 * wobble(t, 6), lean: 0.03 * wobble(t, 3) }) },
      ],
      poke: [
        { name: 'ooze-splat', lasts: 1.2, at: (t) => ({ squash: 0.42 * hump(ramp(t, 0, 0.45)) - 0.1 * hump(ramp(t, 0.45, 0.8)), blink: hold(t, 0.05, 0.35), tongue: 0.5 * hump(ramp(t, 0.5, 1)) }) },
        { name: 'ooze-ripple', lasts: 1.3, at: (t) => ({ squash: 0.14 * Math.sin(t * TAU * 3) * (1 - t), lean: 0.12 * Math.sin(t * TAU * 1.5) * (1 - t), mouth: 0.4 * hump(t) }) },
      ],
      delight: [
        { name: 'ooze-tongue-flick', lasts: 0.7, at: (t) => ({ mouth: 0.4 * hold(t, 0.2, 0.7), tongue: hump(t) }) },
        { name: 'ooze-sag', lasts: 2.4, at: (t) => ({ squash: 0.2 * hold(t, 0.5, 0.75) }) },
        { name: 'ooze-sway', lasts: 2, at: (t) => ({ lean: 0.14 * Math.sin(t * TAU) * hump(t), lookX: Math.sin(t * TAU) }) },
      ],
    },
  },
}

type Playing = { action: Action; kind: ActionKind; start: number; amp: number; speed: number }

/** One customer's motion over time. Seeded, so a run can be played again; times are game seconds. */
export class MotionDirector {
  readonly pose: Pose = restPose()
  private readonly person: Personality
  private readonly rng: Rng
  private playing: Playing[] = []
  private last: Partial<Record<ActionKind, string>> = {}
  private nextBlink: number
  private blinkAt = -10
  private nextDelight: number
  private readonly eyeX: Spring = spring()
  private readonly eyeY: Spring = spring()
  /** The mouth waters towards this, 0 to 1: set by the game when there is something to want. */
  want = 0
  private readonly mouth: Spring = spring()

  constructor(readonly who: Customer, seed: number, now = 0) {
    this.person = PERSONALITIES[who]
    this.rng = makeRng(seed)
    this.nextBlink = now + this.rng.range(...this.person.blinkEvery)
    this.nextDelight = now + this.rng.range(...this.person.delightEvery)
  }

  /** Starts one of its variants of `kind`, never the one it played last. Returns the variant's name. */
  trigger(kind: ActionKind, now: number): string {
    const all = this.person.actions[kind]
    const choice = all.length > 1 ? all.filter((a) => a.name !== this.last[kind]) : all
    const action = this.rng.pick(choice)
    this.last[kind] = action.name
    // A real action takes the place of a delight, and of an older action of its own kind.
    this.playing = this.playing.filter((p) => p.kind !== 'delight' && p.kind !== kind)
    this.playing.push({ action, kind, start: now, amp: this.rng.range(0.85, 1.15), speed: this.rng.range(0.9, 1.1) })
    return action.name
  }

  get busy(): boolean {
    return this.playing.some((p) => p.kind !== 'delight')
  }

  /**
   * Plays up to `now`. `lookAt` is where its eyes should go, each -1 to 1, or
   * null to let them rest. `quiet` holds back the idle delights while something
   * else is the centre of the scene. Returns its pose, the same object each time.
   */
  update(now: number, dt: number, lookAt: { x: number; y: number } | null, quiet = false): Pose {
    const person = this.person, pose = this.pose
    const weight = CHARACTERS[this.who].weight
    if (!quiet && !this.busy && now >= this.nextDelight && this.playing.length === 0) {
      this.trigger('delight', now)
      this.nextDelight = now + this.rng.range(...person.delightEvery)
    }
    if (now >= this.nextBlink) {
      this.blinkAt = now
      // Now and then a double blink.
      this.nextBlink = now + (this.rng.next() < 0.2 ? person.blinkLasts * 1.6 : this.rng.range(...person.blinkEvery))
    }
    stepSpring(this.eyeX, lookAt ? lookAt.x : 0, dt, person.look.stiffness, person.look.damping)
    stepSpring(this.eyeY, lookAt ? lookAt.y : 0, dt, person.look.stiffness, person.look.damping)
    stepSpring(this.mouth, this.want, dt, 60 - weight * 30, 9)

    const sum: Required<Delta> = { lift: 0, squash: 0, lean: 0, mouth: 0, tongue: 0, part: 0, lookX: 0, lookY: 0, blink: 0 }
    const add = (d: Delta, amp: number): void => {
      for (const key of Object.keys(d) as (keyof Delta)[]) sum[key] += (d[key] ?? 0) * amp
    }
    add(person.idle(now), 1)
    this.playing = this.playing.filter((p) => {
      const t = ((now - p.start) * p.speed) / p.action.lasts
      if (t >= 1) return false
      add(p.action.at(t), p.amp)
      return true
    })
    const blink = hump((now - this.blinkAt) / person.blinkLasts)
    pose.lift = Math.max(0, sum.lift)
    // Two actions at once never flatten or stretch it past what its drawing can take.
    const squash = Math.max(-0.4, Math.min(0.5, sum.squash))
    pose.sy = 1 - squash
    pose.sx = 1 + squash * 0.7
    pose.lean = sum.lean
    pose.mouth = clamp01(sum.mouth + this.mouth.x * 0.45)
    pose.tongue = clamp01(sum.tongue + Math.max(0, this.mouth.x - 0.6) * 0.5)
    pose.part = sum.part
    pose.lookX = Math.max(-1, Math.min(1, this.eyeX.x + sum.lookX))
    pose.lookY = Math.max(-1, Math.min(1, this.eyeY.x + sum.lookY))
    pose.blink = clamp01(Math.max(blink, sum.blink))
    return pose
  }
}
