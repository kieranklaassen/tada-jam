import type { Direction } from './acts'
import { below, type Rng } from './rng'

// The three folk who sit round the tree, as numbers: how each one moves, what
// it does while nothing happens and how it answers what the child does. No
// two share a motion: each has its own tempo, weight and funniest part, its
// own idle delights and its own answer to every event. Nothing here draws;
// the view maps a pose onto sprites and a few pencil lines.

export const FOLK = ['fat', 'tidy', 'tiny'] as const
export type Who = (typeof FOLK)[number]

export type Mouth = 'smile' | 'o' | 'grin' | 'flat' | 'yawn' | 'pout'

/** What a folk can answer: a thing lifted, a thing landed, its own thing landed, its own thing in its favourite cell, a hard landing, dust, a tumble home, a poke, water, and a thing set down level. */
export const ACTS = ['see', 'land', 'like', 'love', 'thud', 'dust', 'tumble', 'poke', 'wet', 'level'] as const
export type Act = (typeof ACTS)[number]

export type Personality = {
  /** Where its eyes are on the stage, and where its feet are. */
  eyes: { x: number; y: number }
  feet: { x: number; y: number }
  /** How big a touch on it may be: half its width and its height. */
  reach: { halfWidth: number; height: number; /** Above this height it is narrower: a head and a hat on a wide coat. */ head?: { above: number; left: number; right: number } }
  /** Seconds before it answers something it sees. A poke is answered at once. */
  latency: number
  /** The spring of its body: how stiff, how damped. A low damping wobbles on. */
  stiffness: number
  damping: number
  /** The spring of its funniest part (the belly, the nose, the hat) and of what it holds. */
  partStiffness: number
  partDamping: number
  /** How fast its eyes go to what they look at, per second. */
  eyeSpeed: number
  breath: { hz: number; amp: number }
  blink: { every: readonly [number, number]; lasts: number; twice: boolean }
  /** How far its lids hang when nothing happens: 0 open, 1 shut. */
  restLid: number
  /** Seconds between two idle delights. */
  idleEvery: readonly [number, number]
  /** What it does while nothing happens, picked without doing the same one twice running. */
  delights: readonly Delight[]
  /** Where it looks when there is nothing to follow. */
  restGaze: { x: number; y: number }
}

export type Delight = {
  name: string
  lasts: number
  /** Each channel over the delight's progress from 0 to 1. A channel left out stays at rest. */
  lean?: (p: number) => number
  bob?: (p: number) => number
  part?: (p: number) => number
  prop?: (p: number) => number
  lid?: (p: number) => number
  open?: (p: number) => number
  mouth?: Mouth
}

export type Reaction = {
  /** Degrees it leans while it holds the answer: toward the hollow is positive. */
  lean: number
  /** A kick to its body's bounce and to its funniest part. */
  kick: number
  part: number
  prop: number
  /** How wide its eyes go (1 is as usual), and its brows from -1 (drawn down) to 1 (raised). */
  wide: number
  brow: number
  mouth: Mouth
  open: number
  /** Seconds it holds the face. */
  holds: number
  /** Which of its voices it makes when the answer starts, if any. */
  says: 'poke' | 'like' | 'other' | null
}

const hump = (p: number): number => Math.sin(Math.PI * Math.min(1, Math.max(0, p)))
const ramp = (p: number, a: number, b: number): number => Math.min(1, Math.max(0, (p - a) / (b - a)))
const beats = (p: number, count: number): number => Math.sin(Math.PI * 2 * count * p) * hump(p)

