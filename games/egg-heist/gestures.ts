import type { Actor } from './pairings'
import type { CardId } from './sprites'

// Every move a figure makes in a pairing, as what a stiff card can do: slide,
// lift, tilt, flip on its stick, or be swapped for another printed card of
// the same figure. `k` runs 0 to 1 through the act. A move is written so it
// starts where the one before it in its cell ends, and ends where the figure
// is left. Offsets are in stage units from where the figure stands.

export type Pose = {
  dx: number
  dy: number
  tilt: number
  /** 1 as printed, -1 turned round on its stick. */
  flip: number
  scale: number
  /** Another card of the same figure, where the print differs. */
  card?: CardId
  alpha: number
  /** Not drawn at all. */
  gone?: boolean
}

export const REST: Pose = { dx: 0, dy: 0, tilt: 0, flip: 1, scale: 1, alpha: 1 }
const p = (more: Partial<Pose>): Pose => ({ ...REST, ...more })

const TAU = Math.PI * 2
const up = (k: number): number => Math.sin(Math.PI * Math.min(1, Math.max(0, k)))
const ease = (k: number): number => { const t = Math.min(1, Math.max(0, k)); return t * t * (3 - 2 * t) }
/** `n` hops through the act, each a clean arc. */
const hops = (k: number, n: number): number => Math.abs(Math.sin(Math.PI * n * k))
/** A shake that dies away by the end of the act. */
const dying = (k: number, turns: number): number => Math.sin(k * TAU * turns) * (1 - k)

type Move = (k: number) => Pose

// --- The goose. At the nest she faces the raccoon; offsets are along her facing. -------

const SAT = { dy: 22, tilt: 0 }
const GOOSE: Record<string, Move> = {
  // Lowered onto the thing in the nest, with a small shuffle.
  sit: (k) => p({ dy: SAT.dy * ease(k * 1.6) , tilt: 0.05 * dying(k, 3) }),
  // The ball rolls from under her: she is carried back a step, tipping, and comes to rest astride it.
  rideBack: (k) => p({ dx: -46 * ease(k), dy: SAT.dy - 14 * hops(k, 3) * (1 - k), tilt: -0.2 * Math.sin(k * TAU * 1.5) * (1 - k * 0.6) }),
  proud: (k) => p({ dx: -46, dy: SAT.dy - 8 * up(k * 2), tilt: -0.14 * ease(k * 3), card: 'gooseStrut' }),
  // Two knocks of the beak: tipped forward and back, twice.
  knock: (k) => p({ tilt: 0.42 * hops(k, 2) }),
  listen: (k) => p({ tilt: 0.3 * ease(k * 4) * (k < 0.85 ? 1 : (1 - k) / 0.15) }),
  shrug: (k) => p({ dy: -10 * up(k), tilt: -0.08 * up(k) }),
  sitLopsided: (k) => p({ dy: SAT.dy * ease(k * 2), tilt: -0.2 * ease(k * 2) + 0.04 * dying(k, 2) }),
  shootUp: (k) => p({ dy: SAT.dy * (1 - ease(k * 8)) - 150 * up(Math.min(1, k * 1.25)) * (k < 0.8 ? 1 : 0), card: 'gooseHonk' }),
  glare: (k) => p({ tilt: 0.12 * ease(k * 4), card: 'gooseAlert' }),
  // Head down into the boot.
  peerIn: (k) => p({ tilt: 0.5 * ease(k * 1.4) }),
  // Blind, with the boot on her head: pushed to and fro in jerks.
  stagger: (k) => p({ dx: -32 + 32 * Math.cos(k * TAU * 2), tilt: 0.18 * Math.sin(k * TAU * 3 + 1), dy: -6 * hops(k, 6), card: 'gooseHonk' }),
  shakeOff: (k) => p({ tilt: 0.3 * dying(k, 4) }),
  tear: (k) => p({ tilt: 0.44 * up(Math.min(1, k * 1.6)) , dx: 6 * dying(k, 2) }),
  munch: (k) => p({ dy: -5 * hops(k, 2), tilt: 0.1 }),
  burp: (k) => p({ dy: SAT.dy - 12 * up(k * 2.5), tilt: -0.1 * up(k * 2.5), card: k < 0.45 ? 'gooseHonk' : 'goose' }),
  nudge: (k) => p({ tilt: 0.36 * hops(k, 2) }),
  settle: (k) => p({ dy: SAT.dy * ease(k * 1.5), tilt: 0.09 * dying(k, 4), dx: 4 * dying(k, 4) }),
  coo: (k) => p({ dy: SAT.dy + 2 * Math.sin(k * TAU * 3), tilt: -0.05 * up(k), card: 'gooseStrut' }),
  // In her lane: the whole card tips back to look up at the giant.
  lookUp: (k) => p({ tilt: -0.3 * ease(k * 2.5), card: 'gooseAlert' }),
  squawk: (k) => p({ dy: -30 * hops(k, 2), tilt: -0.3, card: 'gooseHonk' }),
  // In the pond, up to her wings: down with the splash and bobbing.
  dive: (k) => p({ dy: 70 * ease(k * 3) - 10 * up(k), tilt: 0.2 * dying(k, 2), card: 'gooseHonk' }),
  climbOut: (k) => p({ dy: 70 * (1 - ease(k * 1.6)), tilt: 0.16 * dying(k, 5), dx: 5 * dying(k, 8) }),
  // Under the egg on the line: straight up on stiff legs, beak open, and down.
  hopUnder: (k) => p({ dy: -74 * up(Math.min(1, k * 1.2)), tilt: -0.16, card: 'gooseHonk' }),
}

