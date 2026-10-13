import { FIRS, FIR_FOOT, ridge, type Point } from './ground'
import type { SoundName } from './voices'

// The characters of the clearing: where each stands, what it does when
// something happens, and how it moves with nothing happening. Every one
// moves like itself: no two share a curve, a period or a body part (the
// test beside this file holds that). Pure numbers; the view draws them.

export const WHO = ['king', 'lamp', 'peeper', 'sun', 'bird', 'fish', 'hare'] as const
export type Who = (typeof WHO)[number]

/** Where each is by day, in stage units: the point its body is drawn from. The rules move the king, the two frost children and the bird (toyDay.ts); the hare is only there while it crosses. */
export const AT: Record<Who, Point> = {
  king: { x: 1034, y: 512 },
  lamp: { x: 72, y: 500 },
  peeper: { x: 112, y: 752 },
  sun: { x: 176, y: 108 },
  bird: { x: 1100, y: 652 },
  fish: { x: 590, y: 668 },
  hare: { x: 478, y: 250 },
}
/** Where the two frost children stand at night: on the front snow, clear of the bank, the pond and everything that lies. */
export const AT_NIGHT = { lamp: { x: 66, y: 548 }, peeper: { x: 166, y: 772 } } as const

/** What a character can be doing besides idling: how long it lasts, and the sound it starts with, if it has one. */
export const REACTIONS = {
  king: {
    /** Poked: his belly goes in, his beard flies up and he puffs a cloud. */
    harrumph: { lasts: 1.2, sound: 'harrumph' },
    /** A block broke out of the pond: both brows go up and stay a moment. */
    brows: { lasts: 0.9, sound: null },
    /** Something landed on the bank: his belly bounces once. */
    bounce: { lasts: 0.7, sound: null },
    /** Splashed: the beard hangs wet and he shakes like a dog. */
    wet: { lasts: 1.7, sound: 'brr' },
    /** He has sat down on a block: a settling wriggle. */
    sit: { lasts: 0.6, sound: 'oomph' },
    /** He has sat on a point: straight up in the air, bewildered and unhurt. */
    squawk: { lasts: 0.9, sound: 'squawk' },
    /** Nothing will bear him: he sits in the snow and grumbles a cloud at the place he wanted. */
    grumble: { lasts: 1.8, sound: 'grumble' },
    /** Passing clear ice: he polishes it with his beard. */
    polish: { lasts: 0.8, sound: 'polish' },
    /** Nothing will bear him: he tries the highest block with one foot. The block answers when the foot lands on it. */
    foot: { lasts: 1.3, sound: null },
    /** Morning: he stands and shakes the night off before he walks home. */
    shake: { lasts: 0.9, sound: 'brr' },
  },
  lamp: {
    /** Poked: it twirls its lamp round its mitten. */
    chirrup: { lasts: 0.9, sound: 'chirrup' },
    /** A block was set on the bank: it holds the lamp up towards it and looks. It says nothing: a landing has its own sound. */
    lift: { lasts: 1.5, sound: null },
    /** A lamp is shut in behind snow: it goes to the snow block and raps on it once with its mitten. The rap is heard when the mitten lands. */
    knock: { lasts: 0.7, sound: null },
  },
  peeper: {
    /** Poked: it rolls onto its back with its feet in the air. */
    oof: { lasts: 1.1, sound: 'oof' },
    /** The saw bit the ice: it lifts its head to look. */
    look: { lasts: 0.8, sound: null },
    /** Splashed: soaked, and laughing. */
    soaked: { lasts: 1.5, sound: 'giggle' },
    /** The berry block is afloat: once it has laughed the splash off, it stretches its neck out over the ice and its head goes up and down with the berry. It says nothing. */
    watch: { lasts: 2.6, sound: null },
  },
  sun: {
    /** Poked: it squints, puffs its cheeks and wobbles. */
    boing: { lasts: 1.0, sound: 'boing' },
  },
  bird: {
    /** Poked: up off the bush in a flurry and down again. */
    flutter: { lasts: 1.2, sound: 'tweet' },
    /** A crack from the pond: one startled hop. */
    hop: { lasts: 0.4, sound: null },
  },
  fish: {
    /** Something happened on the ice above: it shoots away and drifts back. */
    dart: { lasts: 0.9, sound: null },
  },
  hare: {
    /** Poked: ears straight up, and off in one bound. */
    bolt: { lasts: 0.8, sound: 'thump' },
  },
} as const satisfies Record<Who, Record<string, { lasts: number; sound: SoundName | null }>>