export const PERSONALITY: Record<Who, Personality> = {
  // Slow and heavy. The belly is the funniest part: it wobbles long after the rest has stopped.
  fat: {
    eyes: { x: 134, y: 448 }, feet: { x: 132, y: 640 }, reach: { halfWidth: 108, height: 268 },
    latency: 0.24, stiffness: 38, damping: 5.5, partStiffness: 46, partDamping: 3.2, eyeSpeed: 3.5,
    breath: { hz: 0.22, amp: 0.035 }, blink: { every: [3.2, 5.5], lasts: 0.32, twice: false }, restLid: 0.42, idleEvery: [6, 10],
    restGaze: { x: 560, y: 560 },
    delights: [
      { name: 'nods off', lasts: 2.9, lid: (p) => (p < 0.78 ? ramp(p, 0, 0.6) : 0), lean: (p) => (p < 0.78 ? 9 * ramp(p, 0.1, 0.75) : -4 * hump(ramp(p, 0.78, 1))), part: (p) => (p > 0.78 ? 0.5 * hump(ramp(p, 0.78, 1)) : 0) },
      { name: 'yawns', lasts: 2.3, open: hump, mouth: 'yawn', lid: (p) => 0.9 * hump(p), prop: (p) => 0.6 * hump(p), lean: (p) => -5 * hump(p) },
      { name: 'plumps its pillow', lasts: 1.9, prop: (p) => Math.abs(beats(p, 1)), bob: (p) => -0.03 * Math.abs(beats(p, 1)) },
    ],
  },
  // Quick and exact. The long nose is the funniest part: it twitches.
  tidy: {
    eyes: { x: 1060, y: 392 }, feet: { x: 1062, y: 642 }, reach: { halfWidth: 62, height: 322, head: { above: 200, left: 40, right: 36 } },
    latency: 0.07, stiffness: 190, damping: 20, partStiffness: 320, partDamping: 14, eyeSpeed: 14,
    breath: { hz: 0.5, amp: 0.008 }, blink: { every: [1.6, 2.8], lasts: 0.09, twice: true }, restLid: 0.1, idleEvery: [3.5, 6],
    restGaze: { x: 700, y: 720 },
    delights: [
      { name: 'polishes its dustpan', lasts: 0.95, prop: (p) => beats(p, 5) },
      { name: 'straightens its collar', lasts: 0.7, lean: (p) => -3 * hump(p), part: (p) => -0.6 * hump(p), mouth: 'flat' },
      { name: 'sniffs', lasts: 0.5, part: (p) => beats(p, 3) },
    ],
  },
  // Fast and bouncy. The hat is the funniest part: it is far too big and slips over its eyes.
  tiny: {
    eyes: { x: 918, y: 428 }, feet: { x: 918, y: 496 }, reach: { halfWidth: 60, height: 150 },
    latency: 0.02, stiffness: 120, damping: 6, partStiffness: 90, partDamping: 7, eyeSpeed: 9,
    breath: { hz: 0.9, amp: 0.02 }, blink: { every: [4.5, 8], lasts: 0.12, twice: false }, restLid: 0, idleEvery: [2.5, 4.5],
    restGaze: { x: 590, y: 820 },
    delights: [
      { name: 'loses its hat over its eyes', lasts: 2.8, part: (p) => (p < 0.84 ? ramp(p, 0, 0.84) : -0.25 * hump(ramp(p, 0.84, 1))), bob: (p) => (p > 0.84 ? 0.06 * hump(ramp(p, 0.84, 1)) : 0) },
      { name: 'waves its brush', lasts: 1, prop: (p) => beats(p, 4), mouth: 'grin' },
      { name: 'kicks its heels', lasts: 0.7, bob: (p) => 0.07 * Math.abs(beats(p, 2)) },
    ],
  },
}

/**
 * What each of the three holds or wears that reaches past its body: where it is fixed, from the feet, and the room
 * its pencil takes from there. The view draws it at `at`, and a finger on it is on the one whose it is: the tidy
 * one's dustpan and nose, the tiny one's hat and brush.
 */
export const HELD = {
  fat: {},
  tidy: { pan: { at: { x: -30, y: -172 }, ink: { x: -104, y: 28, w: 73, h: 32 } }, nose: { at: { x: -24, y: -236 }, ink: { x: -48, y: -10, w: 50, h: 20 } } },
  tiny: { hat: { at: { x: 0, y: -122 }, ink: { x: -66, y: -62, w: 132, h: 70 } }, brush: { at: { x: 56, y: -52 }, ink: { x: -18, y: -58, w: 36, h: 66 } } },
} as const

/** Which way each leans when its lean is positive: toward the hollow from where it sits, the fat one to the right and the other two to the left. */
export const TOWARD: Record<Who, 1 | -1> = { fat: 1, tidy: -1, tiny: -1 }

const answer = (lean: number, kick: number, part: number, prop: number, wide: number, brow: number, mouth: Mouth, open: number, holds: number, says: Reaction['says']): Reaction => ({ lean, kick, part, prop, wide, brow, mouth, open, holds, says })

