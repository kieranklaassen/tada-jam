import { draw } from './jobs'

// How things move. Numbers only: the view maps them onto what it draws.
//
// Springs, the director that picks what a character does next, and the old
// hand, who is heavy and slow: a long breath, eyes that follow the hand at
// work, a paw that cannot leave her tea and her biscuits alone, and a coat
// that stands on end at a short and takes its time to lie down again.
// The customers are in folk.ts. No motion is shared between any two of them:
// their variants have different names, different tempos and different
// springs, and tests hold that.

// --- Springs ---------------------------------------------------------------------

export type Spring = { x: number; v: number }

/** One damped spring toward `target`, stepped in slices of at most 1/120 s so a long frame cannot blow it up. */
export function stepSpring(s: Spring, target: number, stiffness: number, damping: number, dt: number): void {
  let left = Math.min(dt, 0.1)
  while (left > 1e-9) {
    const h = Math.min(left, 1 / 120)
    s.v += (-(s.x - target) * stiffness - s.v * damping) * h
    s.x += s.v * h
    left -= h
  }
}

/** How a lead swings: light, a little under-damped, so it overshoots and settles. */
export const LEAD_SPRING = { stiffness: 90, damping: 7 } as const

// --- The director ----------------------------------------------------------------

/** Picks the next variant from a seeded stream, never the one just played. */
export class Director {
  private state: number
  constructor(seed: number) {
    this.state = seed >>> 0
  }
  next(): number {
    const [value, state] = draw(this.state)
    this.state = state
    return value
  }
  pick<T>(variants: readonly T[], last: T | null): T {
    const others = variants.filter((v) => v !== last)
    return others[Math.min(others.length - 1, Math.floor(this.next() * others.length))]
  }
  between(low: number, high: number): number {
    return low + this.next() * (high - low)
  }
}

// --- The old hand ----------------------------------------------------------------

export const RACCOON = {
  /** Breaths a second: slow. */
  breath: 0.2,
  /** Her whiskers: heavy and well damped. */
  whiskers: { stiffness: 14, damping: 4.2 },
  /** The tea in her mug. */
  slosh: { stiffness: 60, damping: 4 },
  /** Her coat, on end: up at once, and a long time lying down again. */
  fur: { stiffness: 3, damping: 6 },
  /** Her free paw: unhurried, and it arrives without a bounce. */
  paw: { stiffness: 38, damping: 10 },
  /** What she does by herself, awake on her stool: none of it has anything to do with the mend. */
  idle: ['ear-flick-left', 'ear-flick-right', 'tail-swish', 'sip', 'dunk', 'goggles-down', 'whisker-preen', 'side-eye', 'yawn'],
  /** How long each takes, in seconds. */
  takes: { 'ear-flick-left': 0.7, 'ear-flick-right': 0.7, 'tail-swish': 1.4, sip: 2.8, dunk: 3.6, 'goggles-down': 3.2, 'whisker-preen': 1.8, 'side-eye': 2.4, yawn: 2.2, 'smooth-down': 1.9, guard: 1.5, huff: 0.9, inspect: 4.4, 'knock-lid': 1.7 },
  /** Where she meddles: what she does with the child's own things when they come within her reach. Nothing she does changes the circuit. */
  meddling: ['inspect', 'knock-lid'],
  /** Seconds between two of them. */
  rest: [2.5, 6],
} as const

export type RaccoonIdle = (typeof RACCOON.idle)[number]
/**
 * What she is doing: one of her own small things; an answer to something (smoothing her coat down after a fright,
 * guarding what is hers, a huff at a poke); or meddling: a part the child has laid within her reach is picked up, looked
 * at through her goggles and put back exactly where it lay, and the open lid of a gadget gets a knock.
 */
export type RaccoonDoing = RaccoonIdle | 'smooth-down' | 'guard' | 'huff' | 'inspect' | 'knock-lid'

/** Where her free paw rests on the counter, about the middle of her face, and where it goes. */
export const PAW = {
  rest: { x: 62, y: 118 },
  mouth: { x: 10, y: 34 },
  cheek: { x: 46, y: 18 },
  brow: { x: 18, y: -44 },
  goggles: { x: 34, y: -30 },
  /** Where she holds a thing up to look at it. */
  look: { x: 52, y: 6 },
} as const