export type ReactionOf<W extends Who> = keyof (typeof REACTIONS)[W] & string
export type Reaction = { [W in Who]: { who: W; what: ReactionOf<W> } }[Who]

/** What a poke starts in each. */
export const POKED: { [W in Exclude<Who, 'fish'>]: ReactionOf<W> } = { king: 'harrumph', lamp: 'chirrup', peeper: 'oof', sun: 'boing', bird: 'flutter', hare: 'bolt' }

export function reactionOf(who: Who, what: string): { lasts: number; sound: SoundName | null } {
  return (REACTIONS[who] as Record<string, { lasts: number; sound: SoundName | null }>)[what]
}

/** One character as the rules hold it: what it is doing and for how long it has, and what it will do in a moment. */
export type Actor = { what: string | null; age: number; next: { what: string; inS: number }[] }

const wave = (t: number, period: number, phase = 0): number => Math.sin(((t + phase) / period) * Math.PI * 2)
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v))
/** 0 to 1 and back over a reaction, quick in and slow out. */
const swell = (p: number): number => Math.sin(Math.min(1, p * 1.6) * Math.PI * 0.5) * (1 - clamp01((p - 0.6) / 0.4))
/** A shake that dies away. */
const shake = (p: number, turns: number): number => Math.sin(p * Math.PI * 2 * turns) * (1 - p)

const progress = (actor: Actor, who: Who, what: string): number => (actor.what === what ? clamp01(actor.age / reactionOf(who, what).lasts) : -1)

/**
 * How far from his middle the widest of King Winter is drawn, in his own measures: the cushion under his arm. His
 * cloak, his sleeves and his mittens are all inside it (figures.ts; the test beside toyKing.ts measures them).
 */
export const KING_REACH = 164

/** King Winter dozes on a cycle this long, and jerks awake at this share of it, which is when a hat comes off. */
export const DOZE_S = 11
export const DOZE_JERK = 0.93

export type KingPose = { breath: number; nod: number; lids: number; beard: number; brows: number; belly: number; puff: number; wet: number; shiver: number; pat: number; up: number; grumble: number; foot: number }
/**
 * Slow and heavy. He breathes with his whole body, nods off every eleven seconds and jerks awake, pats his
 * cushion now and then, and his beard swings behind every move. `awake` keeps him from dozing: he is walking,
 * or the sun is down and he has come in.
 */
