// How the badger and its bakery move (the customers are in cast.ts). Each has its own
// tempo, its own weight and its own funniest part, so no two share an
// animation and a poke never gets the same answer twice running. A print
// moves as cut-out pieces of itself, so all this module gives is numbers for
// whole sprites: a slide, a turn and a squash about the foot, and which
// printed state to lay down. Pure: time arrives through `step`, and chance
// comes from the seed.

export type Who = 'badger' | 'sack' | 'jug' | 'jar' | 'dish' | 'peel' | 'door' | 'fire'
export const EVERYONE: readonly Who[] = ['badger', 'sack', 'jug', 'jar', 'dish', 'peel', 'door', 'fire']

/**
 * How a sprite is laid this frame: slid by dx,dy (reference units, y down as on the canvas, so a hop is a negative dy), turned (radians, positive
 * tips the top to the right) about its foot (bottom centre), scaled about its foot, and which printed state to use. Rest is dx=dy=turn=0, sx=sy=1, frame=0.
 */
export type Pose = { dx: number; dy: number; turn: number; sx: number; sy: number; frame: number }

/** Things the game tells a character. `show` goes on until `rest`; everything else plays once. */
export type Cue = 'flour' | 'water' | 'bubbly' | 'seeds' | 'flour-over' | 'water-over' | 'push' | 'slap' | 'fed' | 'door-shut' | 'door-open' | 'knock' | 'fan' | 'shrug' | 'show' | 'rest'

/** No pose ever leaves these: the furthest slide, the furthest turn, the smallest and the largest scale. */
export const LIMITS = { slide: 40, turn: 0.3, small: 0.8, big: 1.25 } as const

/** Every motion is advanced in steps of this many seconds, so the length of a frame changes nothing. */
const STEP = 1 / 120
/** The most one call to `step` takes: a game back from a long sleep is not owed every second of it. */
const LONGEST = 60
/** How long a reaction takes to let go when another one cuts in. */
const FADE = 0.15
const NEVER = 1e12
const TAU = Math.PI * 2

/** A move: adds itself to the pose `t` seconds after it began. `k` is its size this time. Scales are sums about 0 here. */
type Curve = (t: number, p: Pose, k: number) => void
type Act = { name: string; length: number; curve: Curve; voices: readonly (readonly [number, string])[] }
/** Something a character does on its own, now and then: first at about `first` seconds, then every so often. */
type Habit = { first: number; every: readonly [number, number]; acts: readonly Act[] }
type Kind = { rest?: (t: number, p: Pose) => void; habits: readonly Habit[]; pokes: readonly Act[] }

const act = (name: string, length: number, curve: Curve, ...voices: [number, string][]): Act => ({ name, length, curve, voices })
const habit = (first: number, least: number, most: number, ...acts: Act[]): Habit => ({ first, every: [least, most], acts })

/** Smoothly 0 to 1 between a and b. */
const ramp = (t: number, a: number, b: number) => { const x = t <= a ? 0 : t >= b ? 1 : (t - a) / (b - a); return x * x * (3 - 2 * x) }
/** Up between a and b, held, and down again between c and d. */
const hold = (t: number, a: number, b: number, c: number, d: number) => ramp(t, a, b) * (1 - ramp(t, c, d))
/** One soft bump between a and b. */
const hump = (t: number, a: number, b: number) => (t <= a || t >= b ? 0 : Math.sin((Math.PI * (t - a)) / (b - a)) ** 2)
/** A thrown arc between a and b: what a hop does. */
const arc = (t: number, a: number, b: number) => { const x = (t - a) / (b - a); return x <= 0 || x >= 1 ? 0 : 4 * x * (1 - x) }
/** A wobble of `hz` swings a second that starts at a and has died away by b. */
const ring = (t: number, a: number, b: number, hz: number) => (t <= a || t >= b ? 0 : Math.sin(TAU * hz * (t - a)) * (1 - (t - a) / (b - a)) ** 2)
/** A blow: gathers speed from a, lands at b at full speed, and is let go of by c. */
const strike = (t: number, a: number, b: number, c: number) => (t <= a ? 0 : t < b ? ((t - a) / (b - a)) ** 2 : 1 - ramp(t, b, c))
/** A landing at a: squashed at once, and out of it by b. */
const thud = (t: number, a: number, b: number) => hold(t, a - 0.02, a + 0.03, a + 0.03, b)

