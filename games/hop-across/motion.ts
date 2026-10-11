import type { MoverKind } from './board'

// How everything on the board moves, as numbers the view maps onto its pawns. Pure: time in, numbers out.
// Each of the family hops, lands and idles in its own way, and each kind of mover takes its step in its own
// way; the test fails if two of them share a curve.
//   0  the rabbit          quick and exact, a deep squash, ears streaming behind
//   1  the first small one eager: early, high and snappy, ears bolt upright
//   2  the middle one      dozy: late, low and slow, a long soft squash, ears trailing
//   3  the last one        wobbly: tips in the air, lands, teeters and windmills upright

export type Personality = {
  /** Seconds a hop of one square takes. */
  hop: number
  /** Seconds after the finger lands that it leaves the ground. */
  late: number
  /** How high the hop goes, in squares. */
  height: number
  /** How its way along the hop is eased: 1 is even, above 1 starts slowly, below 1 starts fast. */
  drag: number
  /** The landing squash: how deep, how fast it rings, how fast it dies. */
  squash: number
  ring: number
  damp: number
  /** How far it tips sideways in the air and after landing, in radians. */
  tip: number
  /** Seconds between blinks, and how long its ears take to follow the body. */
  blinkEvery: number
  earLag: number
  /** How far it breathes at rest, as a share of its height, and how slowly. */
  breath: number
  breathEvery: number
}

export const FAMILY: readonly Personality[] = [
  { hop: 0.17, late: 0, height: 0.62, drag: 0.8, squash: 0.34, ring: 27, damp: 9, tip: 0, blinkEvery: 3.7, earLag: 0.09, breath: 0.018, breathEvery: 2.9 },
  { hop: 0.13, late: 0.06, height: 0.86, drag: 0.6, squash: 0.2, ring: 40, damp: 13, tip: 0.05, blinkEvery: 2.3, earLag: 0.03, breath: 0.03, breathEvery: 1.3 },
  { hop: 0.25, late: 0.21, height: 0.3, drag: 1.7, squash: 0.44, ring: 13, damp: 4.5, tip: -0.04, blinkEvery: 6.1, earLag: 0.26, breath: 0.045, breathEvery: 4.6 },
  { hop: 0.2, late: 0.13, height: 0.55, drag: 1, squash: 0.26, ring: 21, damp: 3.2, tip: 0.5, blinkEvery: 3.1, earLag: 0.14, breath: 0.022, breathEvery: 2.1 },
]

export const HOP_SECONDS: readonly number[] = FAMILY.map((one) => one.hop)

/** When a pawn leaves the ground after the finger lands: the rabbit at once, the small ones a ripple behind her. */
export function hopDelay(who: number): number {
  return FAMILY[who].late
}

/** The world takes its step as the rabbit lands. */
export const WORLD_AT = FAMILY[0].hop
/** Seconds each kind of mover takes over its step. */
export const ROLL_SECONDS: Record<MoverKind, number> = { car: 0.22, lorry: 0.36, log: 0.46, turtle: 0.3 }
/** Seconds a pawn is under water before the fish spits it, and seconds the spit flies. */
export const UNDER_SECONDS = 0.42
export const SPIT_SECONDS = 0.44
/**
 * How each of the family peels itself up once its square is clear: how long it lies there first, and how long
 * the peel takes. The eager one is up before anyone, the dozy one goes on dozing and peels with a long stretch.
 */
export const PEEL_AFTER: readonly number[] = [0.22, 0.04, 0.62, 0.3]
export const PEEL_LENGTH: readonly number[] = [0.5, 0.3, 0.95, 0.56]
/** Seconds the train takes over the whole lane, and seconds after the world's step that it sets off. */
export const TRAIN_SECONDS = 0.44
export const TRAIN_AFTER = 0.05
/** Seconds one waddle of the duck's takes, and seconds from one of its steps to the next. */
export const WADDLE_SECONDS = 0.34
export const DUCK_STEP_SECONDS = 0.8

export const clamp01 = (t: number): number => Math.min(1, Math.max(0, t))

export type Arc = { along: number; lift: number; tip: number; stretch: number }

