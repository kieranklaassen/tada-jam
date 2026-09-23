import { familyCount, hasKind, legsOf, type Part } from './parts'

// Form drives motion. What a critter was given decides how it moves: the
// leg count picks one of six gait routines, each its own curve (an inchworm
// hump, a pogo hop, a waddle, a three-beat lope, a diagonal trot, a
// rippling scuttle). Long legs stride slow and high, stubby legs patter,
// mixed legs limp, a big head makes it top-heavy, and a tail steadies it
// and swishes for balance. Its most distinctive part picks an idle routine
// and its temperament picks how it reacts to a friend or a tap. Every
// routine writes into one reusable Pose, so nothing allocates per frame.

export type Routine = 'inch' | 'pogo' | 'waddle' | 'lope' | 'trot' | 'scuttle'
export type IdleRoutine = 'paw' | 'chase' | 'nod' | 'shake' | 'lookAround' | 'wiggle' | 'jelly'
export type Temperament = 'shy' | 'curious' | 'bouncy' | 'bold'

export type GaitProfile = {
  routine: Routine
  legs: number
  /** Gait cycles per second. */
  cadence: number
  /** Walking speed in bench units per second. */
  speed: number
  /** 0 = all stubby legs, 1 = all long legs. */
  longLegs: number
  /** Mixed leg lengths make an uneven, limping step. */
  limp: number
  topHeavy: boolean
  /** A tail steadies the body (0 or 1). */
  steady: number
  idle: IdleRoutine
  temperament: Temperament
  /** Voice pitch multiplier: big heads are low, many small legs are high. */
  voice: number
}

const ROUTINE_BY_LEGS: readonly Routine[] = ['inch', 'pogo', 'waddle', 'lope', 'trot', 'scuttle', 'scuttle']
const BASE_CADENCE: Record<Routine, number> = { inch: 0.62, pogo: 1.25, waddle: 1.75, lope: 1.55, trot: 2.3, scuttle: 4.6 }
const BASE_SPEED: Record<Routine, number> = { inch: 3.4, pogo: 8.5, waddle: 5.6, lope: 9.5, trot: 10.5, scuttle: 15 }

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
const TAU = Math.PI * 2

export function idleFor(parts: readonly Part[]): IdleRoutine {
  if (hasKind(parts, 'horn')) return 'paw'
  if (hasKind(parts, 'tailLong')) return 'chase'
  if (hasKind(parts, 'head')) return 'nod'
  if (hasKind(parts, 'earFlop')) return 'shake'
  if (familyCount(parts, 'eyes') >= 3) return 'lookAround'
  if (hasKind(parts, 'tailCurl')) return 'wiggle'
  return 'jelly'
}

export function temperamentFor(parts: readonly Part[], seed: number): Temperament {
  if (hasKind(parts, 'horn')) return 'bold'
  const temperaments: readonly Temperament[] = ['shy', 'curious', 'bouncy']
  return temperaments[seed % temperaments.length]
}

export function profileFor(parts: readonly Part[], seed: number): GaitProfile {
  const legs = legsOf(parts)
  const routine = ROUTINE_BY_LEGS[legs.length]
  let long = 0
  for (const leg of legs) if (leg === 'legLong') long++
  const longLegs = legs.length === 0 ? 0 : long / legs.length
  const topHeavy = hasKind(parts, 'head')
  const limp = long > 0 && long < legs.length ? 1 : 0
  return {
    routine,
    legs: legs.length,
    cadence: BASE_CADENCE[routine] * lerp(1.25, 0.72, longLegs) * (topHeavy ? 0.9 : 1),
    speed: BASE_SPEED[routine] * lerp(0.9, 1.35, longLegs) * (topHeavy ? 0.85 : 1) * (limp ? 0.85 : 1),
    longLegs,
    limp,
    topHeavy,
    steady: familyCount(parts, 'tail') > 0 ? 1 : 0,
    idle: idleFor(parts),
    temperament: temperamentFor(parts, seed),
    voice: (topHeavy ? 0.78 : 1) * lerp(1.18, 0.9, longLegs) * (legs.length >= 5 ? 1.2 : 1),
  }
}

export const MAX_LEGS = 6

export type Pose = {
  /** Extra height of the body above its resting lift. */
  lift: number
  pitch: number
  roll: number
  yaw: number
  sx: number
  sy: number
  sz: number
  /** Share of walking speed applied right now: an inchworm moves only while it stretches, a pogo only in the air. Negative steps back. */
  advance: number
  legSwing: Float32Array
  legBend: Float32Array
  /** Legs fold out sideways while asleep, so the body rests on its belly. */
  legSplay: number
  tail: number
  tailLift: number
  ear: number
  headNod: number
  headTilt: number
  mouth: number
  lookX: number
  lookY: number
  /** 0 = eyes shut (asleep), 1 = wide open. */
  lids: number
}

export function createPose(): Pose {
  return {
    lift: 0,
    pitch: 0,
    roll: 0,
    yaw: 0,
    sx: 1,
    sy: 1,
    sz: 1,
    advance: 0,
    legSwing: new Float32Array(MAX_LEGS),
    legBend: new Float32Array(MAX_LEGS),
    legSplay: 0,
    tail: 0,
    tailLift: 0,
    ear: 0,
    headNod: 0,
    headTilt: 0,
    mouth: 0,
    lookX: 0,
    lookY: 0,
    lids: 1,
  }
}

