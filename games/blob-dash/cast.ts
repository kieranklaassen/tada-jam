import type { Point } from './input'
import { HOME_SECONDS, LAP_OUT } from './beat'
import { CAMERA, CAST } from './layout'
import type { Habit } from './toy'

// How the cast moves. Pure: each function turns the loop's clock and the
// seconds since a thing happened into the numbers of a pose, and the view
// lays those numbers onto sprites.
//
// Every character moves like itself (motion personality per character). None
// of them shares a curve with another: the pigeon keeps the beat with a snap
// of its head, the rat keeps the halves with a slap of its foot and nods in
// twos, and the cat's tail swings one way a beat, slow and round. Their
// answers to a poke and their idle habits are their own too.

export type Clock = {
  /** Where the loop is, in beats. */
  beats: number
  /** Seconds of attended play. */
  seconds: number
  tempo: number
  /** Where the blob is on the wall. */
  blob: Point
}

const clamp01 = (t: number): number => Math.min(1, Math.max(0, t))
const smooth = (t: number): number => {
  const c = clamp01(t)
  return c * c * (3 - 2 * c)
}
const frac = (t: number): number => t - Math.floor(t)
/** Up over `attack`, held for `hold`, down over `release`: the shape of most answers. */
export function pulse(age: number, attack: number, hold: number, release: number): number {
  if (!(age >= 0) || age >= attack + hold + release) return 0
  if (age < attack) return smooth(age / attack)
  if (age < attack + hold) return 1
  return 1 - smooth((age - attack - hold) / release)
}
/** A shake that dies away. */
const shake = (age: number, rate: number, lasts: number): number => (age >= 0 && age < lasts ? Math.sin(age * rate) * (1 - age / lasts) ** 2 : 0)
/** Eyes shut for `shut` seconds once every `every`. */
const blink = (seconds: number, every: number, shut: number, phase: number): number => pulse(frac((seconds + phase) / every) * every, shut * 0.4, shut * 0.2, shut * 0.4)

/** The unit vector from one point of the wall towards another: where a pair of eyes looks. */
function towards(from: Point, to: Point): Point {
  const dx = to.x - from.x, dy = to.y - from.y, d = Math.hypot(dx, dy) || 1
  return { x: dx / d, y: dy / d }
}

// --- The pigeon: the beat ------------------------------------------------------

export type PigeonPose = {
  /** How far the head is thrust forward, in stage units: a snap out on the beat and a slow draw back. */
  thrust: number
  /** The head's tilt, in radians. */
  tilt: number
  /** 0 to 1: the chest puffed out. */
  puff: number
  /** The wing's angle off the body, in radians. */
  wing: number
  /** The whole bird off its perch, in stage units (negative is up). */
  hop: number
  /** 0 to 1: the beak open. */
  beak: number
  /** Where the eye looks, as a unit vector, and how far the two eyes have crossed, 0 to 1. */
  look: Point
  cross: number
  blink: number
  /** The whole bird's rock from foot to foot as it struts on the spot, in radians, and how high the lifted foot is, -1 to 1. */
  rock: number
  foot: number
  /** 0 to 1: ducked down behind its own wing. */
  duck: number
  /** 0 to 1: its eyes wide, staring. */
  stare: number
  /** In its lap, flying or coming in to land: where round the ring it is, in beats. Null on its perch and while it stares. */
  flight: number | null
}

/**
 * Where each of the pigeon's two eyes looks, the nearer eye first, as vectors in its head's own frame (+x towards
 * the beak). They follow the blob together. When it cannot keep up they cross, each looking at the other; when a
 * flip throws twins two ways they part, the nearer eye looking back and the further one forward.
 */
