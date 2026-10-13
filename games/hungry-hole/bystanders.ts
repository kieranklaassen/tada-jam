import { KIND, seatOf, type Kind } from './kinds'
import { BAR, KEEPER, MAYOR, STREET } from './places'
import { isMarch, type Cue, type Play } from './play'
import { below, makeRng, type Rng } from './rng'
import type { Stage } from './scenes'

// The bystanders: what they want and how they take what happens in the
// street. Pure numbers; the view lays them on the figures. Each moves like
// himself. The mayor is heavy, slow and pompous, and all of him follows his
// hat. The gate keeper is thin, quick and fussy on his stilts, and watches
// the hole. They share no curve (bystanders.test.ts). Lengths of a figure are
// in his own measure, before he is drawn at his size (places.ts).

export type Vec = { x: number; y: number; z: number }

/** An arm of two straight parts: where its elbow and its hand are. */
export type Arm = { elbow: Vec; hand: Vec }

/**
 * Bends an arm of two parts from `shoulder` so that its hand is at `target`, or as near as it reaches, with the
 * elbow pushed toward `pole`. Writes into `out`.
 */
export function bend(shoulder: Vec, target: Vec, upper: number, fore: number, pole: Vec, out: Arm): Arm {
  let dx = target.x - shoulder.x, dy = target.y - shoulder.y, dz = target.z - shoulder.z
  const far = Math.hypot(dx, dy, dz) || 1e-6, reach = Math.min(upper + fore - 0.01, Math.max(Math.abs(upper - fore) + 0.05, far))
  dx /= far; dy /= far; dz /= far
  const along = (upper * upper - fore * fore + reach * reach) / (2 * reach), out2 = Math.sqrt(Math.max(0, upper * upper - along * along))
  // The elbow goes out to the side the pole is on, square to the line from shoulder to hand.
  const dot = pole.x * dx + pole.y * dy + pole.z * dz
  let px = pole.x - dot * dx, py = pole.y - dot * dy, pz = pole.z - dot * dz
  const long = Math.hypot(px, py, pz) || 1e-6
  px /= long; py /= long; pz /= long
  out.elbow.x = shoulder.x + dx * along + px * out2
  out.elbow.y = shoulder.y + dy * along + py * out2
  out.elbow.z = shoulder.z + dz * along + pz * out2
  out.hand.x = shoulder.x + dx * reach
  out.hand.y = shoulder.y + dy * reach
  out.hand.z = shoulder.z + dz * reach
  return out
}

/** The mayor's build: his neck, the middle and half widths of his head, and the arm he gestures with. */
export const MAYOR_BUILD = {
  neck: { x: 0, y: 2.0, z: 0.08 },
  head: { x: 0, y: 3.1, z: 0.08, rx: 1.34, ry: 1.2, rz: 1.2 },
  shoulder: { x: -1.15, y: 1.8, z: 0.15 },
  upper: 1.7,
  fore: 1.7,
  /** The arm that reaches for the hat turns about this point, and is this long to its fingertips. */
  reach: { x: 1.0, y: 1.75, z: 0.25 },
  reachLong: 2.12,
  /** How much of his lean his whole body turns by; his head nods the rest. */
  leanTurn: 0.7,
} as const

/** His reaching arm never points further to either side than this: the onlookers stand beside his stand. */
const REACH_YAW = 1.0
/** Nothing of the mayor comes nearer the street than this: the things stand beyond it. */
export const MAYOR_REACH_Z = STREET.z0 + 0.05
/** As far as he ever leans toward the street: with his hat in the hole and a start on top. At this lean his nose is at the kerb and no further (the view's tests measure it on his real head). */
export const MAYOR_LEAN_MOST = 0.32
const STARTLE_LEAN = 0.08

/**
 * How much of its length the mayor's reaching arm has for a lean and a way it points: it draws in as it points
 * out over the kerb, so that his fingertips stay his side of the street.
 */
export function armLong(lean: number, yaw: number, pitch: number): number {
  const turn = lean * MAYOR_BUILD.leanTurn, reach = MAYOR_BUILD.reach
  const forward = Math.sin(pitch) * Math.sin(turn) + Math.cos(yaw) * Math.cos(pitch) * Math.cos(turn)
  if (forward <= 0) return 1
  const room = (MAYOR_REACH_Z - MAYOR.z) / MAYOR.size - (reach.y * Math.sin(turn) + reach.z * Math.cos(turn))
  return Math.max(0.3, Math.min(1, room / (MAYOR_BUILD.reachLong * forward)))
}