export function resetPose(pose: Pose): Pose {
  pose.lift = 0
  pose.pitch = 0
  pose.roll = 0
  pose.yaw = 0
  pose.sx = 1
  pose.sy = 1
  pose.sz = 1
  pose.advance = 0
  pose.legSwing.fill(0)
  pose.legBend.fill(0)
  pose.legSplay = 0
  pose.tail = 0
  pose.tailLift = 0
  pose.ear = 0
  pose.headNod = 0
  pose.headTilt = 0
  pose.mouth = 0
  pose.lookX = 0
  pose.lookY = 0
  pose.lids = 1
  return pose
}

// --- gait routines -------------------------------------------------------------

/** No legs: an inchworm hump. The body bunches up (short and tall), then stretches forward; it only travels while stretching. */
function inch(p: number, pose: Pose): void {
  const hump = p < 0.5 ? smooth(p / 0.5) : smooth(1 - (p - 0.5) / 0.5)
  pose.sz = 1 - 0.3 * hump
  pose.sy = 1 + 0.34 * hump
  pose.sx = 1 - 0.06 * hump
  pose.lift = 0.9 * hump
  pose.pitch = -0.1 * Math.sin(TAU * p)
  pose.advance = p >= 0.5 ? Math.PI * Math.sin(Math.PI * (p - 0.5) * 2) : 0
  pose.tail = 0.25 * Math.sin(TAU * p)
}

/** One leg: a pogo hop. Crouch, spring up and forward, land in a squash. It travels only in the air. */
function pogo(p: number, profile: GaitProfile, pose: Pose): void {
  const height = 4.2 * (1 + profile.longLegs * 0.5)
  if (p < 0.22) {
    const k = Math.sin((p / 0.22) * Math.PI * 0.5)
    pose.sy = 1 - 0.22 * k
    pose.sx = pose.sz = 1 + 0.12 * k
    pose.legBend[0] = k
    pose.pitch = -0.08 * k
  } else if (p < 0.78) {
    const k = (p - 0.22) / 0.56
    pose.lift = height * Math.sin(Math.PI * k)
    pose.sy = 1 + 0.16 * (1 - k) * (1 - k)
    pose.sx = pose.sz = 1 - 0.07 * (1 - k)
    pose.legSwing[0] = -0.35 * Math.sin(Math.PI * k)
    pose.pitch = 0.12 * Math.sin(Math.PI * k)
    pose.advance = (Math.PI / 1.12) * Math.sin(Math.PI * k)
    pose.ear = -0.8 * Math.cos(Math.PI * k)
  } else {
    const k = Math.sin(((p - 0.78) / 0.22) * Math.PI)
    pose.sy = 1 - 0.26 * k
    pose.sx = pose.sz = 1 + 0.15 * k
    pose.legBend[0] = k
    pose.ear = 0.9 * k
  }
}

/** Two legs: a waddle. The body rolls onto each foot in turn, bobbing on every step, toes turning out. */
function waddle(p: number, profile: GaitProfile, pose: Pose): void {
  const s = Math.sin(TAU * p)
  pose.roll = 0.2 * s
  pose.yaw = 0.13 * s
  pose.lift = 0.6 * Math.abs(s) * (1 + profile.longLegs)
  pose.sy = 1 - 0.05 * (1 - Math.abs(s))
  pose.sx = 1 + 0.04 * (1 - Math.abs(s))
  pose.legSwing[0] = 0.5 * s
  pose.legSwing[1] = -0.5 * s
  pose.legBend[0] = Math.max(0, s)
  pose.legBend[1] = Math.max(0, -s)
  pose.advance = 1 + 0.25 * Math.cos(2 * TAU * p)
  pose.ear = 0.5 * Math.cos(2 * TAU * p)
}

/** Three legs: a three-beat lope, rocking like a hobby horse with a moment of flight. */
function lope(p: number, pose: Pose): void {
  const s = Math.sin(TAU * p)
  pose.pitch = 0.15 * s + 0.05 * Math.sin(2 * TAU * p + 0.6)
  pose.lift = 1.3 * Math.max(0, s) ** 1.6
  pose.sy = 1 + 0.07 * s
  for (let i = 0; i < 3; i++) {
    const leg = Math.sin(TAU * (p - i / 3))
    pose.legSwing[i] = 0.6 * leg
    pose.legBend[i] = Math.max(0, leg)
  }
  pose.advance = 1 + 0.35 * s
  pose.ear = -0.9 * s
  pose.tail = 0.5 * Math.cos(TAU * p)
}

/** Four legs: a brisk diagonal trot, two small bounces a cycle, the back level. */
function trot(p: number, pose: Pose): void {
  const a = Math.sin(TAU * p)
  pose.lift = 0.45 * (1 - Math.cos(2 * TAU * p)) * 0.5
  pose.pitch = 0.035 * Math.sin(2 * TAU * p)
  pose.sy = 1 - 0.035 * Math.cos(2 * TAU * p)
  for (let i = 0; i < 4; i++) {
    const diagonal = i === 0 || i === 3 ? a : -a
    pose.legSwing[i] = 0.42 * diagonal
    pose.legBend[i] = Math.max(0, diagonal)
  }
  pose.advance = 1
  pose.ear = 0.4 * Math.cos(2 * TAU * p)
  pose.tail = 0.35 * Math.sin(2 * TAU * p)
}

/** Five or six legs: a scuttle. A ripple runs front to back along each side, the body low and level with a busy jitter. */
function scuttle(p: number, legs: number, pose: Pose): void {
  for (let i = 0; i < legs; i++) {
    const side = i % 2
    const row = Math.floor(i / 2)
    const leg = Math.sin(TAU * (p - row * 0.22 - side * 0.5))
    pose.legSwing[i] = 0.36 * leg
    pose.legBend[i] = Math.max(0, leg)
  }
  pose.lift = 0.14 * Math.sin(3 * TAU * p)
  pose.yaw = 0.035 * Math.sin(2 * TAU * p)
  pose.sy = 0.95
  pose.sx = 1.03
  pose.advance = 1
  pose.ear = 0.2 * Math.sin(3 * TAU * p)
}