// --- The frog, from his lily pad ---------------------------------------------------

const ON_BALL = { dx: -116, dy: -14 }, ON_PAD = { dx: -116, dy: 12 }, IN_BOOT = { dx: -108, dy: -4 }
const leap = (to: { dx: number; dy: number }, k: number, high = 60): Pose => p({ dx: to.dx * ease(k), dy: to.dy * ease(k) - high * up(k), tilt: -0.3 * up(k) })
const FROG: Record<string, Move> = {
  hopOn: (k) => leap(ON_BALL, k),
  // His feet go one after the other as the ball turns under him.
  patter: (k) => p({ ...ON_BALL, dy: ON_BALL.dy - 5 * hops(k, 12), tilt: 0.16 * Math.sin(k * TAU * 6) }),
  hopOnPad: (k) => leap(ON_PAD, k, 50),
  ribbit: (k) => p({ ...ON_PAD, scale: 1 + 0.16 * up(k * 2), dy: ON_PAD.dy - 6 * up(k * 2) }),
  ridePad: (k) => p({ ...ON_PAD, tilt: 0.1 * Math.sin(k * TAU) }),
  hopIn: (k) => leap(IN_BOOT, k, 70),
  captain: (k) => p({ ...IN_BOOT, dy: IN_BOOT.dy - 10 * up(k * 2), scale: 1 + 0.14 * up(k * 2) }),
  sinkWith: (k) => p({ ...IN_BOOT, dy: IN_BOOT.dy + 30 * ease(k) }),
  flinch: (k) => p({ dy: -34 * up(k * 1.6), tilt: -0.5 * dying(k, 1.5) }),
  coverEars: (k) => (k >= 0.97 ? REST : p({ card: 'frogEars', dy: 6 * ease(k * 6), tilt: 0.05 * Math.sin(k * TAU * 5) })),
  // A stiff lean out over the water to poke the egg, and back.
  poke: (k) => p({ dx: -46 * up(k), tilt: -0.5 * up(k) }),
  kick: (k) => p({ dx: -40 * up(k), tilt: 0.7 * up(k), dy: -16 * up(k) }),
}

// --- The dog, beside his bowl ------------------------------------------------------

