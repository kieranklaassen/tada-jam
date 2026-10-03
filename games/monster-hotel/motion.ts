import { GUEST_IDS, type GuestId } from './guests'
import { REST, type InkBody } from './inkScene'

// How each guest moves: numbers only, which the page turns into a squashed,
// leant and shifted figure. Every guest has a tempo, a weight and one funny
// way of its own, so no two of them ever move alike (motion personality per
// character). Nothing here reads a clock: time is the seconds handed in, and
// which variant plays next comes from a seeded generator.

export type Fidget = {
  /** What it does, for the page's pose and for tests: no two guests share a name. */
  name: string
  /** How long one round of it takes, in seconds. */
  lasts: number
  /** The figure through one round, by how far through it is (0 to 1). */
  body(t: number): InkBody
}

export type Personality = {
  /** Breaths a second while it stands or sleeps. */
  tempo: number
  /** 0 is light, 1 is heavy: a heavy guest squashes less, settles slower and swings less when carried. */
  weight: number
  /** How deep it breathes: the share its height changes by. */
  breath: number
  /** What it does now and then while awake and left alone. */
  fidgets: readonly Fidget[]
  /** How it takes a finger landing on it: how far it squashes, how fast it springs back (cycles a second) and how soon that dies away. */
  squash: number
  spring: number
  damping: number
}

const TAU = Math.PI * 2
const body = (sx = 1, sy = 1, rot = 0, dx = 0, dy = 0): InkBody => ({ sx, sy, rot, dx, dy })
/** Rises to 1 in the middle of a round and is 0 at both ends. */
const hump = (t: number) => Math.sin(Math.max(0, Math.min(1, t)) * Math.PI)