function smooth(t: number): number {
  const k = clamp01(t)
  return k * k * (3 - 2 * k)
}

/** Write the walking pose at gait phase `p` (0..1), blended in by `amount` (0 standing, 1 walking). */
export function gaitPose(profile: GaitProfile, p: number, amount: number, pose: Pose): Pose {
  resetPose(pose)
  switch (profile.routine) {
    case 'inch':
      inch(p, pose)
      break
    case 'pogo':
      pogo(p, profile, pose)
      break
    case 'waddle':
      waddle(p, profile, pose)
      break
    case 'lope':
      lope(p, pose)
      break
    case 'trot':
      trot(p, pose)
      break
    case 'scuttle':
      scuttle(p, profile.legs, pose)
      break
    default: {
      const unreachable: never = profile.routine
      return unreachable
    }
  }
  if (profile.limp) {
    pose.lift += 0.7 * Math.max(0, Math.sin(TAU * p))
    pose.roll += 0.09 * Math.sin(TAU * p)
  }
  if (profile.topHeavy) {
    pose.pitch += 0.07 * Math.sin(TAU * p + 1)
    pose.roll *= 1.35
    pose.headNod = -pose.pitch * 1.4
    pose.headTilt = pose.roll * 0.8
  }
  if (profile.steady) {
    // The tail swings against the roll a quarter-cycle late, like a counterweight catching up.
    pose.tail += -pose.roll * 2 + 0.35 * Math.sin(TAU * p + 1.6)
    pose.roll *= 0.6
    pose.pitch *= 0.7
  }
  blend(pose, amount)
  return pose
}

function blend(pose: Pose, amount: number): void {
  if (amount >= 1) return
  const k = Math.max(0, amount)
  pose.lift *= k
  pose.pitch *= k
  pose.roll *= k
  pose.yaw *= k
  pose.sx = 1 + (pose.sx - 1) * k
  pose.sy = 1 + (pose.sy - 1) * k
  pose.sz = 1 + (pose.sz - 1) * k
  pose.advance *= k
  for (let i = 0; i < MAX_LEGS; i++) {
    pose.legSwing[i] *= k
    pose.legBend[i] *= k
  }
  pose.tail *= k
  pose.ear *= k
  pose.headNod *= k
  pose.headTilt *= k
}

// --- wind-up (before the first step from a standstill) -------------------------------

export const WIND_UP_SECONDS: Record<Routine, number> = { inch: 0.55, pogo: 0.5, waddle: 0.45, lope: 0.5, trot: 0.34, scuttle: 0.42 }

/** Gathering itself to set off, `t` seconds in: every gait winds up its own way and ends back at rest, where the walk takes over. */
export function windUpPose(profile: GaitProfile, t: number, pose: Pose): Pose {
  resetPose(pose)
  const k = clamp01(t / WIND_UP_SECONDS[profile.routine])
  const env = Math.sin(Math.PI * k)
  switch (profile.routine) {
    case 'inch': {
      // Pulls its back end in, bunching up tall, before the first stretch.
      pose.sz = 1 - 0.22 * env
      pose.sy = 1 + 0.2 * env
      pose.pitch = 0.1 * env
      pose.tail = 0.4 * env
      break
    }
    case 'pogo': {
      // Two bounces on the spot, the second one deeper.
      const bounce = Math.abs(Math.sin(k * TAU))
      const depth = k < 0.5 ? 0.1 : 0.22
      pose.sy = 1 - depth * bounce
      pose.sx = pose.sz = 1 + depth * 0.55 * bounce
      pose.legBend[0] = bounce
      pose.ear = 0.8 * bounce
      break
    }
    case 'waddle': {
      // Rocks back on its heels, then tips forward onto the first foot.
      pose.pitch = k < 0.7 ? -0.16 * Math.sin(Math.PI * (k / 0.7)) : 0.08 * Math.sin(Math.PI * ((k - 0.7) / 0.3))
      pose.roll = 0.1 * Math.sin(k * TAU)
      pose.legSwing[0] = pose.legSwing[1] = -0.2 * env
      break
    }
    case 'lope': {
      // Rears up like a hobby horse, the front leg lifting, then drops into the lunge.
      pose.pitch = -0.24 * env
      pose.lift = 1.2 * env
      pose.legSwing[0] = 0.5 * env
      pose.legBend[0] = env
      pose.tail = -0.6 * env
      break
    }
    case 'trot': {
      // A front foot taps twice, impatient.
      const tap = Math.max(0, Math.sin(k * TAU * 2))
      pose.legSwing[0] = 0.45 * tap
      pose.legBend[0] = tap
      pose.headNod = -0.12 * env
      pose.tail = 0.5 * Math.sin(k * TAU * 2)
      break
    }
    case 'scuttle': {
      // Drops low and revs: every leg jitters in place, faster and faster.
      pose.sy = 1 - 0.12 * env
      pose.sx = 1 + 0.06 * env
      for (let i = 0; i < profile.legs; i++) {
        const leg = Math.sin(k * k * TAU * 6 + i * 1.3)
        pose.legSwing[i] = 0.18 * leg * env
        pose.legBend[i] = Math.max(0, leg) * env
      }
      break
    }
    default: {
      const unreachable: never = profile.routine
      return unreachable
    }
  }
  return pose
}

// --- idle routines (added on top of a standing pose) ----------------------------

