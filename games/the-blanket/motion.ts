import { SITTERS, headSpot, spotAt, SEATS, headOf, SPOTS, standAt, type Spot, type Who } from './layout'
import type { Point } from './input'
import type { Phase, Sitter, World } from './model'
import { EAT, HUNT, LOST, SULK, WIND, homeSeconds, runSeconds, sees } from './model'

// How each one moves, as numbers for the view. No two share a curve: the dog
// is all front and no brakes, the cat pours, the aunt bounces where she sits
// and the grandfather creaks.

export type Nature = {
  /** Breaths a second, and how far one swells. */
  breath: number
  swell: number
  /** Strides a second on the run, how high one hops and how far it leans. */
  stride: number
  hop: number
  lean: number
  /** How fast the head turns to what it looks at. */
  turn: number
  /** Seconds between blinks. */
  blink: number
  /** Chews a second, and how far one goes. */
  chew: number
  jaw: number
  /** How it shakes itself on coming out of a blanket. */
  shake: number
  /** How fast it wanders when it does not know. */
  wander: number
  /** How far a lump under a blanket moves, and how fast. */
  lump: number
  lumpRate: number
}

export const NATURES: Record<Who, Nature> = {
  dog: { breath: 1.1, swell: 0.03, stride: 4.6, hop: 46, lean: 0.34, turn: 14, blink: 2.3, chew: 5.2, jaw: 1, shake: 19, wander: 1.5, lump: 9, lumpRate: 3.4 },
  cat: { breath: 0.42, swell: 0.016, stride: 3.1, hop: 16, lean: 0.16, turn: 7, blink: 5.1, chew: 1.7, jaw: 0.4, shake: 11, wander: 0.5, lump: 3, lumpRate: 0.9 },
  aunt: { breath: 0.6, swell: 0.042, stride: 2.2, hop: 74, lean: -0.1, turn: 5, blink: 3.6, chew: 2.6, jaw: 0.55, shake: 7, wander: 0.85, lump: 6, lumpRate: 1.7 },
  grandpa: { breath: 0.33, swell: 0.022, stride: 1.7, hop: 30, lean: 0.06, turn: 3.6, blink: 4.2, chew: 0.95, jaw: 0.75, shake: 4.5, wander: 0.32, lump: 5, lumpRate: 0.55 },
}

/** What eyes rest on. */
export type Looking = { at: Point; sure: boolean }

/** Where a sitter in its seat, uncovered, looks: the sausage in the hand, the one being eaten, what it believes, or about. */
export function looksAt(world: World, who: Who, hand: Point | null, time: number, mouth: Point | null): Looking {
  const s = world.sitters[who]
  if (sees(world, who)) {
    if (world.held?.kind === 'sausage' && hand && world.held.origin !== headSpot(who)) return { at: hand, sure: true }
    if (world.sausage.kind === 'mouth' && mouth) return { at: mouth, sure: true }
  }
  if (s.belief !== null) return { at: spotAt(s.belief), sure: true }
  const n = NATURES[who], i = SITTERS.indexOf(who)
  const step = Math.floor(time * n.wander + i * 0.37), h = Math.sin(step * 12.9898 + i * 78.2) * 43758.5453, k = h - Math.floor(h)
  const h2 = Math.sin(step * 39.3 + i * 11.1) * 24634.63, k2 = h2 - Math.floor(h2)
  const head = SEATS[who].head
  return { at: { x: head.x + (k - 0.5) * 700, y: head.y - 130 + k2 * 260 }, sure: false }
}

export type Mouth = 'shut' | 'smile' | 'open' | 'o' | 'grump' | 'chew' | 'flat'

export type Pose = {
  x: number
  y: number
  rot: number
  sx: number
  sy: number
  /** About the head, when a dive turns the whole figure over: 0 upright, 1 head down. */
  dive: number
  headX: number
  headY: number
  headRot: number
  /** 0 open, 1 shut. */
  lid: number
  brow: number
  mouth: Mouth
  /** Legs: the phase of the stride, and how far they move, 0 to 1. */
  legs: number
  legging: number
  /** The limb that points: the dog's nose needs none, the cat's tail, the aunt's fan, the grandfather's pipe. */
  flap: number
  /** Hair on end, straight out of the blanket, 0 to 1. */
  frizz: number
}

