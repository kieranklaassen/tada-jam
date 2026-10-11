// How things on the table move. A thing's pose is a handful of named numbers
// (how far the bumper is squashed, how far a jaw is open), and each number
// moves towards the last target a beat gave it, in the thing's own manner.
// Pure numbers on game time: the view maps them onto sprites.

/** How one kind of thing moves towards a pose: its tempo, its weight, and how late it is. */
export type Manner = {
  /** How hard the spring pulls: high is quick, low is slow. */
  stiffness: number
  /** How fast it settles: low wobbles on, high stops dead. */
  damping: number
  /** Seconds this thing answers after everyone else to what happens on the table. */
  late: number
}

/**
 * The manners. No two are alike, and a test holds that.
 * - The bumper is hard rubber: quick, with two or three wobbles.
 * - A brick is plastic on a post: quick and soon still.
 * - The drum skin is taut: it sings on for a moment.
 * - The bell hangs: slow, and swings for a long time.
 * - The dragon is quick and jerky. The walrus is slow and sloshes. The
 *   elephant is heavy, and late: it answers after everyone else.
 * - The ladybird is tiny and light.
 */
export const MANNERS = {
  bumper: { stiffness: 620, damping: 15, late: 0 },
  brick: { stiffness: 420, damping: 19, late: 0 },
  jelly: { stiffness: 190, damping: 4.5, late: 0 },
  ice: { stiffness: 980, damping: 34, late: 0 },
  seed: { stiffness: 520, damping: 24, late: 0 },
  sleepy: { stiffness: 70, damping: 9, late: 0 },
  rubble: { stiffness: 210, damping: 11, late: 0 },
  drum: { stiffness: 330, damping: 7, late: 0 },
  lamps: { stiffness: 900, damping: 60, late: 0 },
  bell: { stiffness: 46, damping: 1.6, late: 0 },
  folded: { stiffness: 150, damping: 9, late: 0 },
  ball: { stiffness: 300, damping: 30, late: 0 },
  vine: { stiffness: 120, damping: 6, late: 0 },
  dragon: { stiffness: 460, damping: 17, late: 0.04 },
  walrus: { stiffness: 58, damping: 5.5, late: 0.1 },
  elephant: { stiffness: 96, damping: 10, late: 0.24 },
  ladybird: { stiffness: 760, damping: 30, late: 0 },
} as const satisfies Record<string, Manner>
export type MannerName = keyof typeof MANNERS

type Channel = {
  value: number
  velocity: number
  target: number
  /** While easing: where it started, and how far through it is. */
  from: number
  elapsed: number
  /** Seconds the ease takes; 0 when the channel springs. */
  lasts: number
}

/** The longest step one spring update takes; a longer frame is cut into several. */
const MAX_STEP = 1 / 120

/** One thing's pose. */
export class Pose {
  private readonly channels = new Map<string, Channel>()
  private readonly manner: Manner

  constructor(manner: Manner) {
    this.manner = manner
  }

  /**
   * A beat gives a channel its new target. With no `lasts` it springs there in the thing's manner, and may
   * overshoot. With `lasts` it eases there and arrives exactly then, and with `lasts` of 0 it is there at once.
   */
  set(name: string, target: number, lasts?: number): void {
    const channel = this.channel(name)
    channel.target = target
    if (lasts === undefined) {
      channel.lasts = 0
      return
    }
    if (lasts <= 0) {
      channel.value = target
      channel.velocity = 0
      channel.lasts = 0
      return
    }
    channel.from = channel.value
    channel.elapsed = 0
    channel.lasts = lasts
    channel.velocity = 0
  }

  /** Where a channel is now; 0 for one no beat has set. */
  get(name: string): number {
    return this.channels.get(name)?.value ?? 0
  }

  /** Every channel is where it was going, at once. */
  land(): void {
    for (const channel of this.channels.values()) {
      channel.value = channel.target
      channel.velocity = 0
      channel.lasts = 0
    }
  }

  /** Whether every channel has come to rest at its target. */
  get still(): boolean {
    for (const channel of this.channels.values()) {
      if (channel.lasts > 0 || Math.abs(channel.value - channel.target) > 0.002 || Math.abs(channel.velocity) > 0.01) return false
    }
    return true
  }