/** Seconds of one idle routine before the critter walks on. */
export const IDLE_SECONDS: Record<IdleRoutine, number> = { paw: 3.2, chase: 2.6, nod: 3.6, shake: 2.2, lookAround: 3, wiggle: 2.2, jelly: 2.8 }

const LOOKS = [-0.5, 0.45, 0, 0.2]

/** Idle routine `idle`, `t` seconds in. Everyone also breathes. */
export function idlePose(idle: IdleRoutine, t: number, pose: Pose): Pose {
  const breathe = Math.sin(t * 2.1)
  pose.sy *= 1 + 0.025 * breathe
  pose.sx *= 1 - 0.012 * breathe
  switch (idle) {
    case 'paw': {
      // Horns: head down, a front foot scrapes back twice, then a snorting toss.
      const scrape = t < 2.2 ? (t * 2.4) % 1 : 0
      pose.pitch += 0.16 * smooth(t / 0.4) * (t < 2.4 ? 1 : 1 - smooth((t - 2.4) / 0.4))
      pose.legSwing[0] += t < 2.2 ? -0.7 * Math.sin(scrape * Math.PI) : 0
      pose.headNod += t > 2.4 && t < 2.9 ? -0.4 * Math.sin(((t - 2.4) / 0.5) * Math.PI) : 0
      pose.roll += 0.05 * Math.sin(t * 5)
      break
    }
    case 'chase': {
      // Long tail: it spots its own tail and spins a full circle after it, in little hops.
      const k = smooth((t - 0.3) / 2)
      pose.yaw += k * TAU
      pose.lift += t > 0.3 && t < 2.3 ? 0.9 * Math.abs(Math.sin((t - 0.3) * Math.PI * 3)) : 0
      pose.tail += 0.6 * Math.sin(t * 9)
      pose.lookX += -0.6
      break
    }
    case 'nod': {
      // Big head: it nods off, head drooping lower and lower, then jerks awake with a wobble.
      const cycle = t % 1.8
      const droop = cycle < 1.4 ? smooth(cycle / 1.4) : 1 - smooth((cycle - 1.4) / 0.12)
      pose.headNod += 0.45 * droop
      pose.lids = 1 - 0.8 * droop
      pose.pitch += 0.08 * droop
      if (cycle >= 1.4) pose.sy *= 1 + 0.08 * Math.sin(((cycle - 1.4) / 0.4) * Math.PI * 3) * (1 - (cycle - 1.4) / 0.4)
      break
    }
    case 'shake': {
      // Floppy ears: a wet-dog shake that starts hard and dies away, ears flying.
      const k = t < 1.4 ? Math.sin(t * TAU * 5.5) * (1 - t / 1.4) : 0
      pose.roll += 0.34 * k
      pose.ear += 2.2 * k
      pose.sy *= 1 - 0.05 * Math.abs(k)
      break
    }
    case 'lookAround': {
      // Three eyes: quick looks left, right, and up, snapping between them with an overshoot.
      const i = Math.min(LOOKS.length - 1, Math.floor(t / 0.75))
      const into = (t - i * 0.75) / 0.75
      const from = i === 0 ? 0 : LOOKS[i - 1]
      const snap = 1 - Math.exp(-into * 9) * Math.cos(into * 11)
      pose.yaw += from + (LOOKS[i] - from) * snap
      pose.lookX += LOOKS[i] * 1.4
      pose.lookY += i === 2 ? 0.8 : 0
      break
    }
    case 'wiggle': {
      // Curly tail: a happy bottom wiggle, the tail bouncing like a spring.
      const k = t < 1.6 ? Math.sin(t * TAU * 3.2) * Math.sin((t / 1.6) * Math.PI) : 0
      pose.yaw += 0.2 * k
      pose.roll -= 0.08 * k
      pose.tail += 1.2 * k
      pose.tailLift += 0.4 * Math.abs(k)
      break
    }
    case 'jelly': {
      // Plain lump: a big jelly breath, squashing low and wide, then a little jiggle.
      const breath = Math.sin(t * 2.4)
      pose.sy *= 1 + 0.08 * breath
      pose.sx *= 1 - 0.05 * breath
      pose.sz *= 1 - 0.05 * breath
      if (t > 1.8) pose.sy *= 1 + 0.05 * Math.sin((t - 1.8) * 30) * Math.max(0, 1 - (t - 1.8) * 1.5)
      break
    }
    default: {
      const unreachable: never = idle
      return unreachable
    }
  }
  return pose
}

// --- reactions ---------------------------------------------------------------------

export const REACT_SECONDS: Record<Temperament, number> = { shy: 1.3, curious: 1.5, bouncy: 1.1, bold: 1.2 }