export function pigeonEyes(pose: PigeonPose): [Point, Point] {
  const cross = Math.abs(pose.cross), apart = pose.cross < 0
  const mix = (to: Point): Point => ({ x: pose.look.x * (1 - cross) + to.x * cross, y: pose.look.y * (1 - cross) + to.y * cross })
  return [mix(apart ? { x: -0.95, y: -0.2 } : { x: 0.95, y: 0.2 }), mix(apart ? { x: 0.95, y: -0.2 } : { x: -0.95, y: 0.2 })]
}

/** How far the pigeon rocks to each side in its strut, in radians: enough for the foot it is not standing on to leave the perch. */
export const STRUT_ROCK = 0.24

/**
 * How the pigeon stands as it rocks: it rocks about the foot it comes down on, so the other foot leaves the perch.
 * `dx` and `dy` move the point the bird is placed by, and `lifted` is how far each of its two feet is off the
 * perch, all in the units its stencil was cut in. `feet` is where its two feet are from that point.
 */
export function pigeonStand(pose: PigeonPose, feet: readonly [Point, Point]): { dx: number; dy: number; lifted: [number, number] } {
  const turn = pose.rock, planted = turn > 0 ? 1 : 0, other = 1 - planted
  const cos = Math.cos(turn), sin = Math.sin(turn), on = feet[planted], off = feet[other]
  const dx = on.x - (on.x * cos - on.y * sin), dy = on.y - (on.x * sin + on.y * cos)
  const lifted: [number, number] = [0, 0]
  lifted[other] = Math.max(0, off.y - (dy + off.x * sin + off.y * cos))
  return { dx, dy, lifted }
}

/**
 * How far the pigeon is out of its niche (0 to 1) and where round the ring, or null on its perch: out in the first
 * part of its flight, back in over the beat it lands in, and, when a touch ended its lap, back from wherever it
 * was in a move that is seen.
 */
export function pigeonOut(pose: PigeonPose, lap: Lap, homing: { beats: number; out: number; age: number } | null): { beats: number; out: number } | null {
  if (pose.flight !== null && lap) return { beats: pose.flight, out: lap.stage === 'fly' ? smooth(lap.t / LAP_OUT) : 1 - smooth(lap.t) }
  if (homing) return { beats: homing.beats, out: homing.out * (1 - smooth(homing.age / HOME_SECONDS)) }
  return null
}

/** The head's keeping of the beat: out in the first eighth of a beat, back over the rest. */
export function pigeonBeat(beats: number): number {
  const p = frac(beats)
  return p < 0.125 ? smooth(p / 0.125) : 1 - smooth((p - 0.125) / 0.875)
}

export type PigeonAges = { poke: number; coo: number; puff: number; strut: number; duck: number; apart: number; shake: number; pant: number; habit: Habit }
export type Lap = { stage: 'stare' | 'fly' | 'land'; t: number; beats: number } | null

