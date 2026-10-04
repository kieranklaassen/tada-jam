import { Director, PARTS, bitLength, type Bit, type Part, type Personality, type Reaction } from './personality'
import type { Rng } from './rng'

// The customer as a puppet: each part of its face and body is one number
// that eases towards where a bit of business drives it, on springs that are
// the customer's own weight. It breathes all the time, does a small thing of
// its own every few seconds when nobody is touching it, and never the same
// thing twice running. Pure numbers; the view turns them into a drawing.

/** The parts that ride on the heavy spring of the body. The rest are quick: eyelids, ears, eyes, nose. */
const HEAVY: readonly Part[] = ['tail', 'mouthOpen', 'smile', 'brow', 'tilt', 'bob', 'sink', 'lift', 'shift', 'spin']

/** A value on a spring. */
export type Spring = { x: number; v: number }

/** One step of a spring towards a target. */
export function ease(spring: Spring, target: number, stiffness: number, damping: number, dt: number): void {
  spring.v += (stiffness * (target - spring.x) - damping * spring.v) * dt
  spring.x += spring.v * dt
}

/** The parts that have a left and a right: a bit played the other way round moves these the other way. */
const SIDED: readonly Part[] = ['lookX', 'tilt', 'shift']

/** Which way round a bit is played: as written, the other way round, or the other way round from its second look on. */
export type Turn = boolean | 'second'

/** The steps of play are this long, whatever the frame rate. */
export const TICK = 1 / 120

export class Puppet {
  readonly personality: Personality
  private readonly director: Director
  private readonly rng: Rng
  private readonly parts: Record<Part, Spring>
  private playing: { bit: Bit; t: number; from: number }[] = []
  private untilIdle: number
  /** 0 to 1 through one breath. */
  breath = 0
  /** How far the head is drawn towards something that pulls at its hair, in scene units. */
  readonly lean = { x: { x: 0, v: 0 }, y: { x: 0, v: 0 } }
  private leanTo = { x: 0, y: 0 }
  /** How far a cheek is pulled out, in scene units. */
  readonly cheek = { x: { x: 0, v: 0 }, y: { x: 0, v: 0 } }
  private cheekTo: { x: number; y: number } | null = null
  /** How squashed the head is: above nothing it is flat and wide, below it tall and thin. It bounces back by itself. */
  readonly squash = { x: 0, v: 0 }
  /** The names of the bits that started since this was last read, for a test or a log. */
  readonly started: string[] = []

  constructor(personality: Personality, rng: Rng) {
    this.personality = personality
    this.rng = rng
    this.director = new Director(rng)
    this.parts = Object.fromEntries(PARTS.map((part) => [part, { x: personality.rest[part] ?? 0, v: 0 }])) as Record<Part, Spring>
    this.untilIdle = rng.range(personality.gap[0], personality.gap[1])
  }

  /** Where a part is now. */
  at(part: Part): number {
    return this.parts[part].x
  }

  /** A bit of business is going on. */
  get busy(): boolean {
    return this.playing.length > 0
  }

  /**
   * Plays one bit. `turned` plays it the other way round, left for right, for
   * a look at something that is on its other side; `'second'` plays its first
   * look as written and everything after that the other way round, for a look
   * from one thing to another that is on the other side of it.
   */
  play(bit: Bit, turned: Turn = false): void {
    const later = bit.moves.filter((m) => SIDED.includes(m.part) && m.at > 0).map((m) => m.at)
    this.playing.push({ bit, t: 0, from: turned === true ? 0 : turned === 'second' && later.length > 0 ? Math.min(...later) : Infinity })
    this.started.push(bit.id)
  }

  /** What it does about something that happened to it: one of its reactions of that name, a different one each time. */
  react(name: Reaction, turned: Turn = false): void {
    const bits = this.personality.reactions[name]
    if (bits && bits.length > 0) this.play(this.director.pick(bits), turned)
  }

  /** How long its reaction of that name lasts at the longest, for a scene that waits for it. */
  lasts(name: Reaction): number {
    return this.personality.reactions[name].reduce((most, bit) => Math.max(most, bitLength(bit)), 0)
  }

  /** Everything it was doing stops, and every part is at rest: where a scene that was cut short leaves it. */
  rest(): void {
    this.playing = []
    for (const part of PARTS) { this.parts[part].x = this.personality.rest[part] ?? 0; this.parts[part].v = 0 }
  }

  /** Something pulls at its hair, that far from where the hair is at rest: the head goes a little after it. Nothing, to let it come back. */
  pulledTowards(offset: { x: number; y: number } | null): void {
    this.leanTo = offset ? { x: Math.max(-26, Math.min(26, offset.x * 0.16)), y: Math.max(-14, Math.min(22, offset.y * 0.12)) } : { x: 0, y: 0 }
  }

  /** A cheek is held, that far from where it was caught. Nothing, to let it snap back. */
  cheekHeld(offset: { x: number; y: number } | null): void {
    const reach = offset ? Math.hypot(offset.x, offset.y) : 0
    // Dough gives less the further it is pulled.
    const give = reach > 0 ? (70 * (1 - Math.exp(-reach / 70))) / reach : 0
    this.cheekTo = offset ? { x: offset.x * give, y: offset.y * give } : null
  }

  /** Something landed on it, or it landed on something: the head squashes and bounces back. */
  bump(by = 1): void {
    this.squash.v += 9 * by
  }

  /** Plays `dt` seconds. `idle` says nobody is touching: only then does it start things of its own. */
  step(dt: number, idle: boolean): void {
    let left = dt
    while (left > 1e-9) {
      const tick = Math.min(TICK, left)
      left -= tick
      this.tick(tick, idle)
    }
  }

  private tick(dt: number, idle: boolean): void {
    const p = this.personality
    this.breath = (this.breath + dt / p.breath) % 1
    for (const playing of this.playing) playing.t += dt
    this.playing = this.playing.filter((playing) => playing.t < bitLength(playing.bit))

    if (idle && this.playing.length === 0) {
      this.untilIdle -= dt
      if (this.untilIdle <= 0) {
        this.play(this.director.pick(p.idle))
        this.untilIdle = this.rng.range(p.gap[0], p.gap[1])
      }
    }

    for (const part of PARTS) {
      let target = p.rest[part] ?? 0
      // The move that started last has the part.
      for (const { bit, t, from } of this.playing) for (const m of bit.moves) if (m.part === part && t >= m.at && t < m.at + m.hold) target = m.at >= from && SIDED.includes(part) ? -m.to : m.to
      const heavy = HEAVY.includes(part)
      const stiffness = heavy ? p.stiffness : p.quick
      ease(this.parts[part], target, stiffness, heavy ? p.damping : 2 * Math.sqrt(stiffness) * 0.85, dt)
    }
    ease(this.lean.x, this.leanTo.x, p.stiffness, p.damping, dt)
    ease(this.lean.y, this.leanTo.y, p.stiffness, p.damping, dt)
    // A cheek follows the finger closely while it is held, and wobbles back like dough when it is let go.
    const held = this.cheekTo !== null
    ease(this.cheek.x, this.cheekTo?.x ?? 0, held ? 600 : 170, held ? 44 : 9, dt)
    ease(this.cheek.y, this.cheekTo?.y ?? 0, held ? 600 : 170, held ? 44 : 9, dt)
    ease(this.squash, 0, 240, 9, dt)
  }
}