/** A reaction to a friend or a tap, `t` seconds in, written on top of a standing pose. */
export function reactPose(temperament: Temperament, t: number, pose: Pose): Pose {
  switch (temperament) {
    case 'shy': {
      // Flinch, hop back, then a little tremble.
      if (t < 0.14) {
        const k = Math.sin((t / 0.14) * Math.PI * 0.5)
        pose.sy *= 1 - 0.2 * k
        pose.sx *= 1 + 0.1 * k
        pose.lids = 1.25
      } else if (t < 0.52) {
        const k = (t - 0.14) / 0.38
        pose.lift += 3.2 * Math.sin(Math.PI * k)
        pose.pitch -= 0.2 * Math.sin(Math.PI * k)
        pose.advance = -2.4 * Math.sin(Math.PI * k)
        pose.lids = 1.25
      } else {
        const k = (t - 0.52) / 0.78
        pose.roll += 0.05 * Math.sin(t * 60) * (1 - k)
        pose.sy *= 0.95
        pose.headNod += 0.15
      }
      break
    }
    case 'curious': {
      // Lean in and sniff three times, eyes wide.
      const lean = smooth(t / 0.3) * (1 - smooth((t - 1.2) / 0.3))
      pose.pitch += 0.2 * lean
      pose.headNod += 0.12 * lean + 0.1 * lean * Math.abs(Math.sin(t * 14))
      pose.sz *= 1 + 0.06 * lean
      pose.lids = 1 + 0.2 * lean
      pose.ear += 0.6 * lean
      break
    }
    case 'bouncy': {
      // Crouch, then a spinning hop, landing in a squash.
      if (t < 0.18) {
        const k = Math.sin((t / 0.18) * Math.PI * 0.5)
        pose.sy *= 1 - 0.22 * k
        pose.sx *= 1 + 0.12 * k
      } else if (t < 0.78) {
        const k = (t - 0.18) / 0.6
        pose.lift += 5.5 * Math.sin(Math.PI * k)
        pose.yaw += TAU * smooth(k)
        pose.sy *= 1 + 0.12 * (1 - k)
        pose.ear -= 1.2 * Math.sin(Math.PI * k)
      } else {
        const k = Math.sin(((t - 0.78) / 0.32) * Math.PI)
        pose.sy *= 1 - 0.22 * k
        pose.sx *= 1 + 0.12 * k
      }
      pose.mouth = 0.5
      break
    }
    case 'bold': {
      // Lean back, a playful butt forward, then a wobbly recoil.
      if (t < 0.35) {
        const k = smooth(t / 0.35)
        pose.pitch -= 0.22 * k
        pose.headNod -= 0.15 * k
      } else if (t < 0.55) {
        const k = Math.sin(((t - 0.35) / 0.2) * Math.PI * 0.5)
        pose.pitch += -0.22 + 0.5 * k
        pose.advance = 3 * Math.sin(((t - 0.35) / 0.2) * Math.PI)
        pose.headNod += 0.3 * k
      } else {
        const k = (t - 0.55) / 0.65
        pose.pitch += 0.28 * Math.exp(-k * 4) * Math.cos(k * 18)
        pose.roll += 0.06 * Math.sin(k * 20) * (1 - k)
      }
      break
    }
    default: {
      const unreachable: never = temperament
      return unreachable
    }
  }
  return pose
}

// --- sleeping, waking, carried -------------------------------------------------------

/** Each temperament wakes its own way; `hopAt` is when it leaves the turntable, `seconds` when it lands. */
export const WAKE_TIMING: Record<Temperament, { hopAt: number; seconds: number }> = {
  shy: { hopAt: 1.8, seconds: 2.45 },
  curious: { hopAt: 1.4, seconds: 2 },
  bouncy: { hopAt: 1.25, seconds: 2.05 },
  bold: { hopAt: 1.7, seconds: 2.25 },
}
/** What a waking critter says or does out loud: its voice, a sniff, a yawn, a bounce landing, or a shake. */
export type WakeCue = 'peep' | 'call' | 'ask' | 'sniff' | 'yawn' | 'bounce' | 'shake'
/**
 * Each wake's sounds, at seconds after the tap, on the beats of its own motion: shy's startled peep and a small
 * call before it dares hop, curious's call, sniffs, and questioning rise, bouncy's call and two landing bumps,
 * bold's long yawn and dog-shake flutter. The first cue answers the tap at once.
 */
export const WAKE_CUES: Record<Temperament, readonly (readonly [number, WakeCue])[]> = {
  shy: [
    [0.12, 'peep'],
    [1.62, 'call'],
  ],
  curious: [
    [0.04, 'call'],
    [0.3, 'sniff'],
    [0.9, 'ask'],
  ],
  bouncy: [
    [0.08, 'call'],
    [0.825, 'bounce'],
    [1.25, 'bounce'],
  ],
  bold: [
    [0.05, 'yawn'],
    [1, 'shake'],
  ],
}
/** The longest wake: the next lump waits for the turntable to be clear. */
export const WAKE_HOP_LATEST = Math.max(...Object.values(WAKE_TIMING).map((w) => w.hopAt))

/** Seconds per sleeping breath, and how big a snore bubble each blows on the out-breath. */
export const SLEEP_BREATH: Record<Temperament, { seconds: number; bubble: number }> = {
  shy: { seconds: 2.8, bubble: 0.6 },
  curious: { seconds: 3.4, bubble: 0.85 },
  bouncy: { seconds: 2.3, bubble: 0.75 },
  bold: { seconds: 4.4, bubble: 1.3 },
}