type V = { x: number; y: number }
/** What she can see of the bench this frame. Every point is about the middle of her face. */
export type RaccoonSees = {
  /** Where the finger is, while it is down. */
  finger?: V | null
  /** Where she looks when nothing else has her eye: the board on the mat, or her mug. */
  rest?: V
  /** Her mug and her plate, as her paw finds them. */
  mug?: V
  plate?: V
  /** Her practice board, and how far she is through showing a neat way on it: -1 when she shows none. */
  practice?: V
  neat?: number
  /** How hard a blade on the mat blows, 0 to 3; negative when it sucks. */
  wind?: number
  /** A part the child has laid on the bench within her reach, with nothing clipped to it; and the open lid of the gadget on the mat. */
  loose?: V | null
  lid?: V | null
}

export class Raccoon {
  /** -1 to 1: out and in. */
  breath = 0
  /** 0 at rest, 1 standing straight out. */
  readonly whiskers: Spring = { x: 0, v: 0 }
  readonly slosh: Spring = { x: 0, v: 0 }
  /** 0 lying flat, 1 every hair on end. */
  readonly fur: Spring = { x: 0, v: 0 }
  /** What she is doing now, and how far through it she is, 0 to 1. */
  doing: RaccoonDoing | null = null
  progress = 0
  /** How wide a fright has opened her eyes: 0 as she usually holds them, heavy-lidded; 1 round, after a pop. */
  eye = 0
  /** A blink: 0 open, 1 shut. */
  blink = 0
  /** Where her eyes are turned, each from -1 to 1. */
  readonly gaze: V = { x: 0.5, y: 0.6 }
  /** Her free paw, about the middle of her face. */
  readonly paw = { x: { x: PAW.rest.x, v: 0 } as Spring, y: { x: PAW.rest.y, v: 0 } as Spring }
  /** What her free paw holds: a biscuit, between the plate and her mouth; or a part of the child's, between where it lay and her goggles. */
  holds: 'biscuit' | 'part' | null = null
  /** Knocks of her knuckles on a lid that have landed since they were last taken: for the sound of them. */
  knocks = 0
  /** How far the mug is lifted to her mouth, 0 to 1. */
  mug = 0
  /** How far her goggles are down over her eyes, 0 to 1. */
  goggles = 0
  /** Seconds her ear is still turned to a new sound from the bench. */
  ear = 0
  /** How far a fan that sucks has drawn her whiskers in toward the bench, 0 to 1. */
  drawn = 0
  /** Where she guards: the thing of hers that was touched. */
  private guarding: V | null = null
  private seconds = 0
  private wait: number
  private startled = 0
  private blinkIn: number
  private lastDone: RaccoonDoing | null = null
  /** What she does next, once her fright is over. */
  private then: { at: number; doing: RaccoonDoing } | null = null

  constructor(private readonly director: Director) {
    this.wait = director.between(1.5, 4)
    this.blinkIn = director.between(1.5, 4)
  }

  private start(doing: RaccoonDoing): void {
    this.doing = doing
    this.progress = 0
    this.holds = null
  }

  /** A cell's flag popped: her coat and her whiskers stand out, her eyes go round, the tea jumps. Then she smooths herself down as if nothing had happened. */
  pop(): void {
    this.whiskers.v += 9
    this.slosh.v += 7
    this.fur.x = Math.max(this.fur.x, 1)
    this.fur.v = 0
    this.startled = 1.6
    this.doing = null
    this.holds = null
    this.then = { at: this.seconds + 1.3, doing: 'smooth-down' }
  }

  /** Poked: an ear flicks at once, or she huffs, whatever she was doing. */
  poke(): void {
    this.start(this.director.pick(['ear-flick-left', 'ear-flick-right', 'huff'] as const, this.doing))
  }

  /** Something of hers was touched: her eyes go to it, narrowed, and if her paw can reach it, her paw goes there too. */
  guard(at: V): void {
    this.guarding = at
    this.start('guard')
  }