/** A hop at `t` from 0 to 1: how far along, how high (in squares), how far tipped, and how stretched it is on the way up. Writes into `out`. */
export function hopArc(who: number, t: number, out: Arc): Arc {
  const one = FAMILY[who], u = clamp01(t)
  out.along = Math.pow(u, one.drag)
  out.lift = one.height * 4 * u * (1 - u)
  // The wobbly one goes over in the air; the others lean a little into the hop.
  out.tip = one.tip * Math.sin(u * Math.PI * (who === 3 ? 2 : 1))
  out.stretch = 1 + 0.16 * Math.sin(u * Math.PI) * (who === 2 ? 0.3 : 1)
  return out
}

/** A leapfrog: her vault takes this much longer than a hop, and the small one sets off under her this many seconds after the touch. */
export const LEAP_LONGER = 1.7
export const LEAP_UNDER = 0.07

/** The rabbit's vault over a small one at `t` from 0 to 1: twice as high as a hop, even all the way, and tipped right over the top. Writes into `out`. */
export function vault(t: number, out: Arc): Arc {
  const u = clamp01(t)
  out.along = u
  out.lift = 1.25 * 4 * u * (1 - u)
  out.tip = 0.55 * Math.sin(u * Math.PI * 2)
  out.stretch = 1 + 0.22 * Math.sin(u * Math.PI)
  return out
}

/** The small one under a leapfrog at `t` from 0 to 1: it ducks to half its height at once, scurries along the ground, and comes up at the end. `lift` stays 0. Writes into `out`. */
export function scurry(t: number, out: Arc): Arc {
  const u = clamp01(t)
  out.along = u * u * (3 - 2 * u)
  out.lift = 0
  out.tip = 0.12 * Math.sin(u * Math.PI * 4)
  out.stretch = u < 0.15 ? 1 - 0.5 * (u / 0.15) : u < 0.8 ? 0.5 : 0.5 + 0.5 * ((u - 0.8) / 0.2)
  return out
}

/** How far each ear has gone round `since` seconds after she lands on a log: two whole turns, one ear each way, slowing as she finds her balance. */
export function windmill(since: number): number {
  if (since < 0 || since > 0.6) return 0
  const u = since / 0.6
  return (1 - (1 - u) * (1 - u)) * Math.PI * 4
}

/** How flat the wind of a passing train lays the ears `since` seconds after it comes by: down at once, held, and up again slowly. 0 to 1. */
export function blown(since: number): number {
  if (since < 0 || since > 0.9) return 0
  if (since < 0.06) return since / 0.06
  if (since < 0.4) return 1
  return 1 - (since - 0.4) / 0.5
}

/** How wide the train's mouth is `since` seconds after it has run its lane: it opens slowly, gapes, and shuts. 0 to 1. */
export function yawn(since: number): number {
  if (since < 0 || since > 1.1) return 0
  const u = since / 1.1
  return Math.sin(u * Math.PI) * (u < 0.5 ? 1 : 1 - (u - 0.5) * 0.4)
}

export type Swell = { wide: number; tall: number; shut: boolean; big: number }
/** Seconds an onlooker's answer to a touch lasts. */
export const SWELL_SECONDS = 0.9

/**
 * An onlooker touched, `since` seconds after: each swells from its chin in its own way and never shrinks below
 * its size, since its head in the still picture lies under it. The teddy bounces twice, soft and wide; the robot
 * grows and shrinks in hard steps with its eyes large; the giraffe stretches up slowly and sinks back; the doll
 * shuts its eyes and shivers with a giggle. Writes into `out`.
 */
export function swell(what: 'teddy' | 'robot' | 'giraffe' | 'doll', since: number, out: Swell): Swell {
  out.wide = 1; out.tall = 1; out.shut = false; out.big = 0
  if (since < 0 || since >= SWELL_SECONDS) return out
  const u = since / SWELL_SECONDS
  if (what === 'teddy') {
    const bounce = Math.abs(Math.sin(u * Math.PI * 2)) * (1 - u)
    out.wide = 1 + 0.16 * bounce; out.tall = 1 + 0.05 * bounce
  } else if (what === 'robot') {
    const size = u < 0.2 ? 1.06 : u < 0.5 ? 1.13 : u < 0.75 ? 1.06 : 1
    out.wide = size; out.tall = size; out.big = u < 0.75 ? 1 : 0
  } else if (what === 'giraffe') {
    out.tall = 1 + 0.3 * Math.sin(u * Math.PI)
  } else {
    out.wide = 1 + 0.06 * Math.abs(Math.sin(u * Math.PI * 9)) * (1 - u); out.tall = 1 + 0.04 * (1 - u)
    out.shut = u < 0.8
  }
  return out
}