/** Asleep on the turntable, legs folded out and eyes shut, each temperament its own way. */
export function sleepPose(temperament: Temperament, t: number, pose: Pose): Pose {
  resetPose(pose)
  const breath = Math.sin((t / SLEEP_BREATH[temperament].seconds) * TAU)
  pose.legSplay = 1
  pose.lids = 0
  switch (temperament) {
    case 'shy': {
      // curled up small and tight, ears flat, quick shallow breaths, and now and then a dream twitch
      pose.sy = 0.86 + 0.03 * breath
      pose.sx = pose.sz = 0.95 - 0.01 * breath
      pose.headNod = 0.34
      pose.ear = -0.7
      pose.tailLift = -0.5
      pose.mouth = 0.04
      const twitch = t % 7.3
      if (twitch < 0.7) pose.roll = 0.035 * Math.sin(twitch * 55) * Math.sin((Math.PI * twitch) / 0.7)
      break
    }
    case 'curious': {
      // head tilted as if listening, one ear flicking at something in its dream
      pose.sy = 0.93 + 0.05 * breath
      pose.sx = 1.04 - 0.02 * breath
      pose.sz = 1.03 - 0.015 * breath
      pose.headTilt = 0.26
      pose.roll = 0.07
      pose.headNod = 0.18 + 0.03 * breath
      const flick = t % 4.7
      pose.ear = 0.3 * breath + (flick < 0.3 ? 1.5 * Math.sin((Math.PI * flick) / 0.3) : 0)
      pose.mouth = 0.1 + 0.06 * Math.max(0, breath)
      break
    }
    case 'bouncy': {
      // light quick breaths with a little smile, rocking gently, and every few breaths its legs paddle in a dream
      pose.sy = 0.95 + 0.04 * breath
      pose.sx = pose.sz = 1.02 - 0.02 * breath
      pose.roll = 0.05 * Math.sin((t / 4.6) * TAU)
      pose.headNod = 0.14
      pose.mouth = 0.3
      pose.ear = 0.2 * breath
      const dream = t % 6.1
      if (dream < 1.1) {
        const k = Math.sin((Math.PI * dream) / 1.1)
        for (let i = 0; i < MAX_LEGS; i++) pose.legSwing[i] = 0.45 * k * Math.sin(t * 15 + i * 1.7)
        pose.ear += 0.5 * k * Math.sin(t * 11)
      }
      break
    }
    case 'bold': {
      // sprawled wide and leaning back, deep slow breaths, mouth falling open on every out-breath
      pose.sy = 0.87 + 0.07 * breath
      pose.sx = pose.sz = 1.13 - 0.03 * breath
      pose.pitch = -0.1
      pose.headNod = 0.05
      pose.mouth = 0.2 + 0.45 * Math.max(0, breath)
      pose.ear = 0.4 * breath
      pose.tail = 0.3 * Math.sin((t / 8.8) * TAU)
      break
    }
    default: {
      const unreachable: never = temperament
      return unreachable
    }
  }
  return pose
}

/** Snore bubble size for a sleeper: grows on the out-breath and pops at its peak, in time with its own breathing. */
export function snoreBubble(temperament: Temperament, t: number): number {
  const { seconds, bubble } = SLEEP_BREATH[temperament]
  const phase = ((t / seconds) % 1 + 1) % 1
  if (phase < 0.08 || phase > 0.62) return 0
  return bubble * Math.sin(((phase - 0.08) / 0.54) * Math.PI * 0.5)
}

/** The waking sequence, `t` seconds after the nose was tapped: each temperament comes round in its own way, then hops off the turntable. */
export function wakePose(temperament: Temperament, t: number, pose: Pose): Pose {
  resetPose(pose)
  const { hopAt, seconds } = WAKE_TIMING[temperament]
  if (t >= hopAt) return hopOff(temperament, clamp01((t - hopAt) / (seconds - hopAt)), pose)
  pose.legSplay = 1 - smooth((t - hopAt + 0.5) / 0.4)
  switch (temperament) {
    case 'shy': {
      // One peek and it hides again, then it opens up properly and checks left and right before it dares.
      const peek = Math.sin(Math.PI * clamp01((t - 0.15) / 0.55))
      const open = smooth((t - 0.85) / 0.3)
      pose.lids = Math.max(0.5 * peek, open)
      pose.sy = 1 - 0.1 * smooth((t - 0.5) / 0.2) * (1 - open) - 0.05 * open
      pose.sx = 1 + 0.06 * (1 - open) * smooth((t - 0.5) / 0.2)
      pose.headNod = 0.25 - 0.2 * open
      pose.ear = -0.6 * smooth((t - 0.5) / 0.3)
      const look = clamp01((t - 1.05) / 0.6)
      pose.yaw = 0.38 * Math.sin(look * TAU)
      pose.lookX = Math.sin(look * TAU)
      break
    }
    case 'curious': {
      // Eyes pop wide at once, a lean and three sniffs at the air, then a tilt of the head one way and the other.
      pose.lids = 1.2 * smooth(t / 0.12)
      const lean = smooth((t - 0.1) / 0.2) * (1 - smooth((t - 0.8) / 0.2))
      pose.pitch = 0.2 * lean
      pose.headNod = -0.05 + 0.1 * lean * Math.abs(Math.sin(t * 17))
      pose.sz = 1 + 0.07 * lean
      pose.ear = 0.8 * lean
      const tilt = clamp01((t - 0.85) / 0.5)
      pose.headTilt = 0.35 * Math.sin(tilt * TAU)
      pose.roll = 0.12 * Math.sin(tilt * TAU)
      pose.mouth = 0.3 * lean
      break
    }
    case 'bouncy': {
      // Stretch up tall, then two springy bounces right there on the turntable.
      const stretch = smooth(t / 0.3) * (1 - smooth((t - 0.3) / 0.1))
      pose.lids = smooth((t - 0.1) / 0.15) * 1.1
      pose.sy = 1 + 0.25 * stretch
      pose.sx = pose.sz = 1 - 0.1 * stretch
      const b = clamp01((t - 0.4) / 0.85)
      if (b > 0 && b < 1) {
        const phase = (b * 2) % 1
        pose.lift = 3.2 * Math.sin(Math.PI * phase)
        const contact = Math.max(0, 1 - phase / 0.18) + Math.max(0, (phase - 0.82) / 0.18)
        pose.sy -= 0.18 * contact
        pose.sx += 0.1 * contact
        pose.sz += 0.1 * contact
        pose.ear = 1.4 * Math.sin(Math.PI * phase)
      }
      pose.mouth = 0.5 * smooth((t - 0.3) / 0.2)
      break
    }
    case 'bold': {
      // A huge slow yawn with its chin up, then a big dog shake from side to side.
      const yawn = Math.sin(Math.PI * clamp01(t / 0.95))
      pose.mouth = 1.3 * yawn
      pose.sy = 1 + 0.15 * yawn
      pose.sx = 1 + 0.06 * yawn
      pose.headNod = -0.3 * yawn
      // leaning back turns the open mouth, under the nose, up toward the camera
      pose.pitch = -0.3 * yawn
      pose.lids = smooth((t - 0.75) / 0.2)
      const shake = clamp01((t - 0.95) / 0.55)
      const sway = Math.sin(shake * TAU * 3.5) * Math.sin(Math.PI * shake)
      pose.roll = 0.34 * sway
      pose.yaw = -0.12 * sway
      pose.ear = 1.8 * sway
      pose.tail = 1.2 * sway
      if (t > 1.5) pose.pitch = -0.1 * smooth((t - 1.5) / 0.2)
      break
    }
    default: {
      const unreachable: never = temperament
      return unreachable
    }
  }
  return pose
}