export function pigeonPose(clock: Clock, ages: PigeonAges, lap: Lap = null): PigeonPose {
  const preen = ages.habit.kind === 0 ? pulse(ages.habit.age, 0.3, 1, 0.5) : 0
  const peek = ages.habit.kind === 1 ? pulse(ages.habit.age, 0.25, 1.1, 0.45) : 0
  const startled = pulse(ages.poke, 0.05, 0.1, 0.5)
  const head = { x: CAST.pigeon.x + 52, y: CAST.pigeon.y - 62 }
  // At the dial's fastest the eyes cannot keep up, and cross; off the fast end it shakes its head straight.
  const cross = smooth((clock.tempo - 142) / 16)
  const straighten = shake(ages.shake, 30, 0.7)
  // The drum pad: it struts on the spot, four steps.
  const strut = pulse(ages.strut, 0.08, 0.7, 0.3), stepping = strut > 0 ? Math.sin(ages.strut * 16) : 0
  // The slap: down behind its wing.
  const duck = pulse(ages.duck, 0.05, 0.45, 0.4)
  // A flip that throws twins: one eye each way.
  const apart = pulse(ages.apart, 0.05, 0.3, 0.3)
  // Back from its lap: out of breath, chest heaving.
  const pant = pulse(ages.pant, 0.1, 1.6, 0.8), heave = pant > 0 ? pant * (0.5 + 0.5 * Math.sin(ages.pant * 11)) : 0
  const stare = lap?.stage === 'stare' ? 1 : 0
  const flying = lap?.stage === 'fly'
  const keeping = stare || flying || pant > 0.5 ? 0 : 1
  return {
    thrust: 15 * pigeonBeat(clock.beats) * (1 - preen) * keeping * (1 - duck),
    tilt: -0.9 * preen + 0.42 * peek + 0.12 * shake(ages.poke, 40, 0.6) + 0.1 * cross * Math.sin(clock.seconds * 9) + 0.5 * straighten + 0.35 * duck,
    puff: Math.max(pulse(ages.coo, 0.08, 0.22, 0.5), 0.5 * pulse(ages.puff, 0.06, 0.1, 0.3), 0.8 * strut, heave),
    wing: flying ? -1.3 * (0.5 + 0.5 * Math.sin(clock.beats * Math.PI * 4)) : -1.1 * Math.abs(shake(ages.poke, 34, 0.75)) - 0.25 * preen - 1.2 * duck,
    hop: -20 * startled + 14 * duck,
    beak: Math.max(pulse(ages.coo, 0.05, 0.2, 0.2), startled, 0.7 * heave, flying ? 0.4 : 0),
    look: apart > 0.3 || peek > 0.5 || stare ? { x: 0, y: 0 } : towards(head, clock.blob),
    cross: apart > 0 ? -apart : cross,
    blink: Math.max(blink(clock.seconds, 3.1, 0.14, 0) * (1 - stare), preen > 0.6 ? 1 : 0, duck > 0.6 ? 1 : 0),
    rock: STRUT_ROCK * strut * stepping,
    foot: strut * stepping,
    duck,
    stare,
    flight: lap && lap.stage !== 'stare' ? lap.beats : null,
  }
}

// --- The rat: the halves ---------------------------------------------------------

export type RatPose = {
  /** The head's nod, in radians: one down and up every two beats. */
  nod: number
  /** The tapping foot's toe, in radians off the pavement: it rises towards each half and slaps down on it. */
  foot: number
  /** The arm with the can, in radians, and the can's shake. */
  arm: number
  /** 0 to 1: the grin. */
  grin: number
  /** The whole rat off the pavement, in stage units (negative is up). */
  hop: number
  /** How far the headphones have slipped down its head, in stage units. */
  slip: number
  tail: number
  /** The whiskers' twitch, in radians. */
  whiskers: number
  /** Its chest, breathing: a scale. */
  breath: number
  look: Point
  blink: number
  /** 0 to 1: one cup of the headphones lifted off its ear, and the frown that goes with it. */
  cup: number
  /** 0 to 1: its eyes wide. */
  wide: number
}

/** The foot's keeping of the halves: nothing for most of the beat, a rise into the half, and down at once on it. */
export function ratBeat(beats: number): number {
  const q = frac(beats + 0.5)
  return q > 0.62 ? smooth((q - 0.62) / 0.38) : 0
}

export type RatAges = { poke: number; rattle: number; smirk: number; take: number; hush: number; sniff: number; habit: Habit }