/** How each of the three answers each event. A dislike is as good to watch as a like, and nothing here is about the child. */
export const REACTIONS: Record<Who, Record<Act, Reaction>> = {
  fat: {
    see: answer(2, 0, 0, 0, 0.8, 0.2, 'smile', 0, 0.9, null),
    land: answer(1, -0.5, 0.5, 0, 0.7, 0, 'smile', 0, 0.7, null),
    like: answer(7, 0.3, 0.4, 0.7, 1.2, 0.6, 'o', 0.5, 1.6, 'like'),
    love: answer(11, 0.5, 0.8, 1, 1.45, 1, 'grin', 0.8, 2.4, 'like'),
    thud: answer(-6, -0.9, 1.4, 0.4, 1.3, -0.5, 'pout', 0.2, 1.1, 'other'),
    dust: answer(-2, 0, 0.3, 0, 0.6, -0.2, 'flat', 0, 0.8, null),
    tumble: answer(-3, 0.4, 1.8, 0, 1.1, 0.5, 'grin', 0.9, 1.5, null),
    poke: answer(-4, -1.1, 2.4, 0.3, 1.4, 0.8, 'o', 0.7, 1.2, 'poke'),
    // It dislikes wet: it pulls back from the water, hugs its pillow and grumbles.
    wet: answer(-8, -0.4, 1.1, 1.2, 0.85, -0.9, 'pout', 0.1, 1.4, 'other'),
    level: answer(3, -0.2, 0.9, 0.3, 0.8, 0.2, 'smile', 0.1, 0.9, null),
  },
  tidy: {
    see: answer(1.5, 0, 0.3, 0, 1.1, 0.3, 'flat', 0, 0.5, null),
    land: answer(0.5, 0.2, 0, 0.2, 1, 0.1, 'flat', 0, 0.4, null),
    like: answer(5, 0.5, 0.6, 0.8, 1.25, 0.8, 'smile', 0.2, 1.2, 'like'),
    love: answer(8, 0.9, 0.9, 1.4, 1.35, 1, 'grin', 0.4, 1.8, 'like'),
    thud: answer(-1, 0.3, -0.4, 0, 1.15, -0.3, 'flat', 0, 0.5, null),
    dust: answer(-3, 0.2, 1.3, -0.5, 0.75, -0.8, 'pout', 0, 0.9, 'other'),
    tumble: answer(-2, 0.1, 1, -0.3, 0.8, -1, 'pout', 0.1, 1, 'other'),
    poke: answer(-5, 0.6, -2.2, 0.6, 1.4, 1, 'o', 0.4, 0.8, 'poke'),
    wet: answer(-1, 0.2, 0.5, 0, 1.1, 0.2, 'flat', 0, 0.5, null),
    // Its taste for level things: a short nod at the thing, its brows up, its eyes on it. It is no larger than its
    // sniff at dust or its tut at a tumble, and it is about the thing, not about who set it down.
    level: answer(3, 0.2, 0.2, 0.5, 1.15, 0.7, 'smile', 0, 0.9, null),
  },
  tiny: {
    see: answer(4, 0.8, 0.2, 0.3, 1.2, 0.5, 'o', 0.3, 0.6, null),
    land: answer(2, 1.2, 0.9, 0, 1.1, 0.3, 'smile', 0.2, 0.5, null),
    like: answer(8, 1.8, 0.6, 1, 1.3, 0.9, 'grin', 0.7, 1.3, 'like'),
    love: answer(12, 2.6, 1, 1.6, 1.5, 1, 'grin', 1, 2, 'like'),
    thud: answer(1, 1.6, 1.4, 0, 1.25, 0.4, 'o', 0.5, 0.6, null),
    dust: answer(0, 0.9, 0.5, 0.4, 1.05, 0.2, 'smile', 0.3, 0.5, null),
    tumble: answer(3, 2, 0.7, 0.8, 1.2, 0.7, 'grin', 1, 1.2, 'other'),
    poke: answer(-2, 1.4, 2.6, -0.4, 0.4, 0.6, 'o', 0.8, 1, 'poke'),
    wet: answer(6, 1.5, 0.8, 1.2, 1.3, 0.8, 'grin', 0.8, 1, null),
    level: answer(5, 0.6, 1.4, 0.6, 1.15, 0.5, 'smile', 0.4, 0.7, null),
  },
}

export type Pose = {
  /** Degrees of lean about its feet, toward the hollow positive. */
  lean: number
  /** How much taller than usual it stands, as a share of its height: negative is a squash. */
  bob: number
  /** Where its pupils sit, each from -1 to 1. */
  gazeX: number
  gazeY: number
  /** How far its lids are shut, 0 to 1, and how wide its eyes are. */
  lid: number
  wide: number
  brow: number
  mouth: Mouth
  /** How far its mouth is open, 0 to 1. */
  open: number
  /** Its funniest part, in its own units: the belly's wobble, the nose's twitch, how far the hat has slipped. */
  part: number
  /** What it holds: the pillow's squeeze, the dustpan's turn, the brush's wave. */
  prop: number
}

type Spring = { at: number; speed: number }