// The badger: heavy and slow. It gathers itself before anything big and sinks past rest after. Funniest part: the belly.
const BADGER: Kind = {
  // A slow breath: taller and a touch narrower, so it keeps its amount.
  rest: (t, p) => { const breath = Math.sin((TAU * t) / 3.6); p.sy += 0.015 * breath; p.sx -= 0.005 * breath },
  habits: [
    habit(1.9, 2.4, 6.2, act('blink', 0.12, (_t, p) => { p.frame = 1 })),
    habit(6, 9, 14,
      act('shoulder-roll', 1.5, (t, p) => { p.turn += 0.03 * (hump(t, 0.5, 1.5) - hump(t, 0, 0.8)); p.sy += 0.02 * hump(t, 0.2, 1.2) }),
      // The oven is to its right.
      act('oven-glance', 1.6, (t, p) => { const look = hold(t, 0, 0.4, 1, 1.6); p.turn += 0.045 * look; p.dx += 3 * look })),
  ],
  pokes: [
    // A slow lean back, held, and a sink past rest on the way home.
    act('grumble', 2, (t, p, k) => {
      const back = hold(t, 0.2, 0.75, 1.05, 1.5), sink = hump(t, 1.35, 2)
      p.turn += k * (0.09 * back - 0.025 * sink); p.sy += k * (0.04 * back - 0.03 * hump(t, 0, 0.35) - 0.025 * sink)
    }, [0.2, 'badger-grumble']),
    // A breath in, then the belly bounces and runs down.
    act('chuckle', 1.7, (t, p, k) => {
      const bounce = t < 0.3 ? 0 : Math.abs(Math.sin(TAU * 1.8 * (t - 0.3))) * (1 - ramp(t, 0.5, 1.7))
      p.sy += k * (0.035 * hump(t, 0, 0.4) - 0.07 * bounce); p.sx += k * 0.04 * bounce
    }, [0.3, 'badger-chuckle']),
    // A small look, a beat, then the real one, and the hat goes on wobbling after the head has stopped.
    act('double-take', 1.8, (t, p, k) => {
      p.turn += k * (0.035 * hold(t, 0, 0.12, 0.45, 0.6) - 0.1 * hold(t, 0.55, 0.7, 1, 1.5) + 0.03 * ring(t, 0.7, 1.8, 5.5)); p.sy += k * 0.03 * hump(t, 0.55, 1.1)
    }, [0.6, 'badger-hm']),
  ],
}
// A long slow breath in, then the whole badger snaps forward.
const SNEEZE = act('sneeze', 1.8, (t, p) => {
  const up = ramp(t, 0, 0.7) * (1 - ramp(t, 0.72, 0.78)), down = strike(t, 0.72, 0.8, 1.5)
  p.sy += 0.06 * up - 0.1 * down + 0.02 * hump(t, 1.3, 1.8); p.turn += 0.04 * up - 0.13 * down
}, [0.78, 'badger-sneeze'])
const SHAKE = act('shake', 1.3, (t, p) => { p.turn += 0.11 * ring(t, 0.12, 1.3, 8); p.sx += 0.03 * hump(t, 0.12, 1.1); p.sy -= 0.03 * hump(t, 0, 0.3) })
// A crouch, a heavy hop off the wet floor, and a deep landing.
const WET_HOP = act('wet-hop', 1.3, (t, p) => { const land = thud(t, 0.74, 1.05); p.dy -= 20 * arc(t, 0.26, 0.74); p.sx += 0.07 * land; p.sy += 0.03 * hump(t, 1, 1.3) - 0.07 * hump(t, 0, 0.32) - 0.11 * land })
// A quick lean in for the dough, a wiggle as it goes down, and two pats of the belly.
const FED = act('fed', 2.3, (t, p) => {
  const lean = hold(t, 0, 0.14, 0.45, 0.75), wiggle = Math.sin(TAU * 4.5 * t) * hump(t, 0.6, 1.5), pat = hump(t, 1.5, 1.75) + hump(t, 1.8, 2.05)
  p.turn -= 0.08 * lean; p.dx += 3 * wiggle; p.sx += 0.04 * wiggle + 0.03 * pat; p.sy += 0.02 * hump(t, 2, 2.3) - 0.05 * lean - 0.045 * pat
}, [0.18, 'badger-slurp'])
// It leans over what lies on the peel and raps it twice with a knuckle: each rap is heard as it lands.
const KNOCK = act('knock', 1.5, (t, p) => {
  const over = hold(t, 0, 0.35, 1.05, 1.5), rap = strike(t, 0.42, 0.52, 0.68) + strike(t, 0.74, 0.84, 1.05)
  p.turn -= 0.07 * over + 0.035 * rap; p.sy -= 0.04 * over + 0.03 * rap; p.dx -= 4 * over
}, [0.52, 'knock'], [0.84, 'knock'])
// Smoke: it flaps its apron at it, quick and small, and the flapping runs down.
const FAN = act('fan', 1.4, (t, p) => { const flap = Math.sin(TAU * 5 * t) * hold(t, 0, 0.15, 0.8, 1.4); p.turn += 0.05 * flap + 0.03 * hump(t, 0, 1.2); p.sx += 0.025 * flap; p.dx += 2.5 * flap })
// A long peer at the thing, then both shoulders up and down again.
const SHRUG = act('shrug', 1.7, (t, p) => {
  const peer = hold(t, 0, 0.4, 0.8, 1.05), up = hold(t, 0.95, 1.12, 1.25, 1.55)
  p.turn -= 0.06 * peer; p.sy += 0.055 * up - 0.03 * peer - 0.02 * hump(t, 1.4, 1.7); p.sx -= 0.02 * up
})