const LYING = { dy: 26, tilt: -0.5, dx: -22 }
const DOG: Record<string, Move> = {
  pounce: (k) => p({ dx: -34 * ease(k), dy: -46 * up(k), tilt: -0.3 * up(k) }),
  noseRound: (k) => p({ dx: -34 + 22 * Math.sin(k * TAU * 1.5), tilt: -0.3 - 0.12 * Math.cos(k * TAU * 3), dy: -8 * hops(k, 3) }),
  chinOn: (k) => p({ dx: -34 + 6 * ease(k), tilt: -0.3 - 0.16 * ease(k * 2), dy: 10 * ease(k * 2) }),
  bite: (k) => p({ dx: -30 * up(k * 0.5 + 0.5 * k), tilt: -0.5 * up(k) }),
  // His whole card turns away from the bowl: a long face.
  longFace: (k) => p({ flip: Math.cos(Math.PI * ease(k * 2.2)), dy: 6 * ease(k) }),
  spit: (k) => p({ flip: -Math.cos(Math.PI * ease(k * 3)), dx: -16 * up(k), tilt: -0.24 * up(k) }),
  shove: (k) => p({ dx: -30 * up(k), tilt: -0.2 * up(k), flip: k < 0.75 ? 1 : Math.cos(Math.PI * ease((k - 0.75) * 4)) }),
  sulk: () => p({ flip: -1, dy: 6 }),
  cockHead: (k) => p({ tilt: 0.24 * ease(k * 3) * (Math.sin(k * TAU) > 0 ? 1 : -1) }),
  // Nose to the sky, rising with the ring.
  howl: (k) => p({ tilt: 0.5 * ease(k * 2.5), dy: -12 * ease(k) }),
  pawOn: (k) => p({ tilt: 0.5 * (1 - ease(k * 2.5)) - 0.34 * ease(k * 2.5), dx: -30 * ease(k * 2.5), dy: -12 * (1 - ease(k * 2.5)) + 8 * ease(k * 2.5) }),
  pawRest: () => p({ tilt: -0.34, dx: -30, dy: 8 }),
  grab: (k) => p({ dx: -30 * ease(k * 1.5), tilt: -0.36 * up(k) }),
  shakeIt: (k) => p({ dx: -30, tilt: 0.4 * Math.sin(k * TAU * 4), dy: -6 * hops(k, 4) }),
  lieDown: (k) => p({ dx: -30 + (LYING.dx + 30) * ease(k), dy: LYING.dy * ease(k) - 16 * up(k), tilt: LYING.tilt * ease(k) }),
  chew: (k) => p({ ...LYING, tilt: LYING.tilt + 0.05 * Math.sin(k * TAU * 5) }),
  sniffTwice: (k) => p({ dx: -22 * hops(k, 2), tilt: -0.34 * hops(k, 2) }),
  windUp: (k) => p({ tilt: 0.4 * ease(k), dy: -8 * ease(k) }),
  sneeze: (k) => p({ tilt: 0.4 - 1.0 * ease(k * 3), dx: -26 * up(k), dy: -8 + 8 * ease(k * 3) }),
  // Over backwards, and he ends on his back with his legs in the air.
  rollBack: (k) => p({ tilt: -0.6 + (0.6 + Math.PI * 1.1 + TAU) * ease(k), dx: 16 * ease(k), dy: -50 * up(k) - 150 * ease(k) }),
  onBack: () => p({ tilt: Math.PI * 1.1 + TAU, dx: 16, dy: -150 }),
  dig: (k) => p({ dx: -26, tilt: -0.44 + 0.16 * Math.sin(k * TAU * 7), dy: 8 + 5 * hops(k, 7) }),
  noseOver: (k) => p({ dx: -26 + 12 * Math.sin(k * TAU * 2), tilt: -0.5, dy: 12 }),
  pat: (k) => p({ dx: -26, tilt: -0.4, dy: 4 + 14 * hops(k, 3) }),
  lieOn: (k) => p({ dx: -26 + (LYING.dx - 6 + 26) * ease(k), dy: 4 + (LYING.dy - 22) * ease(k) - 20 * up(k), tilt: -0.4 + (LYING.tilt + 0.4) * ease(k) }),
  onMound: () => p({ dx: LYING.dx - 6, dy: LYING.dy - 18, tilt: LYING.tilt }),
  // Over his shoulder: a jerk of the head up and back.
  toss: (k) => p({ tilt: 0.7 * up(k), dy: -18 * up(k) }),
}

const TAIL: Record<string, Move> = {
  wagHard: (k) => p({ tilt: 0.8 * Math.sin(k * TAU * 6) }),
}

// --- The crow, from the scarecrow's shoulder ---------------------------------------

const ON_PEG = { dx: 54, dy: -125 }, ON_HEAD = { dx: 54, dy: -102 }, AT_HAND = { dx: 136, dy: 22 }, BY_HEAD = { dx: 8, dy: -62 }
const flit = (from: { dx: number; dy: number }, to: { dx: number; dy: number }, k: number, high = 40): Pose =>
  p({ dx: from.dx + (to.dx - from.dx) * ease(k), dy: from.dy + (to.dy - from.dy) * ease(k) - high * up(k), tilt: 0.3 * Math.sin(k * TAU * 3) })