export function kingPose(t: number, actor: Actor, awake = false): KingPose {
  const breath = wave(t, 4.6)
  // Eleven seconds: awake for six, then the head sinks for four, then a start.
  const cycle = (t % DOZE_S) / DOZE_S
  const sink = cycle < 0.55 ? 0 : cycle < DOZE_JERK ? (cycle - 0.55) / (DOZE_JERK - 0.55) : 1 - (cycle - DOZE_JERK) / (1 - DOZE_JERK)
  const busy = actor.what !== null || awake
  const nod = busy ? 0 : sink * sink
  const harrumph = progress(actor, 'king', 'harrumph'), brows = progress(actor, 'king', 'brows'), bounce = progress(actor, 'king', 'bounce'), wet = progress(actor, 'king', 'wet')
  const sit = progress(actor, 'king', 'sit'), squawk = progress(actor, 'king', 'squawk'), grumble = progress(actor, 'king', 'grumble'), polish = progress(actor, 'king', 'polish')
  const foot = progress(actor, 'king', 'foot'), shook = progress(actor, 'king', 'shake')
  // Two pats on the cushion every seven seconds, while he is awake and has nothing else to do.
  const beat = (t % 7) / 7
  const pat = busy || nod > 0 ? 0 : beat < 0.12 ? Math.abs(Math.sin((beat / 0.12) * Math.PI * 2)) : 0
  return {
    breath,
    nod,
    lids: busy ? 0 : 0.25 + nod * 0.7,
    beard: wave(t, 3.1, 0.4) * 0.5 + (harrumph >= 0 ? shake(harrumph, 3) * 1.6 : 0) + (wet >= 0 ? shake(wet, 7) * 0.8 : 0) + (polish >= 0 ? Math.sin(polish * Math.PI * 6) * 2.4 : 0) + (shook >= 0 ? shake(shook, 5) * 2.2 : 0),
    brows: brows >= 0 ? swell(brows) : harrumph >= 0 || grumble >= 0 ? -swell(Math.max(harrumph, grumble)) : squawk >= 0 ? 1 : foot >= 0 ? footOut(foot) * 0.7 : 0,
    belly: (harrumph >= 0 ? -swell(harrumph) * 0.8 : 0) + (bounce >= 0 ? shake(bounce, 2) : 0) + (sit >= 0 ? shake(sit, 2) * 0.8 : 0),
    puff: harrumph >= 0 ? clamp01(harrumph * 1.4) : 0,
    wet: wet >= 0 ? 1 - wet * wet : 0,
    shiver: wet >= 0 ? shake(wet, 9) : shook >= 0 ? shake(shook, 6) * 1.8 : 0,
    pat,
    up: squawk >= 0 ? Math.sin(squawk * Math.PI) : 0,
    grumble: grumble >= 0 ? clamp01(grumble * 1.2) : 0,
    foot: foot >= 0 ? footOut(foot) : 0,
  }
}

/** When in his trying of a block the foot lands on it, as a share of the reaction. */
export const FOOT_LANDS = 0.4
/** How far his foot is out: it goes up to the block, rests on it and presses, and comes back. */
export function footOut(p: number): number {
  return p < FOOT_LANDS ? Math.sin((p / FOOT_LANDS) * Math.PI * 0.5) : p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25
}

/** What the lamp child is about: looking for a hollow, pointing its lamp at one, nose flat on lit clear ice, or frowning at snow that shuts a lamp in. */
export type LampMood = 'seek' | 'point' | 'nose' | 'frown'
export type LampPose = { legs: number; tilt: number; lamp: number; lift: number; twirl: number; out: number; scan: number; duck: number; knock: number; nose: number; frown: number }
/** Small and busy. Its legs swing, its head tips from one side to the other and stays, and the lamp hangs and swings like a weight. */
export function lampPose(t: number, actor: Actor, mood: LampMood = 'seek'): LampPose {
  // The head holds one side for 2.3 seconds, then tips over quickly.
  const beat = t / 2.3, side = Math.floor(beat) % 2 === 0 ? 1 : -1, turn = clamp01((beat - Math.floor(beat)) / 0.18)
  const tilt = side * (turn * turn * (3 - 2 * turn) * 2 - 1)
  const lift = progress(actor, 'lamp', 'lift'), chirrup = progress(actor, 'lamp', 'chirrup'), knock = progress(actor, 'lamp', 'knock')
  // Seeking: it holds the lamp out over the bank, ducks to look under it, then looks all round, every six seconds.
  const seek = mood === 'seek' ? (t % 6) / 6 : -1
  return {
    legs: wave(t, 0.9),
    tilt,
    lamp: wave(t, 1.7, 0.3) * (lift >= 0 || mood === 'point' ? 0.3 : 0.6),
    lift: lift >= 0 ? swell(lift) : mood === 'point' ? 0.8 : 0,
    twirl: chirrup >= 0 ? chirrup : 0,
    out: mood === 'seek' ? 1 : 0,
    scan: seek >= 0.45 ? Math.sin(((seek - 0.45) / 0.55) * Math.PI * 2) : 0,
    duck: seek >= 0 && seek < 0.4 ? Math.sin((seek / 0.4) * Math.PI) : 0,
    knock: knock >= 0 ? Math.abs(Math.sin(knock * Math.PI * 3)) : 0,
    nose: mood === 'nose' ? 1 : 0,
    frown: mood === 'frown' ? 1 : 0,
  }
}