// The sack: heavy and floppy. It gives way under a touch and comes back slowly.
const SACK: Kind = { habits: [], pokes: [
  act('slump', 1, (t, p, k) => { const down = hold(t, 0, 0.09, 0.12, 0.34), spring = ring(t, 0.24, 1, 3.2); p.sy += k * (0.06 * spring - 0.14 * down); p.sx += k * (0.09 * down - 0.03 * spring) }, [0, 'sack-rustle']),
  act('flop', 1.1, (t, p, k) => { p.turn += k * (0.07 * hold(t, 0, 0.28, 0.34, 0.62) - 0.025 * ring(t, 0.56, 1.1, 3)); p.sy -= 0.06 * k * hump(t, 0.1, 0.66) }, [0.06, 'sack-rustle']),
] }
const SACK_HOP = act('sack-hop', 0.56, (t, p) => { const land = thud(t, 0.26, 0.56); p.dy -= 7 * arc(t, 0, 0.26); p.sy -= 0.09 * land; p.sx += 0.05 * land })

// The jar of bubbly: glass with something alive in it. It wobbles slowly, and then the lid lifts. The board is to its left.
const JAR: Kind = { habits: [], pokes: [
  act('burp', 1.1, (t, p, k) => { const lid = strike(t, 0.4, 0.48, 0.75); p.turn += 0.06 * k * ring(t, 0, 0.6, 2.6); p.sy += k * (0.08 * lid - 0.03 * hump(t, 0.75, 1.1)); p.sx -= 0.03 * k * lid }, [0.48, 'burp']),
  act('lid-rattle', 0.5, (t, p, k) => { p.dy -= 2.5 * k * (arc(t, 0, 0.09) + arc(t, 0.12, 0.2) + 0.6 * arc(t, 0.24, 0.31)); p.turn += 0.015 * k * ring(t, 0.05, 0.5, 12) }, [0.09, 'jar-clink']),
] }
const JAR_TIP = act('jar-tip', 1.3, (t, p) => { p.turn += 0.03 * ring(t, 0.9, 1.3, 4) - 0.17 * hold(t, 0, 0.3, 0.7, 0.95); p.dx -= 5 * hold(t, 0, 0.3, 0.7, 0.95) })

