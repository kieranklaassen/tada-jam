import type { FrogMode } from '../controller'
import { BONE, LID_CLOSED, LID_OPEN, type Character, type FrogRig } from './frog'

// Five frogs, five ways of being alive. Each personality is its own
// routine for idle, anticipation (a finger resting on it), singing, the tap
// reaction, being carried, the hop, and landing. They share only the pose
// they write into and a few curve helpers, never a routine with different
// numbers:
//
// - the show-off struts, winks, spins when tapped, and lands in a ta-da;
// - the shy one hides under a leaf parasol, sings with her eyes shut, and
//   ducks behind the leaf when tapped, then peeks;
// - the sleepy one breathes slowly, nods off and jerks awake, yawns, and
//   plops down like jelly;
// - the bouncy one bops on every beat, backflips when tapped, and lands in
//   decaying boings;
// - the old crooner sways and conducts, sings with vibrato, and bows.

export type FrogMoment = {
  time: number
  dt: number
  /** Loop clock and beat length, for moving in time. */
  clock: number
  beat: number
  mode: FrogMode
  /** Seconds since each event; Infinity when it never happened. */
  sing: number
  singStrength: number
  press: number
  tap: number
  lift: number
  land: number
  splash: number
  /** 0..1 through a hop, or -1. */
  hop: number
  /** Velocity while carried, world units per second. */
  vx: number
  vz: number
  /** The firefly relative to the frog's eyes, in the frog's own units. */
  gazeX: number
  gazeY: number
  gazeZ: number
  /** 1 when the firefly is right here, 0 when it is far. */
  fireNear: number
  /** 0..1 progress of the first-open invitation, or null. */
  invite: number | null
  /** 0..1 while a carried frog hovers over this frog's pad: one drop from a swap. */
  visited: number
  /** The carried frog relative to this frog's eyes, in the frog's own units. */
  visitorX: number
  visitorY: number
  visitorZ: number
  /** Which way to make room (+1 or -1 on x): toward the middle of the pond, so it never leans off screen. */
  visitorSide: number
}

export type Pose = {
  rootX: number
  rootY: number
  rootZ: number
  rootPitch: number
  rootYaw: number
  rootRoll: number
  bodySX: number
  bodySY: number
  bodySZ: number
  bodyPitch: number
  bodyYaw: number
  bodyRoll: number
  headY: number
  headPitch: number
  headYaw: number
  headRoll: number
  /** 0 open, 1 closed. */
  lidL: number
  lidR: number
  pupilX: number
  pupilY: number
  mouth: number
  bubble: number
  /** Arm raise outward and forward, radians, mirrored per side. */
  armLOut: number
  armLFwd: number
  armROut: number
  armRFwd: number
  /** Leg swing: positive extends down and back. */
  legL: number
  legR: number
  hatY: number
  hatPitch: number
  hatRoll: number
  cheeks: number
}

export function restPose(): Pose {
  return {
    rootX: 0,
    rootY: 0,
    rootZ: 0,
    rootPitch: 0,
    rootYaw: 0,
    rootRoll: 0,
    bodySX: 1,
    bodySY: 1,
    bodySZ: 1,
    bodyPitch: 0,
    bodyYaw: 0,
    bodyRoll: 0,
    headY: 0,
    headPitch: 0,
    headYaw: 0,
    headRoll: 0,
    lidL: 0,
    lidR: 0,
    pupilX: 0,
    pupilY: 0,
    mouth: 0,
    bubble: 0,
    armLOut: 0,
    armLFwd: 0,
    armROut: 0,
    armRFwd: 0,
    legL: 0,
    legR: 0,
    hatY: 0,
    hatPitch: 0,
    hatRoll: 0,
    cheeks: 1,
  }
}

const REST = restPose()

export function resetPose(pose: Pose): Pose {
  return Object.assign(pose, REST)
}

// Curves.

const TAU = Math.PI * 2

function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t
}

/** 0 → 1 → 0 over [a, b]. */
function bump(t: number, a: number, b: number): number {
  if (t <= a || t >= b) return 0
  return Math.sin(((t - a) / (b - a)) * Math.PI)
}

/** Rises over `attack`, holds, falls over `release`. */
function envelope(t: number, attack: number, hold: number, release: number): number {
  if (t < 0 || t >= attack + hold + release) return 0
  if (t < attack) return smooth(t / attack)
  if (t < attack + hold) return 1
  return 1 - smooth((t - attack - hold) / release)
}