export function ratPose(clock: Clock, ages: RatAges): RatPose {
  const twitch = ages.habit.kind === 0 ? pulse(ages.habit.age, 0.1, 0.9, 0.5) : 0
  const scratch = ages.habit.kind === 1 ? pulse(ages.habit.age, 0.3, 0.9, 0.5) : 0
  const start = pulse(ages.poke, 0.04, 0.05, 0.3)
  const eye = { x: CAST.rat.x + 40, y: CAST.rat.y - 330 }
  // The splitter: a double-take (away, back, away again), and then one slow nod.
  const take = ages.take >= 0 && ages.take < 0.5 ? Math.sin(ages.take * Math.PI * 4) * (1 - ages.take / 0.5) : 0
  const slowNod = pulse(ages.take - 0.55, 0.3, 0.15, 0.45)
  // The hush of a tunnel: one cup of the headphones off its ear, and a frown into it.
  const cup = pulse(ages.hush, 0.12, 0.9, 0.35)
  // A piece under its nose: it leans down to sniff, and its tail flicks the piece home.
  const sniff = pulse(ages.sniff, 0.12, 0.4, 0.2), flick = pulse(ages.sniff - 0.55, 0.05, 0.05, 0.3)
  return {
    nod: 0.07 * Math.sin(Math.PI * clock.beats) + 0.16 * pulse(ages.rattle, 0.08, 0.3, 0.4) - 0.2 * start + 0.3 * slowNod + 0.34 * sniff - 0.22 * take,
    foot: 0.5 * ratBeat(clock.beats),
    arm: 0.5 * shake(ages.rattle, 46, 0.55) - 0.9 * scratch + (scratch > 0 ? 0.14 * Math.sin(scratch * ages.habit.age * 24) : 0) - 0.35 * start,
    grin: Math.max(pulse(ages.rattle, 0.06, 0.55, 0.4), 0.6 * pulse(ages.smirk, 0.06, 0.2, 0.3), 0.5 * slowNod) * (1 - cup),
    hop: -24 * start,
    // Knocked down in the start, held there a moment, and pushed back up.
    slip: 18 * pulse(ages.poke, 0.06, 0.35, 0.35),
    tail: 0.13 * Math.sin(clock.seconds * 1.3) + 0.45 * shake(ages.rattle, 19, 0.7) + 0.3 * start - 1.1 * flick,
    whiskers: (twitch > 0 ? 0.3 * twitch * Math.sin(ages.habit.age * 31) : 0) + (sniff > 0 ? 0.25 * sniff * Math.sin(ages.sniff * 44) : 0),
    breath: 1 + 0.012 * Math.sin(clock.seconds * 5.6),
    look: sniff > 0.3 ? { x: 0.3, y: 0.95 } : towards(eye, clock.blob),
    blink: blink(clock.seconds, 4.3, 0.16, 1.7),
    cup,
    wide: Math.max(Math.abs(take), start),
  }
}

// --- The cat: quiet ----------------------------------------------------------------

export type CatPose = {
  /** The hanging tail, in radians off straight down, and the bend of its tip on top of that. */
  tail: number
  tip: number
  /** The ear that is turned to the ring, in radians. */
  ear: number
  /** 0 to 1: the fur along its back on end. */
  fur: number
  /** 0 to 1: the paw's swipe. */
  paw: number
  /** 0 (shut) to 1 (wide): its eyes. */
  eye: number
  yawn: number
  /** 0 to 1: the forepaw stretched out along the ledge. */
  stretch: number
  breath: number
  head: number
}

/** The tail's keeping of the beat: one way a beat, so a whole swing takes two. */
export function catBeat(beats: number): number {
  return Math.cos(Math.PI * beats)
}

export type CatAges = { poke: number; fur: number; ear: number; blink: number; bat: number; habit: Habit }