// The dish of seeds: light and shallow. Everything it does, the seeds do a moment later.
const DISH: Kind = { habits: [], pokes: [
  act('seed-rattle', 0.7, (t, p, k) => { const rattle = ring(t, 0, 0.7, 9); p.dx += 3.5 * k * rattle; p.dy -= 1.5 * k * Math.abs(rattle) }, [0.02, 'seed-rattle']),
  // A dish cannot turn in a print: it goes narrow and wide again, once, and rocks to a stop.
  act('spin', 0.9, (t, p, k) => { p.sx -= 0.16 * k * hump(t, 0, 0.42); p.turn += 0.04 * k * ring(t, 0.36, 0.9, 5); p.dy -= 2 * k * arc(t, 0, 0.42) }, [0.1, 'seed-ticks']),
] }
const DISH_TILT = act('dish-tilt', 0.9, (t, p) => { p.turn += 0.02 * ring(t, 0.6, 0.9, 7) - 0.13 * hold(t, 0, 0.18, 0.4, 0.62); p.dy -= 4 * hold(t, 0, 0.18, 0.4, 0.62) })

// The oven door: iron on a hinge. It never bends; it bangs, and then it shivers.
const DOOR: Kind = { habits: [], pokes: [
  act('clang', 0.8, (t, p, k) => { p.dx += k * (3 * strike(t, 0, 0.04, 0.2) + 1.5 * ring(t, 0.04, 0.8, 16)); p.sx += 0.012 * k * ring(t, 0.04, 0.8, 16) }, [0.03, 'door-clang']),
  act('handle-rattle', 0.55, (t, p, k) => { p.turn += 0.012 * k * ring(t, 0, 0.55, 11); p.dy += 1.2 * k * Math.abs(ring(t, 0, 0.55, 11)) }, [0.02, 'door-rattle']),
] }
// Shut: it comes home hard, flat for a moment, and rings. Open: it swings away narrow and comes back.
const DOOR_SHUT = act('door-shut', 0.7, (t, p) => { const home = thud(t, 0.06, 0.3); p.sx -= 0.08 * home; p.sy += 0.03 * home; p.dx += 1.5 * ring(t, 0.1, 0.7, 14) }, [0.06, 'door-clang'])
const DOOR_OPEN = act('door-open', 0.9, (t, p) => { const swing = hold(t, 0, 0.3, 0.4, 0.8); p.sx -= 0.14 * swing; p.dx -= 6 * swing; p.turn += 0.012 * ring(t, 0.7, 0.9, 9) }, [0.08, 'oven-whoosh'])

// The jug: hard, on a round foot. It never squashes: it rocks. The board is to its right.
const JUG: Kind = { habits: [], pokes: [
  act('tilt', 1.1, (t, p, k) => { p.turn += k * (0.11 * hold(t, 0, 0.14, 0.16, 0.32) - 0.05 * ring(t, 0.3, 1.1, 4.5)) }, [0.31, 'jug-clink']),
  act('rattle', 0.65, (t, p, k) => { const rock = ring(t, 0.1, 0.65, 10); p.dx += 2.5 * k * rock; p.turn += 0.035 * k * rock; p.dy -= 3 * k * arc(t, 0, 0.12) }, [0.12, 'jug-clink']),
] }
const POUR = act('pour', 1.2, (t, p) => { p.turn += 0.16 * hold(t, 0, 0.24, 0.58, 0.82) - 0.035 * ring(t, 0.78, 1.2, 5) })
const JUG_HOP = act('jug-hop', 0.5, (t, p) => { p.dy -= 5 * arc(t, 0, 0.2); p.turn += 0.04 * ring(t, 0.2, 0.5, 9) })