/** The gate keeper's build: his two shoulders, his arms, and how high his head sits for a neck stretched by `neck`. */
export const KEEPER_BUILD = {
  keyShoulder: { x: -0.4, y: 3.95, z: 0 },
  barShoulder: { x: 0.4, y: 3.95, z: 0 },
  upper: 0.8,
  fore: 0.8,
  headY: (neck: number): number => 4.15 + neck * 0.32,
  /** How far up his head his ears, his brow and the top of his cap are. */
  ear: 0.92,
  brow: 1.25,
  crown: 1.3,
} as const

/** How far in front of the middle of his head the gate keeper's saluting hand is: a hand's breadth off his brow, never in it. */
const SALUTE_OFF = 0.72
/** Where he holds the key up, to the side: far enough out that its teeth clear his head when he stretches his neck beside it. */
const KEY_OUT = -0.92
/** How far he turns his face from the hand that fans a burp away, in radians. */
const FAN_TURN = 0.5

/** A point just off the mayor's head, the way `u` points from its middle; `off` of 1 is on the skin. */
function offHead(ux: number, uy: number, uz: number, off: number, out: Vec): Vec {
  const long = Math.hypot(ux, uy, uz) || 1, head = MAYOR_BUILD.head
  out.x = head.x + (ux / long) * head.rx * off
  out.y = head.y + (uy / long) * head.ry * off
  out.z = head.z + (uz / long) * head.rz * off
  return out
}

/**
 * Moves the mayor's hand toward where it is wanted, round his head and never through it: the way it points
 * from the middle of his head and how far off the skin it is are each eased by themselves.
 */
function easeRound(at: Vec, to: Vec, rate: number, dt: number): void {
  const head = MAYOR_BUILD.head, k = Math.min(1, rate * dt)
  const ax = (at.x - head.x) / head.rx, ay = (at.y - head.y) / head.ry, az = (at.z - head.z) / head.rz
  const tx = (to.x - head.x) / head.rx, ty = (to.y - head.y) / head.ry, tz = (to.z - head.z) / head.rz
  const from = Math.hypot(ax, ay, az) || 1e-6, goal = Math.hypot(tx, ty, tz) || 1e-6
  const ux = ax / from + (tx / goal - ax / from) * k, uy = ay / from + (ty / goal - ay / from) * k, uz = az / from + (tz / goal - az / from) * k
  offHead(ux, uy, uz, from + (goal - from) * k, at)
}

/** How far the gate keeper rises for a stack of `count` things set down, 0..1: higher for every thing more. */
export function lookFor(count: number): number {
  return 1 - 0.8 ** Math.max(0, count)
}

/** What the mayor's free hand is doing. */
export type Gesture = 'rest' | 'pat' | 'clutch' | 'cup' | 'tip' | 'peek'

/** How long a gesture that ends by itself lasts, in seconds. The others last as long as their cause. */
export const GESTURE_SECONDS: Readonly<Record<Gesture, number>> = { rest: 0, pat: 0.9, clutch: 0, cup: 0, tip: 1.3, peek: 2.6 }

/** Where the mayor's free hand is for a gesture `t` seconds in. Writes into `out`. */
export function handFor(gesture: Gesture, t: number, out: Vec): Vec {
  switch (gesture) {
    // On the rail of his stand.
    case 'rest': out.x = -1.6; out.y = 0.9; out.z = 1.05; return out
    // Two pats on his bald crown.
    case 'pat': return offHead(-0.3, 1, 0.15, 1.25 + 0.22 * Math.abs(Math.cos((t / GESTURE_SECONDS.pat) * Math.PI * 2)), out)
    // Both would clutch if he had a hand free: this one grips the crown and shakes.
    case 'clutch': return offHead(-0.25 + 0.04 * Math.sin(t * 17), 1, 0.1, 1.22, out)
    // Cupped beside his mouth, to call down the hole.
    case 'cup': return offHead(-0.62, -0.45, 0.65, 1.3, out)
    // Lifts a hat he does not have off his crown, out and up, and puts it back.
    case 'tip': return offHead(-0.25, 0.9, 0.3 + 0.25 * Math.sin(Math.min(1, t / GESTURE_SECONDS.tip) * Math.PI), 1.25 + 0.25 * Math.sin(Math.min(1, t / GESTURE_SECONDS.tip) * Math.PI), out)
    // Over his eyes, and then it slips down so he can peek over it.
    case 'peek': return offHead(-0.05, t < 1.2 ? 0.27 : 0.27 - 0.42 * Math.min(1, (t - 1.2) / 0.3), 1, 1.3, out)
  }
}