/** Off the turntable: a tiny hop with ears flat, a forward dive, a high spinning leap, or a heavy stomp. */
function hopOff(temperament: Temperament, k: number, pose: Pose): Pose {
  pose.lids = 1
  const air = Math.sin(Math.PI * Math.min(1, k * 1.25))
  const land = k < 0.8 ? 0 : Math.sin(((k - 0.8) / 0.2) * Math.PI)
  switch (temperament) {
    case 'shy':
      pose.lift = 3.6 * air
      pose.ear = -0.9
      pose.sy = 1 - 0.1 * land
      pose.headNod = 0.12
      break
    case 'curious':
      pose.lift = 7 * air
      pose.pitch = 0.3 * Math.sin(Math.PI * k)
      pose.sz = 1 + 0.12 * air
      pose.sy = 1 - 0.16 * land
      pose.ear = 1.2 * air
      break
    case 'bouncy':
      pose.lift = 10 * air
      pose.yaw = TAU * smooth(k / 0.8)
      pose.sy = k < 0.8 ? 1 + 0.14 * (1 - k) : 1 - 0.24 * land
      pose.sx = pose.sz = k < 0.8 ? 1 - 0.06 * (1 - k) : 1 + 0.14 * land
      pose.mouth = 0.6
      break
    case 'bold':
      pose.lift = 4.5 * air
      pose.pitch = -0.08 * air
      pose.sy = 1 - 0.3 * land
      pose.sx = pose.sz = 1 + 0.18 * land
      pose.mouth = 0.4
      break
    default: {
      const unreachable: never = temperament
      return unreachable
    }
  }
  return pose
}

/** Lifted by a finger, each in its own way: shy curls up, curious peers down, bouncy paddles, bold spreads out and swings. */
export function carriedPose(temperament: Temperament, t: number, pose: Pose): Pose {
  resetPose(pose)
  switch (temperament) {
    case 'shy': {
      // a tight ball with eyes squeezed shut, trembling, one quick peek now and then
      for (let i = 0; i < MAX_LEGS; i++) {
        pose.legSwing[i] = -0.35
        pose.legBend[i] = 1
      }
      pose.sy = 0.9
      pose.sx = pose.sz = 1.05
      pose.roll = 0.04 * Math.sin(t * 52)
      pose.headNod = 0.3
      pose.ear = -0.9
      pose.tailLift = -0.6
      const peek = (t % 1.6) / 1.6
      pose.lids = peek > 0.7 && peek < 0.85 ? 0.6 : 0.05
      pose.mouth = 0.1
      break
    }
    case 'curious': {
      // leans out over the bench and looks all around it, legs reaching slowly for the ground
      for (let i = 0; i < MAX_LEGS; i++) {
        const s = Math.sin(t * 4 + i * 2.1)
        pose.legSwing[i] = 0.25 * s
        pose.legBend[i] = 0.15 * Math.max(0, s)
      }
      pose.pitch = 0.2
      pose.headNod = 0.25
      pose.lookY = -1
      pose.lookX = Math.sin(t * 1.9)
      pose.headTilt = 0.25 * Math.sin(t * 1.3)
      pose.ear = 0.9
      pose.lids = 1.15
      pose.mouth = 0.3
      pose.sy = 1.05
      break
    }
    case 'bouncy': {
      // paddles fast with a big grin, bobbing in the hand
      for (let i = 0; i < MAX_LEGS; i++) {
        const s = Math.sin(t * 20 + i * 1.7)
        pose.legSwing[i] = 0.6 * s
        pose.legBend[i] = 0.45 * Math.max(0, s)
      }
      pose.lift = 0.9 * Math.abs(Math.sin(t * 9))
      pose.sy = 1.08 + 0.06 * Math.sin(t * 18)
      pose.sx = pose.sz = 0.96
      pose.tail = 1.1 * Math.sin(t * 16)
      pose.ear = 1.2 * Math.sin(t * 9)
      pose.lids = 1.25
      pose.mouth = 0.8
      break
    }
    case 'bold': {
      // legs flung wide like a plane, a slow big swing from side to side, ears streaming back
      for (let i = 0; i < MAX_LEGS; i++) {
        pose.legSwing[i] = i % 2 ? 0.7 : -0.7
        pose.legBend[i] = 0
      }
      pose.roll = 0.28 * Math.sin(t * 2.2)
      pose.yaw = 0.15 * Math.sin(t * 2.2 - 0.6)
      pose.pitch = -0.12
      pose.sz = 1.06
      pose.ear = -0.5 + 0.2 * Math.sin(t * 6)
      pose.tail = 0.5 * Math.sin(t * 2.2)
      pose.lids = 1.1
      pose.mouth = 0.6
      break
    }
    default: {
      const unreachable: never = temperament
      return unreachable
    }
  }
  return pose
}