function smooth(t: number): number {
  const u = clamp01(t)
  return u * u * (3 - 2 * u)
}

/** A struck spring: decaying oscillation. */
function ring(t: number, hz: number, decay: number): number {
  return t < 0 || !Number.isFinite(t) ? 0 : Math.exp(-t * decay) * Math.sin(t * hz * TAU)
}

function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

/** Seconds into the current occurrence of an event that recurs roughly every `period`, jittered per cycle. */
function recurring(time: number, period: number, seed: number): number {
  const cycle = Math.floor(time / period)
  const offset = hash(cycle * 13 + seed) * period * 0.6
  return time - cycle * period - offset
}

function volume(pose: Pose, sy: number): void {
  pose.bodySY *= sy
  const side = 1 / Math.sqrt(sy)
  pose.bodySX *= side
  pose.bodySZ *= side
}

function gaze(pose: Pose, m: FrogMoment, reach: number): void {
  const d = Math.hypot(m.gazeX, m.gazeY, m.gazeZ) + 1e-4
  pose.pupilX = (m.gazeX / d) * 0.04 * reach
  pose.pupilY = (m.gazeY / d) * 0.035 * reach
}

type Spring = { x: number; v: number }

function spring(s: Spring, target: number, stiffness: number, damping: number, dt: number): number {
  s.v += ((target - s.x) * stiffness - s.v * damping) * dt
  s.x += s.v * dt
  return s.x
}

const beatPhase = (m: FrogMoment) => (((m.clock / m.beat) % 1) + 1) % 1

// The show-off: coral, chest out, a lily on its head.

type ShowoffState = { flower: Spring; lean: Spring }

function showoff(m: FrogMoment, p: Pose, s: ShowoffState): void {
  const t = m.time
  p.bodySZ = 1.04
  p.headPitch = -0.12
  p.bodyRoll = Math.sin(t * 1.3) * 0.07
  p.headRoll = -Math.sin(t * 1.3 - 0.4) * 0.05
  p.rootYaw = Math.sin(t * 0.65) * 0.18
  volume(p, 1 + Math.sin(t * 2.1) * 0.025)
  gaze(p, m, 1)
  const wink = recurring(t, 7, 1)
  p.lidR = bump(wink, 0, 0.45)
  p.armROut = 0.25 + bump(wink, 0, 0.6) * 1.3
  p.mouth = 0.12 + bump(wink, 0, 0.6) * 0.25
  p.lidL = bump(recurring(t, 4.1, 2), 0, 0.14)

  if (m.press < 0.4 && m.tap > m.press && m.mode === 'sit') {
    volume(p, 0.9)
    p.mouth = 0.3
  }
  // Singing: a fast puff that swells twice, up on its toes with arms flung wide.
  const sing = m.sing
  const puff = envelope(sing, 0.06, 0.3, 0.3)
  p.bubble = puff * (0.98 + 0.2 * bump(sing, 0.12, 0.36)) * m.singStrength
  volume(p, 1 + puff * 0.1)
  p.armLOut += puff * 1.1
  p.armROut += puff * 1.1
  p.headPitch -= puff * 0.25
  p.lidL = Math.max(p.lidL, puff * 0.35)
  p.lidR = Math.max(p.lidR, puff * 0.35)
  // Tapped: an anticipating crouch, a full pirouette, and a wink to finish.
  const tap = m.tap
  if (tap < 1.2) {
    const crouch = bump(tap, 0, 0.18)
    volume(p, 1 - crouch * 0.18)
    const spin = smooth((tap - 0.1) / 0.6)
    p.rootYaw += spin * TAU
    p.rootY += bump(tap, 0.1, 0.7) * 0.28
    p.lidR = Math.max(p.lidR, bump(tap, 0.7, 1.2))
    p.armROut += bump(tap, 0.65, 1.2) * 1.2
  }
  // Carried: a flying superhero, arms forward and legs back, leaning into the motion.
  if (m.mode === 'held' || m.hop >= 0) {
    const carried = m.mode === 'held' ? smooth(m.lift / 0.2) : 0.7
    const lean = spring(s.lean, Math.max(-0.5, Math.min(0.5, m.vx * 0.08)), 60, 9, m.dt)
    p.rootRoll = -lean
    p.bodyPitch = 0.35 * carried
    p.armLOut = 0.9 * carried
    p.armROut = 0.9 * carried
    p.armLFwd = 1.6 * carried
    p.armRFwd = 1.6 * carried
    p.legL = p.legR = 1.3 * carried
    p.mouth = 0.4 * carried
    volume(p, 1 + 0.12 * carried)
  } else spring(s.lean, 0, 60, 9, m.dt)
  // Landing: a ta-da, arms up in a V.
  const tada = envelope(m.land, 0.08, 0.35, 0.4)
  if (m.land < 1) {
    volume(p, 1 - ring(m.land, 2.4, 6) * 0.2)
    p.armLOut += tada * 2.1
    p.armROut += tada * 2.1
    p.headPitch -= tada * 0.2
  }
  const flower = spring(s.flower, p.headRoll + p.bodyRoll, 90, 7, m.dt)
  p.hatRoll = (flower - p.headRoll - p.bodyRoll) * 1.5
}