export const PERSONALITY: Readonly<Record<GuestId, Personality>> = {
  // Heavy and slow. Its foot taps and its cheeks puff even when the tuba is down.
  troll: {
    tempo: 0.32, weight: 0.95, breath: 0.012, squash: 0.07, spring: 2.1, damping: 3.2,
    fidgets: [
      { name: 'troll-cheeks', lasts: 1.6, body: (t) => body(1 + 0.035 * hump(t) * Math.abs(Math.sin(t * TAU * 2)), 1) },
      { name: 'troll-foot-tap', lasts: 1.2, body: (t) => body(1, 1, 0, 0, -1.6 * Math.abs(Math.sin(t * TAU * 3)) * hump(t)) },
      { name: 'troll-lean-back', lasts: 2.4, body: (t) => body(1, 1, 0.045 * hump(t)) },
    ],
  },
  // Light and twitchy. Its ears go first, and it rocks as if still hanging.
  bat: {
    tempo: 0.22, weight: 0.15, breath: 0.02, squash: 0.2, spring: 5.2, damping: 5,
    fidgets: [
      { name: 'bat-rock', lasts: 1.8, body: (t) => body(1, 1, 0.08 * Math.sin(t * TAU * 2) * hump(t)) },
      { name: 'bat-ear-flick', lasts: 0.5, body: (t) => body(1 - 0.03 * hump(t), 1 + 0.06 * hump(t)) },
      { name: 'bat-wrap', lasts: 1.4, body: (t) => body(1 - 0.09 * hump(t), 1 + 0.02 * hump(t)) },
    ],
  },
  // Soft all through: it spreads and wobbles like a jelly, and never leans.
  blob: {
    tempo: 0.3, weight: 0.6, breath: 0.03, squash: 0.26, spring: 2.8, damping: 2.1,
    fidgets: [
      { name: 'blob-jelly', lasts: 1.5, body: (t) => body(1 + 0.05 * Math.sin(t * TAU * 3) * hump(t), 1 - 0.05 * Math.sin(t * TAU * 3) * hump(t)) },
      { name: 'blob-sag', lasts: 2.6, body: (t) => body(1 + 0.07 * hump(t), 1 - 0.08 * hump(t)) },
      { name: 'blob-pillow-hug', lasts: 1.1, body: (t) => body(1 - 0.04 * hump(t), 1, 0, -2.2 * hump(t)) },
    ],
  },
  // Enormous and unhurried. It fans itself: a slow sway of the whole body, and a shake like a wet dog.
  yeti: {
    tempo: 0.16, weight: 1, breath: 0.016, squash: 0.05, spring: 1.7, damping: 3.6,
    fidgets: [
      { name: 'yeti-fan', lasts: 3, body: (t) => body(1, 1, 0.025 * Math.sin(t * TAU), 2.5 * Math.sin(t * TAU)) },
      { name: 'yeti-shake', lasts: 0.9, body: (t) => body(1, 1, 0, 2.8 * Math.sin(t * TAU * 6) * hump(t)) },
      { name: 'yeti-settle', lasts: 2.2, body: (t) => body(1 + 0.03 * hump(t), 1 - 0.035 * hump(t)) },
    ],
  },
  // Thin and quick, and cold: it shivers in bursts, darts its head and hugs itself.
  lizard: {
    tempo: 0.23, weight: 0.3, breath: 0.014, squash: 0.13, spring: 6.4, damping: 6.5,
    fidgets: [
      { name: 'lizard-shiver', lasts: 0.8, body: (t) => body(1, 1, 0, 1.3 * Math.sin(t * TAU * 11) * hump(t)) },
      { name: 'lizard-head-dart', lasts: 0.4, body: (t) => body(1, 1, -0.06 * hump(t), -3 * hump(t)) },
      { name: 'lizard-hug', lasts: 1.7, body: (t) => body(1 - 0.06 * hump(t), 1 + 0.015 * hump(t)) },
    ],
  },
  // Broad and steady, always stirring: a round of the spoon turns its whole top.
  cook: {
    tempo: 0.19, weight: 0.8, breath: 0.015, squash: 0.09, spring: 2.4, damping: 3,
    fidgets: [
      { name: 'cook-stir', lasts: 2, body: (t) => body(1, 1, 0.03 * Math.sin(t * TAU * 2), 1.8 * Math.cos(t * TAU * 2) * hump(t)) },
      { name: 'cook-taste', lasts: 1.3, body: (t) => body(1, 1 + 0.03 * hump(t), -0.05 * hump(t)) },
      { name: 'cook-hum', lasts: 2.8, body: (t) => body(1, 1, 0, 0, -1.2 * Math.abs(Math.sin(t * TAU * 2)) * hump(t)) },
    ],
  },
  // The fastest of them: it rubs its hands, its whole body buzzes, and its nose goes up to sniff.
  fly: {
    tempo: 0.42, weight: 0.05, breath: 0.01, squash: 0.17, spring: 8.5, damping: 7.5,
    fidgets: [
      { name: 'fly-buzz', lasts: 0.6, body: (t) => body(1, 1, 0, 0.9 * Math.sin(t * TAU * 16) * hump(t), 0.9 * Math.cos(t * TAU * 16) * hump(t)) },
      { name: 'fly-sniff', lasts: 0.9, body: (t) => body(1, 1 + 0.05 * hump(t), 0.07 * hump(t), 0, -2 * hump(t)) },
      { name: 'fly-hand-rub', lasts: 0.7, body: (t) => body(1 + 0.025 * Math.sin(t * TAU * 5) * hump(t), 1) },
    ],
  },
  // She has no weight at all: she drifts off the floor, billows, and swells before a note.
  singer: {
    tempo: 0.28, weight: 0, breath: 0.022, squash: 0.3, spring: 1.3, damping: 1.4,
    fidgets: [
      { name: 'singer-drift', lasts: 3.4, body: (t) => body(1, 1, 0, 3.5 * Math.sin(t * TAU), -4 * hump(t)) },
      { name: 'singer-billow', lasts: 1.9, body: (t) => body(1 + 0.06 * Math.sin(t * TAU * 2) * hump(t), 1 + 0.03 * hump(t)) },
      { name: 'singer-swell', lasts: 1.2, body: (t) => body(1 + 0.05 * hump(t), 1 + 0.07 * hump(t), 0, 0, -1.5 * hump(t)) },
    ],
  },
}

/** Two bodies at once: the shares multiply, the lean and the shifts add. */
export function both(a: InkBody, b: InkBody): InkBody {
  return { sx: a.sx * b.sx, sy: a.sy * b.sy, rot: a.rot + b.rot, dx: a.dx + b.dx, dy: a.dy + b.dy }
}

/** Breathing: every guest at its own tempo and depth, deeper asleep than awake. */
export function breathing(id: GuestId, seconds: number, awake: boolean): InkBody {
  const { tempo, breath } = PERSONALITY[id]
  const lift = Math.sin(seconds * tempo * TAU) * breath * (awake ? 1 : 1.8)
  return body(1 - lift * 0.6, 1 + lift)
}