/**
 * Set down from a finger: `touches` are the seconds it meets the bench (the first ends the drop, bouncy
 * rebounds for the rest), `seconds` is when it has settled, `weight` how hard it lands.
 */
export const LAND_TIMING: Record<Temperament, { touches: readonly number[]; seconds: number; weight: number }> = {
  shy: { touches: [0.5], seconds: 1.55, weight: 0.45 },
  curious: { touches: [0.46], seconds: 1.5, weight: 0.65 },
  bouncy: { touches: [0.38, 0.84, 1.1], seconds: 1.25, weight: 0.85 },
  bold: { touches: [0.32], seconds: 1.15, weight: 1.2 },
}

/**
 * The set-down, `t` seconds after the finger let go. The drop itself is the caller's; this is how each
 * temperament falls and comes round: shy stays curled, lands flat, and dares one peek before it unfolds;
 * curious reaches for the bench and sniffs where it landed; bouncy rebounds twice; bold stomps down wide
 * and shakes it off.
 */
export function landPose(temperament: Temperament, t: number, pose: Pose): Pose {
  resetPose(pose)
  const { touches } = LAND_TIMING[temperament]
  const fall = clamp01(t / touches[0])
  const s = t - touches[0]
  const thump = s < 0 ? 0 : Math.sin(Math.PI * clamp01(s / 0.2))
  switch (temperament) {
    case 'shy': {
      const unfold = smooth((s - 0.6) / 0.4)
      const curl = 1 - unfold
      for (let i = 0; i < MAX_LEGS; i++) {
        pose.legSwing[i] = -0.35 * curl
        pose.legBend[i] = curl
      }
      pose.sy = 1 - 0.12 * curl - 0.1 * thump
      pose.sx = pose.sz = 1 + 0.06 * curl + 0.06 * thump
      pose.headNod = 0.3 * curl
      pose.ear = -0.9 * curl
      pose.lids = s < 0.25 ? 0.05 : 0.05 + 0.95 * smooth((s - 0.25) / 0.35)
      const glance = clamp01((s - 0.3) / 0.5)
      pose.lookX = 0.8 * Math.sin(glance * TAU) * curl
      pose.yaw = 0.12 * Math.sin(glance * TAU) * curl
      pose.mouth = 0.1
      break
    }
    case 'curious': {
      const reach = s < 0 ? smooth(fall / 0.6) : 1 - smooth(s / 0.15)
      for (let i = 0; i < MAX_LEGS; i++) pose.legSwing[i] = 0.4 * reach
      const sniff = smooth(s / 0.2) * (1 - smooth((s - 0.75) / 0.2))
      const up = smooth((s - 0.8) / 0.15) * (1 - smooth((s - 0.95) / 0.1))
      pose.pitch = 0.3 * sniff + 0.1 * reach
      pose.headNod = 0.28 * sniff + 0.08 * sniff * Math.abs(Math.sin(s * 18)) - 0.18 * up
      pose.lookY = -0.9 * sniff - 0.5 * reach + 0.6 * up
      pose.sy = 1 - 0.12 * thump
      pose.sx = pose.sz = 1 + 0.06 * thump
      pose.ear = 0.8
      pose.lids = 1.15
      pose.mouth = 0.3 * sniff
      break
    }
    case 'bouncy': {
      const [, second, third] = touches
      pose.lift = s < 0 ? 0 : s < second - touches[0] ? 4.2 * Math.sin((Math.PI * s) / (second - touches[0])) : 1.4 * Math.sin(Math.PI * clamp01((t - second) / (third - second)))
      let contact = 0
      for (const at of touches) contact = Math.max(contact, 1 - Math.abs(t - at) / 0.09)
      pose.sy = 1 + 0.1 * (s < 0 ? fall : 0) - 0.22 * contact
      pose.sx = pose.sz = 1 + 0.12 * contact
      for (let i = 0; i < MAX_LEGS; i++) pose.legSwing[i] = (i % 2 ? 0.5 : -0.5) * (s < 0 ? 1 : pose.lift / 4.2)
      pose.ear = 1.3 * (s < 0 ? 1 : pose.lift / 4.2) - 0.4 * contact
      pose.lids = 1.2
      pose.mouth = 0.75
      break
    }
    case 'bold': {
      const stomp = s < 0 ? 0 : Math.sin(Math.PI * clamp01(s / 0.34))
      const plant = s < 0 ? 0.3 * fall : 1 - smooth((s - 0.3) / 0.3)
      for (let i = 0; i < MAX_LEGS; i++) pose.legSwing[i] = (i % 2 ? 0.55 : -0.55) * plant
      pose.sy = 1 - 0.24 * stomp
      pose.sx = pose.sz = 1 + 0.16 * stomp
      pose.pitch = s < 0 ? -0.1 * fall : -0.16 * smooth((s - 0.1) / 0.15) * (1 - smooth((s - 0.72) / 0.1))
      const shake = clamp01((s - 0.3) / 0.45)
      const sway = Math.sin(shake * TAU * 2.5) * Math.sin(Math.PI * shake)
      pose.roll = 0.2 * sway
      pose.ear = -0.5 * (1 - shake) + 1.5 * sway
      pose.tail = sway
      pose.lids = 1.05
      pose.mouth = 0.45 * stomp + 0.3
      break
    }
    default: {
      const unreachable: never = temperament
      return unreachable
    }
  }
  return pose
}