/** Where the mayor's hat is, and how it is being used. */
export type HatPlace = {
  /** `alone` on the street, on `top` of something, `under` something, in the `belly`, or riding on the `breath`. */
  how: 'alone' | 'top' | 'under' | 'belly' | 'breath'
  /** It sits straight on a dog, which is his favourite. */
  onDog: boolean
  x: number
  y: number
  z: number
}

function onDog(parts: readonly Kind[], at: number): boolean {
  return at > 0 && parts[at - 1] === 'dog'
}

export function hatPlace(play: Play, stage: Stage | null = null): HatPlace | null {
  // Going out with the float: he follows it to the end of his rail.
  if (stage?.float && stage.float.hat >= 0) {
    const part = stage.float.parts[stage.float.hat]
    return { how: stage.float.hat === 0 ? 'under' : 'top', onDog: false, x: part.x, y: part.y + KIND.hat.height / 2, z: part.z }
  }
  for (const thing of play.things) {
    const at = thing.parts.indexOf('hat')
    if (at < 0 || thing.away) continue
    const how = thing.parts.length === 1 ? 'alone' : at === 0 ? 'under' : 'top'
    return { how, onDog: onDog(thing.parts, at), x: thing.sx, y: seatOf(thing.parts, at) + KIND.hat.height / 2, z: thing.sz }
  }
  // What hangs on the breath: a hat that still waits down in the mouth is in the hole to him.
  const up = play.riding, riding = up.findIndex((rider) => rider.kind === 'hat')
  if (riding >= 0) {
    const parts = up.map((rider) => rider.kind)
    // On the breath it is on top of something, under something, or alone up there.
    const how = parts.length === 1 ? 'breath' : riding === 0 ? 'under' : 'top'
    return { how, onDog: onDog(parts, riding), x: play.anchor.x, y: up[riding].y + KIND.hat.height / 2, z: play.anchor.z }
  }
  if (play.belly.includes('hat') || play.riders.some((rider) => rider.kind === 'hat')) return { how: 'belly', onDog: false, x: play.x, y: -0.6, z: play.z }
  return null
}

export type MayorPose = {
  /** Where he stands along his rail. */
  x: number
  /** Up and down on his heels. */
  bob: number
  /** How far he leans out over the rail, in radians. */
  lean: number
  headYaw: number
  headTilt: number
  /** Where his pupils sit in his eyes, each -1..1. */
  eyeX: number
  eyeY: number
  /** -1 knitted with worry, 1 raised. */
  brow: number
  mouthOpen: number
  /** 1 a wide grin, -1 a small round mouth. */
  mouthWide: number
  /** His moustache: 1 curled up, -1 drooping. */
  curl: number
  /** His reaching arm: which way it points, and how much of its length it has (`armLong`). */
  armYaw: number
  armPitch: number
  armLong: number
  /** His one tuft of hair: 1 when it stands on end. */
  tuft: number
  /** His belly shaking with laughter: how far it is out, -1..1. */
  belly: number
  /** What his free hand is doing, and the arm that does it. */
  gesture: Gesture
  arm: Arm
}

export type KeeperPose = {
  /** How far he stands above his resting height: his bob, and how far he has risen on his stilts. */
  lift: number
  /** His sway on the stilts, in radians. */
  sway: number
  /** How far he has risen on his stilts, 0..1. */
  rise: number
  /** How far his neck is stretched, 0..1. */
  neck: number
  headYaw: number
  headTilt: number
  eyeX: number
  eyeY: number
  brow: number
  mouthOpen: number
  mouthWide: number
  /** How fast the key shakes in his hand, 0..1. */
  jingle: number
  /** How far he bends back from a burp, in radians. */
  back: number
  /** The arm with the key and the arm with the gate bar. */
  keyArm: Arm
  barArm: Arm
  /** Where the key is, and 0..1 how far it has dropped out of his hand and lies on the pavement. */
  key: Vec
  dropped: number
  /** 0..1 how far his cap is off his head and in his bar hand. */
  capOff: number
}