const TAU = Math.PI * 2
const clamp = (t: number) => Math.max(0, Math.min(1, t))
const ease = (t: number) => { const k = clamp(t); return k * k * (3 - 2 * k) }
const bump = (t: number) => Math.sin(clamp(t) * Math.PI)

export function neutral(): Pose {
  return { x: 0, y: 0, rot: 0, sx: 1, sy: 1, dive: 0, headX: 0, headY: 0, headRot: 0, lid: 0, brow: 0, mouth: 'shut', legs: 0, legging: 0, flap: 0, frizz: 0 }
}

/** The floor line in front of the chairs, where those stand who have been up a wall. */
const FRONT = 645

/** The floor under a hunter: behind what stands on the rug, and under what hangs on the wall. */
function floorUnder(s: Sitter): number {
  const spot = s.target
  if (spot === null || headOf(spot)) return s.at.y
  return aloft(spot) ? FRONT : 655
}

/** Whether a spot is out of reach from the floor, so that getting there is a leap. */
export function aloft(spot: Spot): boolean {
  return spot === 'hook' || (headOf(spot) === null && SPOTS[spot as keyof typeof SPOTS].high)
}

/** Where a sitter is seen to stand, and so where it is touched: the rules move it in straight lines, and it keeps to the floor until it leaps. */
export function footing(who: Who, s: Sitter): Point {
  if (s.target === null) return s.at
  const floor = floorUnder(s)
  if (s.phase === 'run' && aloft(s.target)) {
    const to = standAt(s.target, s.slot), k = s.t / runSeconds(who, s.from, to)
    const base = s.from.y + (floor - s.from.y) * clamp(k / 0.5)
    return { x: s.at.x, y: base + (to.y - base) * ease((k - 0.5) / 0.5) }
  }
  if (s.phase === 'eat' || s.phase === 'sulk') return { x: s.at.x, y: s.at.y + (floor - s.at.y) * ease(s.t / 0.3) }
  if (s.phase === 'home') {
    const k = s.t / homeSeconds(who, s.from, SEATS[who])
    const start = aloft(s.target) ? FRONT : headOf(s.target) ? s.from.y : 655
    return { x: s.at.x, y: s.at.y + (start - s.from.y) * (1 - clamp(k)) }
  }
  return s.at
}

const arc: Record<Who, number> = { dog: 110, cat: 190, aunt: 70, grandpa: 130 }

/** Fills in the pose of one sitter. `time` is game time, `poked` seconds since it was last touched, `freed` since its blanket came off. */
export function poseOf(who: Who, s: Sitter, time: number, poked: number, freed: number, bowled: number, out: Pose): Pose {
  const n = NATURES[who], i = SITTERS.indexOf(who)
  Object.assign(out, neutral())
  const breath = Math.sin((time * n.breath + i * 0.31) * TAU)
  const foot = footing(who, s)
  out.x = foot.x
  out.y = foot.y
  out.sy = 1 + breath * n.swell
  out.sx = 1 - breath * n.swell * 0.6
  const b = (time + i * 1.7) % n.blink
  if (b < 0.13) out.lid = 1
  if (poked < 0.5) {
    const k = Math.exp(-poked * 7) * Math.cos(poked * 24)
    out.sy -= 0.14 * k
    out.sx += 0.12 * k
  }
  if (bowled < 1.1) {
    const k = Math.exp(-bowled * 3)
    out.sy -= 0.3 * k * Math.cos(bowled * 16)
    out.sx += 0.26 * k * Math.cos(bowled * 16)
    out.rot += 0.22 * k * Math.sin(bowled * 13)
    out.mouth = 'o'
  }
  out.frizz = clamp(1.2 - freed * 0.8)
  out.flap = Math.sin(time * (1.3 + i * 0.45) + i) * 0.12
  if (freed < 0.6) out.headRot += Math.sin(freed * n.shake * 5) * 0.3 * (1 - freed / 0.6)
  ;(PHASES[s.phase] ?? PHASES.seat)(who, s, time, out)
  return out
}