export function catPose(clock: Clock, ages: CatAges): CatPose {
  const yawn = ages.habit.kind === 0 ? pulse(ages.habit.age, 0.45, 0.6, 0.5) : 0
  const stretch = ages.habit.kind === 1 ? pulse(ages.habit.age, 0.5, 0.6, 0.6) : 0
  const fur = pulse(ages.fur, 0.07, 0.5, 1.7)
  const swipe = pulse(ages.poke, 0.1, 0.08, 0.36)
  // A thing it likes: a slow blink, and the tip of the tail curls.
  const liked = pulse(ages.blink, 0.3, 0.35, 0.5)
  // A piece let go on it: batted off the ledge, and not an eye opened for it.
  const bat = pulse(ages.bat, 0.07, 0.05, 0.3)
  return {
    tail: 0.36 * catBeat(clock.beats) * (1 - 0.7 * fur),
    tip: 0.3 * Math.cos(Math.PI * clock.beats - 1) + 0.5 * yawn + 1.1 * liked,
    ear: -0.55 * pulse(ages.ear, 0.03, 0.02, 0.2) - 0.3 * fur,
    fur,
    paw: Math.max(swipe, bat),
    eye: Math.max(0.12, fur, 0.6 * pulse(ages.poke, 0.05, 0.4, 0.5), 0.35 * stretch) * (1 - blink(clock.seconds, 7.3, 0.7, 3)) * (1 - yawn) * (1 - liked),
    yawn,
    stretch,
    breath: 1 + 0.025 * Math.sin(clock.seconds * 2.1),
    head: 0.1 * fur - 0.12 * yawn + 0.08 * swipe,
  }
}

// --- The camera -----------------------------------------------------------------------

export type CameraPose = {
  /** Where it points, in radians from pointing right. */
  pan: number
  /** A dip of the lens when the blob lands. */
  nod: number
  /** 0 to 1: its lamp. */
  lamp: number
}

export function cameraPose(clock: Clock, ages: { poke: number; nod: number; lookX: number; lookY: number }): CameraPose {
  const pivot = { x: CAST.camera.x, y: CAST.camera.y }
  const angle = (to: Point) => Math.max(CAMERA.least, Math.min(CAMERA.most, Math.atan2(to.y - pivot.y, to.x - pivot.x)))
  // A poke on the camera draws the lens to the finger for a moment, then it goes back to the blob.
  const finger = pulse(ages.poke, 0.14, 0.5, 0.4)
  return {
    pan: angle(clock.blob) * (1 - finger) + angle({ x: ages.lookX, y: ages.lookY }) * finger,
    nod: 0.1 * pulse(ages.nod, 0.03, 0.03, 0.22),
    lamp: frac(clock.seconds / 2.2) < 0.14 ? 1 : 0.25,
  }
}

// --- The neighbour at the window ------------------------------------------------------

export type NeighbourPose = {
  /** The sway of head and shoulders, in radians: once across in a bar of four beats. */
  sway: number
  /** 0 to 1: the mug at the mouth. */
  sip: number
  /** 0 to 1: gone down behind the sill. */
  duck: number
  /** 0 to 1: the curtain drawn across. */
  curtain: number
  /** How far the plant's leaves on the sill droop and spring, in radians. */
  leaf: number
  blink: number
}

/** The neighbour's keeping of time: a slow sway that takes a whole bar, there in two beats and back in two. */
export function neighbourBeat(beats: number): number {
  const p = frac(beats / 4)
  return p < 0.5 ? smooth(p * 2) * 2 - 1 : 1 - smooth((p - 0.5) * 2) * 2
}

export function neighbourPose(clock: Clock, ages: { poke: number; habit: Habit }): NeighbourPose {
  const sip = ages.habit.kind === 0 ? pulse(ages.habit.age, 0.4, 0.7, 0.5) : 0
  const lean = ages.habit.kind === 1 ? pulse(ages.habit.age, 0.4, 0.8, 0.5) : 0
  // Poked, it is gone behind the sill with the curtain across, and comes back up a little at a time.
  const duck = pulse(ages.poke, 0.06, 0.5, 0.9)
  return {
    sway: 0.09 * neighbourBeat(clock.beats) * (1 - sip) + 0.16 * lean,
    sip,
    duck,
    curtain: pulse(ages.poke, 0.08, 0.3, 0.7),
    leaf: 0.2 * shake(ages.poke, 22, 1.1) + 0.05 * Math.sin(clock.seconds * 0.9) + 0.25 * lean,
    blink: blink(clock.seconds, 5.2, 0.15, 2.4),
  }
}