type MayorIdle = 'heels' | 'twirl' | 'peer'
type KeeperIdle = 'spin' | 'stork' | 'crane'
const MAYOR_IDLES: readonly MayorIdle[] = ['heels', 'twirl', 'peer']
const KEEPER_IDLES: readonly KeeperIdle[] = ['spin', 'stork', 'crane']

const TAU = Math.PI * 2
const ease = (from: number, to: number, rate: number, dt: number): number => from + (to - from) * Math.min(1, rate * dt)
const vec = (): Vec => ({ x: 0, y: 0, z: 0 })
const arm = (): Arm => ({ elbow: vec(), hand: vec() })
function easeVec(at: Vec, to: Vec, rate: number, dt: number): void {
  at.x = ease(at.x, to.x, rate, dt); at.y = ease(at.y, to.y, rate, dt); at.z = ease(at.z, to.z, rate, dt)
}

/** How long a head of the crowd takes to duck and pop up again, in seconds. */
export const DUCK_SECONDS = 0.7

export class Bystanders {
  readonly mayor: MayorPose = { x: (MAYOR.x0 + MAYOR.x1) / 2, bob: 0, lean: 0, headYaw: 0, headTilt: 0, eyeX: 0, eyeY: 0, brow: 0, mouthOpen: 0.15, mouthWide: 0, curl: 0.4, armYaw: 0, armPitch: 0, armLong: 1, tuft: 0, belly: 0, gesture: 'rest', arm: arm() }
  readonly keeper: KeeperPose = { lift: 0, sway: 0, rise: 0, neck: 0.2, headYaw: 0, headTilt: 0, eyeX: 0, eyeY: 0, brow: 0, mouthOpen: 0, mouthWide: 0, jingle: 0, back: 0, keyArm: arm(), barArm: arm(), key: vec(), dropped: 0, capOff: 0 }
  /** Which head of the crowd is ducking, or -1, and how far down it is, 0..1. */
  ducking = -1
  duck = 0
  /** 1 when the hole has just swallowed, easing to 0: every head jerks back. */
  flinch = 0

  private time = 0
  private mayorIdle: MayorIdle = 'heels'
  private mayorNext = 3
  private keeperIdle: KeeperIdle = 'spin'
  private keeperNext = 2
  /** Reactions, each 1 when set off and easing to 0. */
  private startle = 0
  private joy = 0
  private huff = 0
  private fanning = 0
  private fanBack = 0
  private looking = 0
  private ears = 0
  private salute = 0
  private ducked = DUCK_SECONDS
  /** A gesture that ends by itself, and the seconds it has run. */
  private timed: Gesture = 'rest'
  private gestureT = 0
  private how: HatPlace['how'] | 'none' = 'none'
  private laugh = 0
  private readonly handAt = vec()
  private readonly handTo = vec()
  private readonly pole = vec()
  private readonly keyTo = vec()
  private readonly barTo = vec()
  private readonly keyHand = vec()
  private readonly barHand = vec()
  private readonly mayorRng: Rng
  private readonly keeperRng: Rng

  /**
   * `rng` is a stream of its own: which idle comes next is ordinary chance and changes nothing in the game. Each of
   * the two draws from a stream of his own, started from it, so the same seed gives each of them the same fidgets in
   * the same order however long a frame is, and neither's turn shifts the other's.
   */
  constructor(rng: Rng) {
    this.mayorRng = makeRng(Math.floor(rng.next() * 4294967296))
    this.keeperRng = makeRng(Math.floor(rng.next() * 4294967296))
    handFor('rest', 0, this.handAt)
    this.pole.x = -0.5; this.pole.y = 0.2; this.pole.z = -1
  }

  get mayorIdleNow(): string { return this.mayorIdle }
  get keeperIdleNow(): string { return this.keeperIdle }