// The peel: a long stiff board. It only jolts, and it rings a little after.
const PEEL: Kind = { habits: [], pokes: [
  act('jolt', 0.5, (t, p, k) => { p.dy += k * (3.5 * strike(t, 0, 0.04, 0.16) + 2 * ring(t, 0.1, 0.5, 13)) }, [0, 'peel-knock']),
  act('skid', 0.65, (t, p, k) => { p.dx += k * (7 * hold(t, 0, 0.07, 0.1, 0.42) - 2 * ring(t, 0.3, 0.65, 8)); p.turn += 0.012 * k * ring(t, 0.05, 0.65, 7) }, [0.03, 'peel-knock']),
] }
const NUDGE = act('nudge', 0.24, (t, p) => { p.dy += 2 * strike(t, 0, 0.04, 0.24) })
const JUMP = act('jump', 0.75, (t, p) => { const land = thud(t, 0.32, 0.62); p.dy += 1.5 * ring(t, 0.32, 0.75, 12) - 14 * arc(t, 0.02, 0.32); p.sy -= 0.05 * land; p.sx += 0.012 * land })

// The fire: no weight at all. It only grows and shrinks; the view swaps its three printed states.
const FIRE: Kind = { habits: [], rest: (t, p) => { p.sy += 0.025 * Math.sin((TAU * t) / 1.7) + 0.012 * Math.sin((TAU * t) / 0.61) }, pokes: [
  act('flare', 0.95, (t, p, k) => { const up = hold(t, 0, 0.12, 0.3, 0.8); p.sy += k * (0.2 * up + 0.02 * ring(t, 0.3, 0.95, 9)); p.sx -= 0.05 * k * up }, [0, 'fire-whoosh']),
  act('crackle', 0.7, (t, p, k) => { p.sy += 0.08 * k * (strike(t, 0, 0.04, 0.16) + strike(t, 0.2, 0.24, 0.36) + strike(t, 0.34, 0.38, 0.62)); p.dx += 2 * k * ring(t, 0, 0.7, 14) }, [0.02, 'fire-crackle']),
] }

const KINDS: Record<Who, Kind> = { badger: BADGER, sack: SACK, jug: JUG, jar: JAR, dish: DISH, peel: PEEL, door: DOOR, fire: FIRE }