  /** She lets go of whatever she is meddling with, at once: the child wants it, or it has gone. */
  leave(): void {
    if (this.doing !== 'inspect' && this.doing !== 'knock-lid') return
    this.doing = null
    this.progress = 0
    this.holds = null
  }

  /** A new sound from the bench: the ear on that side turns to it, whatever else she is doing. */
  hark(): void {
    this.ear = 0.7
  }

  /** How far she is through the middle of what she is doing: 0 at both ends, 1 through the middle. */
  get swing(): number {
    return Math.sin(Math.min(1, Math.max(0, this.progress)) * Math.PI)
  }

  step(dt: number, sees: RaccoonSees = {}): void {
    this.seconds += dt
    this.breath = Math.sin(this.seconds * RACCOON.breath * Math.PI * 2)
    const wind = sees.wind ?? 0
    stepSpring(this.whiskers, 0, RACCOON.whiskers.stiffness, RACCOON.whiskers.damping, dt)
    // A fan that sucks draws her whiskers in toward the bench for as long as it turns.
    this.drawn += ((wind < 0 ? Math.min(1, -wind / 2) : 0) - this.drawn) * Math.min(1, dt * 3)
    stepSpring(this.slosh, 0, RACCOON.slosh.stiffness, RACCOON.slosh.damping, dt)
    // A fan's wind lifts her coat a little for as long as it blows.
    stepSpring(this.fur, Math.min(0.5, Math.abs(wind) * 0.2), RACCOON.fur.stiffness, RACCOON.fur.damping, dt)
    this.ear = Math.max(0, this.ear - dt)
    this.startled = Math.max(0, this.startled - dt)
    // The eyes open fast and go heavy again slowly.
    this.eye += ((this.startled > 0.5 ? 1 : 0) - this.eye) * Math.min(1, dt * (this.startled > 0.5 ? 14 : 2.5))
    if ((this.blinkIn -= dt) <= 0) this.blinkIn = this.director.between(2.2, 5.5)
    this.blink = this.blinkIn < 0.16 ? Math.sin((this.blinkIn / 0.16) * Math.PI) : 0

    const neat = sees.neat ?? -1, showing = neat >= 0 && neat < 1
    if (this.then && this.seconds >= this.then.at) {
      if (!showing) this.start(this.then.doing)
      this.then = null
    }
    if (this.doing) {
      this.progress += dt / RACCOON.takes[this.doing]
      if (this.progress >= 1) {
        this.wait = this.director.between(RACCOON.rest[0], RACCOON.rest[1])
        this.lastDone = this.doing
        this.doing = null
        this.progress = 0
        this.holds = null
      }
    } else if (!showing && this.startled <= 0 && (this.wait -= dt) <= 0) {
      // Half the time, when something of the child's is within her reach, she cannot leave it alone.
      const within: RaccoonDoing[] = [...(sees.loose ? (['inspect'] as const) : []), ...(sees.lid ? (['knock-lid'] as const) : [])].filter((d) => d !== this.lastDone)
      if (within.length > 0 && this.director.next() < 0.5) this.start(this.director.pick(within, null))
      else this.start(this.director.pick(RACCOON.idle, this.lastDone))
    }
    if ((this.doing === 'inspect' && !sees.loose) || (this.doing === 'knock-lid' && !sees.lid)) this.leave()

    // Where her free paw goes, and what the rest of her does with it.
    const t = this.progress, at = (from: number, to: number) => t >= from && t < to
    const mug = sees.mug ?? PAW.rest, plate = sees.plate ?? PAW.rest
    let paw: V = PAW.rest, lift = 0, goggles = 0
    if (showing && sees.practice) {
      // She reaches to her board, does it, and goes back.
      const reach = Math.sin(Math.min(1, neat / 0.9) * Math.PI)
      paw = { x: PAW.rest.x + (sees.practice.x - PAW.rest.x) * reach, y: PAW.rest.y + (sees.practice.y - PAW.rest.y) * reach }
      goggles = reach > 0.3 ? 1 : 0
    } else if (this.doing === 'sip') lift = at(0.12, 0.8) ? 1 : 0
    else if (this.doing === 'dunk') {
      // To the plate, into the tea, to her mouth, and back to the counter.
      if (at(0.08, 0.3)) paw = plate
      else if (at(0.3, 0.55)) paw = { x: mug.x + 10, y: mug.y - 6 }
      else if (at(0.55, 0.86)) paw = PAW.mouth
      if (at(0.22, 0.8)) this.holds = 'biscuit'
      else this.holds = null
    } else if (this.doing === 'goggles-down') {
      goggles = at(0.14, 0.82) ? 1 : 0
      if (at(0.02, 0.2) || at(0.78, 0.94)) paw = PAW.goggles
    } else if (this.doing === 'whisker-preen') {
      paw = at(0.1, 0.9) ? { x: PAW.cheek.x + Math.sin(t * Math.PI * 6) * 9, y: PAW.cheek.y + Math.sin(t * Math.PI * 6) * 3 } : PAW.rest
      if (at(0.1, 0.9)) this.whiskers.v += Math.cos(t * Math.PI * 6) * 14 * dt
    } else if (this.doing === 'smooth-down') {
      // One slow stroke over the top of her head, and her coat lies down under it.
      paw = at(0.08, 0.9) ? { x: PAW.brow.x - (t - 0.1) * 60, y: PAW.brow.y + Math.abs(t - 0.5) * 16 } : PAW.rest
      if (t > 0.2) stepSpring(this.fur, 0, 60, 14, dt)
    } else if (this.doing === 'inspect' && sees.loose) {
      // Down to the part, up with it to her goggles, a long look, and back with it to exactly where it lay.
      if (at(0.04, 0.24) || at(0.8, 0.96)) paw = sees.loose
      else if (at(0.24, 0.8)) paw = { x: PAW.look.x + Math.sin(t * 20) * 3, y: PAW.look.y }
      this.holds = at(0.18, 0.9) ? 'part' : null
      goggles = at(0.2, 0.84) ? 1 : 0
    } else if (this.doing === 'knock-lid' && sees.lid) {
      // Over to the lid, two knocks with her knuckles, and back.
      const before = this.progress - dt / RACCOON.takes['knock-lid']
      for (const land of [0.42, 0.62]) if (before < land && t >= land) this.knocks++
      const down = at(0.36, 0.46) || at(0.56, 0.66) ? 0 : -16
      if (at(0.1, 0.8)) paw = { x: sees.lid.x, y: sees.lid.y + down }
    } else if (this.doing === 'guard' && this.guarding) {
      const far = Math.hypot(this.guarding.x - PAW.rest.x, this.guarding.y - PAW.rest.y) > 150
      if (!far && at(0.05, 0.85)) paw = this.guarding
    }
    stepSpring(this.paw.x, paw.x, RACCOON.paw.stiffness, RACCOON.paw.damping, dt)
    stepSpring(this.paw.y, paw.y, RACCOON.paw.stiffness, RACCOON.paw.damping, dt)
    this.mug += (lift - this.mug) * Math.min(1, dt * 5)
    this.goggles += (goggles - this.goggles) * Math.min(1, dt * 7)

    // Her eyes: on the finger while it works; on what she guards; on what her paw is busy with; sideways at the
    // customer now and then; and otherwise on the bench.
    let look: V = sees.rest ?? { x: 160, y: 190 }
    if (this.doing === 'guard' && this.guarding) look = this.guarding
    else if (sees.finger) look = sees.finger
    else if (showing && sees.practice) look = sees.practice
    else if (this.doing === 'side-eye') look = at(0.15, 0.8) ? { x: 420, y: -10 } : look
    else if (this.doing === 'dunk' || this.doing === 'sip') look = { x: mug.x, y: mug.y }
    else if (this.doing === 'inspect') look = { x: this.paw.x.x, y: this.paw.y.x + 14 }
    else if (this.doing === 'knock-lid' && sees.lid) look = sees.lid
    const far = Math.hypot(look.x, look.y) || 1, reach = Math.min(1, far / 120)
    const follow = Math.min(1, dt * (sees.finger ? 12 : 6))
    this.gaze.x += ((look.x / far) * reach - this.gaze.x) * follow
    this.gaze.y += ((look.y / far) * reach - this.gaze.y) * follow
  }
}