  /** Something happened in the street. Each of them takes it in his own way, or not at all. */
  react(cue: Cue): void {
    // Every swallow makes all of them flinch.
    if (cue.type === 'drop') { this.flinch = 1; this.startle = Math.max(this.startle, 0.25) }
    if (cue.type === 'drop' && cue.kind === 'hat') this.startle = 1
    if (cue.type === 'burp' && (cue.kind === 'hat' || cue.onto === 'hat')) this.joy = 1
    // The balloon's squeal makes the mayor jump, every time.
    if ((cue.type === 'teeter' || cue.type === 'drop') && cue.kind === 'balloon') this.startle = Math.max(this.startle, 0.7)
    if (cue.type === 'burp') { this.fanning = 1; this.fanBack = Math.min(1, KIND[cue.kind].width / 2.6) }
    if (cue.type === 'setdown') {
      // The taller the stack, the higher he rises: every thing more lifts him further, up to the tallest a street can make.
      this.looking = lookFor(cue.parts.length)
      // His hat set down on top of something: he tips the hat he does not have at whatever wears it.
      if (cue.parts.indexOf('hat') > 0) this.begin('tip')
    }
    if (cue.type === 'burp' && cue.onto === 'hat') this.begin('tip')
    // The drummer's noise, wherever he makes it: touched, on the rim, going in, coming out, stopping on his spot, passing the gate.
    if ((cue.type === 'poke' || cue.type === 'teeter' || cue.type === 'drop' || cue.type === 'pass' || cue.type === 'arrive') && cue.kind === 'drummer') this.ears = 1
    if (cue.type === 'burp' && (cue.kind === 'drummer' || cue.onto === 'drummer')) this.ears = 1
    if (cue.type === 'bob' && cue.parts.includes('drummer')) this.ears = Math.max(this.ears, 0.6)
    if (cue.type === 'step' && (cue.parts[0] === 'drummer' || isMarch(cue.parts))) this.ears = Math.max(this.ears, 0.6)
    if (cue.type === 'secret' && cue.which === 'peek') this.begin('peek')
    if (cue.type === 'bystander' && cue.who === 'mayor') { this.huff = 1; this.begin('pat') }
    if (cue.type === 'bystander' && cue.who === 'keeper') this.salute = 1
    if (cue.type === 'bystander' && cue.who === 'crowd') { this.ducking = cue.head; this.ducked = 0 }
  }

  private begin(gesture: Gesture): void {
    this.timed = gesture
    this.gestureT = 0
  }

  /** The street as it is found on load, and as a put-away leaves it: no reaction is running, and both stand as the fields have them, with nothing easing into place. */
  settle(play: Play, stage: Stage): void {
    this.startle = this.joy = this.huff = this.fanning = this.fanBack = this.looking = this.ears = this.salute = this.flinch = this.laugh = 0
    this.ducked = DUCK_SECONDS
    this.duck = 0
    this.ducking = -1
    this.timed = 'rest'
    // With no hat anywhere, as on the bare street after a float, the mayor is found at the middle of his rail: where
    // he followed the float to is not saved, so a put-away leaves him where a load finds him.
    if (!hatPlace(play, stage)) this.mayor.x = (MAYOR.x0 + MAYOR.x1) / 2
    this.pose(1e6, play, stage)
  }

  step(dt: number, play: Play, stage: Stage): void {
    if (dt <= 0) return
    this.time += dt
    const t = this.time
    this.startle = Math.max(0, this.startle - dt * 1.1)
    this.joy = Math.max(0, this.joy - dt * 0.7)
    this.huff = Math.max(0, this.huff - dt * 1.1)
    this.fanning = Math.max(0, this.fanning - dt * 0.8)
    this.looking = Math.max(0, this.looking - dt * 0.45)
    this.ears = Math.max(0, this.ears - dt * 0.9)
    this.salute = Math.max(0, this.salute - dt * 1.5)
    this.flinch = Math.max(0, this.flinch - dt * 3)
    this.ducked = Math.min(DUCK_SECONDS, this.ducked + dt)
    // Down fast, a moment under, and up again with a pop.
    this.duck = this.ducked >= DUCK_SECONDS ? 0 : Math.sin(Math.min(1, this.ducked / DUCK_SECONDS) ** 0.6 * Math.PI)
    if (this.duck === 0) this.ducking = -1
    if (this.timed !== 'rest') {
      this.gestureT += dt
      if (this.gestureT >= GESTURE_SECONDS[this.timed]) this.timed = 'rest'
    } else this.gestureT += dt
    if (t >= this.mayorNext) { this.mayorIdle = next(MAYOR_IDLES, this.mayorIdle, this.mayorRng); this.mayorNext = t + 4.5 + this.mayorRng.next() * 3 }
    if (t >= this.keeperNext) { this.keeperIdle = next(KEEPER_IDLES, this.keeperIdle, this.keeperRng); this.keeperNext = t + 2.2 + this.keeperRng.next() * 2 }
    this.pose(dt, play, stage)
  }