/**
 * How a guest takes a finger: it squashes the moment the finger lands and,
 * once the finger lifts, springs back past its own height and settles, as
 * fast and as far as its weight lets it. `held` is seconds since the finger
 * landed; `since` is seconds since it lifted, or null while it is still down.
 */
export function pressed(id: GuestId, held: number, since: number | null): InkBody {
  const { squash, spring, damping } = PERSONALITY[id]
  // Down: most of the squash is there at once, and the rest in a tenth of a second.
  const down = squash * (0.7 + 0.3 * Math.min(1, held / 0.1))
  if (since === null) return body(1 + down * 0.6, 1 - down)
  const ring = down * Math.exp(-damping * since) * Math.cos(since * spring * TAU)
  return body(1 + ring * 0.6, 1 - ring)
}

/** How long after a lift the spring is still worth drawing: until it has died to a hundredth of a height. */
export function settles(id: GuestId): number {
  const { squash, damping } = PERSONALITY[id]
  return Math.log(squash / 0.01) / damping
}

/** A carried guest hangs from the finger and swings: a pendulum that a light guest swings wide on and a heavy one hardly at all. */
export class Dangle {
  angle = 0
  private speed = 0
  private readonly id: GuestId

  constructor(id: GuestId) {
    this.id = id
  }

  /** `pull` is how fast the finger is moving sideways, in drawing units a second: it drags the feet behind. */
  step(dt: number, pull: number): void {
    const weight = PERSONALITY[this.id].weight
    const stiffness = 38 + 50 * weight, damping = 3 + 5 * weight, give = 0.0009 * (1.25 - weight)
    const push = -pull * give * stiffness
    this.speed += (-(stiffness * this.angle) - damping * this.speed + push) * dt
    this.angle += this.speed * dt
    const most = 0.75 - 0.5 * weight
    if (this.angle > most) { this.angle = most; this.speed = Math.min(0, this.speed) }
    if (this.angle < -most) { this.angle = -most; this.speed = Math.max(0, this.speed) }
  }
}

/** A small seeded generator, so a visit's fidgets can be the same again for a still. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Playing = { fidget: number; from: number } | null

/**
 * Chooses what each guest does while it is awake and left alone: a rest of a
 * few seconds, then one of its fidgets, never the same one twice running, and
 * never two guests starting on the same beat.
 */
export class MotionDirector {
  private readonly random: () => number
  private readonly playing = new Map<GuestId, Playing>()
  private readonly next = new Map<GuestId, number>()
  private readonly last = new Map<GuestId, number>()

  constructor(seed: number) {
    this.random = seeded(seed)
    GUEST_IDS.forEach((id, at) => this.next.set(id, 1.5 + at * 0.7 + this.random() * 3))
  }

  /** The guest's own motion at this moment. Asleep, held or carried, it does not fidget. */
  body(id: GuestId, seconds: number, awake: boolean, free: boolean): InkBody {
    const breath = breathing(id, seconds, awake)
    if (!awake || !free) {
      this.playing.set(id, null)
      return breath
    }
    const fidgets = PERSONALITY[id].fidgets
    let playing = this.playing.get(id) ?? null
    if (playing && seconds - playing.from >= fidgets[playing.fidget].lasts) {
      playing = null
      this.playing.set(id, null)
      this.next.set(id, seconds + 2.5 + this.random() * 5)
    }
    if (!playing && seconds >= (this.next.get(id) ?? 0)) {
      const before = this.last.get(id) ?? -1
      let pick = Math.floor(this.random() * fidgets.length)
      if (pick === before) pick = (pick + 1) % fidgets.length
      playing = { fidget: pick, from: seconds }
      this.playing.set(id, playing)
      this.last.set(id, pick)
    }
    if (!playing) return breath
    const fidget = fidgets[playing.fidget]
    return both(breath, fidget.body((seconds - playing.from) / fidget.lasts))
  }

  /** The name of the fidget a guest is in the middle of, or null. */
  doing(id: GuestId): string | null {
    const playing = this.playing.get(id) ?? null
    return playing ? PERSONALITY[id].fidgets[playing.fidget].name : null
  }
}

export { REST }