/** Seconds a pawn that came down on a lorry's cab takes to slide back onto its bed. */
export const CAB_SLIDE = 0.2
/** How long a tyre track is dusted off with an ear: three strokes, one for each brush of its sound. */
export const DUST_SECONDS = 0.42
/** Where the dusting ear is across the tummy, -1 to 1, `since` seconds after it began; null before and after. */
export function dusting(since: number): number | null {
  if (!(since >= 0) || since >= DUST_SECONDS) return null
  return -Math.cos((since / DUST_SECONDS) * 3 * Math.PI)
}

/** How far a rider on a log is thrown off upright, in radians: it leans with the log as it rides up over a turtle (`tilted` seconds ago), and wobbles to and fro when the fish noses the log (`rocked` seconds ago). */
export function riderSway(tilted: number, rocked: number): number {
  const wobble = rocked < 0 || rocked > 0.7 ? 0 : 0.22 * Math.sin(rocked * 30) * (1 - rocked / 0.7)
  return 0.3 * overShell(tilted) + wobble
}

/** How far round a car driver's head has turned `since` seconds after the knock from behind: round in a moment, held, and back. 0 ahead, 1 right round. */
export function lookBehind(since: number): number {
  if (since < 0 || since > 0.9) return 0
  if (since < 0.18) return since / 0.18
  if (since < 0.7) return 1
  return 1 - (since - 0.7) / 0.2
}

/** A log `since` seconds after somebody lands on it: it dips at once and comes up ringing (`dip`, 1 at the landing), and rolls a little to and fro (`roll`). Writes into `out`. */
export function logLanded(since: number, out: { dip: number; roll: number }): { dip: number; roll: number } {
  if (since < 0 || since > 1.2) { out.dip = 0; out.roll = 0; return out }
  out.dip = Math.exp(-6 * since) * Math.cos(19 * since)
  out.roll = Math.exp(-4 * since) * Math.sin(13 * since)
  return out
}

/** Spat out by the fish, a small one comes down on its head and rolls upright: how many turns it has made at `t` from 0 to 1 of the roll. It lands a turn and a half round; the wobbly one rolls three times more before it is up. */
export const SPIT_TURNS = 1.5
export const ROLL_UP_SECONDS: readonly number[] = [0, 0.26, 0.4, 0.72]
export function rollUp(who: number, t: number): number {
  const u = clamp01(t)
  return SPIT_TURNS + (who === 3 ? 3.5 : 0.5) * (1 - (1 - u) * (1 - u))
}

/**
 * The row the fish's shadow keeps to in its river while the rabbit is on row `row`: the row next to hers, below
 * her or above her on the last row, and her own row once it has come `near`, which is one whole square nearer.
 */
export function shadowRow(row: number, near: boolean, rows: number): number {
  if (near) return row
  return row + 1 < rows ? row + 1 : row - 1
}

/** How long wet and a tyre track last, in hops of the line: never in seconds. */
export const MARK_HOPS = 3

/** A hop on the spot: straight up and down, a little lower than a hop along. */
export function spotLift(who: number, t: number): number {
  const u = clamp01(t)
  return FAMILY[who].height * 0.8 * 4 * u * (1 - u)
}

export type Squash = { wide: number; tall: number; lean: number }

/** The squash `since` seconds after a landing: down, then ringing back to rest. `tall` is under 1 while squashed, and `wide` grows as it shrinks. Writes into `out`. */
export function landSquash(who: number, since: number, out: Squash): Squash {
  const one = FAMILY[who]
  if (since < 0) {
    out.wide = 1; out.tall = 1; out.lean = 0
    return out
  }
  const ring = Math.exp(-one.damp * since) * Math.cos(one.ring * since)
  out.tall = 1 - one.squash * ring
  out.wide = 1 + one.squash * 0.7 * ring
  // Only the wobbly one teeters after it lands.
  out.lean = who === 3 ? one.tip * Math.exp(-2.2 * since) * Math.sin(11 * since) : one.tip * Math.exp(-8 * since)
  return out
}