type Move = (who: Who, s: Sitter, time: number, out: Pose) => void

const PHASES: Record<Phase, Move> = {
  seat: (_who, s, _t, o) => {
    if (!s.covered && s.belief !== null && o.mouth === 'shut') o.mouth = 'smile'
    if (!s.covered && s.belief === null) { o.mouth = 'flat'; o.brow = 0.5 }
  },
  wind: (who, s, _t, o) => {
    const k = s.t / WIND
    o.lid = k < 0.3 ? 0 : 1
    o.mouth = 'open'
    o.brow = 1
    // Each winds up with a different part: the dog goes down in front, the cat stretches tall, the aunt swells, the grandfather rocks.
    if (who === 'dog') { o.sy *= 1 - 0.2 * ease(k * 1.4); o.sx *= 1 + 0.14 * k; o.headX += Math.sin(k * 40) * 5 }
    if (who === 'cat') { o.sy *= 1 + 0.16 * ease(k); o.sx *= 1 - 0.1 * ease(k) }
    if (who === 'aunt') { const p = Math.abs(Math.sin(k * 9.4)); o.y -= p * 22; o.sy *= 1 - 0.12 * (1 - p); o.sx *= 1 + 0.12 * (1 - p) }
    if (who === 'grandpa') o.rot += Math.sin(k * 12) * 0.16
  },
  run: (who, s, _t, o) => {
    const n = NATURES[who]
    const to = s.at.x >= s.from.x ? 1 : -1
    const p = s.t * n.stride
    o.lid = 1
    o.mouth = 'open'
    o.brow = 1
    o.legs = p * TAU
    o.legging = 1
    o.y -= Math.abs(Math.sin(p * Math.PI)) * n.hop
    o.rot = n.lean * to
    const squash = Math.cos(p * TAU) * 0.06
    o.sy *= 1 - squash
    o.sx *= 1 + squash
    o.headRot = -o.rot * 0.5
    o.flap = Math.sin(p * TAU) * 0.6
  },
  hunt: (who, s, _t, o) => {
    const n = NATURES[who], k = s.t / HUNT, spot = s.target!
    o.lid = 1
    o.legging = 1
    o.legs = s.t * n.stride * 1.3 * TAU
    const own = headOf(spot)
    if (own === who) {
      // Pats its own head.
      o.lid = 0
      o.mouth = 'o'
      o.headY = Math.abs(Math.sin(s.t * 12)) * 8
      o.flap = Math.sin(s.t * 12)
      o.legging = 0
      return
    }
    if (spot === 'hook') {
      o.lid = 0
      o.mouth = 'o'
      const j = (s.t * 2.5) % 1
      o.y -= Math.sin(j * Math.PI) * arc[who] * 0.9
      o.sy *= 1 + (Math.sin(j * Math.PI) - 0.2) * 0.3
      o.flap = -1
      return
    }
    if (own) {
      o.y -= Math.sin(clamp(k * 1.6) * Math.PI) * arc[who]
      o.rot = Math.sin(s.t * 14) * 0.12
      o.mouth = 'open'
      return
    }
    o.dive = ease(k * 4.5)
    o.headRot = Math.sin(s.t * (9 + SITTERS.indexOf(who) * 2)) * 0.2
    o.rot = Math.sin(s.t * (8 + SITTERS.indexOf(who) * 1.7)) * 0.06
    o.y -= Math.sin(clamp(k * 4.5) * Math.PI) * arc[who] * 0.6
  },
  eat: (who, s, _t, o) => {
    const n = NATURES[who], k = s.t / EAT
    const c = Math.abs(Math.sin(s.t * n.chew * Math.PI))
    o.mouth = k < 0.12 ? 'open' : k > 0.9 ? 'smile' : 'chew'
    o.headY = c * n.jaw * 7
    if (who === 'dog') { o.mouth = k < 0.22 ? 'open' : k < 0.4 ? 'chew' : 'o'; o.headRot = k > 0.4 ? Math.sin(s.t * 7) * 0.4 : 0; o.sy *= k > 0.2 && k < 0.4 ? 1.12 : 1; o.brow = k > 0.4 ? -0.6 : 0.4 }
    if (who === 'cat') { o.lid = k < 0.86 ? 1 : 0.4; o.headRot = Math.sin(s.t * 2.2) * 0.1 }
    if (who === 'aunt') { o.flap = k > 0.8 ? -1 : 0.3; if (k > 0.82) { o.mouth = 'o'; o.sy *= 1 - 0.06 * bump((k - 0.82) / 0.1) } }
    if (who === 'grandpa') { o.lid = k < 0.45 ? 0 : 0.6; o.headRot = k < 0.45 ? Math.sin(s.t * 5) * 0.18 : 0; o.mouth = k < 0.45 ? 'smile' : 'chew'; if (k < 0.45) o.rot = Math.sin(s.t * 4) * 0.05 }
  },
  sulk: (who, s, _t, o) => {
    const k = s.t / SULK
    o.brow = -1
    o.mouth = 'grump'
    if (who === 'dog') { o.headRot = -0.15; o.headY = -Math.abs(Math.sin(k * 9)) * 12; o.mouth = 'o'; o.sy *= 1 + bump(k) * 0.08 }
    if (who === 'cat') { o.lid = k > 0.3 ? 0.9 : 0; o.headRot = k > 0.3 ? 0.35 : 0; o.headY = k > 0.3 ? Math.sin(k * 30) * 4 : 0; o.mouth = k > 0.3 ? 'smile' : 'flat'; o.brow = 0 }
    if (who === 'aunt') { o.mouth = k < 0.25 ? 'o' : 'grump'; o.flap = Math.sin(s.t * (8 + s.t * 14)) * 0.7; o.sx *= 1 + bump(k) * 0.1 }
    if (who === 'grandpa') { o.headRot = Math.sin(clamp(k * 2) * 9) * 0.1; o.flap = k > 0.45 ? 1 : -0.6; o.sy *= k > 0.4 && k < 0.6 ? 0.93 : 1 }
    if (s.target !== null && disliked(who, s.target)) dislike(who, k, o)
  },
  home: (who, s, _t, o) => {
    const n = NATURES[who], p = s.t * n.stride * 0.62
    o.legs = p * TAU
    o.legging = 0.6
    o.y -= Math.abs(Math.sin(p * Math.PI)) * n.hop * 0.4
    o.headY = 8
    o.rot = (s.covered ? Math.sin(s.t * 7) * 0.1 : 0.03 * Math.sin(p * Math.PI))
    if (!s.covered) { o.mouth = s.belief === 'hook' ? 'smile' : 'flat'; o.brow = s.belief === 'hook' ? 0 : -0.5 }
  },
  lost: (who, s, _t, o) => {
    const k = s.t / LOST
    o.brow = 0.8
    o.mouth = 'o'
    o.headRot = Math.sin(k * 10 + SITTERS.indexOf(who)) * 0.34
    o.headX = Math.sin(k * 10 + SITTERS.indexOf(who)) * 16
    o.y -= Math.abs(Math.sin(k * 10)) * NATURES[who].hop * 0.3
    if (k > 0.6) { o.mouth = 'flat'; o.sy *= 1 - 0.06 * bump((k - 0.6) / 0.4); o.flap = 0.5 }
  },
}

const DISLIKES: Record<Who, Spot> = { dog: 'gramophone', cat: 'pot', aunt: 'boot', grandpa: 'teapot' }
export function disliked(who: Who, spot: Spot): boolean {
  return DISLIKES[who] === spot
}

/** The taste that never changes, after hunting where it least likes to. */
function dislike(who: Who, k: number, o: Pose): void {
  if (who === 'dog') { o.flap = 1; o.headY = 10; o.lid = 1; o.rot = Math.sin(k * 40) * 0.04 }
  if (who === 'cat') { o.lid = 0; o.mouth = 'grump'; o.legs = k * 30; o.legging = 1; o.headRot = Math.sin(k * 26) * 0.12 }
  if (who === 'aunt') { o.flap = -1.4; o.lid = 1; o.headRot = -0.25; o.mouth = 'grump' }
  if (who === 'grandpa') { o.flap = -1; o.headY = 12; o.rot = Math.sin(k * 22) * 0.05; o.lid = 0.6 }
}