const HOME_SPOT = { dx: 0, dy: 0 }
const CROW: Record<string, Move> = {
  flyUp: (k) => flit(HOME_SPOT, ON_PEG, k),
  // Running on the spot to stay on top of the ball: tipped one way and the other, fast.
  runOnSpot: (k) => p({ ...ON_PEG, dx: ON_PEG.dx + 9 * Math.sin(k * TAU * 5), dy: ON_PEG.dy - 7 * hops(k, 10), tilt: 0.34 * Math.sin(k * TAU * 5) }),
  onBall: () => p({ ...ON_PEG }),
  walkArm: (k) => p({ dx: AT_HAND.dx * k, dy: AT_HAND.dy * k - 5 * hops(k, 6), tilt: 0.12 * Math.sin(k * TAU * 6) }),
  peckThree: (k) => p({ ...AT_HAND, tilt: 0.7 * hops(k, 3) }),
  hopHomeFromHand: (k) => flit(AT_HAND, HOME_SPOT, k, 50),
  nodInTime: (k) => p({ tilt: 0.3 * hops(k, 4) }),
  // Off the shoulder: over backwards and down to the floor.
  fallOff: (k) => p({ dx: -40 * ease(k), dy: 150 * ease(k) * ease(k) - 30 * up(k * 2), tilt: -5 * ease(k) }),
  hopHomeFromFloor: (k) => flit({ dx: -40, dy: 150 }, HOME_SPOT, k, 60),
  caw: (k) => p({ tilt: -0.5 * up(k), dy: -10 * up(k), scale: 1 + 0.12 * up(k) }),
  // A hop to his head, a tug at a leaf and back down.
  pull: (k) => p({ dx: BY_HEAD.dx * up(k), dy: BY_HEAD.dy * up(k), tilt: 0.6 * Math.sin(k * Math.PI * 3) * up(k) }),
  flyToHead: (k) => flit(HOME_SPOT, { ...ON_HEAD, dy: ON_HEAD.dy - 16 }, k),
  sitDown: (k) => p({ ...ON_HEAD, dy: ON_HEAD.dy - 16 * (1 - ease(k)), tilt: 0.08 * dying(k, 3) }),
  fluffUp: (k) => p({ ...ON_HEAD, scale: 1 + 0.3 * ease(k * 2), tilt: 0.06 * dying(k, 4) }),
  softCaw: (k) => p({ ...ON_HEAD, scale: 1.3, tilt: -0.2 * up(k) }),
  onEgg: () => p({ ...ON_HEAD, scale: 1.3 }),
  // It lifts the old thing off him and lets it go towards the nest.
  carryOff: (k) => p({ dx: 120 * up(k), dy: -90 * up(k), tilt: 0.3 * Math.sin(k * TAU * 4) }),
}

const SCARECROW: Record<string, Move> = {
  // Anything on his head and he stands taller on his pole.
  tall: (k) => p({ dy: -10 * ease(k * 1.5) }),
  giant: (k) => p({ dy: -22 * ease(k * 1.5), tilt: 0.03 * dying(k, 3) }),
  shrink: (k) => p({ dy: -10 * (1 - ease(k * 1.5)) }),
}

/** Every move by who makes it. The thing's own moves and the small props are drawn by the frame, which knows where they are. */
const MOVES: Partial<Record<Actor, Record<string, Move>>> = { goose: GOOSE, frog: FROG, dog: DOG, tail: TAIL, crow: CROW, scarecrow: SCARECROW }

export function poseOf(who: Actor, does: string, k: number): Pose {
  const move = MOVES[who]?.[does]
  return move ? move(Math.min(1, Math.max(0, k))) : REST
}

export function knows(who: Actor, does: string): boolean {
  return MOVES[who]?.[does] !== undefined
}

// --- The thing itself --------------------------------------------------------------

export type ThingPose = Pose & {
  /** It rides the goose's head (the boot), wherever she is. */
  onGoose?: boolean
  /** How far it has turned into what the pairing leaves, 0 to 1, where a move does that by itself (sinking). */
  into?: number
}
const t = (more: Partial<ThingPose>): ThingPose => ({ ...REST, ...more })