  private pose(dt: number, play: Play, stage: Stage): void {
    this.poseMayor(dt, this.time, hatPlace(play, stage), play)
    this.poseKeeper(dt, this.time, play, stage)
  }

  private poseMayor(dt: number, t: number, hat: HatPlace | null, play: Play): void {
    const mayor = this.mayor, size = MAYOR.size
    // All of him follows his hat: he shuffles along the rail to stay level with it, slowly, being heavy.
    const level = hat ? Math.max(MAYOR.x0, Math.min(MAYOR.x1, hat.x)) : mayor.x
    mayor.x = ease(mayor.x, level, 1.4, dt)
    const shoulderY = MAYOR.floor + MAYOR_BUILD.reach.y * size
    const dx = (hat ? hat.x : mayor.x) - mayor.x, dy = (hat ? hat.y : 0) - shoulderY, dz = (hat ? hat.z : 0) - MAYOR.z
    const flat = Math.hypot(dx, dz) || 1
    mayor.armYaw = ease(mayor.armYaw, Math.max(-REACH_YAW, Math.min(REACH_YAW, Math.atan2(dx, dz))), 5, dt)
    mayor.armPitch = ease(mayor.armPitch, Math.atan2(dy, flat), 5, dt)
    // What he thinks of where his hat is.
    const how = hat?.how ?? 'alone'
    if (how !== this.how) { this.how = how; if (this.timed === 'rest') this.gestureT = 0 }
    // What his free hand does: a gesture that ends by itself, or the one his hat's place asks for.
    const gesture: Gesture = this.timed !== 'rest' ? this.timed : how === 'under' ? 'clutch' : how === 'belly' ? 'cup' : 'rest'
    mayor.gesture = gesture
    easeRound(this.handAt, handFor(gesture, this.gestureT, this.handTo), 11, dt)
    // The elbow goes back while the hand rests on the rail, and out to the side when it is at his head.
    const up = gesture === 'rest' ? 0 : 1
    this.pole.x = ease(this.pole.x, -0.5 - 0.5 * up, 8, dt)
    this.pole.y = ease(this.pole.y, 0.2 - 0.4 * up, 8, dt)
    this.pole.z = ease(this.pole.z, -1 + 1.3 * up, 8, dt)
    bend(MAYOR_BUILD.shoulder, this.handAt, MAYOR_BUILD.upper, MAYOR_BUILD.fore, this.pole, mayor.arm)
    // His head keeps still under a hand; otherwise it turns after the hat. Touched, he looks down at the hole at his feet.
    const still = gesture === 'rest' ? 1 : 0, down = this.huff > 0 ? 1 : 0
    const lookX = down ? play.x - mayor.x : dx, lookY = down ? -shoulderY : dy, lookZ = down ? play.z - MAYOR.z : dz
    mayor.headYaw = ease(mayor.headYaw, still * Math.max(-0.7, Math.min(0.7, Math.atan2(lookX, lookZ))), 3, dt)
    mayor.eyeX = ease(mayor.eyeX, Math.max(-1, Math.min(1, lookX / 3)), 6, dt)
    mayor.eyeY = ease(mayor.eyeY, Math.max(-1, Math.min(1, lookY / 3 + 0.6)), 6, dt)
    const want = {
      alone: { lean: 0.16, brow: 0.2, open: 0.25, wide: -0.3, curl: 0.3, tilt: 0.05 },
      top: { lean: 0.05, brow: 0.8, open: 0.5, wide: 1, curl: 1, tilt: -0.08 },
      under: { lean: 0.1, brow: -1, open: 0.45, wide: -0.8, curl: -1, tilt: 0.2 },
      belly: { lean: MAYOR_LEAN_MOST - STARTLE_LEAN, brow: -0.6, open: 0.9, wide: -1, curl: -0.4, tilt: 0.3 },
      breath: { lean: -0.08, brow: 1, open: 0.7, wide: -0.6, curl: 0.6, tilt: -0.3 },
    }[how]
    mayor.lean = ease(mayor.lean, want.lean + STARTLE_LEAN * Math.min(1, this.startle), 3.5, dt)
    mayor.armLong = armLong(mayor.lean, mayor.armYaw, mayor.armPitch)
    mayor.brow = ease(mayor.brow, want.brow + this.startle - 0.8 * this.huff, 7, dt)
    mayor.mouthOpen = ease(mayor.mouthOpen, Math.min(1, want.open + this.startle * 0.6 + this.joy * 0.5 + this.huff * 0.4), 9, dt)
    mayor.mouthWide = ease(mayor.mouthWide, Math.max(-1, Math.min(1, want.wide + this.joy * 1.5)), 7, dt)
    // Twirling his moustache is one of his three idles, and he twirls it whenever his hat is on top of something.
    const twirl = this.mayorIdle === 'twirl' || how === 'top'
    mayor.curl = ease(mayor.curl, want.curl + this.joy + (twirl ? 0.5 * Math.sin(t * TAU * 0.9) : 0), 4, dt)
    mayor.tuft = ease(mayor.tuft, this.startle > 0.3 ? 1 : 0, 12, dt)
    // His hat on the dog is his favourite: his belly shakes for as long as it sits there.
    this.laugh = ease(this.laugh, hat?.onDog ? 1 : 0, 4, dt)
    mayor.belly = this.laugh * Math.sin(t * TAU * 2.2)
    // Heavy and slow: about half a beat a second, with a jump when he is startled or glad.
    let bob = 0.04 * Math.sin(t * TAU * 0.45), tilt = want.tilt
    if (this.mayorIdle === 'heels') bob += 0.09 * Math.max(0, Math.sin(t * TAU * 0.55)) ** 2
    if (this.mayorIdle === 'peer') tilt += 0.1 * Math.sin(t * TAU * 0.3)
    bob += 0.5 * Math.sin(Math.min(1, (1 - this.startle) * 3) * Math.PI) * (this.startle > 0 ? 1 : 0)
    bob += 0.3 * Math.abs(Math.sin(this.joy * TAU * 2)) * this.joy
    bob -= 0.12 * Math.sin(Math.min(1, this.huff) * Math.PI)
    mayor.bob = bob
    mayor.headTilt = ease(mayor.headTilt, still * tilt, 3, dt)
  }