// The shy one: small and butter yellow, under a leaf parasol.

type ShyState = { leaf: Spring; tremble: number }

function shy(m: FrogMoment, p: Pose, s: ShyState): void {
  const t = m.time
  p.headPitch = 0.16
  p.headYaw = Math.sin(t * 0.4) * 0.12
  volume(p, 1 + Math.sin(t * 2.6) * 0.02)
  // She watches the firefly from under her lashes, and blushes when it comes close.
  gaze(p, m, 0.8)
  p.pupilY -= 0.012
  p.cheeks = 1 + m.fireNear * 0.8
  const glance = recurring(t, 5.3, 3)
  p.headPitch -= bump(glance, 0, 1.4) * 0.28
  const blink = recurring(t, 2.7, 4)
  p.lidL = p.lidR = Math.max(bump(blink, 0, 0.1), bump(blink, 0.16, 0.26))
  p.armROut = Math.sin(t * 0.9) * 0.05
  p.armLFwd = 0.35
  p.armLOut = -0.15

  if (m.press < 0.5 && m.tap > m.press && m.mode === 'sit') {
    volume(p, 0.86)
    p.lidL = p.lidR = 1
  }
  // Singing: a small brave bubble, eyes squeezed shut, shoulders up.
  const sing = m.sing
  const note = envelope(sing, 0.14, 0.22, 0.2)
  p.bubble = note * 0.78 * m.singStrength
  p.lidL = Math.max(p.lidL, note)
  p.lidR = Math.max(p.lidR, note)
  volume(p, 1 - note * 0.08)
  p.cheeks += note * 0.5
  // Tapped: ducks behind the leaf, holds still, then peeks out over it.
  const tap = m.tap
  let hide = 0
  if (tap < 2.2) {
    hide = envelope(tap, 0.12, 0.8, 0.6)
    volume(p, 1 - hide * 0.14)
    p.headPitch += hide * 0.3
    const peek = bump(tap, 0.9, 1.9)
    p.headRoll = peek * 0.35
    p.rootX = peek * 0.06
    p.cheeks += peek * 0.6
  }
  // Carried: curled into a ball behind the leaf, trembling a little.
  const carried = m.mode === 'held' ? smooth(m.lift / 0.25) : m.hop >= 0 ? 0.8 : 0
  if (carried > 0) {
    s.tremble += m.dt * 31
    hide = Math.max(hide, carried)
    p.legL = p.legR = -0.5 * carried
    p.lidL = p.lidR = carried
    volume(p, 1 - 0.12 * carried)
    p.rootRoll = Math.sin(s.tremble) * 0.03 * carried
    p.armLFwd = 1.2 * carried
  }
  // Landing: soft and small, then a peek from under the leaf.
  if (m.land < 1.6) {
    volume(p, 1 - ring(m.land, 3.2, 9) * 0.1)
    p.headRoll += bump(m.land, 0.4, 1.4) * -0.3
  }
  // Her arm is raised overhead, so hiding pitches it the other way from a hanging arm:
  // the leaf swings down in front of her face, broad side to the child.
  const leaf = spring(s.leaf, hide, 70, 11, m.dt)
  p.armRFwd = -leaf * 1.2
  p.armROut += -leaf * 0.18 + Math.sin(t * 1.1) * 0.03
}