export type PeeperPose = { left: number; right: number; head: number; roll: number; look: number; soaked: number; watch: number; bob: number; lean: number }
/** Flat on its front. Its two feet kick at different speeds, so they never keep step, and its head sinks slowly towards the ice. `lean` says a block lies over its view, which it leans round. */
export function peeperPose(t: number, actor: Actor, lean = false): PeeperPose {
  const oof = progress(actor, 'peeper', 'oof'), look = progress(actor, 'peeper', 'look'), soaked = progress(actor, 'peeper', 'soaked'), watch = progress(actor, 'peeper', 'watch')
  return {
    left: wave(t, 0.7),
    right: wave(t, 1.1, 0.2),
    head: wave(t, 3.7) * 0.5 + 0.5,
    roll: oof >= 0 ? swell(oof) : 0,
    look: look >= 0 ? swell(look) : 0,
    soaked: soaked >= 0 ? shake(soaked, 6) : 0,
    watch: watch >= 0 ? Math.sin(Math.min(1, watch * 5) * Math.PI * 0.5) * (1 - clamp01((watch - 0.8) / 0.2)) : 0,
    // Its head goes with the berry, which bobs on the water at this pace (viewThings.ts).
    bob: watch >= 0 ? Math.sin(t * 2.1) : 0,
    lean: lean ? 1 : 0,
  }
}

export type SunPose = { breath: number; droop: number; yawn: number; rays: number; squint: number; wobble: number }
/** Drowsy. It swells and shrinks, droops a little every nine seconds with a yawn, and its rays creep round. */
export function sunPose(t: number, actor: Actor): SunPose {
  const cycle = (t % 9) / 9
  const droop = cycle < 0.6 ? 0 : Math.sin(((cycle - 0.6) / 0.4) * Math.PI)
  const boing = progress(actor, 'sun', 'boing')
  return {
    breath: wave(t, 5.2),
    droop: boing >= 0 ? 0 : droop,
    yawn: boing >= 0 ? 0 : droop * droop,
    rays: t * 0.05,
    squint: boing >= 0 ? swell(boing) : 0,
    wobble: boing >= 0 ? shake(boing, 4) : 0,
  }
}

export type BirdPose = { hop: number; cock: number; up: number; flap: number }
/** All quick moves and stillness. One hop every 2.6 seconds, a cocked head that snaps to the other side, nothing in between. */
export function birdPose(t: number, actor: Actor): BirdPose {
  const beat = (t % 2.6) / 2.6
  const idleHop = beat < 0.07 ? Math.sin((beat / 0.07) * Math.PI) : 0
  const flutter = progress(actor, 'bird', 'flutter'), hop = progress(actor, 'bird', 'hop')
  return {
    hop: hop >= 0 ? Math.sin(hop * Math.PI) * 1.6 : flutter >= 0 ? 0 : idleHop,
    cock: Math.floor(t / 1.3) % 2 === 0 ? 1 : -1,
    up: flutter >= 0 ? Math.sin(flutter * Math.PI) : 0,
    flap: flutter >= 0 ? Math.sin(flutter * Math.PI * 14) : 0,
  }
}

export type FishPose = { x: number; y: number; heading: number; tail: number }
/** How far along its path one dart throws the fish, in seconds of gliding. */
export const DART_AHEAD = 6
/**
 * A shadow under the clear ice that glides in a slow figure and flicks its tail; a dart throws it far along its
 * path. `ahead` is how far its earlier darts have thrown it, which the rules keep, so it never jumps back.
 */