/** How far the ears trail behind the body: 1 streaming flat behind, 0 at rest, below 0 thrown forward on the landing. */
export function earTrail(who: number, t: number, since: number): number {
  const one = FAMILY[who]
  if (since < 0) return Math.sin(clamp01(t) * Math.PI * 0.5 + 0.2) * (who === 1 ? 0.25 : 1)
  return -0.55 * Math.exp(-since / (one.earLag * 3)) * Math.cos(since / one.earLag)
}

/** Whether a pawn's eyes are shut at `time`: each blinks at its own pace, and the dozy one's stay shut longest. */
export function blinking(who: number, time: number): boolean {
  const one = FAMILY[who]
  const phase = (time + who * 1.37) % one.blinkEvery
  return phase < (who === 2 ? 0.5 : 0.12)
}

/** The rise and fall of a pawn at rest, as a share of its height. */
export function breath(who: number, time: number): number {
  const one = FAMILY[who]
  return one.breath * Math.sin((time / one.breathEvery) * Math.PI * 2 + who)
}

/** How flat a peeling pawn still is at `t` from 0 to 1: it comes up by one ear, overshoots tall and settles. 1 is flat, 0 is upright, below 0 is stretched. */
export function peel(t: number, who = 0): number {
  const u = clamp01(t)
  // The dozy one comes up slowly and stretches long; the eager one snaps up; the rabbit comes up by one ear.
  if (who === 2) {
    if (u < 0.6) return 1 - 0.5 * (u / 0.6)
    const w = (u - 0.6) / 0.4
    return 0.5 * (1 - w) - 0.55 * Math.sin(w * Math.PI)
  }
  if (who === 1) return u < 0.3 ? 1 - u / 0.3 : -0.4 * Math.sin(((u - 0.3) / 0.7) * Math.PI) * (1 - u)
  // The wobbly one gets most of the way up, slips back, and makes it at the second go.
  if (who === 3) {
    if (u < 0.3) return 1 - 0.8 * (u / 0.3)
    if (u < 0.5) return 0.2 + 0.3 * Math.sin(((u - 0.3) / 0.2) * Math.PI)
    const w = (u - 0.5) / 0.5
    return 0.2 * (1 - w) - 0.3 * Math.sin(w * Math.PI) * Math.sqrt(1 - w)
  }
  if (u < 0.45) return 1 - 0.5 * (u / 0.45) * (u / 0.45)
  const v = (u - 0.45) / 0.55
  return 0.5 * (1 - v) * (1 - v) * (1 - v) - 0.3 * Math.sin(v * Math.PI) * Math.sqrt(1 - v)
}

export type Roll = { along: number; pitch: number; bob: number; turn: number }

/**
 * A mover's step at `t` from 0 to 1. A car darts and nods on its springs when it stops; a lorry heaves itself
 * off, never overshoots and rattles; a log drifts evenly, bobs and rolls a quarter turn. Writes into `out`.
 */
export function roll(kind: MoverKind, t: number, out: Roll): Roll {
  const u = clamp01(t)
  out.pitch = 0; out.bob = 0; out.turn = 0
  if (kind === 'car') {
    const back = 1.9, v = u - 1
    out.along = 1 + (back + 1) * v * v * v + back * v * v
    out.pitch = u < 1 ? -0.1 * Math.sin(u * Math.PI) : 0
  } else if (kind === 'lorry') {
    out.along = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2
    out.bob = 0.02 * Math.sin(u * Math.PI * 9) * (1 - u)
  } else if (kind === 'log') {
    out.along = u
    out.bob = 0.05 * Math.sin(u * Math.PI * 2)
    out.turn = u * 0.25
  } else {
    // A turtle goes nowhere: its step is a slow change of how deep it lies, with one slosh.
    out.along = u * u * (3 - 2 * u)
    out.bob = 0.04 * Math.sin(u * Math.PI)
  }
  return out
}