// The sleepy one: big and leafy green, in a striped nightcap.

type SleepyState = { cap: Spring; jelly: Spring }

function sleepy(m: FrogMoment, p: Pose, s: SleepyState): void {
  const t = m.time
  // Deep slow breaths, the head nodding off and jerking back up.
  const breath = Math.sin(t * 1.05)
  volume(p, 1 + breath * 0.05)
  p.bodySZ *= 1 + breath * 0.03
  const nod = (t % 6.5) / 6.5
  const nodding = nod < 0.85 ? smooth(nod / 0.85) * 0.34 : 0.34 * (1 - smooth((nod - 0.85) / 0.05))
  p.headPitch = nodding
  p.headRoll = Math.sin(t * 0.45) * 0.08
  p.lidL = p.lidR = 0.55 + nodding * 0.9
  const blink = recurring(t, 4.8, 5)
  p.lidL = p.lidR = Math.min(1, Math.max(p.lidL, bump(blink, 0, 0.6)))
  gaze(p, m, 0.35)
  // A long yawn now and then: mouth wide, arms up, eyes shut.
  const yawn = recurring(t, 11, 6)
  const yawning = envelope(yawn, 0.5, 0.6, 0.6)
  p.mouth = yawning
  p.armLOut = p.armROut = yawning * 1.9
  p.headPitch -= yawning * 0.45
  p.lidL = p.lidR = Math.max(p.lidL, yawning)
  volume(p, 1 + yawning * 0.08)

  if (m.press < 0.5 && m.tap > m.press && m.mode === 'sit') p.lidR = 0.1
  // Singing: a slow swelling hum, eyes closed, head lolling to one side.
  const sing = m.sing
  const hum = envelope(sing, 0.3, 0.2, 0.55)
  p.bubble = hum * 1.1 * m.singStrength
  p.lidL = Math.max(p.lidL, hum)
  p.lidR = Math.max(p.lidR, hum)
  p.headRoll += hum * 0.25
  p.bodyRoll = hum * 0.1
  // Tapped: startled awake, eyes wide and the cap flying up, then drooping again.
  const tap = m.tap
  if (tap < 3) {
    const jolt = bump(tap, 0, 0.35)
    p.rootY += jolt * 0.3
    volume(p, 1 + jolt * 0.2)
    const awake = envelope(tap, 0.05, 0.5, 2.2)
    p.lidL = p.lidR = Math.min(p.lidL, 1 - awake)
    p.headPitch -= awake * 0.3
    p.hatY = jolt * 0.2
    p.armLOut = Math.max(p.armLOut, jolt * 1.4)
    p.armROut = Math.max(p.armROut, jolt * 1.4)
  }
  // Carried: dangles limp like a sleepy cat, long and loose, still asleep.
  const carried = m.mode === 'held' ? smooth(m.lift / 0.35) : m.hop >= 0 ? 0.6 : 0
  if (carried > 0) {
    volume(p, 1 + 0.28 * carried)
    p.legL = p.legR = 0.9 * carried
    p.armLOut = p.armROut = -0.1 * carried
    p.lidL = p.lidR = Math.max(p.lidL, carried)
    p.headRoll += Math.sin(t * 1.6) * 0.2 * carried
    p.rootRoll = -Math.max(-0.4, Math.min(0.4, m.vx * 0.06)) * carried
  }
  // Landing: a heavy plop, then wobbling like jelly.
  const jelly = spring(s.jelly, 0, 140, 5, m.dt)
  if (m.land < m.dt * 1.5) s.jelly.v = -3.2
  volume(p, 1 + jelly * 0.9)
  const cap = spring(s.cap, p.headRoll + p.bodyRoll, 40, 4, m.dt)
  p.hatRoll = (cap - p.headRoll - p.bodyRoll) * 1.6 + jelly * 0.8
  p.hatPitch = -p.hatY * 1.2
}

// The bouncy one: sky blue and spotted, on long legs.

type BouncyState = { turn: Spring; kick: number }