const THING: Record<string, (k: number) => ThingPose> = {
  rollUnder: (k) => t({ dx: 40 * (1 - ease(k)), tilt: -TAU * ease(k) }),
  plop: (k) => t({ dy: -14 * up(k * 2) * (1 - k) + 10 * up(k), tilt: 0.1 * dying(k, 2) }),
  bob: (k) => t({ dy: 5 * Math.sin(k * TAU * 2), tilt: 0.08 * Math.sin(k * TAU) }),
  spin: (k) => t({ tilt: -TAU * 3 * k, dy: 3 * Math.sin(k * TAU * 4) }),
  stick: (k) => t({ dy: -18 * (1 - ease(k * 2)), tilt: 0.12 * dying(k, 3) }),
  wobble: (k) => t({ tilt: 0.16 * Math.sin(k * TAU * 5), dx: 3 * Math.sin(k * TAU * 5) }),
  squirt: (k) => t({ dx: -70 * up(k), dy: -50 * up(k), tilt: -TAU * k }),
  roundBowl: (k) => t({ dx: 20 * Math.sin(k * TAU * 1.5) * (1 - k * k), dy: -8 * hops(k, 3), tilt: TAU * k }),
  pegIn: (k) => t({ dy: -12 * (1 - ease(k * 2)), tilt: 0.2 * dying(k, 2) }),
  kneeSwing: (k) => t({ dx: -16 * Math.sin(k * TAU * 1.8) * up(k), tilt: 0.3 * Math.sin(k * TAU * 1.8) * up(k) }),
  sink: (k) => t({ dy: -6 * up(k * 2), tilt: 0.3 * dying(k, 2), into: ease(k) }),
  layInHand: (k) => t({ dy: -10 * (1 - ease(k * 2)), tilt: 0.1 * dying(k, 2) }),
  inMouth: (k) => t({ dx: 26 * ease(k * 4), dy: -52 * ease(k * 4), tilt: 0.4 }),
  spatBack: (k) => t({ dx: 26 * (1 - ease(k)), dy: -52 * (1 - ease(k)) - 20 * up(k), tilt: 0.4 * (1 - k) + TAU * k }),
  dangle: (k) => t({ dy: 14 * dying(k, 3), tilt: 0.1 * dying(k, 3) }),
  tickUnder: (k) => t({ tilt: 0.05 * Math.sin(k * TAU * 7) }),
  ring: (k) => t({ tilt: 0.2 * Math.sin(k * TAU * 14) * (1 - k * 0.5), dy: -3 * hops(k, 14) }),
  hangOnNeck: (k) => t({ dy: -10 * (1 - ease(k * 2)), tilt: 0.24 * dying(k, 2) }),
  tock: (k) => t({ tilt: k >= 1 ? 0 : 0.14 * (Math.sin(k * TAU * 2) > 0 ? 1 : -1) }),
  tick: (k) => t({ tilt: k >= 1 ? 0 : 0.07 * (Math.sin(k * TAU * 3) > 0 ? 1 : -1) }),
  // A pendulum on its peg: out one way on the tick and the other way on the tock.
  pendulum: (k) => t({ tilt: 0.5 * Math.sin(k * TAU * 2.4 + Math.PI / 2) * (k < 0.9 ? 1 : (1 - k) * 10) }),
  onHead: () => t({ onGoose: true }),
  dropOff: (k) => t({ dy: -60 * (1 - ease(k)) - 20 * up(k), dx: -20 * (1 - ease(k)), tilt: 3 * (1 - k) }),
  floatHigh: (k) => t({ dy: -30 + 4 * Math.sin(k * TAU * 4) - 14 * up(k * 6) * (k < 1 / 6 ? 1 : 0), tilt: 0.06 * Math.sin(k * TAU * 2) }),
  settleLow: (k) => t({ dy: -30 * (1 - ease(k)), tilt: 0.04 * dying(k, 3) }),
  hatOn: (k) => t({ dy: -20 * (1 - ease(k * 2)), tilt: 0.14 * dying(k, 2) }),
  shaken: (k) => t({ dx: 24 * Math.sin(k * TAU * 4) * (1 - k * k), dy: -30 * up(k) - 6 * hops(k, 4), tilt: 0.9 * Math.sin(k * TAU * 4) * (1 - k * k) }),
  turnSlowly: (k) => t({ tilt: 0.5 * Math.sin(k * Math.PI) , dx: 4 * Math.sin(k * TAU) }),
  rock: (k) => t({ tilt: 0.34 * dying(k, 2) + 0.2 * hops(k, 2) * (1 - k) }),
  duck: (k) => t({ dy: 40 * ease(k) }),
  popUp: (k) => t({ dy: 40 * (1 - ease(k * 2.5)) - 22 * up(Math.max(0, k * 2.5 - 1) / 1.5) }),
  layOnHead: (k) => t({ dy: -14 * (1 - ease(k * 2)), tilt: 0.12 * dying(k, 3) }),
  dropIn: (k) => t({ dy: 26 * ease(k), scale: 1 - 0.3 * ease(k) }),
}

export function thingPose(does: string, k: number): ThingPose {
  const move = THING[does]
  return move ? move(Math.min(1, Math.max(0, k))) : t({})
}

export const THING_MOVES = Object.keys(THING)