export function fishPose(t: number, actor: Actor, ahead: number): FishPose {
  const dart = progress(actor, 'fish', 'dart')
  const along = t + ahead + (dart >= 0 ? (1 - (1 - dart) * (1 - dart)) * DART_AHEAD : 0)
  const x = Math.sin(along / 7.3) * 150, y = Math.sin(along / 4.1) * 34
  const dx = (Math.cos(along / 7.3) * 150) / 7.3, dy = (Math.cos(along / 4.1) * 34) / 4.1
  return { x, y, heading: Math.atan2(dy, dx), tail: wave(t, dart >= 0 ? 0.16 : 0.8) }
}

/** How long one bound of the hare takes, and how long its dash for cover takes when it is sent running. */
export const BOUND_S = 0.4
export const BOLT_S = 0.8
/** The two firs the hare lives between, as places in `FIRS`: it comes out from behind the first and goes in behind the second. */
export const HARE_FIRS = [12, 8] as const
/** Where it is while it is hidden behind one of its firs: on the ridge at the fir's foot, inside the fir's lowest boughs. */
export function hareHide(which: 0 | 1): Point {
  const x = FIRS[HARE_FIRS[which]][0]
  return { x, y: ridge(x) + FIR_FOOT - 7 }
}
/**
 * Where the hare lands after each bound, from the fir it comes out of to the fir it goes in behind, and how
 * long it stops there to listen. No two bounds are the same length and the line wanders, as a hare's does; its
 * tracks in the far snow are printed at these same places (backdrop.ts).
 */
export const HARE_STEPS: readonly { x: number; y: number; stop: number }[] = [
  { ...hareHide(0), stop: 0 },
  { x: 738, y: 262, stop: 0 }, { x: 716, y: 296, stop: 0.5 }, { x: 664, y: 306, stop: 0 }, { x: 640, y: 332, stop: 0 },
  { x: 584, y: 322, stop: 0.9 }, { x: 562, y: 290, stop: 0 }, { x: 512, y: 302, stop: 0.3 }, { x: 494, y: 330, stop: 0 },
  { x: 436, y: 316, stop: 0.6 }, { x: 448, y: 268, stop: 0 },
  { ...hareHide(1), stop: 0 },
]
/** How long the hare takes from one fir to the other, and how long the snow is bare between two crossings. */
export const HARE_S = HARE_STEPS.reduce((sum, step) => sum + step.stop, 0) + (HARE_STEPS.length - 1) * BOUND_S
export const HARE_EVERY = 38

export type HarePose = { x: number; y: number; hop: number; ears: number; stretch: number; face: 1 | -1 }

/** Where it is `run` seconds into an undisturbed crossing. */
function hareAlong(run: number): HarePose {
  let left = Math.max(0, run)
  for (let i = 1; i < HARE_STEPS.length; i++) {
    const from = HARE_STEPS[i - 1], to = HARE_STEPS[i], face = to.x <= from.x ? 1 : -1
    if (left < BOUND_S) {
      const p = left / BOUND_S, glide = p * p * (3 - 2 * p), hop = Math.sin(p * Math.PI)
      return { x: from.x + (to.x - from.x) * glide, y: from.y + (to.y - from.y) * glide, hop, ears: 0, stretch: hop, face }
    }
    left -= BOUND_S
    // Stopped to listen: its ears go up and come down again.
    if (left < to.stop) return { x: to.x, y: to.y, hop: 0, ears: Math.sin((left / to.stop) * Math.PI), stretch: 0, face }
    left -= to.stop
  }
  const end = HARE_STEPS[HARE_STEPS.length - 1]
  return { x: end.x, y: end.y, hop: 0, ears: 0, stretch: 0, face: -1 }
}

/**
 * The hare whose tracks cross the far snow. It comes out from behind one fir, goes in uneven bounds with a stop
 * to listen now and then, and goes in behind another. `run` is how long it has been out; `bolt` how long since
 * it was sent running, or a negative number: then it dashes from where it was for the nearer of its two firs
 * and is behind it within `BOLT_S`.
 */