function bouncy(m: FrogMoment, p: Pose, s: BouncyState): void {
  const t = m.time
  // A bop on every beat: a tiny hop, a squash on contact, a head bob.
  const phase = beatPhase(m)
  const hopUp = bump(phase, 0, 0.42)
  p.rootY = hopUp * 0.07
  volume(p, 1 + hopUp * 0.06 - bump(phase, 0.42, 0.62) * 0.12)
  p.legL = p.legR = hopUp * 0.4
  p.headPitch = Math.sin(phase * TAU) * 0.08
  // Turns its whole body to follow the firefly, eager.
  const turn = spring(s.turn, Math.max(-0.7, Math.min(0.7, Math.atan2(m.gazeX, Math.max(0.5, m.gazeZ + 2)) * 0.9)), 30, 8, m.dt)
  p.rootYaw = turn
  gaze(p, m, 1.2)
  const blink = recurring(t, 3.4, 7)
  p.lidL = p.lidR = Math.max(bump(blink, 0, 0.08), bump(blink, 0.14, 0.22))
  p.armLOut = p.armROut = 0.15 + hopUp * 0.2

  if (m.press < 0.5 && m.tap > m.press && m.mode === 'sit') {
    volume(p, 0.78)
    p.legL = p.legR = -0.2
    p.rootY = 0
  }
  // Singing: rib-bit, two quick puffs, a jump on the first.
  const sing = m.sing
  const rib = envelope(sing, 0.04, 0.08, 0.1)
  const bit = envelope(sing - 0.24, 0.04, 0.1, 0.16)
  p.bubble = Math.max(rib, bit) * 1.05 * m.singStrength
  p.rootY += bump(sing, 0, 0.3) * 0.22
  p.legL = p.legR = Math.max(p.legL, bump(sing, 0, 0.3) * 1.2)
  p.mouth = bit * 0.3
  // Tapped: a big backflip.
  const tap = m.tap
  if (tap < 1.1) {
    const crouch = bump(tap, 0, 0.14)
    volume(p, 1 - crouch * 0.22)
    const flight = clamp01((tap - 0.1) / 0.62)
    p.rootY += Math.sin(flight * Math.PI) * 0.95
    p.rootPitch = -smooth(flight) * TAU
    p.legL = p.legR = Math.max(p.legL, bump(tap, 0.1, 0.72) * 1.6)
    p.armLOut += bump(tap, 0.1, 0.72) * 1.4
    p.armROut += bump(tap, 0.1, 0.72) * 1.4
  }
  // Carried: legs cycling like swimming, arms paddling, eyes wide.
  const carried = m.mode === 'held' ? smooth(m.lift / 0.15) : 0
  if (carried > 0) {
    s.kick += m.dt * 14
    p.legL = (0.8 + Math.sin(s.kick) * 0.7) * carried
    p.legR = (0.8 + Math.sin(s.kick + Math.PI) * 0.7) * carried
    p.armLOut = (0.9 + Math.sin(s.kick + 1) * 0.5) * carried
    p.armROut = (0.9 + Math.sin(s.kick + 1 + Math.PI) * 0.5) * carried
    p.rootY = 0
    p.rootYaw *= 1 - carried
    p.mouth = Math.max(p.mouth, 0.35 * carried)
  }
  // The hop is a real frog jump: legs fully extended behind.
  if (m.hop >= 0) {
    p.legL = p.legR = 1.7 * bump(m.hop, 0, 1)
    p.rootPitch = -0.4 * Math.sin(m.hop * Math.PI)
    volume(p, 1 + 0.25 * bump(m.hop, 0, 1))
  }
  // Landing: boing, boing, boing.
  if (m.land < 1.3) {
    const bounce = Math.abs(Math.sin(m.land * 3.4 * Math.PI)) * Math.exp(-m.land * 3.2)
    p.rootY += bounce * 0.35
    volume(p, 1 + (bounce > 0.02 ? 0.08 : -0.15) * Math.exp(-m.land * 3))
  }
}

// The old crooner: a tan toad with warts, spectacles, and white brows.

type CroonerState = { sway: number; arm: Spring }