  step(seconds: number): void {
    let left = seconds
    while (left > 1e-9) {
      const h = Math.min(left, MAX_STEP)
      left -= h
      for (const channel of this.channels.values()) {
        if (channel.lasts > 0) {
          channel.elapsed += h
          const t = Math.min(1, channel.elapsed / channel.lasts)
          // Slow in, slow out.
          channel.value = channel.from + (channel.target - channel.from) * (t * t * (3 - 2 * t))
          if (t >= 1) channel.lasts = 0
          continue
        }
        channel.velocity += (this.manner.stiffness * (channel.target - channel.value) - this.manner.damping * channel.velocity) * h
        channel.value += channel.velocity * h
      }
    }
  }

  private channel(name: string): Channel {
    let channel = this.channels.get(name)
    if (!channel) {
      channel = { value: 0, velocity: 0, target: 0, from: 0, elapsed: 0, lasts: 0 }
      this.channels.set(name, channel)
    }
    return channel
  }
}

/**
 * What each large toy does while nothing happens, as numbers the view adds to its pose. Each has its own period
 * and its own part that moves, so no two idle alike: the dragon's flame flickers and its head darts, the walrus
 * rises and sinks in its tub as it breathes, and the elephant's ears fan slowly, one after the other.
 */
export function idle(toy: 'dragon' | 'walrus' | 'elephant', seconds: number): { bob: number; part: number; other: number } {
  if (toy === 'dragon') {
    // A flame that gutters on two rates that never line up, and a head that darts and holds.
    const dart = Math.floor(seconds / 1.7)
    const hold = Math.min(1, (seconds / 1.7 - dart) * 9)
    const side = (n: number) => Math.sin(n * 12.9898) * 0.5
    return { bob: side(dart) + (side(dart + 1) - side(dart)) * hold * hold * (3 - 2 * hold), part: 0.6 + 0.25 * Math.sin(seconds * 23) + 0.15 * Math.sin(seconds * 37.1), other: Math.sin(seconds * 5.3) }
  }
  if (toy === 'walrus') {
    // Long breaths, with the water a quarter turn behind the body.
    const breath = seconds * ((2 * Math.PI) / 4.6)
    return { bob: Math.sin(breath), part: Math.sin(breath - Math.PI / 2), other: Math.sin(seconds * 0.9) }
  }
  // One ear, then the other, and a trunk that sways half as fast.
  const fan = seconds * ((2 * Math.PI) / 3.1)
  return { bob: Math.sin(fan * 0.5) * 0.4, part: Math.sin(fan), other: Math.sin(fan - 1.9) }
}

/** Whether an eye is shut at this moment: a blink of about a tenth of a second, at gaps that differ for each `who`. */
export function blinking(who: number, seconds: number): boolean {
  const period = 2.9 + (who % 7) * 0.47
  const phase = (seconds + who * 1.37) % period
  return phase < 0.11
}

/** How far the dragon's mouth stands open while nothing has asked it to move. It holds its gate open towards the ball. */
export const REST_JAW = 0.3

/**
 * How far open the dragon's mouth is: what its pose asks for, and never less than it holds it open at rest. It
 * opens wider as the ball comes to its gate. `far` is how far the flying ball is from the gate.
 */
export function gape(jaw: number, far: number): number {
  const near = Math.max(0, 1 - far / 240)
  return Math.max(jaw, REST_JAW + near * 0.45)
}

/**
 * The flame at the dragon's nostril, which it keeps trying to hide. Every few seconds it holds its breath and
 * squints at the flame, which shrinks to a spark; then it cannot hold it any longer and the flame bursts out
 * larger than before. `size` is how large the flame is (1 is as usual) and `looking` is whether the dragon is
 * squinting at it.
 */
export function hidingFlame(seconds: number): { size: number; looking: boolean } {
  const t = seconds % 7.3
  if (t < 5.6) return { size: 1, looking: false }
  const u = t - 5.6
  if (u < 0.25) return { size: 1 - (u / 0.25) * 0.85, looking: true }
  if (u < 1.3) return { size: 0.15, looking: true }
  if (u < 1.45) return { size: 1.5, looking: false }
  return { size: 1.5 - ((u - 1.45) / 0.25) * 0.5, looking: false }
}

/**
 * The breath of an ice brick, which shows because it is cold: a puff every few seconds, at a moment of its own
 * for each `who`. Returns how far along the puff is, from 0 to 1, or -1 between puffs.
 */
export function breath(who: number, seconds: number): number {
  const period = 3.1 + (who % 5) * 0.43
  const phase = (seconds + who * 0.83) % period
  return phase < 0.9 ? phase / 0.9 : -1
}