  private poseKeeper(dt: number, t: number, play: Play, stage: Stage): void {
    const keeper = this.keeper, size = KEEPER.size, build = KEEPER_BUILD
    // He watches the hole, or a stack that has just been let down, or the float, from the top of his stilts.
    const riding = play.riders.length > 0, float = stage.float
    const lookY = float ? 1.5 : riding ? play.riders[play.riders.length - 1].y + 1 : this.looking > 0 ? 2.5 * this.looking : 0
    const atX = float ? float.parts[0].x : riding ? play.anchor.x : play.x, atZ = float ? float.parts[0].z : riding ? play.anchor.z : play.z
    const dx = atX - KEEPER.x, dz = atZ - KEEPER.z, dy = lookY - build.headY(keeper.neck) * size
    const fan = this.fanning > 0.15, deaf = this.ears > 0.1
    // While he fans he turns his nose away from the hand that fans, so the cap never passes his face.
    keeper.headYaw = ease(keeper.headYaw, deaf ? 0 : fan ? -FAN_TURN : Math.max(-0.9, Math.min(0.9, Math.atan2(dx, dz))), 9, dt)
    keeper.eyeX = ease(keeper.eyeX, Math.max(-1, Math.min(1, dx / 4)), 12, dt)
    keeper.eyeY = ease(keeper.eyeY, Math.max(-1, Math.min(1, dy / 4 + 0.9)), 12, dt)
    // He rises for a tall stack that is set down, and with the gate as he swings it open.
    keeper.rise = ease(keeper.rise, Math.max(this.looking, stage.gate), 6, dt)
    keeper.back = ease(keeper.back, fan ? 0.3 * this.fanBack : 0, 7, dt)
    keeper.brow = ease(keeper.brow, fan ? -1 : this.looking > 0 ? 1 : deaf ? -0.6 : 0.1, 10, dt)
    keeper.mouthOpen = ease(keeper.mouthOpen, this.looking > 0 ? 0.8 : fan ? 0.1 : 0.2, 10, dt)
    keeper.mouthWide = ease(keeper.mouthWide, this.looking > 0 ? -1 : fan ? -0.6 : 0.2, 10, dt)
    keeper.jingle = this.salute
    // Thin and quick: a fast small sway that never quite stops, and one of three fidgets.
    let bob = 0.03 * Math.sin(t * TAU * 1.3), sway = 0.035 * Math.sin(t * TAU * 0.8 + 1), neck = 0.2 + 0.8 * this.looking, tilt = 0
    if (this.keeperIdle === 'spin') keeper.jingle = Math.max(keeper.jingle, 0.35 + 0.35 * Math.sin(t * TAU * 1.7))
    if (this.keeperIdle === 'stork') sway += 0.09 * Math.sin(t * TAU * 0.4)
    if (this.keeperIdle === 'crane') { neck += 0.35 * (0.5 + 0.5 * Math.sin(t * TAU * 0.6)); tilt = 0.16 * Math.sin(t * TAU * 0.6) }
    bob += 0.06 * Math.abs(Math.sin(t * TAU * 3.2)) * ((fan ? 1 : 0) + this.ears)
    // With his fingers in his ears his neck is drawn in, so his hands reach.
    keeper.neck = ease(keeper.neck, deaf ? 0 : Math.min(1.3, neck), 6, dt)
    keeper.sway = sway
    keeper.headTilt = ease(keeper.headTilt, tilt - 0.8 * keeper.back, 6, dt)
    keeper.lift = bob + keeper.rise * 0.6
    const headY = build.headY(keeper.neck)
    // The key hand: up and ready, at his brow in a salute, or a finger in his ear.
    const key = this.keyTo
    if (deaf) { key.x = -0.56; key.y = headY + build.ear; key.z = 0.02 } else if (this.salute > 0.05) { key.x = -0.34; key.y = headY + build.brow; key.z = SALUTE_OFF } else { key.x = KEY_OUT; key.y = 5.2; key.z = 0.25 }
    // The bar hand: on the gate bar, off it to wave the gate open, fanning with his cap, or a finger in the other ear.
    const bar = this.barTo
    if (deaf) { bar.x = 0.56; bar.y = headY + build.ear; bar.z = 0.02 } else if (fan) { bar.x = 0.7 + 0.25 * Math.sin(t * 15); bar.y = headY + 0.7; bar.z = 0.85 } else {
      bar.x = (BAR.x - KEEPER.x) / size + 0.25 * stage.gate
      bar.y = BAR.y / size - keeper.lift
      bar.z = (BAR.z - KEEPER.z) / size + 0.9 * stage.gate
    }
    easeVec(this.keyHand, key, 12, dt)
    easeVec(this.barHand, bar, fan ? 30 : 12, dt)
    bend(build.keyShoulder, this.keyHand, build.upper, build.fore, { x: -1, y: -0.3, z: 0.2 }, keeper.keyArm)
    bend(build.barShoulder, this.barHand, build.upper, build.fore, { x: 1, y: -0.3, z: 0.2 }, keeper.barArm)
    // The key drops out of his hand when his fingers go in his ears, and he has it again when the noise is over.
    keeper.dropped = ease(keeper.dropped, deaf ? 1 : 0, deaf ? 9 : 5, dt)
    const fell = keeper.dropped
    keeper.key.x = keeper.keyArm.hand.x + (-1.0 - keeper.keyArm.hand.x) * fell
    keeper.key.y = keeper.keyArm.hand.y + (0.06 - keeper.lift - keeper.keyArm.hand.y) * fell * fell
    keeper.key.z = keeper.keyArm.hand.z + (0.9 - keeper.keyArm.hand.z) * fell
    // His cap sits on his head, and is in his bar hand while he fans.
    keeper.capOff = ease(keeper.capOff, fan ? 1 : 0, 14, dt)
  }
}

/** One of the others, never the same twice in a row. */
function next<T>(all: readonly T[], now: T, rng: Rng): T {
  const others = all.filter((one) => one !== now)
  return others[below(rng, others.length)]
}