function crooner(m: FrogMoment, p: Pose, s: CroonerState): void {
  const t = m.time
  // A slow lounge sway and a nod on each beat, one hand conducting.
  s.sway += m.dt
  p.bodyRoll = Math.sin(s.sway * 0.8) * 0.09
  p.headRoll = Math.sin(s.sway * 0.8 + 0.6) * 0.06
  const phase = beatPhase(m)
  p.headPitch = bump(phase, 0, 0.5) * 0.09 - 0.05
  const conduct = spring(s.arm, Math.sin(phase * TAU) * 0.35, 50, 9, m.dt)
  p.armROut = 0.5 + conduct
  p.armRFwd = 0.9
  p.armLFwd = 0.5
  p.armLOut = 0.1
  volume(p, 1 + Math.sin(t * 1.4) * 0.02)
  gaze(p, m, 0.7)
  p.lidL = p.lidR = 0.28
  const blink = recurring(t, 5.6, 8)
  p.lidL = p.lidR = Math.max(p.lidL, bump(blink, 0, 0.35))
  // Brows rise when the firefly draws near.
  p.hatY = m.fireNear * 0.05

  if (m.press < 0.5 && m.tap > m.press && m.mode === 'sit') {
    p.hatY = 0.07
    p.headPitch -= 0.2
    p.lidL = p.lidR = 0
  }
  // Singing: a long note with vibrato, eyes closed, head back, arm sweeping wide.
  const sing = m.sing
  const note = envelope(sing, 0.12, 0.35, 0.45)
  p.bubble = note > 0 ? note * (1.15 + Math.sin(sing * 44) * 0.07) * m.singStrength : 0
  p.lidL = p.lidR = Math.max(p.lidL, note)
  p.headPitch -= note * 0.3
  p.armLOut += note * 1.2
  p.armLFwd += note * 0.4
  p.hatY += note * 0.04
  // Tapped: a slow stage bow, then a push at the spectacles. The camera looks
  // down, so a straight bow foreshortens away; the lean and the wide sweep of
  // the free arm are what read.
  const tap = m.tap
  if (tap < 2) {
    const bow = envelope(tap, 0.35, 0.3, 0.45)
    p.bodyPitch = bow * 0.5
    p.bodyRoll += bow * 0.24
    p.headRoll += bow * 0.16
    p.headPitch += bow * 0.2
    p.armLOut += bow * 0.9
    p.armLFwd += bow * 0.3
    const specs = bump(tap, 1.05, 1.8)
    p.armROut = p.armROut * (1 - specs) + specs * 2.3
    p.armRFwd = p.armRFwd * (1 - specs) + specs * 1.2
    p.hatY += specs * 0.05
  }
  // Carried: stiff and dignified, legs together, a hand on the spectacles, brows down.
  const carried = m.mode === 'held' ? smooth(m.lift / 0.3) : m.hop >= 0 ? 0.7 : 0
  if (carried > 0) {
    p.legL = p.legR = 0.7 * carried
    p.armROut = p.armROut * (1 - carried) + 2.3 * carried
    p.armRFwd = p.armRFwd * (1 - carried) + 1.2 * carried
    p.hatY = -0.04 * carried
    p.lidL = p.lidR = 0.45 * carried
    p.bodyRoll *= 1 - carried
    p.rootRoll = -Math.max(-0.2, Math.min(0.2, m.vx * 0.03)) * carried
  }
  // Landing: settles, straightens its waistcoat, and bows a little.
  if (m.land < 1.4) {
    volume(p, 1 - ring(m.land, 1.8, 7) * 0.14)
    p.bodyPitch += bump(m.land, 0.35, 1.3) * 0.3
  }
}

type States = {
  showoff: ShowoffState
  shy: ShyState
  sleepy: SleepyState
  bouncy: BouncyState
  crooner: CroonerState
}

function freshState<C extends Character>(character: C): States[C] {
  const states: States = {
    showoff: { flower: { x: 0, v: 0 }, lean: { x: 0, v: 0 } },
    shy: { leaf: { x: 0, v: 0 }, tremble: 0 },
    sleepy: { cap: { x: 0, v: 0 }, jelly: { x: 0, v: 0 } },
    bouncy: { turn: { x: 0, v: 0 }, kick: 0 },
    crooner: { sway: 0, arm: { x: 0, v: 0 } },
  }
  return states[character]
}

export type Animator = (m: FrogMoment, pose: Pose) => void

export function animatorFor(character: Character): Animator {
  switch (character) {
    case 'showoff': {
      const state = freshState('showoff')
      return (m, pose) => showoff(m, pose, state)
    }
    case 'shy': {
      const state = freshState('shy')
      return (m, pose) => shy(m, pose, state)
    }
    case 'sleepy': {
      const state = freshState('sleepy')
      return (m, pose) => sleepy(m, pose, state)
    }
    case 'bouncy': {
      const state = freshState('bouncy')
      return (m, pose) => bouncy(m, pose, state)
    }
    case 'crooner': {
      const state = freshState('crooner')
      return (m, pose) => crooner(m, pose, state)
    }
    default: {
      const never: never = character
      throw new Error(`no animator for ${String(never)}`)
    }
  }
}