function pull(spring: Spring, to: number, stiffness: number, damping: number, step: number): void {
  spring.speed += (-stiffness * (spring.at - to) - damping * spring.speed) * step
  spring.at += spring.speed * step
}

function between(rng: Rng, range: readonly [number, number]): number {
  return range[0] + (range[1] - range[0]) * rng.next()
}

/** One of the three, alive. Stepped on game time only, with chance from the stream it is given. */
export class Folk {
  readonly who: Who
  readonly is: Personality
  readonly pose: Pose = { lean: 0, bob: 0, gazeX: 0, gazeY: 0, lid: 0, wide: 1, brow: 0, mouth: 'smile', open: 0, part: 0, prop: 0 }
  /** How many answers it has started. A test reads it beside the sounds. */
  answers = 0
  private readonly lean: Spring = { at: 0, speed: 0 }
  private readonly bob: Spring = { at: 0, speed: 0 }
  private readonly part: Spring = { at: 0, speed: 0 }
  private readonly prop: Spring = { at: 0, speed: 0 }
  private readonly open: Spring = { at: 0, speed: 0 }
  private now: Reaction | null = null
  private holdLeft = 0
  private waiting: { act: Act; left: number } | null = null
  /** What it answers next, once the answer it is giving is over: the tidy one likes its feather and then sniffs at the dust it raised. */
  private next: Act | null = null
  private delight: Delight | null = null
  private delightAt = 0
  private lastDelight = -1
  private idleIn: number
  private blinkIn: number
  private blinkAt = -1
  private blinksLeft = 0
  private clock = 0
  private look = { x: 0, y: 0, until: 0 }
  private directed: Direction | null = null

  constructor(who: Who, private readonly rng: Rng) {
    this.who = who
    this.is = PERSONALITY[who]
    this.idleIn = between(rng, this.is.idleEvery) * 0.6
    this.blinkIn = between(rng, this.is.blink.every)
    this.pose.lid = this.is.restLid
  }

  /** The delight that is playing, if any. */
  get doing(): string | null {
    return this.delight?.name ?? null
  }

  /** What it is told to be now, at evening or as it wakes, or null by day when it is its own idle self. Its body still follows on its own springs. */
  direct(to: Direction | null): void {
    this.directed = to
    if (to) this.delight = null
  }

  /** Whether it is being told what to be. */
  get told(): boolean {
    return this.directed !== null
  }

  /** At rest, at once: as it is found when the game is opened. Nothing is left swinging, pending or half done. */
  settle(): void {
    const to = this.directed
    this.now = null
    this.holdLeft = 0
    this.waiting = null
    this.next = null
    this.delight = null
    this.blinkAt = -1
    this.blinksLeft = 0
    for (const spring of [this.lean, this.bob, this.part, this.prop, this.open]) spring.speed = 0
    this.lean.at = to?.lean ?? 0
    this.bob.at = to?.bob ?? 0
    this.part.at = to?.part ?? 0
    this.prop.at = to?.prop ?? 0
    this.open.at = to?.open ?? 0
    const pose = this.pose
    pose.lean = this.lean.at
    pose.bob = this.bob.at
    pose.part = this.part.at
    pose.prop = this.prop.at
    pose.open = Math.min(1, Math.max(0, this.open.at))
    pose.lid = to ? to.lid : this.is.restLid
    pose.wide = to?.wide ?? 1
    pose.brow = to?.brow ?? 0
    pose.mouth = to?.mouth ?? 'smile'
    pose.gazeX = 0
    pose.gazeY = 0
    this.look = { x: 0, y: 0, until: 0 }
  }

  /** A jolt through its body and its funniest part: a sneeze, a bonk, a start. */
  jolt(kick: number, part: number): void {
    this.bob.speed += kick
    this.part.speed += part * 6
  }

  /** Something to follow with its eyes for a while, in stage units. */
  watch(x: number, y: number, seconds: number): void {
    this.look = { x, y, until: this.clock + seconds }
  }

  /** It sees something happen and answers after its own latency. A newer event takes the place of one it has not answered yet. */
  notice(act: Act, then: Act | null = null): void {
    this.waiting = { act, left: this.is.latency }
    this.next = then
  }

  /** A finger on it: answered in this call, since a touch is answered when it lands. Returns which voice it makes. */
  poke(): Reaction['says'] {
    this.waiting = null
    this.next = null
    return this.begin('poke')
  }