/** What a mover still does `since` seconds after its step has ended: the car nods, the lorry's tailboard shivers, the log goes on bobbing a little. */
export function settle(kind: MoverKind, since: number): number {
  if (since < 0) return 0
  if (kind === 'car') return 0.09 * Math.exp(-7 * since) * Math.sin(24 * since)
  if (kind === 'lorry') return 0.03 * Math.exp(-11 * since) * Math.sin(60 * since)
  if (kind === 'turtle') return 0.02 * Math.exp(-5 * since) * Math.sin(9 * since)
  return 0.03 * Math.exp(-1.5 * since) * Math.sin(5 * since)
}

/** How deep a turtle lies for each count: head high, shell awash, under. */
export const DEPTH: readonly number[] = [0, 0.5, 1]

/** How far along its lane the train is at `t` from 0 to 1: it bursts out of its arch and does not slow down. */
export function trainRun(t: number): number {
  const u = clamp01(t)
  return u * (0.35 + 0.65 * u)
}

/** A car or a lorry the train shoves ahead of it: it goes with the train's nose and a little faster, bouncing. Writes into `out`. */
export function shoved(t: number, out: Roll): Roll {
  const u = clamp01(t)
  out.along = Math.min(1, trainRun(u) * 1.12 + 0.04)
  out.pitch = 0.14 * Math.sin(u * Math.PI * 7)
  out.bob = 0
  out.turn = 0
  return out
}

/** A car shunted by the lorry behind it: it jumps a square in one knock and rocks hard on its springs. */
export function shunted(t: number, out: Roll): Roll {
  const u = clamp01(t)
  out.along = 1 - (1 - u) * (1 - u) * (1 - u) * (1 - u)
  out.pitch = 0.2 * Math.sin(u * Math.PI * 3) * (1 - u)
  out.bob = 0
  out.turn = 0
  return out
}

/** A log riding up over a turtle's shell `since` seconds after it begins: it tilts, holds, and drops level with a slap. Positive is tilted. */
export function overShell(since: number): number {
  if (since < 0 || since > 0.6) return 0
  return since < 0.4 ? Math.sin((since / 0.4) * Math.PI * 0.5) : 1 - (since - 0.4) / 0.2
}

/** A log nosed from below by the fish: it rocks twice and lies still. */
export function nosed(since: number): number {
  return since < 0 ? 0 : Math.exp(-5 * since) * Math.sin(17 * since)
}

/** The duck's waddle at `t` from 0 to 1: it rocks from foot to foot as it goes, chest first. Writes into `out`. */
export function waddle(t: number, out: Arc): Arc {
  const u = clamp01(t)
  out.along = u
  out.lift = 0.06 * Math.abs(Math.sin(u * Math.PI * 3))
  out.tip = 0.22 * Math.sin(u * Math.PI * 6)
  out.stretch = 1
  return out
}

/** How far the rabbit's ears whirl `since` seconds after she lands wet: a whole turn four times over, slowing. */
export function shakeDry(since: number): number {
  if (since < 0 || since > 0.8) return 0
  const u = since / 0.8
  return (1 - u) * (1 - u) * Math.PI * 8
}

/** How far the leaf behind the fold is lifted at `t` from 0 to 1: up with a heave, held while the small ones slide, and dropped flat. */
export function leafLift(t: number): number {
  const u = clamp01(t)
  if (u < 0.3) return Math.sin((u / 0.3) * Math.PI * 0.5)
  if (u < 0.72) return 1
  const v = (u - 0.72) / 0.28
  return 1 - v * v
}

/** The board sliding on at `t` from 0 to 1: it starts and stops gently. */
export function slideOn(t: number): number {
  const u = clamp01(t)
  return u * u * (3 - 2 * u)
}

/** Where the cat's eyes go: a share of the way from its face to what it watches, never past the eye's rim. Writes into `out`. */
export function gaze(fromX: number, fromY: number, toX: number, toY: number, reach: number, out: { x: number; y: number }): { x: number; y: number } {
  const dx = toX - fromX, dy = toY - fromY
  const far = Math.hypot(dx, dy)
  const pull = far > 0 ? Math.min(reach, far * 0.05) / far : 0
  out.x = dx * pull; out.y = dy * pull
  return out
}