export function harePose(run: number, bolt: number): HarePose {
  if (bolt < 0) return hareAlong(run)
  const from = hareAlong(run - bolt)
  const a = hareHide(0), b = hareHide(1)
  const to = Math.hypot(a.x - from.x, a.y - from.y) < Math.hypot(b.x - from.x, b.y - from.y) ? a : b
  const p = clamp01(bolt / BOLT_S), glide = 1 - (1 - p) * (1 - p)
  // Two long low bounds on the way.
  const hop = Math.abs(Math.sin(p * Math.PI * 2)) * 0.7
  return { x: from.x + (to.x - from.x) * glide, y: from.y + (to.y - from.y) * glide, hop, ears: 1, stretch: 1, face: to.x <= from.x ? 1 : -1 }
}

// --- The lamp child's arm and lamp, as numbers ---------------------------------

/** The lamp child is drawn this much larger than its own measures. */
export const KID_SCALE = 1.34
/** How far it leans forward when it ducks to look under its lamp, in radians. */
export const DUCK_LEAN = 0.1
/** How far it holds its lamp out over the bank while it seeks, beyond its arm at rest. */
const HELD_OUT = 6
const SHOULDER = { x: 26, y: -60 } as const

/**
 * The lamp child's arm, in its own measures about its hip: which way it points, how long it is, and where the
 * mitten is. With `aim` it points there: at a hollow, or at the snow block it raps on, where the mitten stops
 * on the block and never goes into it. Twirling its lamp, the arm goes up and back, so the lamp turns over its
 * own head.
 */
export function lampArm(pose: LampPose, at: Point, aim: Point | null): { to: number; reach: number; hand: Point } {
  const k = KID_SCALE, sx = at.x + SHOULDER.x * k, sy = at.y + SHOULDER.y * k
  let to = aim ? Math.atan2(aim.y - sy, aim.x - sx) : -0.2 - pose.lift * 0.9
  const back = Math.min(1, pose.twirl * 6, (1 - pose.twirl) * 6)
  if (pose.twirl > 0) to += (-2.3 - to) * back
  let reach = 34 + pose.out * HELD_OUT + pose.lift * 8 + pose.knock * 16
  if (aim && pose.knock > 0) reach = Math.min(reach, Math.hypot(aim.x - sx, aim.y - sy) / k)
  return { to, reach, hand: { x: SHOULDER.x + Math.cos(to) * reach, y: SHOULDER.y + Math.sin(to) * reach } }
}
/** Where its mitten is on the stage. `lift` is how far it is off the ground in a jump. */
export function lampMitten(pose: LampPose, at: Point, aim: Point | null, lift = 0): Point {
  const { hand } = lampArm(pose, { x: at.x, y: at.y - lift }, aim)
  return { x: at.x + hand.x * KID_SCALE, y: at.y - lift + hand.y * KID_SCALE }
}
/** How the lamp in its mitten hangs: turned by its swing, and right round when it is twirled. */
export const lampTurn = (pose: LampPose): number => pose.lamp * 0.22 + pose.twirl * Math.PI * 2
/** The furthest right the lamp in its mitten reaches on the stage, which stays short of the stretch a palace is built on. */
export function lampReachesTo(pose: LampPose, at: Point, aim: Point | null): number {
  const { hand } = lampArm(pose, at, aim), turn = lampTurn(pose), lean = pose.duck * DUCK_LEAN
  let most = -Infinity
  // The lamp's roof and foot, as lampFrame draws them: 19 to each side of its hook, 66 long.
  for (const [lx, ly] of [[-19, 0], [19, 0], [-19, 66], [19, 66]] as const) {
    const x = hand.x + lx * Math.cos(turn) - ly * Math.sin(turn), y = hand.y + lx * Math.sin(turn) + ly * Math.cos(turn)
    most = Math.max(most, at.x + KID_SCALE * (x * Math.cos(lean) - y * Math.sin(lean)))
  }
  return most
}