/** The names of each one's poke reactions. */
export const POKES = {} as Record<Who, readonly string[]>
for (const who of EVERYONE) POKES[who] = KINDS[who].pokes.map((poke) => poke.name)

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let mixed = Math.imul(state ^ (state >>> 15), state | 1)
    return (((mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)) ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

/** One act being played: when it began, its size this time, and when something else cut in. */
type Play = { act: Act; at: number; gain: number; fade: number }
/** `chance` times the habits and `pick` chooses reactions: two streams, so a poke never shifts anyone's idle life. */
type Body = { kind: Kind; idle: Play[]; plays: Play[]; next: number[]; chance: () => number; pick: () => number; last: number }

const cap = (v: number, low: number, high: number) => (v < low ? low : v > high ? high : v)
/** Drops what has run its length, and what was cut in on and has shrunk away. */
const prune = (list: Play[], now: number) => { for (let i = list.length - 1; i >= 0; i--) if (now >= list[i].at + list[i].act.length || now >= list[i].fade + FADE) list.splice(i, 1) }

export class Motion {
  private ticks = 0
  private left = 0
  private readonly bodies = {} as Record<Who, Body>
  private waiting: { at: number; name: string }[] = []
  private heard: string[] = []
  /** The badger's lean toward the dough, 0 to 1, and when the last push came. */
  private lean = 0
  private pushed = -NEVER
  private sneezed = false
  /** The badger at its own lump: whether it is showing, how far into it (0 to 1), and since when. */
  private showing = false
  private show = 0
  private showAt = 0

  constructor(seed: number) {
    EVERYONE.forEach((who, i) => {
      const kind = KINDS[who], chance = mulberry32(seed ^ Math.imul(2 * i + 1, 0x9e3779b1)), pick = mulberry32(seed ^ Math.imul(2 * i + 2, 0x85ebca6b))
      this.bodies[who] = { kind, idle: [], plays: [], chance, pick, last: -1, next: kind.habits.map((each) => each.first * (0.75 + 0.5 * chance())) }
    })
  }

  private get now(): number { return this.ticks * STEP }

  /** Advance by attended seconds. Fixed internal steps, so a long frame and many short ones agree. */
  step(seconds: number): void {
    if (!(seconds > 0)) return
    this.left += Math.min(seconds, LONGEST)
    // A hair of slack, so sixty steps of a sixtieth come to the same ticks as one step of a second.
    for (let n = Math.floor(this.left / STEP + 1e-6); n > 0; n--) { this.left -= STEP; this.tick() }
  }

  private tick(): void {
    const now = ++this.ticks * STEP
    for (const who of EVERYONE) {
      const body = this.bodies[who], habits = body.kind.habits
      for (let i = 0; i < habits.length; i++) {
        if (now < body.next[i]) continue
        const { acts, every } = habits[i], next = acts[Math.floor(body.chance() * acts.length)]
        body.idle.push({ act: next, at: now, gain: 1, fade: NEVER }); this.voice(next, now)
        body.next[i] = now + every[0] + (every[1] - every[0]) * body.chance()
      }
      prune(body.idle, now); prune(body.plays, now)
    }
    // The lean is held while pushes keep coming, and let go of a little after the last one.
    this.lean = now < this.pushed + 0.6 ? Math.min(1, this.lean + STEP / 0.3) : Math.max(0, this.lean - STEP / 0.5)
    this.show = this.showing ? Math.min(1, this.show + STEP / 0.3) : Math.max(0, this.show - STEP / 0.4)
    this.flush()
  }

  /** Queues an act's voices in the order they fall due; those of one moment keep the order they were asked in. */
  private voice(from: Act, at: number): void {
    for (const [after, name] of from.voices) this.waiting.push({ at: at + after, name })
    this.waiting.sort((a, b) => a.at - b.at)
  }

  private flush(): void { while (this.waiting.length && this.waiting[0].at <= this.now + 1e-9) this.heard.push(this.waiting.shift()!.name) }

  private play(who: Who, next: Act, delay = 0, gain = 1, loud = true): Act {
    const body = this.bodies[who], at = this.now + delay
    // Whatever it was doing is let go of as the new one starts, so reactions never pile up.
    for (const old of body.plays) old.fade = Math.min(old.fade, at)
    body.plays.push({ act: next, at, gain, fade: NEVER })
    if (loud) this.voice(next, at)
    this.flush(); return next
  }

  /** The child's finger landed on someone: its own poke reaction, a different variant than last time. Returns the name of the variant played. */
  poke(who: Who): string {
    const body = this.bodies[who], pokes = body.kind.pokes
    // Never the one just played: the draw is among the others.
    let i = Math.floor(body.pick() * (body.last < 0 ? pokes.length : pokes.length - 1))
    if (body.last >= 0 && i >= body.last) i++
    return this.play(who, pokes[(body.last = i)], 0, 0.9 + 0.2 * body.pick()).name
  }

  /** A game event; characters it does not concern ignore it. The game voices most of them: here only the sneeze, the slurp, the knocks and the door are heard. */
  cue(what: Cue): void {
    const once: Partial<Record<Cue, [Who, Act]>> = {
      water: ['jug', POUR], bubbly: ['jar', JAR_TIP], seeds: ['dish', DISH_TILT], 'flour-over': ['badger', SHAKE], 'water-over': ['badger', WET_HOP], fed: ['badger', FED],
      'door-shut': ['door', DOOR_SHUT], 'door-open': ['door', DOOR_OPEN], knock: ['badger', KNOCK], fan: ['badger', FAN], shrug: ['badger', SHRUG],
    }
    const plain = once[what]
    if (plain) this.play(plain[0], plain[1])
    else if (what === 'flour') {
      this.play('sack', SACK.pokes[0], 0, 1.15, false)
      // About one tip in three and never two running: a sneeze that always comes is a rule, not a surprise.
      this.sneezed = !this.sneezed && this.bodies.badger.pick() < 0.5
      if (this.sneezed) this.play('badger', SNEEZE, 0.25)
    } else if (what === 'push') {
      this.pushed = this.now
      // A stream of pushes is one jolt at a time, and never cuts a jump short.
      if (!this.bodies.peel.plays.length) this.play('peel', NUDGE)
    } else if (what === 'slap') {
      // The board jumps first and the rest follow down the bench, each in its own time and its own way.
      this.play('peel', JUMP); this.play('sack', SACK_HOP, 0.06); this.play('jug', JUG_HOP, 0.13)
      this.play('jar', JAR.pokes[1], 0.1, 0.8, false); this.play('dish', DISH.pokes[0], 0.16, 0.7, false)
    } else if (what === 'show') {
      if (!this.showing) this.showAt = this.now
      this.showing = true
    } else this.showing = false
  }

  pose(who: Who): Readonly<Pose> {
    const body = this.bodies[who], now = this.now, p: Pose = { dx: 0, dy: 0, turn: 0, sx: 0, sy: 0, frame: 0 }
    body.kind.rest?.(now, p)
    for (const list of [body.idle, body.plays]) for (const play of list) {
      const t = now - play.at, part: Pose = { dx: 0, dy: 0, turn: 0, sx: 0, sy: 0, frame: 0 }
      if (t < 0 || t >= play.act.length) continue
      play.act.curve(t, part, play.gain)
      // A cut-out cannot fade, but a move can shrink: one that was cut in on runs down to nothing.
      const weight = 1 - ramp(now, play.fade, play.fade + FADE)
      p.dx += part.dx * weight; p.dy += part.dy * weight; p.turn += part.turn * weight; p.sx += part.sx * weight; p.sy += part.sy * weight
      if (weight === 1) p.frame = Math.max(p.frame, part.frame)
    }
    if (who === 'badger') {
      // Bent over its own small lump, patting it quick and small: busy, and not looking up.
      const lean = ramp(this.lean, 0, 1), busy = ramp(this.show, 0, 1), t = now - this.showAt, pat = Math.abs(Math.sin(TAU * 1.6 * t))
      p.turn -= 0.05 * lean + 0.045 * busy; p.sy -= 0.03 * lean + busy * (0.04 + 0.03 * pat); p.dx += 1.5 * busy * Math.sin(TAU * 0.8 * t)
    }
    const { slide, turn, small, big } = LIMITS
    return { dx: cap(p.dx, -slide, slide), dy: cap(p.dy, -slide, slide), turn: cap(p.turn, -turn, turn), sx: cap(1 + p.sx, small, big), sy: cap(1 + p.sy, small, big), frame: p.frame }
  }

  /** Sound cues that became due since the last call, in order, each the name of a voice. Drains. */
  sounds(): string[] { const due = this.heard; this.heard = []; return due }

  /** True when nobody is in a reaction (idle routines may still run). */
  get calm(): boolean { return this.lean === 0 && this.show === 0 && !this.showing && this.now >= this.pushed + 0.6 && EVERYONE.every((who) => this.bodies[who].plays.length === 0) }
}