/**
 * Guidance cues are the same for every frog so a four-year-old can learn
 * them: before the first touch the nearest frog puffs its throat and
 * bounces toward the child. A splash is a plain physical surprise.
 */
export function overlays(m: FrogMoment, p: Pose): void {
  if (m.invite !== null) {
    const puff = bump(m.invite, 0.05, 0.75)
    p.bubble = Math.max(p.bubble, puff * 0.85)
    const hop = bump(m.invite, 0.25, 0.6)
    p.rootY += hop * 0.22
    p.rootZ += hop * 0.12
    p.lidL = p.lidR = Math.min(p.lidL, 1 - puff)
  }
  // A frog hovering overhead is about to swap in, and it covers this one's
  // face, so this one scoots aside and leans out past it to look up, wide-eyed.
  if (m.visited > 0.01) {
    const k = m.visited
    const d = Math.hypot(m.visitorX, m.visitorY, m.visitorZ) + 1e-4
    p.pupilX += ((m.visitorX / d) * 0.045 - p.pupilX) * k
    p.pupilY += ((m.visitorY / d) * 0.04 - p.pupilY) * k
    p.lidL *= 1 - k
    p.lidR *= 1 - k
    p.rootX += m.visitorSide * 0.34 * k
    p.bodyRoll -= m.visitorSide * 0.24 * k
    p.headRoll -= m.visitorSide * 0.14 * k
    p.headPitch -= 0.18 * k
    volume(p, 1 - 0.07 * k)
    p.mouth = Math.max(p.mouth, 0.22 * k)
  }
  if (m.mode === 'splash') {
    p.lidL = p.lidR = 0
    p.mouth = 0.8
    p.armLOut = p.armROut = 2.2 + Math.sin(m.time * 30) * 0.3
    volume(p, 1.12)
  }
}

export function applyPose(rig: FrogRig, p: Pose): void {
  const b = rig.bones
  const restP = rig.restPosition
  const restR = rig.restRotation
  b[BONE.root].position.set(p.rootX, p.rootY, p.rootZ)
  b[BONE.root].rotation.set(p.rootPitch, p.rootYaw, p.rootRoll, 'YXZ')
  b[BONE.body].scale.set(p.bodySX, p.bodySY, p.bodySZ)
  b[BONE.body].rotation.set(p.bodyPitch, p.bodyYaw, p.bodyRoll)
  const head = b[BONE.head]
  head.position.copy(restP[BONE.head])
  head.position.y += p.headY
  head.rotation.set(p.headPitch, p.headYaw, p.headRoll)
  b[BONE.lidL].rotation.x = LID_OPEN + (LID_CLOSED - LID_OPEN) * clamp01(p.lidL)
  b[BONE.lidR].rotation.x = LID_OPEN + (LID_CLOSED - LID_OPEN) * clamp01(p.lidR)
  const pupils = b[BONE.pupils]
  pupils.position.copy(restP[BONE.pupils])
  pupils.position.x += p.pupilX
  pupils.position.y += p.pupilY
  const mouth = clamp01(p.mouth)
  b[BONE.mouth].scale.set(0.4 + 0.6 * mouth, Math.max(0.03, mouth), 0.4 + 0.6 * mouth)
  const bubble = Math.max(0.14, p.bubble)
  b[BONE.bubble].scale.set(bubble * 1.04, bubble * 0.96, bubble)
  const armL = restR[BONE.armL]
  const armR = restR[BONE.armR]
  b[BONE.armL].rotation.set(armL.x - p.armLFwd, armL.y, armL.z - p.armLOut)
  b[BONE.armR].rotation.set(armR.x - p.armRFwd, armR.y, armR.z + p.armROut)
  b[BONE.legL].rotation.x = p.legL
  b[BONE.legR].rotation.x = p.legR
  const hat = b[BONE.hat]
  hat.position.copy(restP[BONE.hat])
  hat.position.y += p.hatY
  hat.rotation.set(p.hatPitch, 0, p.hatRoll)
  b[BONE.cheeks].scale.setScalar(p.cheeks)
}