  private begin(act: Act): Reaction['says'] {
    const reaction = REACTIONS[this.who][act]
    this.now = reaction
    this.holdLeft = reaction.holds
    this.bob.speed += reaction.kick
    this.part.speed += reaction.part * 6
    this.prop.speed += reaction.prop * 4
    // An answer wakes it from whatever it was idly doing.
    this.delight = null
    this.idleIn = between(this.rng, this.is.idleEvery)
    this.answers += 1
    return reaction.says
  }

  /** Advances by `step` seconds of play. Returns the voice of an answer that starts in this step, if it has one. */
  step(step: number): Reaction['says'] {
    this.clock += step
    let says: Reaction['says'] = null
    if (this.waiting) {
      this.waiting.left -= step
      if (this.waiting.left <= 0) {
        const act = this.waiting.act
        this.waiting = null
        says = this.begin(act)
      }
    }
    if (this.now && (this.holdLeft -= step) <= 0) {
      this.now = null
      if (this.next && !this.waiting) {
        says = this.begin(this.next)
        this.next = null
      }
    }

    // An idle delight, when it is answering nothing.
    if (!this.now && !this.delight && !this.directed && (this.idleIn -= step) <= 0) {
      let index = below(this.rng, this.is.delights.length - 1)
      if (index >= this.lastDelight && this.lastDelight >= 0) index += 1
      if (this.lastDelight < 0) index = below(this.rng, this.is.delights.length)
      this.lastDelight = index
      this.delight = this.is.delights[index]
      this.delightAt = 0
    }
    let idle: Delight | null = null, p = 0
    if (this.delight) {
      this.delightAt += step
      p = this.delightAt / this.delight.lasts
      if (p >= 1) {
        this.delight = null
        this.idleIn = between(this.rng, this.is.idleEvery)
      } else idle = this.delight
    }

    const is = this.is, now = this.now
    const breath = Math.sin(this.clock * Math.PI * 2 * is.breath.hz) * is.breath.amp
    const told = this.directed
    pull(this.lean, (now?.lean ?? 0) + (told ? told.lean : idle?.lean?.(p) ?? 0), is.stiffness, is.damping, step)
    pull(this.bob, (told ? 0 : breath) + (told ? told.bob : idle?.bob?.(p) ?? 0), is.stiffness, is.damping, step)
    pull(this.part, told ? told.part : idle?.part?.(p) ?? 0, is.partStiffness, is.partDamping, step)
    pull(this.prop, told ? told.prop : idle?.prop?.(p) ?? 0, is.partStiffness, is.partDamping, step)
    pull(this.open, now?.open ?? (told ? told.open : idle?.open?.(p) ?? 0), 160, 18, step)

    // The lids: at rest, shut by a blink, or as the delight has them. Wide eyes lift them.
    if ((this.blinkIn -= step) <= 0) {
      this.blinkAt = 0
      this.blinksLeft = is.blink.twice ? 1 : 0
      this.blinkIn = between(this.rng, is.blink.every)
    }
    let blink = 0
    if (this.blinkAt >= 0) {
      this.blinkAt += step
      blink = hump(this.blinkAt / is.blink.lasts)
      if (this.blinkAt >= is.blink.lasts) {
        // The second blink of a pair follows the first at once.
        if (this.blinksLeft > 0) {
          this.blinksLeft -= 1
          this.blinkAt = 0
        } else this.blinkAt = -1
      }
    }
    const wide = now?.wide ?? told?.wide ?? 1
    const rest = wide > 1 || told ? 0 : is.restLid
    const pose = this.pose
    // A poke opens the eyes of a sleeper for as long as it answers.
    pose.lid = Math.min(1, Math.max(rest, blink, now ? 0 : told ? told.lid : idle?.lid?.(p) ?? 0))
    pose.wide += (wide - pose.wide) * Math.min(1, step * 14)
    pose.brow += ((now?.brow ?? told?.brow ?? 0) - pose.brow) * Math.min(1, step * 12)
    pose.mouth = now?.mouth ?? told?.mouth ?? idle?.mouth ?? 'smile'
    pose.open = Math.min(1, Math.max(0, this.open.at))
    pose.lean = this.lean.at
    pose.bob = this.bob.at
    pose.part = this.part.at
    pose.prop = this.prop.at

    // The eyes go to what they follow, each folk at its own speed.
    const target = this.clock < this.look.until ? this.look : is.restGaze
    const dx = target.x - is.eyes.x, dy = target.y - is.eyes.y
    const far = Math.hypot(dx, dy) || 1
    const reach = Math.min(1, far / 260)
    const ease = Math.min(1, step * is.eyeSpeed)
    pose.gazeX += ((dx / far) * reach - pose.gazeX) * ease
    pose.gazeY += ((dy / far) * reach - pose.gazeY) * ease
    return says
  }
}
